import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execa } from 'execa';
import { VENDOR_SCRIPT, BINARY_NAME, DATA_DIR } from '../core/engine.js';

/**
 * Copy the bundled engine to the target bin dir.
 * Tries a direct copy first; falls back to sudo when permission is denied.
 * @param {string} targetDir e.g. /usr/local/bin or ~/.local/bin
 * @returns {Promise<{dest: string, usedSudo: boolean}>}
 */
export async function installBinary(targetDir) {
  const dest = path.join(targetDir, BINARY_NAME);

  try {
    fs.mkdirSync(targetDir, { recursive: true });  // may itself need privileges
    fs.copyFileSync(VENDOR_SCRIPT, dest);
    fs.chmodSync(dest, 0o755);
    return { dest, usedSudo: false };
  } catch (err) {
    if (!['EACCES', 'EPERM'].includes(err.code)) throw err;
  }

  // Permission denied → escalate with sudo (user already confirmed in the wizard)
  await execa('sudo', ['mkdir', '-p', targetDir], { stdio: 'inherit' });
  await execa('sudo', ['install', '-m', '755', VENDOR_SCRIPT, dest], { stdio: 'inherit' });
  return { dest, usedSudo: true };
}

/**
 * Ensure a directory is on PATH by adding an rc marker block to shell rc files.
 * Only appends if the marker is not already present — never rewrites rc files.
 * @param {string} dir directory to add to PATH
 */
export async function ensureOnPath(dir) {
  const rcs = ['.bashrc', '.zshrc'].map((f) => path.join(os.homedir(), f));
  const marker = '# gitswitch-wizard PATH';
  let touched = false;

  for (const rc of rcs) {
    try {
      const content = fs.existsSync(rc) ? fs.readFileSync(rc, 'utf8') : '';
      if (content.includes(marker)) continue;
      const block = `\n${marker}\nexport PATH="${dir}:$PATH"\n`;
      fs.appendFileSync(rc, block);
      touched = true;
    } catch {
      /* rc file not writable — skip silently */
    }
  }
  return touched;
}

/**
 * Add the SSH-agent auto-start block to ~/.bashrc (opt-in, asked first).
 * Mirrors the classic install.sh behaviour but only with explicit consent.
 */
export async function addSshAgentRc() {
  const bashrc = path.join(os.homedir(), '.bashrc');
  const marker = '# GitSwitch SSH Agent — auto-start (managed by gitswitch-wizard)';
  const content = fs.existsSync(bashrc) ? fs.readFileSync(bashrc, 'utf8') : '';
  if (content.includes('GitSwitch SSH Agent')) return false;

  const block = [
    '',
    marker,
    'if [ -z "$SSH_AUTH_SOCK" ]; then',
    '    eval "$(ssh-agent -s)" > /dev/null 2>&1',
    'fi',
    ''
  ].join('\n');
  fs.appendFileSync(bashrc, block);
  return true;
}

/**
 * Make sure the data directories exist. Never overwrites existing files.
 */
export function prepareDataDirs() {
  fs.mkdirSync(path.join(DATA_DIR, 'backups'), { recursive: true });
  fs.mkdirSync(path.join(os.homedir(), '.ssh'), { recursive: true });
  // Tokens live in plaintext inside accounts.json and keys inside ~/.ssh:
  // enforce strict permissions even if the directories already existed.
  try { fs.chmodSync(DATA_DIR, 0o700); } catch { /* best effort */ }
  try { fs.chmodSync(path.join(os.homedir(), '.ssh'), 0o700); } catch { /* best effort */ }
}
