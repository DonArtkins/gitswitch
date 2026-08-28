import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compareVersions, NPM_NAME, BIN_NAME, cleanRcMarkers } from '../src/lib/self.js';

test('NPM_NAME and BIN_NAME are correct', () => {
  assert.equal(NPM_NAME, 'gitswitch-wizard');
  assert.equal(BIN_NAME, 'gitswitch');
});

test('compareVersions orders versions correctly', () => {
  assert.equal(compareVersions('1.0.0', '1.0.1'), -1, 'older vs newer');
  assert.equal(compareVersions('1.0.1', '1.0.0'), 1, 'newer vs older');
  assert.equal(compareVersions('1.0.1', '1.0.1'), 0, 'equal');
  assert.equal(compareVersions('2.1.1', '2.1.0'), 1, 'patch bump is newer');
});

test('cleanRcMarkers strips PATH marker, export PATH line and SSH-agent block', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-self-home-'));
  const rc = path.join(home, '.bashrc');
  fs.writeFileSync(rc, [
    'export FOO=bar',
    '# gitswitch-wizard PATH',
    'export PATH=/home/user/.local/bin:$PATH',
    '# GitSwitch SSH Agent — auto-start',
    'if [ -f ~/.gitswitch/ssh-agent.sh ]; then',
    '  . ~/.gitswitch/ssh-agent.sh',
    'fi',
    'export BAZ=qux',
  ].join('\n'));

  await cleanRcMarkers(home);

  const cleaned = fs.readFileSync(rc, 'utf8');
  assert.ok(!cleaned.includes('# gitswitch-wizard PATH'), 'PATH marker removed');
  assert.ok(!cleaned.includes('.local/bin'), 'PATH export removed');
  assert.ok(!cleaned.includes('GitSwitch SSH Agent'), 'SSH-agent marker removed');
  assert.ok(!cleaned.includes('ssh-agent.sh'), 'SSH-agent block body removed');
  assert.ok(cleaned.includes('export FOO=bar'), 'unrelated line kept');
  assert.ok(cleaned.includes('export BAZ=qux'), 'unrelated line after blocks kept');
  fs.rmSync(home, { recursive: true, force: true });
});

test('cleanRcMarkers tolerates missing rc files', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-self-home2-'));
  await cleanRcMarkers(home); // no .bashrc/.zshrc → must not throw
  fs.rmSync(home, { recursive: true, force: true });
});