import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../server/gameState.js';
import { FIRE_TORNADO_CONFIG, SPELL_RULES } from '../src/shared/combatRules.js';
import { CLASS_SPELLS } from '../src/systems/spells.js';
import { SPELL_VFX_PROFILES } from '../src/graphics/spellVfxProfiles.js';

const io = { to: () => ({ emit: () => {} }) };

function fieldFor(state, playerId = 'p') {
  return {
    owner: playerId,
    floor: state.floor,
    until: Date.now() + 5000,
    next: Date.now() + 5000,
    cast: { id: 'fire_tornado', target: { x: 0, y: 0.03, z: 0 } },
    pullDistanceByEnemy: new Map()
  };
}

function fixture() {
  const state = new GameState('TORNADO', io, { difficulty: 'standard' });
  state.enemies.clear();
  const player = state.addPlayer('p', 'Pyro', 'pyromancer');
  player.x = 0;
  player.y = 0;
  player.z = 10;
  state.masteryFields = [fieldFor(state)];
  return state;
}

test('Fire Tornado cooldown and field profile agree across server and client', () => {
  assert.equal(SPELL_RULES.fire_tornado.cooldown, 22);
  assert.equal(CLASS_SPELLS.pyromancer.ult.cd, 22);
  assert.equal(SPELL_VFX_PROFILES.fire_tornado.cooldown, 22);
  assert.equal(SPELL_RULES.fire_tornado.cooldown, 12 + 10);
  assert.equal(SPELL_VFX_PROFILES.fire_tornado.radius, FIRE_TORNADO_CONFIG.suctionRadius);
});

test('authoritative suction is smooth, capped, and applied to ordinary enemies', () => {
  const state = fixture();
  const enemy = { id: 'shade', type: 'shade', x: 0, y: 0, z: 4, health: 100, maxHealth: 100, isAlive: true };
  state.enemies.set(enemy.id, enemy);

  state.updateFireTornadoSuction(10, Date.now());
  assert.ok(enemy.z < 4, 'enemy should move toward the field center');
  assert.ok(4 - enemy.z <= FIRE_TORNADO_CONFIG.suctionMaxStep + 1e-9, 'one tick must not snap');
});

test('suction stops before an interior wall and bosses have a hard pull cap', () => {
  const state = fixture();
  state.getServerSpellColliders = () => [{ type: 'rect', minX: -2, maxX: 2, minZ: -1, maxZ: 1 }];
  const wallEnemy = { id: 'wall-shade', type: 'shade', x: 0, y: 0, z: -2, health: 100, maxHealth: 100, isAlive: true };
  const boss = { id: 'boss', type: 'boss', x: 4, y: 0, z: 0, health: 100, maxHealth: 100, isAlive: true };
  state.enemies.set(wallEnemy.id, wallEnemy);
  state.enemies.set(boss.id, boss);

  const now = Date.now();
  for (let i = 0; i < 120; i++) state.updateFireTornadoSuction(0.05, now);

  // Rect maxZ=1, inflated by the enemy radius (.65), leaves the center at
  // -1.65 as the closest safe point on the far side.
  assert.ok(wallEnemy.z <= -1.64, `wall pull crossed blocker: ${wallEnemy.z}`);
  assert.ok(4 - boss.x <= FIRE_TORNADO_CONFIG.suctionBossMaxDistance + 1e-9);
  assert.ok(4 - boss.x < 1, 'boss should receive only a restrained pull');
});
