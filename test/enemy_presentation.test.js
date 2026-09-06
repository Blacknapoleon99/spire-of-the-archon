import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EnemyEntity } from '../src/entities/enemy.js';

test('unchanged enemy snapshots do not redraw and upload health textures', () => {
  let redraws = 0;
  const enemy = { health: 100, maxHealth: 100, targetPos: new THREE.Vector3(),
    updateHpBar() { redraws++; } };
  const snapshot = { health: 100, maxHealth: 100, x: 1, z: 2, state: 'idle', isAlive: true };
  for (let i = 0; i < 100; i++) EnemyEntity.prototype.sync.call(enemy, snapshot);
  assert.equal(redraws, 0);
  EnemyEntity.prototype.sync.call(enemy, { ...snapshot, health: 90 });
  assert.equal(redraws, 1);
  EnemyEntity.prototype.sync.call(enemy, { ...snapshot, health: 90, maxHealth: 110 });
  assert.equal(redraws, 2);
});
