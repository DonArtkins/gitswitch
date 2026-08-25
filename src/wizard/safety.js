import * as p from '@clack/prompts';
import pc from 'picocolors';
import { inspectSshConfig } from '../core/ssh-config.js';

/**
 * Show the user exactly what GitSwitch will and will NOT touch in ~/.ssh.
 * This is the "never interfere with existing SSH data" guarantee, surfaced
 * before any install / update action.
 */
export function reportSshSafety() {
  const ssh = inspectSshConfig();
  if (!ssh.exists) {
    p.log.info(
      pc.dim('No ~/.ssh/config found yet — one will be created only when you add your first account.'),
    );
    return;
  }
  if (ssh.foreignHosts === 0 && ssh.managedUsers.length === 0) {
    p.log.info(pc.dim('~/.ssh/config exists but contains no Host entries.'));
    return;
  }
  const lines = [];
  if (ssh.foreignHosts > 0) {
    lines.push(
      `${pc.green(`${ssh.foreignHosts} existing non-GitSwitch host entr${ssh.foreignHosts === 1 ? 'y' : 'ies'}`)} → ${pc.bold('left completely untouched')}`,
    );
  }
  if (ssh.managedUsers.length > 0) {
    lines.push(
      `${pc.cyan('GitSwitch-managed accounts')} (${ssh.managedUsers.join(', ')}) → preserved`,
    );
  }
  p.note(lines.join('\n'), 'SSH safety check');
  p.log.message(
    pc.dim('GitSwitch only ever APPENDS its own "Host github.com-<user>" blocks. Existing keys & hosts stay as-is.'),
  );
}
