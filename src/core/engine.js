import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path to the bundled bash engine shipped inside the npm package.
 * NOTE: fileURLToPath is mandatory here — a raw URL pathname silently
 * corrupts any install path containing spaces or non-ASCII characters.
 */
export const VENDOR_SCRIPT = fileURLToPath(new URL('../../vendor/gitswitch.sh', import.meta.url));

/** Common install targets for the gitswitch binary. */
export const SYSTEM_BIN_DIR = '/usr/local/bin';
export const USER_BIN_DIR = path.join(os.homedir(), '.local', 'bin');
export const BINARY_NAME = 'gitswitch';

/** GitSwitch data locations (never deleted without explicit user consent). */
export const DATA_DIR = path.join(os.homedir(), '.gitswitch');
export const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
export const ACTIVE_FILE = path.join(DATA_DIR, 'active');
export const SSH_CONFIG = path.join(os.homedir(), '.ssh', 'config');

/**
 * Locate an already-installed gitswitch binary.
 * Checks well-known paths first, then falls back to `command -v`.
 * @returns {string|null} absolute path to the binary, or null
 */
export function findInstalledBinary() {
  for (const dir of [SYSTEM_BIN_DIR, USER_BIN_DIR]) {
    const candidate = path.join(dir, BINARY_NAME);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Run the GitSwitch engine (installed binary or bundled script) with inherited stdio.
 * @param {string[]} args CLI args forwarded to the engine
 */
export async function runEngine(args = []) {
  const { execa } = await import('execa');
  const engine = findInstalledBinary();
  if (engine) {
    return execa(engine, args, { stdio: 'inherit', reject: false });
  }
  // Not permanently installed yet → run the bundled copy straight through bash,
  // so `npx gitswitch-wizard` gives full functionality even without installation.
  return execa('bash', [VENDOR_SCRIPT, ...args], { stdio: 'inherit', reject: false });
}
