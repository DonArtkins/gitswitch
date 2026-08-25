import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, extractVersion } from '../src/lib/version.js';
import { parseSshConfig, stripManagedBlocks } from '../src/core/ssh-config.js';

test('compareVersions orders semver correctly', () => {
  assert.equal(compareVersions('2.1.0', '2.0.9'), 1);
  assert.equal(compareVersions('2.1.0', '2.1.0'), 0);
  assert.equal(compareVersions('1.9.9', '2.0.0'), -1);
  assert.equal(compareVersions('v2.1.0', '2.1.0'), 0);
  assert.equal(compareVersions('2.1', '2.1.0'), 0);
});

test('extractVersion finds version in engine output', () => {
  assert.equal(extractVersion('GitSwitch v2.1.0 — Multi-GitHub Account Manager'), '2.1.0');
  assert.equal(extractVersion('no version here'), null);
});

const CONFIG = [
  '# Personal server',
  'Host myserver',
  '    HostName example.com',
  '    IdentityFile ~/.ssh/id_custom',
  '',
  '# DonArtkins GitHub account',
  'Host github.com-DonArtkins',
  '    HostName github.com',
  '    User git',
  '    IdentityFile ~/.ssh/id_ed25519_DonArtkins',
  '',
  'Host github.com-LyncxsIndustries',
  '    HostName github.com',
  '    User git',
  '    IdentityFile ~/.ssh/id_ed25519_LyncxsIndustries',
].join('\n');

test('parseSshConfig separates managed entries from foreign ones', () => {
  const info = parseSshConfig(CONFIG);
  assert.deepEqual(info.managedUsers.sort(), ['DonArtkins', 'LyncxsIndustries']);
  assert.equal(info.foreignHosts, 1); // only "myserver"
});

test('stripManagedBlocks removes ONLY gitswitch blocks, byte-preserving foreign hosts', () => {
  const cleaned = stripManagedBlocks(CONFIG, ['DonArtkins']);
  assert.match(cleaned, /Host myserver/);
  assert.match(cleaned, /IdentityFile ~\/\.ssh\/id_custom/);
  assert.doesNotMatch(cleaned, /github\.com-DonArtkins/);
  assert.doesNotMatch(cleaned, /# DonArtkins GitHub account/);
  assert.match(cleaned, /github\.com-LyncxsIndustries/, 'other managed block stays until asked');
});

test('stripManagedBlocks with no users returns content unchanged', () => {
  assert.equal(stripManagedBlocks(CONFIG, []), CONFIG);
});
