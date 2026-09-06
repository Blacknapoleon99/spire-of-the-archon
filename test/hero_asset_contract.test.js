import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GameState } from '../server/gameState.js';

const root = path.resolve(process.cwd(), 'public', 'models');

function readGlbJson(file) {
  const buffer = fs.readFileSync(path.join(root, file));
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF');
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
}

test('authored hero exports contain the shared rig/socket/clip contract', () => {
  const requiredClips = ['Idle', 'Walk', 'Cast_Ember', 'Cast_Fireball', 'Cast_FlameWave', 'Cast_Tornado'];
  for (const hero of ['player_pyromancer.glb', 'player_cryomancer.glb', 'player_luminary.glb', 'player_chronomancer.glb']) {
    const gltf = readGlbJson(hero);
    const nodes = new Set((gltf.nodes || []).map(node => node.name).filter(Boolean));
    const clips = new Set((gltf.animations || []).map(animation => animation.name));
    assert.ok(nodes.has('HeroArmature'), `${hero} is missing HeroArmature`);
    assert.ok(nodes.has('HandSocket_R'), `${hero} is missing HandSocket_R`);
    assert.ok(nodes.has('CastSocket'), `${hero} is missing CastSocket`);
    for (const clip of requiredClips) assert.ok(clips.has(clip), `${hero} is missing ${clip}`);
  }
});

test('vault gate is authoritative, proximity checked, and repeat-safe', () => {
  const emitted = [];
  const state = new GameState('GATE_TEST', { to: () => ({ emit: (event, payload) => emitted.push({ event, payload }) }) });
  const player = state.addPlayer('p1', 'Gate Tester', 'pyromancer');
  player.x = 0;
  player.z = 20;
  assert.equal(state.handleVaultGateOpen('p1'), true);
  assert.equal(state.vaultGateOpen, true);
  assert.equal(emitted.filter(event => event.event === 'vault_gate_state').length, 1);
  assert.equal(state.handleVaultGateOpen('p1'), true);
  assert.equal(emitted.filter(event => event.event === 'vault_gate_state').length, 1);
});
