import * as p from '@clack/prompts';
import pc from 'picocolors';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { findInstalledBinary, SYSTEM_BIN_DIR, USER_BIN_DIR, DATA_DIR } from '../core/engine.js';
import { compareVersions, extractVersion } from '../lib/version.js';
import { checkDependencies, aptInstall, formatMissing } from '../installer/deps.js';
import { installBinary, ensureOnPath, addSshAgentRc, prepareDataDirs } from '../installer/installer.js';
import { reportSshSafety } from './safety.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

/** Read the version reported by an installed gitswitch binary. */
function installedVersion(binaryPath) {
  try {
    const { execaSync } = require('execa');
    const res = execaSync(binaryPath, ['version'], { reject: false });
    return extractVersion(res.stdout || '');
  } catch {
    return null;
  }
}

async function runDepsSetup() {
  p.log.step('Checking dependencies…');
  const deps = await checkDependencies();

  if (deps.missingCore.length > 0) {
    p.log.warn(`Missing required tools → ${formatMissing(deps)}`);
    const install = await p.confirm({
      message: `Install missing packages via apt (${deps.missingCore.join(', ')})?`,
      initialValue: true,
    });
    if (!p.isCancel(install) && install) {
      try {
        await aptInstall(deps.missingCore);
      } catch (e) {
        // Broken third-party apt repos, sudo declines, offline machines…
        // None of these should kill the whole wizard with a stack trace.
        p.log.warn(String(e.message || e));
        p.log.message(pc.dim('Continuing — GitSwitch will surface anything essential again when the engine runs.'));
      }
    } else {
      p.log.message(pc.dim('Skipping — GitSwitch needs these tools to function.'));
    }
  }

  if (deps.missingOptional.includes('fzf')) {
    const wantFzf = await p.confirm({
      message: 'Install fzf for nicer account selection menus? (recommended)',
      initialValue: false,
    });
    if (!p.isCancel(wantFzf) && wantFzf) {
      try {
        await aptInstall(['fzf']);
        p.log.success('fzf installed — nicer menus unlocked.');
      } catch (e) {
        p.log.warn(`fzf could not be installed automatically. Falling back to basic menus.`);
        p.log.message(pc.dim(String(e.message || e)));
      }
    }
  }

  if (deps.missingCore.length === 0) {
    p.log.success('All required dependencies present.');
  }
}

async function freshInstallFlow() {
  p.log.step('Fresh install detected');

  await runDepsSetup();
  reportSshSafety();
  prepareDataDirs();

  const location = await p.select({
    message: 'Where should the gitswitch command be installed?',
    options: [
      { value: 'system', label: `System-wide (${SYSTEM_BIN_DIR})`, hint: 'may ask for sudo; all users' },
      { value: 'user', label: 'Current user (~/.local/bin)', hint: 'no sudo; added to PATH' },
    ],
  });
  if (p.isCancel(location)) { p.cancel('Aborted.'); process.exit(0); }

  const s = p.spinner();
  s.start('Installing GitSwitch engine…');
  try {
    const { dest, usedSudo } = await installBinary(location === 'system' ? SYSTEM_BIN_DIR : USER_BIN_DIR, { spinner: s });
    s.stop(`Engine installed → ${pc.cyan(dest)}${usedSudo ? pc.dim(' (via sudo)') : ''}`);

    if (location === 'user') {
      const ps = p.spinner();
      ps.start('Ensuring ~/.local/bin is on PATH…');
      const touched = await ensureOnPath(USER_BIN_DIR);
      ps.stop(touched
        ? 'PATH updated in ~/.bashrc / ~/.zshrc — open a new terminal or: source ~/.bashrc'
        : 'Already on PATH.');
    }
  } catch (e) {
    s.stop(pc.red(`Install failed: ${e.message}`));
    process.exit(1);
  }

  const wantAgent = await p.confirm({
    message: 'Add SSH-agent auto-start to ~/.bashrc so keys survive reboots?',
    initialValue: true,
  });
  if (!p.isCancel(wantAgent) && wantAgent) {
    const added = await addSshAgentRc();
    p.log[added ? 'success' : 'message'](added ? 'SSH-agent persistence added.' : 'Already present — skipped.');
  }

  p.outro(pc.green('GitSwitch installed! Run `gitswitch` to add your first GitHub account.'));
}

