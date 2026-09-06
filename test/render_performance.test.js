import test from 'node:test';
import assert from 'node:assert/strict';
import { EngineScene } from '../src/engine/scene.js';

test('adaptive resolution responds to slow frames within half a second and remains bounded', () => {
  const engine = {
    graphicsQuality: 'balanced',
    adaptiveResolution: { enabled: true, min: 0.65, max: 1, ratio: 1, elapsed: 0, frames: 0 },
    setRenderPixelRatio(ratio) { this.appliedRatio = ratio; }
  };
  for (let i = 0; i < 5; i++) EngineScene.prototype.updatePerformance.call(engine, 0.1);
  assert.equal(engine.appliedRatio, 0.85);
  for (let i = 0; i < 50; i++) EngineScene.prototype.updatePerformance.call(engine, 0.1);
  assert.equal(engine.appliedRatio, 0.65);
});

test('an explicit ultra profile is not resized by the adaptive controller', () => {
  const engine = {
    graphicsQuality: 'ultra',
    adaptiveResolution: { enabled: true, ratio: 1 },
    setRenderPixelRatio() { assert.fail('Ultra should preserve its chosen resolution'); }
  };
  EngineScene.prototype.updatePerformance.call(engine, 1);
  assert.equal(engine.adaptiveResolution.ratio, 1);
});
