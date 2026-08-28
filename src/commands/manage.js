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
 * `gitswitch uninstall` wizard — every destructive step is opt-in and asked first.
 */
export async function runUninstallWizard() {
  p.intro(pc.bgRed(pc.black(' GitSwitch Uninstaller ')));

  const binary = findInstalledBinary();
  if (!binary) p.log.info('No installed gitswitch binary found.');

  // 1. Remove the binary?
  let removedBin = false;
  if (binary) {
    const removeBin = await p.confirm({ message: `Remove the gitswitch command (${binary})?`, initialValue: true });
    if (!p.isCancel(removeBin) && removeBin) {
      try {
        // Try a direct removal first (user-local installs, writable dirs).
        fs.rmSync(binary, { force: true });
        removedBin = true;
      } catch {
        // Root-owned dir → escalate via sudo. Run with the terminal in normal
        // mode (we are past the clack prompt), so the password prompt is
        // usable and Ctrl+C interrupts cleanly. A decline just falls through.
        try {
          await execa('sudo', ['rm', '-f', binary], { stdio: 'inherit' });
          removedBin = true;
        } catch {
          p.log.warn(`Could not remove ${binary} — you may need to run it manually:\n  sudo rm -f "${binary}"`);
        }
      }
    }
  }

  // 2. Remove account data?
  let removedData = false;
  const hasData = fs.existsSync(path.join(os.homedir(), '.gitswitch'));
  if (hasData) {
    const removeData = await p.confirm({
      message: 'Delete ALL stored accounts & backups (~/.gitswitch)?',
      initialValue: false,
    });
    if (!p.isCancel(removeData) && removeData) {
      fs.rmSync(path.join(os.homedir(), '.gitswitch'), { recursive: true, force: true });
      removedData = true;
    }
  }

  // 3. Remove only GitSwitch-managed SSH config entries? Foreign hosts are never touched.
  const ssh = inspectSshConfig();
  if (ssh.exists && ssh.managedUsers.length > 0) {
    const cleanSsh = await p.confirm({
      message: `Remove GitSwitch's own SSH config blocks for: ${ssh.managedUsers.join(', ')}?`,
      initialValue: false,
    });
    if (!p.isCancel(cleanSsh) && cleanSsh) {
      const backup = `${SSH_CONFIG}.gitswitch-backup-${Date.now()}`;
      const content = fs.readFileSync(SSH_CONFIG, 'utf8');
      fs.writeFileSync(backup, content);
      fs.writeFileSync(SSH_CONFIG, stripManagedBlocks(content, ssh.managedUsers));
      p.log.success(`Backup written → ${backup}`);
    }
  } else {
    p.log.message(pc.dim('No GitSwitch-managed SSH config entries found.'));
  }

  // Remove the npm package so the `gitswitch` command actually disappears.
  const npmRemoved = await selfUninstall();

  // Remove leftover PATH / SSH-agent markers from ~/.bashrc / ~/.zshrc.
  await cleanRcMarkers();

  p.outro(pc.green(
    `Uninstalled.${removedBin ? ' Binary removed.' : ''}${removedData ? ' Account data deleted.' : ' Account data kept at ~/.gitswitch.'} ${npmRemoved ? 'gitswitch npm package removed — command no longer available.' : 'gitswitch npm package kept.'}`,
  ));
}
