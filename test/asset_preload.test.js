import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { AssetLoader } from '../src/graphics/assetLoader.js';

for (const first of ['loadGLTF', 'loadGLTFRaw']) {
  test(`scene and animated requests share one decode when ${first} starts first`, async () => {
    const loader = new AssetLoader();
    let requests = 0;
    let complete;
    loader.loader = { load(_url, onLoad) { requests++; complete = onLoad; } };
    const second = first === 'loadGLTF' ? 'loadGLTFRaw' : 'loadGLTF';
    const a = loader[first]('/models/test.glb');
    const b = loader[second]('/models/test.glb');
    const gltf = { scene: new THREE.Group(), animations: [] };
    complete(gltf);
    await Promise.all([a, b]);
    assert.equal(requests, 1);
    assert.equal(await loader.loadGLTFRaw('/models/test.glb'), gltf);
    assert.notEqual(await loader.loadGLTF('/models/test.glb'), gltf.scene);
    assert.equal(requests, 1);
  });
}
