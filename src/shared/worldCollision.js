/**
 * Dependency-free world collision helpers shared by the browser and relay.
 *
 * The renderer may provide the richer floor collider list built by
 * TowerEnvironment.  The server uses the deterministic floor envelope below
 * so a forged client cannot report a hit through the room boundary.  Every
 * function is allocation-light and works with plain {x, y, z} objects.
 */

const EPSILON = 1e-6;

export const WORLD_FLOOR_CONFIG = Object.freeze({
  1: Object.freeze({ floorY: 0, ceilingY: 12, outerRadius: 21, kind: 'vault' }),
  2: Object.freeze({ floorY: 0, ceilingY: 14, outerRadius: 64, kind: 'circular' }),
  3: Object.freeze({ floorY: 0, ceilingY: 14, outerRadius: 43, kind: 'circular' }),
  4: Object.freeze({ floorY: 0, ceilingY: 14, outerRadius: 21, kind: 'circular' }),
  5: Object.freeze({ floorY: 0, ceilingY: 14, outerRadius: 23, kind: 'circular' }),
  6: Object.freeze({ floorY: 0, ceilingY: 14, outerRadius: 23, kind: 'circular' }),
  7: Object.freeze({ floorY: 0, ceilingY: 14, outerRadius: 23, kind: 'circular' }),
  8: Object.freeze({ floorY: 0, ceilingY: 14, outerRadius: 23, kind: 'circular' }),
  9: Object.freeze({ floorY: 0, ceilingY: 15, outerRadius: 27, kind: 'circular' }),
  10: Object.freeze({ floorY: 0, ceilingY: 15, outerRadius: 23, kind: 'circular' }),
  11: Object.freeze({ floorY: 0, ceilingY: 15, outerRadius: 23, kind: 'circular' }),
  12: Object.freeze({ floorY: 0, ceilingY: 15, outerRadius: 23, kind: 'circular' }),
  13: Object.freeze({ floorY: 0, ceilingY: 15, outerRadius: 23, kind: 'circular' }),
  14: Object.freeze({ floorY: 0, ceilingY: 15, outerRadius: 23, kind: 'circular' }),
  15: Object.freeze({ floorY: 0, ceilingY: 16, outerRadius: 29, kind: 'circular' })
});