async function updateFlow(binaryPath, currentVersion) {
  p.note(`Installed: v${currentVersion ?? '?'}\nBundled:  v${pkg.version}`, 'Update available');

  const doUpdate = await p.confirm({ message: 'Update GitSwitch to the latest version?', initialValue: true });
  if (p.isCancel(doUpdate) || !doUpdate) { p.outro('Update cancelled.'); return; }

  reportSshSafety();

  const s = p.spinner();
  s.start('Updating GitSwitch engine…');
  try {
    const destDir = binaryPath.includes(SYSTEM_BIN_DIR) ? SYSTEM_BIN_DIR : USER_BIN_DIR;
    // `installBinary` stops the spinner itself right before any interactive
    // sudo prompt, so Ctrl+C / password entry work — then we stop it again
    // here (idempotent) to print the completed state.
    const { dest, usedSudo } = await installBinary(destDir, { spinner: s });
    s.stop(`Updated → ${pc.cyan(dest)}${usedSudo ? pc.dim(' (via sudo)') : ''}`);
    p.log.success(
      fs.existsSync(DATA_DIR)
        ? `Your accounts (${pc.cyan('~/.gitswitch')}), SSH keys and SSH config entries were ${pc.bold('preserved')}.`
        : 'No existing account data found — nothing to preserve.',
    );
  } catch (e) {
    s.stop(pc.red(`Update failed: ${e.message}`));
    process.exit(1);
  }
  p.outro(pc.green('GitSwitch updated!'));
}

/**
 * Main wizard entry point.
 * - Already installed + outdated → update in place (data & SSH configs preserved)
 * - Already installed + current  → open / repair / exit
 * - Not installed               → guided fresh install
 */
export async function runWizard() {
  p.intro(pc.bgCyan(pc.black(` ⚡ GitSwitch Wizard v${pkg.version} `)));

  if (process.platform !== 'linux') {
    p.log.warn('GitSwitch officially supports Linux. Continuing anyway, but YMMV on other platforms.');
  }

  // Self-check: offer an update if a newer npm version is published.
  const { checkForUpdate, promptSelfUpdate } = await import('../lib/self.js');
  const { outdated } = await checkForUpdate();
  if (outdated) await promptSelfUpdate();

  const binary = findInstalledBinary();
  const hasData = fs.existsSync(DATA_DIR);

  if (binary) {
    const ver = installedVersion(binary);
    p.note(`${binary}${ver ? pc.dim(` (v${ver})`) : ''}`, 'Existing installation detected');
    if (hasData) p.log.success(pc.dim('Account data found at ~/.gitswitch — it will be preserved.'));

    if (ver && compareVersions(ver, pkg.version) < 0) {
      await updateFlow(binary, ver);
      return;
    }

    const action = await p.select({
      message: ver
        ? 'You are on the latest version. What would you like to do?'
        : 'Could not determine installed version. What would you like to do?',
      options: [
        { value: 'open', label: 'Open GitSwitch now' },
        { value: 'repair', label: 'Reinstall / repair the engine (data untouched)' },
        { value: 'exit', label: 'Exit' },
      ],
    });
    if (p.isCancel(action) || action === 'exit') { p.outro('Bye! 👋'); return; }

    if (action === 'repair') {
      reportSshSafety();
      const s = p.spinner();
      s.start('Reinstalling engine…');
      const destDir = binary.includes(SYSTEM_BIN_DIR) ? SYSTEM_BIN_DIR : USER_BIN_DIR;
      try {
        await installBinary(destDir, { spinner: s });
        s.stop('Engine repaired. All data untouched.');
      } catch (e) {
        s.stop(pc.red(`Repair failed: ${e.message}`));
        process.exit(1);
      }
      p.outro(pc.green('Done!'));
      return;
    }

    p.outro(pc.cyan('Launching GitSwitch…'));
    const { runEngine } = await import('../core/engine.js');
    await runEngine([]);
    return;
  }

  if (hasData) {
    p.log.info(pc.yellow('Found ~/.gitswitch data without an installed binary — it will be reused.'));
  }
  await freshInstallFlow();
}


