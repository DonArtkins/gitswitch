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
 * Pull the actionable lines out of noisy apt output (E:/W:/Err: prefixes).
 */
function summarizeAptProblems(stdout = '', stderr = '') {
  return `${stdout}\n${stderr}`
    .split('\n')
    .filter((l) => /^(E|W|Err):/.test(l.trim()))
    .slice(0, 5)
    .join('\n');
}

/**
 * Explain WHY apt-get update failed, including the offending third-party
 * repository when apt told us. Seen in the wild: Parrot Security's release
 * codename is literally "echo", so Docker's official one-liner ends up
 * writing "linux/debian echo stable" — a suite Docker never publishes.
 */
function printAptDiagnosis(stderr = '') {
  console.log('');
  console.log(
    pc.yellow('⚠️   `sudo apt-get update` failed — a third-party apt repository on this machine looks misconfigured.'),
  );
  const badRepoLine = stderr.split('\n').find((l) => l.includes('does not have a Release file'));
  const match = badRepoLine?.match(/repository '([^']+)'/);
  if (match) {
    console.log(pc.yellow(`    Offending entry: ${pc.bold(match[1])}`));
    console.log(
      pc.dim(
        '    Frequent cause on Parrot OS: its codename ("echo") gets copied verbatim into an apt source.',
      ),
    );
    console.log(
      pc.dim(
        '    Point the entry at the Debian release it tracks instead (Parrot 6.x → bookworm, 7.x → trixie):',
      ),
    );
    console.log(pc.dim('        sudo sed -i -E \'s#(linux/debian)\\s+\\S+#\\1 trixie#\' /etc/apt/sources.list.d/*.list'));
    console.log(pc.dim('        sudo apt-get update'));
  }
  console.log(pc.dim('    Continuing with cached package indexes — broken repositories do NOT abort this installer.'));
  console.log('');
}

/**
 * Refresh apt indexes. A single broken THIRD-PARTY repository is a common
 * user-machine condition and must never blow up the installer, so failures
 * here are reported and tolerated by default.
 * @param {{ignoreErrors?: boolean}} opts set ignoreErrors=false to rethrow
 * @returns {Promise<boolean>} true when the refresh succeeded
 */
export async function aptUpdate({ ignoreErrors = true } = {}) {
  const res = await execa('sudo', ['apt-get', 'update', '-qq'], { reject: false });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  const ok = res.exitCode === 0;
  if (!ok) {
    if (!ignoreErrors) throw new Error(res.shortMessage || 'sudo apt-get update failed');
    printAptDiagnosis(res.stderr || '');
  }
  return ok;
}

/** How the user can install things themselves if automation is impossible. */
export function manualInstallHint(pkgs) {
  return pc.bold(`sudo apt install ${pkgs.join(' ')}`);
}

/**
 * Install missing packages via apt (Debian family only).
 * The index refresh is fault-tolerant; only a genuine INSTALL failure throws,
 * and even then the error carries a copy/paste-able manual command.
 * @param {string[]} pkgs
 */
export async function aptInstall(pkgs) {
  await aptUpdate();
  const res = await execa('sudo', ['apt-get', 'install', '-y', ...pkgs], { reject: false });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.exitCode !== 0) {
    const problems = summarizeAptProblems(res.stdout || '', res.stderr || '');
    const detail = problems ? `\n${problems}` : '';
    throw new Error(
      `Could not auto-install ${pkgs.join(', ')} via apt.${detail}\nInstall manually: ${manualInstallHint(pkgs)}`,
    );
  }
}

export function formatMissing({ missingCore, missingOptional }) {
  const parts = [];
  if (missingCore.length) parts.push(pc.red(`required: ${missingCore.join(', ')}`));
  if (missingOptional.length) parts.push(pc.yellow(`optional: ${missingOptional.join(', ')}`));
  return parts.join(' · ');
}
