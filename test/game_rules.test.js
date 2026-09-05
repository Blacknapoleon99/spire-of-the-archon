import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTES, FLOOR_DEFINITIONS, getDifficulty, getFloorDefinition } from '../src/shared/gameData.js';
import { CooldownManager } from '../src/systems/spells.js';
import { GameState } from '../server/gameState.js';
import { RoomManager } from '../server/roomManager.js';

const mockIo = { to: () => ({ emit: () => {} }) };

test('shared floor catalog covers the staged 15-floor ascent', () => {
  assert.equal(FLOOR_DEFINITIONS.length, 15);
  assert.equal(getFloorDefinition(10).boss, 'astraea');
  assert.equal(getFloorDefinition(15).boss, 'valerius');
});

test('difficulty scales for solo and full covenant play', () => {
  const solo = getDifficulty('standard', 1);
  const party = getDifficulty('standard', 4);
  assert.equal(solo.enemyHealth, 1);
  assert.ok(party.enemyHealth > solo.enemyHealth);
  assert.ok(getDifficulty('story', 1).enemyDamage < solo.enemyDamage);
});

test('cooldowns respect haste and never become negative', () => {
  const cooldowns = new CooldownManager();
  cooldowns.trigger('skill1', 4, 0.25);
  cooldowns.update(10);
  assert.equal(cooldowns.isReady('skill1'), true);
  assert.deepEqual(ATTRIBUTES, ['vitality', 'arcana', 'focus', 'haste', 'mastery']);
});

test('floor nine has the Xyris hero encounter before Astraea', () => {
  const state = new GameState('TEST', mockIo, { difficulty: 'standard' });
  state.initFloor(9);
  assert.equal(state.enemies.get('boss_xyris')?.bossType, 'xyris');
  assert.equal(state.enemies.get('boss_xyris')?.invulnerable, false);
});

test('server validates spell ownership, cooldowns and damage tokens', () => {
  const events = [];
  const io = { to: () => ({ emit: (event, payload) => events.push({ event, payload }) }) };
  const state = new GameState('COMBAT', io, { difficulty: 'standard' });
  const player = state.addPlayer('p1', 'Tester', 'pyromancer');
  const enemy = state.enemies.values().next().value;
  player.x = enemy.x; player.z = enemy.z;
  state.handleSpellCast('p1', {
    spellId: 'fireball', spellType: 'skill1',
    origin: { x: player.x, y: 1.7, z: player.z },
    direction: { x: 0, y: 0, z: -1 }
  });
  assert.equal(player.mana, 115);
  state.handleSpellCast('p1', { spellId: 'fireball', spellType: 'skill1' });
  assert.ok(events.some(event => event.event === 'action_rejected' && event.payload.reason === 'cooldown'));
  const before = enemy.health;
  state.handleDamageToEnemy(enemy.id, 999, 'arcane', 'p1');
  assert.ok(enemy.health < before);
  assert.ok(enemy.health >= before - 75);
});

test('server rejects projectile damage through an interior world blocker', () => {
  const state = new GameState('LOS', { to: () => ({ emit: () => {} }) }, { difficulty: 'standard' });
  state.initFloor(4);
  const player = state.addPlayer('p1', 'Tester', 'pyromancer');
  player.x = 0;
  player.y = 0;
  player.z = 10;
  const enemy = {
    id: 'los_enemy', type: 'sentinel', name: 'LOS Target', x: 0, y: 0, z: -15,
    health: 200, maxHealth: 200, isAlive: true, invulnerable: false
  };
  state.enemies.set(enemy.id, enemy);
  state.handleSpellCast('p1', {
    spellId: 'fireball',
    spellType: 'skill1',
    origin: { x: 0, y: 1.7, z: 10 },
    direction: { x: 0, y: 0, z: -1 }
  });
  const before = enemy.health;
  state.handleDamageToEnemy(enemy.id, 75, 'fire', 'p1');
  assert.equal(enemy.health, before);
  assert.equal(state.players.get('p1').lastSpell.worldImpact.kind, 'object');
});

test('server mirrors the floor nine central platform for projectile LOS', () => {
  const state = new GameState('LOS9', { to: () => ({ emit: () => {} }) }, { difficulty: 'standard' });
  state.initFloor(9);
  const hit = state.resolveEnemyProjectileImpact(
    { x: 0, y: 1.8, z: 15 },
    { x: 0, y: 1.2, z: -15 },
    0.22
  );
  assert.equal(hit.worldImpact?.kind, 'object');
  assert.ok(hit.worldImpact.distance < hit.distance);
});

test('boss ground hazards damage only players inside the authoritative volume', () => {
  const state = new GameState('HAZARD', { to: () => ({ emit: () => {} }) }, { difficulty: 'standard' });
  state.initFloor(5);
  state.enemies.clear();
  const player = state.addPlayer('p1', 'Tester', 'pyromancer');
  player.x = 0;
  player.z = 0;
  const hazard = state.registerBossHazard('magma_caldera', 0, 0, 5.5, 2.2, 35);
  const before = player.health;
  state.tick(0.05);
  assert.equal(player.health, before - 35);
  player.x = 20;
  const outside = player.health;
  state.tick(0.55);
  assert.equal(player.health, outside);
  assert.ok(state.activeHazards.includes(hazard));
});

