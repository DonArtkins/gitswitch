import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installBinary } from '../src/installer/installer.js';
import { VENDOR_SCRIPT, BINARY_NAME } from '../src/core/engine.js';

test('installBinary copies into a writable dir (no sudo)', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const res = await installBinary(root);
  assert.equal(res.usedSudo, false);
  assert.equal(res.dest, path.join(root, BINARY_NAME));
  assert.ok(fs.existsSync(res.dest));
  const mode = fs.statSync(res.dest).mode & 0o777;
  assert.equal(mode, 0o755);
});

test('installBinary escalates to sudo when the dir is unwritable, stops spinner first', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const unwritable = path.join(root, 'bin');
  fs.mkdirSync(unwritable);
  fs.chmodSync(unwritable, 0o555); // no write bit → copy must fail with EACCES

  const dest = path.join(unwritable, BINARY_NAME);
  const calls = [];
  let stopped = false;
  const sudoSeam = async (cmd, args) => {
    calls.push([cmd, args]);
    if (args[0] === 'install') {
      // Simulate sudo's root privileges: restore write permission, then copy.
      fs.chmodSync(unwritable, 0o755);
      fs.copyFileSync(VENDOR_SCRIPT, dest);
      fs.chmodSync(dest, 0o755);
    }
  };

  const res = await installBinary(unwritable, {
    spinner: { stop: () => { stopped = true; } },
    sudo: sudoSeam,
  });

  assert.equal(res.usedSudo, true);
  assert.ok(stopped, 'spinner must be stopped before the sudo prompt (restores the terminal)');
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'sudo');
  assert.equal(calls[0][1][0], 'mkdir');
  assert.equal(calls[1][1][0], 'install');
  assert.ok(fs.existsSync(dest));
});

test('installBinary surfaces a friendly error when sudo is declined or fails', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const M = path.join(root, 'bin');
  fs.mkdirSync(M);
  fs.chmodSync(M, 0o555);

  const failingSudo = async () => { throw new Error('sudo: a password is required'); };

  await assert.rejects(
    installBinary(M, { spinner: { stop() {} }, sudo: failingSudo }),
    /sudo was declined or failed/,
  );
});