import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa } from 'execa';
import {
  findInstalledBinary,
  ACCOUNTS_FILE,
  ACTIVE_FILE,
  SSH_CONFIG,
  SYSTEM_BIN_DIR,
  USER_BIN_DIR,
  DATA_DIR,
  BINARY_NAME,
} from '../core/engine.js';
import { inspectSshConfig, stripManagedBlocks } from '../core/ssh-config.js';
import { checkDependencies, formatMissing } from '../installer/deps.js';
import { installBinary } from '../installer/installer.js';
import { VENDOR_SCRIPT } from '../core/engine.js';
import { checkForUpdate, promptSelfUpdate, selfUninstall, cleanRcMarkers } from '../lib/self.js';

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** `gitswitch doctor` — full environment diagnostic. */
export async function runDoctor() {
  console.log(pc.bold('\n🩺 GitSwitch Doctor\n'));

  const binary = findInstalledBinary();
  const engineLabel = binary ?? `${VENDOR_SCRIPT} ${pc.dim('(bundled, not permanently installed)')}`;
  console.log(`  Engine   : ${pc.cyan(engineLabel)}`);
  if (binary) {
    try {
      const res = await execa(binary, ['version'], { reject: false });
      console.log(`  Version  : ${(res.stdout || '?').trim()}`);
    } catch { /* older engine without version cmd */ }
  }

  console.log(`  Accounts : ${ACCOUNTS_FILE}${fs.existsSync(ACCOUNTS_FILE) ? '' : pc.dim(' (none yet)')}`);
  const accounts = readJsonSafe(ACCOUNTS_FILE);
  if (Array.isArray(accounts)) {
    for (const a of accounts) {
      const type = a.type === 'org' ? '🏢 org' : '👤 user';
      console.log(`    - ${pc.bold(a.user)} ${pc.dim(type)}${a.parent && a.type === 'org' ? pc.dim(` ↳ ${a.parent}`) : ''}`);
    }
  }
  const active = fs.existsSync(ACTIVE_FILE) ? fs.readFileSync(ACTIVE_FILE, 'utf8').trim() : '';
  console.log(`  Active   : ${active ? pc.green('⭐ ' + active) : pc.yellow('not set')}`);

  const ssh = inspectSshConfig();
  console.log(`  SSH conf : ${SSH_CONFIG}${ssh.exists ? '' : pc.dim(' (missing)')}`);
  if (ssh.exists) {
    console.log(
      `             ${ssh.managedUsers.length} managed account(s), ${ssh.foreignHosts} foreign host entr${ssh.foreignHosts === 1 ? 'y' : 'ies'} (untouched)`,
    );
  }

  const deps = await checkDependencies();
  console.log(`  Deps     : ${deps.missingCore.length === 0 ? pc.green('all required present') : formatMissing(deps)}\n`);
}

/** `gitswitch upgrade` — self-update the npm CLI if a newer version is published. */
export async function runSelfUpgrade() {
  const { outdated, latest, current } = await checkForUpdate();
  if (!outdated) {
    console.log(pc.green(`Already on the latest version (v${current}).`));
    return;
  }
  console.log(`Available: ${pc.cyan('v' + latest)}  (you have ${pc.dim('v' + current)})`);
  await promptSelfUpdate();
}

/** `gitswitch repair` — re-install the engine binary (fixes a broken install). */
export async function runRepair() {
  console.log(pc.bold('\n🔧 GitSwitch Repair\n'));
  const binary = findInstalledBinary();
  const targetDir = binary?.includes(SYSTEM_BIN_DIR) ? SYSTEM_BIN_DIR : USER_BIN_DIR;
  try {
    await installBinary(targetDir);
    const dest = findInstalledBinary() ?? path.join(targetDir, 'gitswitch');
    console.log(`  Engine   : ${pc.cyan(dest)}`);
    console.log('  Status   : ' + pc.green('re-installed & ready'));
    console.log(`  Data     : ${fs.existsSync(DATA_DIR) ? pc.green('accounts preserved') : pc.dim('no account data')}`);
    console.log();
  } catch (e) {
    console.log('  Status   : ' + pc.red('repair failed — ' + (e.message || e)));
    console.log();
    process.exitCode = 1;
  }
}

