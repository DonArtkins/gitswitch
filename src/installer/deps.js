import { execa } from 'execa';
import pc from 'picocolors';

export const CORE_DEPS = ['git', 'ssh', 'ssh-keygen', 'curl'];
export const OPTIONAL_DEPS = ['jq', 'fzf'];

async function which(bin) {
  try {
    const { stdout } = await execa('bash', ['-c', `command -v ${bin}`], { reject: false });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Check which required/optional dependencies exist on this system.
 */
export async function checkDependencies() {
  const found = {};
  for (const dep of [...CORE_DEPS, ...OPTIONAL_DEPS]) {
    found[dep] = await which(dep);
  }
  const missingCore = CORE_DEPS.filter((d) => !found[d]);
  const missingOptional = OPTIONAL_DEPS.filter((d) => !found[d]);
  return { found, missingCore, missingOptional };
}

/**
 * Install missing packages via apt (Debian family only).
 * @param {string[]} pkgs
 */
export async function aptInstall(pkgs) {
  await execa('sudo', ['apt-get', 'update', '-qq'], { stdio: 'inherit' });
  await execa('sudo', ['apt-get', 'install', '-y', ...pkgs], { stdio: 'inherit' });
}

export function formatMissing({ missingCore, missingOptional }) {
  const parts = [];
  if (missingCore.length) parts.push(pc.red(`required: ${missingCore.join(', ')}`));
  if (missingOptional.length) parts.push(pc.yellow(`optional: ${missingOptional.join(', ')}`));
  return parts.join(' · ');
}