export function getWorldFloorConfig(floorNumber = 1) {
  return WORLD_FLOOR_CONFIG[Math.max(1, Math.min(15, Math.floor(Number(floorNumber) || 1)))] || WORLD_FLOOR_CONFIG[1];
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function pointAt(start, delta, t) {
  return {
    x: start.x + delta.x * t,
    y: start.y + delta.y * t,
    z: start.z + delta.z * t
  };
}

function addHit(hits, t, point, normal, kind, collider = null) {
  if (!Number.isFinite(t) || t < -EPSILON || t > 1 + EPSILON) return;
  hits.push({ t: clamp01(t), point, normal, kind, collider });
}

function intersectFloorAndCeiling(start, delta, config, hits) {
  const radius = 0;
  if (Math.abs(delta.y) <= EPSILON) return;
  const floorT = (config.floorY + radius - start.y) / delta.y;
  if (delta.y < 0) addHit(hits, floorT, pointAt(start, delta, floorT), { x: 0, y: 1, z: 0 }, 'floor');
  const ceilingT = (config.ceilingY - radius - start.y) / delta.y;
  if (delta.y > 0) addHit(hits, ceilingT, pointAt(start, delta, ceilingT), { x: 0, y: -1, z: 0 }, 'ceiling');
}

function intersectOuterCircle(start, delta, config, hits, radius = 0) {
  const radiusLimit = Math.max(0.1, config.outerRadius - Math.max(0, radius));
  const a = delta.x * delta.x + delta.z * delta.z;
  if (a <= EPSILON) return;
  const b = 2 * (start.x * delta.x + start.z * delta.z);
  const c = start.x * start.x + start.z * start.z - radiusLimit * radiusLimit;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return;
  const root = Math.sqrt(discriminant);
  const roots = [(-b - root) / (2 * a), (-b + root) / (2 * a)].sort((x, y) => x - y);
  const t = roots.find(value => value >= -EPSILON && value <= 1 + EPSILON);
  if (t === undefined) return;
  const point = pointAt(start, delta, t);
  const length = Math.hypot(point.x, point.z) || 1;
  addHit(hits, t, point, { x: point.x / length, y: 0, z: point.z / length }, 'wall', { ...config, type: 'cylinder_outer' });
}

function intersectCylinder(start, delta, collider, hits, radius = 0) {
  const combinedRadius = Math.max(0.01, Number(collider.radius) || 0) + Math.max(0, radius);
  const sx = start.x - (Number(collider.x) || 0);
  const sz = start.z - (Number(collider.z) || 0);
  const a = delta.x * delta.x + delta.z * delta.z;
  if (a <= EPSILON) return;
  const b = 2 * (sx * delta.x + sz * delta.z);
  const c = sx * sx + sz * sz - combinedRadius * combinedRadius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return;
  const root = Math.sqrt(discriminant);
  const roots = [(-b - root) / (2 * a), (-b + root) / (2 * a)].sort((x, y) => x - y);
  const t = roots.find(value => value >= -EPSILON && value <= 1 + EPSILON);
  if (t === undefined) return;
  const point = pointAt(start, delta, t);
  const nx = point.x - (Number(collider.x) || 0);
  const nz = point.z - (Number(collider.z) || 0);
  const length = Math.hypot(nx, nz) || 1;
  addHit(hits, t, point, { x: nx / length, y: 0, z: nz / length }, 'object', collider);
}

function intersectRect(start, delta, collider, hits, radius = 0) {
  const minX = Number(collider.minX) - Math.max(0, radius);
  const maxX = Number(collider.maxX) + Math.max(0, radius);
  const minZ = Number(collider.minZ) - Math.max(0, radius);
  const maxZ = Number(collider.maxZ) + Math.max(0, radius);
  let tMin = 0;
  let tMax = 1;
  let normal = null;

  const slab = (startAxis, deltaAxis, min, max, minNormal, maxNormal) => {
    if (Math.abs(deltaAxis) <= EPSILON) return startAxis >= min && startAxis <= max;
    let t1 = (min - startAxis) / deltaAxis;
    let t2 = (max - startAxis) / deltaAxis;
    let n1 = minNormal;
    let n2 = maxNormal;
    if (t1 > t2) { [t1, t2] = [t2, t1]; [n1, n2] = [n2, n1]; }
    if (t1 > tMin) { tMin = t1; normal = n1; }
    tMax = Math.min(tMax, t2);
    return tMin <= tMax + EPSILON;
  };

  if (!slab(start.x, delta.x, minX, maxX, { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })) return;
  if (!slab(start.z, delta.z, minZ, maxZ, { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 })) return;
  if (normal) addHit(hits, tMin, pointAt(start, delta, tMin), normal, 'object', collider);
}

/**
 * Find the first world obstruction along a segment.  `end` may be either an
 * absolute point or a delta when `delta=true` is supplied.
 */
export function firstWorldHit(start, endOrDelta, options = {}) {
  const startPoint = start || { x: 0, y: 0, z: 0 };
  const delta = options.delta
    ? { x: Number(endOrDelta?.x) || 0, y: Number(endOrDelta?.y) || 0, z: Number(endOrDelta?.z) || 0 }
    : {
        x: (Number(endOrDelta?.x) || 0) - (Number(startPoint.x) || 0),
        y: (Number(endOrDelta?.y) || 0) - (Number(startPoint.y) || 0),
        z: (Number(endOrDelta?.z) || 0) - (Number(startPoint.z) || 0)
      };
  const config = options.config || getWorldFloorConfig(options.floor);
  const hits = [];

  intersectFloorAndCeiling(startPoint, delta, config, hits);
  if (config.kind === 'vault') {
    // The vault is represented as a conservative circular envelope for spell
    // LOS. The richer client collider list still handles its doorway exactly.
    intersectOuterCircle(startPoint, delta, config, hits, options.radius || 0);
  } else {
    intersectOuterCircle(startPoint, delta, config, hits, options.radius || 0);
  }

  for (const collider of options.colliders || []) {
    if (!collider || collider.type === 'cylinder_outer') continue;
    if (collider.type === 'cylinder') intersectCylinder(startPoint, delta, collider, hits, options.radius || 0);
    else if (collider.type === 'rect') intersectRect(startPoint, delta, collider, hits, options.radius || 0);
  }

  if (!hits.length) return null;
  hits.sort((a, b) => a.t - b.t);
  const hit = hits[0];
  const distance = Math.hypot(delta.x, delta.y, delta.z) * hit.t;
  return { ...hit, distance };
}

export function firstWorldHitAlongRay(origin, direction, maxDistance, options = {}) {
  const distance = Math.max(0, Number(maxDistance) || 0);
  const dirLength = Math.hypot(Number(direction?.x) || 0, Number(direction?.y) || 0, Number(direction?.z) || 0) || 1;
  const delta = {
    x: (Number(direction?.x) || 0) / dirLength * distance,
    y: (Number(direction?.y) || 0) / dirLength * distance,
    z: (Number(direction?.z) || 0) / dirLength * distance
  };
  const hit = firstWorldHit(origin, delta, { ...options, delta: true });
  if (!hit) return null;
  return { ...hit, distance: Math.min(distance, hit.distance) };
}

/**
 * Resolve a ground-targeted ability without allowing its center to pass
 * through a wall.  The target is placed on the floor at the requested range,
 * or at the first horizontal obstruction when the room ends sooner.
 */
export function resolveGroundTarget(origin, direction, requestedDistance = 10, options = {}) {
  const config = options.config || getWorldFloorConfig(options.floor);
  const dirLength = Math.hypot(Number(direction?.x) || 0, Number(direction?.z) || 0) || 1;
  const horizontal = {
    x: (Number(direction?.x) || 0) / dirLength,
    y: 0,
    z: (Number(direction?.z) || 0) / dirLength
  };
  const distance = Math.max(0.5, Number(requestedDistance) || 10);
  const horizontalHit = firstWorldHit(origin, {
    x: horizontal.x * distance,
    y: 0,
    z: horizontal.z * distance
  }, { ...options, delta: true, config });
  const travel = horizontalHit ? Math.max(0.5, horizontalHit.distance - 0.18) : distance;
  return {
    point: {
      x: (Number(origin?.x) || 0) + horizontal.x * travel,
      y: config.floorY + 0.03,
      z: (Number(origin?.z) || 0) + horizontal.z * travel
    },
    blocked: Boolean(horizontalHit),
    normal: horizontalHit?.normal || { x: 0, y: 1, z: 0 },
    distance: travel,
    obstruction: horizontalHit || null
  };
}

export function isPointInsideWorld(point, options = {}) {
  const config = options.config || getWorldFloorConfig(options.floor);
  const radius = Math.max(0, Number(options.radius) || 0);
  const distance = Math.hypot(Number(point?.x) || 0, Number(point?.z) || 0);
  if (distance + radius > config.outerRadius + EPSILON) return false;
  if (Number(point?.y) < config.floorY - EPSILON || Number(point?.y) > config.ceilingY + EPSILON) return false;
  return true;
}
