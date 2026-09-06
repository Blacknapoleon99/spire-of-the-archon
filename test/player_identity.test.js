import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocalPlayerId } from '../src/shared/playerIdentity.js';

test('duplicate names never hide the host on a guest', () => {
  const players = [{ id: 'host', name: 'Wizard' }, { id: 'guest', name: 'Wizard' }, { id: 'third', name: 'Wizard' }];
  assert.equal(resolveLocalPlayerId(players, 'guest', 'host'), 'guest');
  assert.equal(resolveLocalPlayerId(players, 'third', 'third'), 'third');
  assert.equal(resolveLocalPlayerId(players, 'new-socket', 'missing'), null);
  assert.equal(resolveLocalPlayerId(players, null, 'guest'), 'guest');
});
