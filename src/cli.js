import { defineCommand, runMain } from 'citty';
import pc from 'picocolors';
import { createRequire } from 'node:module';
import { runWizard } from './wizard/install-flow.js';
import { runDoctor, runUninstallWizard, runSelfUpgrade, runRepair, runFullUpdate } from './commands/manage.js';
import { runEngine } from './core/engine.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

/**
 * Terminal safety net for Ctrl+C / Ctrl+Z / SIGTERM.
 *
 * When GitSwitch runs an interactive child (e.g. a `sudo` password prompt) the
 * terminal is in canonical mode, so these keys arrive as *real signals*. This
 * handler restores the cursor and exits immediately instead of leaving the
 * user stuck on a frozen spinner. Inside @clack/prompts raw-mode prompts these
 * signals are never generated (clack cancels via keypress), so this never
 * interferes with the normal cancel flow.
 */
function terminateAndRestore(signal, code) {
  // Show the cursor & move to a fresh line before dying (spinner may have hidden it).
  try {
    if (process.stdout.isTTY) process.stdout.write('\x1b[?25h\n\r');
  } catch { /* best effort */ }
  process.exit(code);
}
if (process.platform !== 'win32') process.on('SIGTSTP', () => terminateAndRestore('SIGTSTP', 130)); // Ctrl+Z
process.on('SIGINT', () => terminateAndRestore('SIGINT', 130));  // Ctrl+C
process.on('SIGTERM', () => terminateAndRestore('SIGTERM', 143));

/** Commands forwarded straight to the GitSwitch bash engine. */
const ENGINE_COMMANDS = ['whoami', 'active', 'list', 'accounts'];

/**
 * Forward argv to the bash engine and mirror its exit status onto this
 * process, so scripts calling `gitswitch use <bad-name>` see real failures
 * instead of silent success.
 */
async function forwardEngine(argv) {
  const res = await runEngine(argv);
  if (res && Number.isInteger(res.exitCode) && res.exitCode !== 0) {
    process.exitCode = res.exitCode;
  }
  return res;
}

function printUsage() {
  console.log(`
${pc.bold('gitswitch')} ${pc.dim(`v${pkg.version}`)} — multi-GitHub account manager

${pc.bold('Usage:')}
  gitswitch                    Run the install / repair wizard
  gitswitch use <account>      ⭐ Set the active account (quick switch)
  gitswitch switch <account>   Alias for \`use\`
  gitswitch whoami             Show the currently active account
  gitswitch status             Same as \`whoami\`
  gitswitch list               List stored accounts
  gitswitch install            Run the install / repair wizard
  gitswitch update             Update fully from npm (CLI first, then engine)
  gitswitch doctor             Diagnose installation & environment
  gitswitch upgrade            Check for & install the latest npm version
  gitswitch repair             Re-install the engine binary (fixes broken install)
  gitswitch uninstall          Remove everything (accounts, SSH entries, binary, npm package)
  gitswitch version            Print the version
  gitswitch help               Show this help
`);
}

const main = defineCommand({
  meta: {
    name: 'gitswitch',
    version: pkg.version,
    description: 'GitSwitch Wizard — multi-GitHub account manager installer & updater',
  },
  async run({ args }) {
    const [cmd, ...rest] = args._;

    // citty parses `-V` as a boolean flag into args.V (never reached via args._);
    // treat it as a version request like the other aliases.
    if (args.V) {
      console.log(`gitswitch v${pkg.version}`);
      return undefined;
    }

    // No arguments → the wizard (install / update / repair)
    if (!cmd) return runWizard();

    switch (cmd) {
      case 'wizard':
      case 'install':
        return runWizard();
      case 'update':
        // Full update: pull the latest CLI from npm, then update the engine.
        return runFullUpdate();
      case 'doctor':
        return runDoctor();
      case 'upgrade':
      case 'self-update':
      case 'selfupdate':
        return runSelfUpgrade();
      case 'repair':
        return runRepair();
      case 'uninstall':
        return runUninstallWizard();
      case 'version':
      case '-v':
      case '-V':
      case '--version':
        console.log(`gitswitch v${pkg.version}`);
        return undefined;
      case 'help':
      case '-h':
      case '--help':
        printUsage();
        return undefined;
      case 'use':
      case 'switch':
        return forwardEngine(['use', ...rest]);
      case 'whoami':
      case 'active':
      case 'status':
        // Engine supports `whoami|active`; `status` is an npm-side alias.
        return forwardEngine(['whoami', ...rest]);
      case 'list':
      case 'accounts':
        return forwardEngine([cmd, ...rest]);
      default:
        if (ENGINE_COMMANDS.includes(cmd)) return forwardEngine(args._);
        console.error(pc.red(`Unknown command: ${cmd}`));
        printUsage();
        process.exitCode = 1;
        return undefined;
    }
  },
});

runMain(main);

