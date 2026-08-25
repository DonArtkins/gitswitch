import fs from 'node:fs';
import { SSH_CONFIG } from '../core/engine.js';

/**
 * Parse an SSH config file and separate GitSwitch-managed entries
 * from everything else. GitSwitch ONLY ever owns blocks that look like:
 *
 *   # <user> GitHub account
 *   Host github.com-<user>
 *       ...
 *
 * Everything else is foreign and is never read, modified or removed.
 * @param {string} content raw ssh config content
 * @returns {{ managedUsers: string[], managedAliases: string[], foreignHosts: number, totalLines: number }}
 */
export function parseSshConfig(content = '') {
  const lines = content.split('\n');
  const managedUsers = [];
  const managedAliases = [];
  let foreignHosts = 0;
  let currentIsManaged = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^Host\s+/i.test(trimmed)) {
      const aliases = trimmed.replace(/^Host\s+/i, '').split(/\s+/);
      currentIsManaged = false;
      for (const alias of aliases) {
        const m = alias.match(/^github\.com-(.+)$/);
        if (m) {
          managedAliases.push(alias);
          if (!managedUsers.includes(m[1])) managedUsers.push(m[1]);
          currentIsManaged = true;
        }
      }
      if (!currentIsManaged) foreignHosts++;
    }
  }

  return { managedUsers, managedAliases, foreignHosts, totalLines: lines.length };
}

/**
 * Remove GitSwitch-managed Host blocks for the given users from a config string.
 * Foreign entries are preserved byte-for-byte. The comment marker line
 * (`# <user> GitHub account`) is also removed.
 * @param {string} content raw ssh config content
 * @param {string[]} users GitSwitch usernames to remove
 * @returns {string} new config content
 */
export function stripManagedBlocks(content = '', users = []) {
  if (users.length === 0) return content;
  const userSet = new Set(users);
  const out = [];
  let skipping = false;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Drop the "# <user> GitHub account" comment markers
    const comment = trimmed.match(/^#\s*(.+?)\s+GitHub account$/);
    if (comment && userSet.has(comment[1])) continue;

    if (/^Host\s+/i.test(trimmed)) {
      const aliases = trimmed.replace(/^Host\s+/i, '').split(/\s+/);
      skipping = aliases.some((a) => {
        const m = a.match(/^github\.com-(.+)$/);
        return m && userSet.has(m[1]);
      });
      if (!skipping) out.push(line);
      continue;
    }

    if (skipping && trimmed === '') continue; // drop blank lines inside managed blocks
    if (!skipping) out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Inspect ~/.ssh/config without modifying anything.
 */
export function inspectSshConfig() {
  if (!fs.existsSync(SSH_CONFIG)) {
    return { exists: false, ...parseSshConfig('') };
  }
  const content = fs.readFileSync(SSH_CONFIG, 'utf8');
  return { exists: true, ...parseSshConfig(content) };
}