test('movement bounds, floor objectives and profile sync are authoritative', () => {
  const events = [];
  const io = { to: () => ({ emit: (event, payload) => events.push({ event, payload }) }) };
  const state = new GameState('RULES', io, { difficulty: 'standard' });
  const player = state.addPlayer('p1', 'Tester', 'chronomancer');
  state.handlePlayerInput('p1', { seq: 1, x: 80, y: 0, z: 80, rotY: 0 });
  assert.equal(player.x, -2);
  assert.ok(events.some(event => event.event === 'input_rejected'));
  state.applyPlayerProfile('p1', { level: 4, xp: 800, attributes: { vitality: 30, focus: 25, haste: 20, arcana: 22, mastery: 18 } });
  assert.equal(player.level, 4);
  assert.equal(player.maxHealth, 390);
  state.puzzles.floor1.unlocked = true;
  for (const enemy of state.enemies.values()) { enemy.isAlive = false; enemy.health = 0; }
  state.refreshObjective(true);
  assert.equal(state.objective.complete, true);
  assert.equal(state.advanceFloor('p1'), true);
  assert.equal(state.floor, 2);
});

test('room reconnect restores the authoritative player slot during grace', () => {
  const emitted = [];
  const io = {
    to: roomId => ({ emit: (event, payload) => emitted.push({ roomId, event, payload }) })
  };
  const makeSocket = id => ({
    id,
    events: [],
    joined: [],
    join(roomId) { this.joined.push(roomId); },
    to(roomId) { return { emit: (event, payload) => this.events.push({ roomId, event, payload }) }; },
    emit(event, payload) { this.events.push({ event, payload }); }
  });
  const manager = new RoomManager(io);
  const host = makeSocket('host');
  const guest = makeSocket('guest');
  manager.createRoom(host, { roomCode: 'RESUME', playerName: 'Host', wizardClass: 'pyromancer', peerId: 'peer-host' });
  const room = manager.joinRoom(guest, { roomCode: 'RESUME', playerName: 'Guest', wizardClass: 'luminary', peerId: 'peer-guest' });
  manager.startGame(host);
  const guestToken = guest.events.find(event => event.event === 'room_joined').payload.resumeToken;
  manager.handleDisconnect(guest);
  assert.equal(room.gameState.players.get('guest').connected, false);

  const replacement = makeSocket('guest-reconnected');
  manager.resumeRoom(replacement, guestToken, 'peer-guest-new');
  assert.equal(room.gameState.players.has('guest'), false);
  assert.equal(room.gameState.players.get('guest-reconnected').connected, true);
  assert.equal(room.gameState.players.get('guest-reconnected').peerId, 'peer-guest-new');
  assert.ok(replacement.events.some(event => event.event === 'room_resumed'));
  clearInterval(room.ticker);
});

test('boss puzzle actions require the matching spell and proximity', () => {
  const events = [];
  const io = { to: () => ({ emit: (event, payload) => events.push({ event, payload }) }) };
  const state = new GameState('PUZZLE', io, { difficulty: 'standard' });
  state.initFloor(10);
  state.isGameStarted = true;
  const player = state.addPlayer('p1', 'Tester', 'pyromancer');
  player.x = 0;
  player.y = 0;
  player.z = 32;

  assert.equal(state.chargeLeylinePedestal('pyretic', 'p1'), false);
  assert.equal(state.puzzles.floor10.pedestals.pyretic.isCharged, false);
  assert.ok(events.some(event => event.event === 'action_rejected' && event.payload.reason === 'matching_spell_required'));

  state.handleSpellCast('p1', {
    spellId: 'ember_bolt',
    origin: { x: 0, y: 1.7, z: 32 },
    direction: { x: 0, y: 0, z: -1 }
  });
  assert.equal(state.chargeLeylinePedestal('pyretic', 'p1'), true);
  assert.equal(state.puzzles.floor10.pedestals.pyretic.isCharged, true);

  assert.equal(state.alignLeylinePedestal('pyretic', 'p1'), false);
  assert.ok(events.some(event => event.event === 'action_rejected' && event.payload.reason === 'out_of_range'));

  player.z = 22;
  assert.equal(state.alignLeylinePedestal('pyretic', 'p1'), true);
  assert.equal(state.puzzles.floor10.pedestals.pyretic.isAligned, true);
  assert.equal(state.puzzles.floor10.alignedCount, 1);
});

test('talent upgrades reject unknown keys and unmet prerequisites', () => {
  const events = [];
  const io = { to: () => ({ emit: (event, payload) => events.push({ event, payload }) }) };
  const state = new GameState('TALENT', io, { difficulty: 'standard' });
  state.isGameStarted = true;
  const player = state.addPlayer('p1', 'Tester', 'pyromancer');
  assert.equal(state.upgradeTalent('p1', 'does_not_exist'), false);
  assert.equal(player.talentPoints, 1);
  assert.ok(events.some(event => event.event === 'action_rejected' && event.payload.reason === 'invalid_talent'));
  assert.equal(state.upgradeTalent('p1', 'pyro_combustion'), false);
  assert.equal(player.talentPoints, 1);
  assert.ok(events.some(event => event.event === 'action_rejected' && event.payload.reason === 'prerequisite_required'));
  assert.equal(state.upgradeTalent('p1', 'pyro_ignite'), true);
  assert.equal(player.talentPoints, 0);
});

test('live snapshots omit defeated actors and idle ticks do not spam objectives', () => {
  const events = [];
  const io = { to: () => ({ emit: (event, payload) => events.push({ event, payload }) }) };
  const state = new GameState('REPLICATION', io, { difficulty: 'standard' });
  state.isGameStarted = true;
  const enemy = state.enemies.values().next().value;
  enemy.isAlive = false;
  enemy.health = 0;
  state.refreshObjective(true);
  const beforeTick = events.filter(event => event.event === 'objective_update').length;
  const snapshot = state.getSnapshot();
  assert.equal(snapshot.enemies.some(actor => actor.id === enemy.id), false);
  state.tick(0.05);
  const afterTick = events.filter(event => event.event === 'objective_update').length;
  assert.equal(afterTick, beforeTick);
});
