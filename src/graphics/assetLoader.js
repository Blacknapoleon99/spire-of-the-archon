import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * High-performance AssetLoader for local 3D .glb models.
 * Loads, caches, and clones textured 3D meshes with soft shadows and PBR lighting.
 */
export class AssetLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  loadGLTF(url) {
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url).clone());
    }
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url).then(scene => scene.clone());
    }

    const p = new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.side = THREE.FrontSide;
              }
            }
          });
          this.cache.set(url, gltf.scene);
          resolve(gltf.scene.clone());
        },
        undefined,
        (err) => {
          console.warn(`[AssetLoader] Could not load ${url}:`, err);
          reject(err);
        }
      );
    });

    this.loadingPromises.set(url, p);
    return p;
  }

  getModel(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url).clone();
    }
    return null;
  }

  loadGLTFRaw(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.side = THREE.FrontSide;
              }
            }
          });
          resolve(gltf);
        },
        undefined,
        (err) => {
          console.warn(`[AssetLoader] Could not load raw ${url}:`, err);
          reject(err);
        }
      );
    });
  }

  preloadFloor1() {
    const floor1Urls = [
      '/models/sorcerer.glb',
      '/models/druid.glb',
      '/models/knight.glb',
      '/models/malakor.glb',
      '/models/elf_mage.glb',
      '/models/heavy_warrior.glb'
    ];
    return Promise.allSettled(floor1Urls.map(u => this.loadGLTF(u)));
  }

  preloadFloor2() {
    const floor2Urls = [
      '/models/blacksmith.glb',
      '/models/guard_tower.glb',
      '/models/gatehouse.glb',
      '/models/props.glb'
    ];
    return Promise.allSettled(floor2Urls.map(u => this.loadGLTF(u)));
  }

  preloadFloor3() {
    const floor3Urls = [
      '/models/archon_valerius.glb',
      '/models/direwolf.glb'
    ];
    return Promise.allSettled(floor3Urls.map(u => this.loadGLTF(u)));
  }

  preloadAll() {
    // Progressive Loading: Load Floor 1 immediately, then background-stream later floors
    return this.preloadFloor1().then(() => {
      // Lazy stream Floor 2 & 3 in background during idle time
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          this.preloadFloor2().then(() => this.preloadFloor3());
        }, { timeout: 3000 });
      } else {
        setTimeout(() => {
          this.preloadFloor2().then(() => this.preloadFloor3());
        }, 1500);
      }
    });
  }
}

export const assetLoader = new AssetLoader();