/**
 * Remove a gitswitch engine binary, trying a direct `rm` first and escalating
 * to sudo when the target is root-owned. Runs with the terminal in normal mode
 * (we are past the clack prompt), so the password prompt is usable and Ctrl+C
 * interrupts cleanly. A decline just falls through.
 * @param {string} binaryPath absolute path to the engine binary
 * @param {{sudo?: Function}} [opts] test seam for the sudo runner
 * @returns {Promise<boolean>} true when the binary no longer exists
 */
export async function removeBinary(binaryPath, { sudo = execa } = {}) {
  try {
    fs.rmSync(binaryPath, { force: true });
    return !fs.existsSync(binaryPath);
  } catch {
    try {
      await sudo('sudo', ['rm', '-f', binaryPath], { stdio: 'inherit' });
      return !fs.existsSync(binaryPath);
    } catch {
      return false;
    }
  }
}

/**
 * `gitswitch uninstall` wizard — removes EVERY trace so `gitswitch` afterwards
 * reports `command not found`: engine binaries in every known location, all
 * account data, GitSwitch-managed SSH blocks, the npm package and rc markers.
 */
export async function runUninstallWizard() {
  p.intro(pc.bgRed(pc.black(' GitSwitch Uninstaller ')));

  const binary = findInstalledBinary();
  if (binary) p.note(binary, 'Installed engine detected');

  const confirm = await p.confirm({
    message: 'Uninstall GitSwitch completely? This removes the engine binary, ALL stored accounts & backups (~/.gitswitch), GitSwitch-managed SSH config entries, the gitswitch-wizard npm package and every rc marker.',
    initialValue: true,
  });
  if (p.isCancel(confirm)) { p.cancel('Aborted.'); process.exit(0); }
  if (!confirm) { p.outro('Nothing was removed.'); return; }

  // 1. Remove the engine binary from EVERY known location (system + user).
  let removedBins = 0;
  for (const dir of [SYSTEM_BIN_DIR, USER_BIN_DIR]) {
    const candidate = path.join(dir, BINARY_NAME);
    if (!fs.existsSync(candidate)) continue;
    if (await removeBinary(candidate)) removedBins++;
    else p.log.warn(`Could not remove ${candidate} — run: sudo rm -f "${candidate}"`);
  }

  // 2. Delete ALL stored accounts & backups.
  const dataGone = deleteData();
  if (dataGone) p.log.success('Removed all accounts & backups (~/.gitswitch).');

  // 3. Remove only GitSwitch-managed SSH config entries (foreign hosts untouched),
  //    with a timestamped backup so nothing is lost irreversibly.
  const ssh = inspectSshConfig();
  if (ssh.exists && ssh.managedUsers.length > 0) {
    const backup = `${SSH_CONFIG}.gitswitch-backup-${Date.now()}`;
    const content = fs.readFileSync(SSH_CONFIG, 'utf8');
    fs.writeFileSync(backup, content);
    fs.writeFileSync(SSH_CONFIG, stripManagedBlocks(content, ssh.managedUsers));
    p.log.success(`Removed GitSwitch-managed SSH entries for: ${ssh.managedUsers.join(', ')} (backup → ${backup}).`);
  } else {
    p.log.message(pc.dim('No GitSwitch-managed SSH config entries found.'));
  }

  // 4. Remove the npm package so the `gitswitch` command truly disappears.
  const npmRemoved = await selfUninstall();

  // 5. Remove leftover PATH / SSH-agent markers from ~/.bashrc / ~/.zshrc.
  await cleanRcMarkers();

  p.outro(pc.green(
    `Uninstalled.${removedBins ? ` ${removedBins} engine binary(ies) removed.` : ''} Account data ${dataGone ? 'deleted.' : 'could not be deleted — run: rm -rf ~/.gitswitch'} ${npmRemoved ? 'gitswitch-wizard npm package removed — the gitswitch command is gone.' : 'gitswitch-wizard npm package could not be removed automatically — run: npm uninstall -g gitswitch-wizard'}`,
  ));
  p.log.message(pc.dim('After uninstall, `gitswitch` reports: bash: gitswitch: command not found'));
  p.log.message(pc.dim('If this terminal still shows "No such file or directory", clear bash\'s cached command path with: hash -r (or open a new terminal).'));
}

/**
 * Delete ~/.gitswitch (accounts, backups, active pointer).
 * @returns {boolean} true when the data dir no longer exists
 */
function deleteData() {
  try {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    return !fs.existsSync(DATA_DIR);
  } catch {
    return false;
  }
}
