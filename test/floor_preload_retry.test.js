import test from 'node:test';
import assert from 'node:assert/strict';
import { ChunkLoader } from '../src/engine/chunkLoader.js';
import { assetLoader } from '../src/graphics/assetLoader.js';

test('failed floor assets remain retryable and cannot be reported as cached ready', async () => {
  const original = assetLoader.loadGLTF;
  let fail = true;
  assetLoader.loadGLTF = async () => { if (fail) throw new Error('temporary network failure'); return {}; };
  try {
    const loader = new ChunkLoader(null, null);
    const first = await loader.preloadFloor(1);
    assert.equal(first.ready, false);
    assert.equal(loader.loadedFloors.has(1), false);
    fail = false;
    const second = await loader.preloadFloor(1);
    assert.equal(second.ready, true);
    assert.deepEqual(second.errors, []);
    assert.equal(loader.loadedFloors.has(1), true);
  } finally {
    assetLoader.loadGLTF = original;
  }
});

test('background floor streaming deduplicates requests and honors priority order', async () => {
  const loader = new ChunkLoader(null, null);
  const order = [];
  const original = loader.preloadFloor;
  loader.preloadFloor = async floor => {
    order.push(floor);
    await Promise.resolve();
    loader.loadedFloors.add(floor);
    return { floor, ready: true, loaded: 1, total: 1, errors: [] };
  };
  try {
    const low = loader.scheduleBackgroundPreload(2, { priority: 1, delayMs: 0 });
    const high = loader.scheduleBackgroundPreload(3, { priority: 5, delayMs: 0 });
    assert.strictEqual(loader.scheduleBackgroundPreload(3, { priority: 99, delayMs: 0 }), high);
    loader.startBackgroundPreload();
    const results = await Promise.all([low, high]);
    assert.deepEqual(order, [3, 2]);
    assert.deepEqual(results.map(result => result.floor).sort(), [2, 3]);
    assert.equal(loader.streamStats.completed, 2);
    assert.equal(loader.streamStats.failed, 0);
  } finally {
    loader.preloadFloor = original;
  }
});
