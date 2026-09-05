import test from 'node:test';
import assert from 'node:assert/strict';
import { firstWorldHit, firstWorldHitAlongRay, getWorldFloorConfig, resolveGroundTarget } from '../src/shared/worldCollision.js';

test('world collision finds the first outer wall hit and normal', () => {
  const hit = firstWorldHitAlongRay(
    { x: 0, y: 1.7, z: 0 },
    { x: 0, y: 0, z: 1 },
    40,
    { floor: 4 }
  );
  assert.ok(hit);
  assert.equal(hit.kind, 'wall');
  assert.ok(Math.abs(hit.distance - 21) < 0.01);
  assert.deepEqual(hit.normal, { x: 0, y: 0, z: 1 });
});

test('world collision catches a floor crossing before range expiry', () => {
  const hit = firstWorldHitAlongRay(
    { x: 0, y: 3, z: 0 },
    { x: 0, y: -1, z: 0 },
    10,
    { floor: 4 }
  );
  assert.ok(hit);
  assert.equal(hit.kind, 'floor');
  assert.ok(Math.abs(hit.point.y) < 0.001);
  assert.deepEqual(hit.normal, { x: 0, y: 1, z: 0 });
});

test('interior cylinder is hit before the outer wall', () => {
  const hit = firstWorldHit(
    { x: -5, y: 1.7, z: 0 },
    { x: 12, y: 0, z: 0 },
    { floor: 4, colliders: [{ type: 'cylinder', x: 0, z: 0, radius: 1 }] }
  );
  assert.ok(hit);
  assert.equal(hit.kind, 'object');
  assert.ok(hit.distance < 7);
});

test('ground targeting clamps to the first horizontal obstruction', () => {
  const target = resolveGroundTarget(
    { x: 0, y: 1.7, z: 10 },
    { x: 0, y: 0, z: -1 },
    10,
    { floor: 1, colliders: [{ type: 'cylinder', x: 0, z: 5, radius: 1 }] }
  );
  assert.equal(target.blocked, true);
  assert.ok(target.point.z > 5.9 && target.point.z < 7.1);
  assert.equal(target.point.y, getWorldFloorConfig(1).floorY + 0.03);
});
