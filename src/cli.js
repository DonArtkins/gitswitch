import { defineCommand, runMain } from 'citty';
import pc from 'picocolors';
import { createRequire } from 'node:module';
import { runWizard } from './wizard/install-flow.js';
import { runDoctor, runUninstallWizard } from './commands/manage.js';
import { runEngine } from './core/engine.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

/** Commands forwarded straight to the GitSwitch bash engine. */
const ENGINE_COMMANDS = ['whoami', 'active', 'list', 'accounts', 'version', '--version', '-v', 'help', '-h'];

function printUsage() {
  console.log(`
${pc.bold('gitswitch')} ${pc.dim(`v${pkg.version}`)} — multi-GitHub account manager

${pc.bold('Usage:')}
  gitswitch                    Run the install / update wizard
  gitswitch use <account>      ⭐ Set the active account (quick switch)
  gitswitch whoami             Show the currently active account
  gitswitch list               List stored accounts
  gitswitch doctor             Diagnose installation & environment
  gitswitch uninstall          Uninstall (asks before deleting anything)
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

    // No arguments → the wizard (install / update / repair)
    if (!cmd) return runWizard();

    switch (cmd) {
      case 'wizard':
      case 'install':
      case 'update':
        return runWizard();
      case 'doctor':
        return runDoctor();
      case 'uninstall':
        return runUninstallWizard();
      case 'use':
      case 'switch':
        return runEngine(['use', ...rest]);
      default:
        if (ENGINE_COMMANDS.includes(cmd)) return runEngine(args._);
        console.error(pc.red(`Unknown command: ${cmd}`));
        printUsage();
        process.exitCode = 1;
        return undefined;
    }
  },
});

runMain(main);

