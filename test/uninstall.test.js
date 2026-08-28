import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { removeBinary } from '../src/commands/manage.js';

test('removeBinary deletes a writable engine binary', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-rmbin-'));
  const bin = path.join(dir, 'gitswitch');
  fs.writeFileSync(bin, '#!/usr/bin/env bash\necho gitswitch\n');
  fs.chmodSync(bin, 0o755);

  assert.equal(await removeBinary(bin), true, 'returns true when removed');
  assert.equal(fs.existsSync(bin), false, 'binary gone');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('removeBinary tolerates an already-missing path', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-rmbin2-'));
  assert.equal(await removeBinary(path.join(dir, 'missing')), true, 'missing is treated as removed');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('removeBinary falls back to sudo when direct removal fails', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-rmbin3-'));
  const bin = path.join(dir, 'gitswitch');
  // A path that cannot be removed directly (parent is a non-empty dir treated
  // as a file target — here we simulate permission failure by pointing at a dir).
  fs.writeFileSync(bin, 'data\n');

  const sudoCalls = [];
  // Force the direct rmSync to fail by mocking: point the binary at a directory.
  fs.rmSync(bin, { force: true });
  fs.mkdirSync(bin);

  const sudo = async (cmd, args) => {
    sudoCalls.push([cmd, args]);
    // Simulate sudo actually removing the file.
    fs.rmdirSync(bin);
  };

  assert.equal(await removeBinary(bin, { sudo }), true, 'sudo removal succeeded');
  assert.equal(fs.existsSync(bin), false, 'binary gone via sudo');
  assert.deepEqual(sudoCalls, [['sudo', ['rm', '-f', bin]]], 'sudo invoked with rm -f');
  fs.rmSync(dir, { recursive: true, force: true });
});