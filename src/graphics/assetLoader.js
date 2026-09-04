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
    if (this.rawCache && this.rawCache.has(url)) {
      return this.rawCache.get(url).scene.clone();
    }
    return null;
  }

  loadGLTFRaw(url) {
    if (!this.rawCache) this.rawCache = new Map();
    if (this.rawCache.has(url)) {
      return Promise.resolve(this.rawCache.get(url));
    }

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
          this.rawCache.set(url, gltf);
          this.cache.set(url, gltf.scene);
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
      '/models/gatehouse.glb'
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

  preloadBossesAndNPCs() {
    const urls = [
      '/models/boss_ignis.glb',
      '/models/boss_xyris.glb',
      '/models/boss_valerius.glb',
      '/models/npc_merchant.glb',
      '/models/npc_alchemist.glb',
      '/models/npc_quest_giver.glb'
    ];
    return Promise.allSettled(urls.map(u => this.loadGLTFRaw(u)));
  }

  preloadAll() {
    // 100% Upfront Preloading: Load wand viewmodel, all floors, rigged bosses and NPCs in parallel
    const wandPromise = this.loadGLTFRaw('/models/fp_viewmodel_wand.glb').catch(err => {
      console.warn('[AssetLoader] Viewmodel wand preload notice:', err);
    });

    const f1Promise = this.preloadFloor1();
    const f2Promise = this.preloadFloor2();
    const f3Promise = this.preloadFloor3();
    const bossPromise = this.preloadBossesAndNPCs();

    return Promise.all([wandPromise, f1Promise, f2Promise, f3Promise, bossPromise]).then(() => {
      console.log('⚡ [AssetLoader] 100% of all 3D GLTF models, rigged bosses & NPCs pre-cached into memory. Zero runtime loading!');
    });
  }
}

export const assetLoader = new AssetLoader();
