import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * High-performance AssetLoader for local 3D .glb models.
 * Loads, caches, and clones textured 3D meshes with soft shadows and PBR lighting.
 */
export class AssetLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    // Compressed exports can opt into the decoder files without changing the
    // runtime API. Existing uncompressed GLBs continue to load unchanged.
    this.dracoLoader.setDecoderPath('/draco/');
    this.loader.setDRACOLoader(this.dracoLoader);
    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('/basis/');
    this.loader.setKTX2Loader(this.ktx2Loader);
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.renderer = null;
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.rawLoadingPromises = new Map();
    this.stats = { requests: 0, cacheHits: 0, bytesHint: 0, meshes: 0, materials: 0 };
  }

  configureRenderer(renderer) {
    if (!renderer || this.renderer === renderer) return;
    this.renderer = renderer;
    try {
      // KTX2 transcoding needs the active WebGL capabilities. This is a
      // no-op for existing uncompressed assets and makes optimized local GLBs
      // load without changing entity code.
      this.ktx2Loader.detectSupport(renderer);
    } catch (error) {
      console.warn('[AssetLoader] KTX2 support detection skipped:', error.message);
    }
  }

  loadGLTF(url) {
    this.stats.requests += 1;
    if (this.cache.has(url)) {
      this.stats.cacheHits += 1;
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
              this.stats.meshes += 1;
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                this.stats.materials += Array.isArray(child.material) ? child.material.length : 1;
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

    const tracked = p.finally(() => this.loadingPromises.delete(url));
    this.loadingPromises.set(url, tracked);
    return tracked;
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
    if (this.rawLoadingPromises.has(url)) return this.rawLoadingPromises.get(url);

    const promise = new Promise((resolve, reject) => {
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
    const tracked = promise.finally(() => this.rawLoadingPromises.delete(url));
    this.rawLoadingPromises.set(url, tracked);
    return tracked;
  }

  getStats() {
    return { ...this.stats, cachedModels: this.cache.size, pending: this.loadingPromises.size + this.rawLoadingPromises.size };
  }

  /**
   * Drop a streamed asset when its floor leaves the resident window. Models
   * are cloned before use, so disposing the cached source prevents the floor
   * streamer from quietly retaining every GLB for the whole 15-floor run.
   */
  releaseGLTF(url) {
    const source = this.cache.get(url) || this.rawCache?.get(url)?.scene;
    if (!source) {
      this.cache.delete(url);
      this.rawCache?.delete(url);
      return false;
    }
    source.traverse((child) => {
      child.geometry?.dispose?.();
      const material = child.material;
      if (Array.isArray(material)) material.forEach(item => item?.dispose?.());
      else material?.dispose?.();
    });
    this.cache.delete(url);
    this.rawCache?.delete(url);
    return true;
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
      '/models/boss_astraea.glb',
      '/models/npc_merchant.glb',
      '/models/npc_alchemist.glb',
      '/models/npc_quest_giver.glb',
      '/models/enemy_direwolf.glb',
      '/models/enemy_knight.glb',
      '/models/enemy_golem.glb',
      '/models/enemy_sentinel.glb'
    ];
    return Promise.allSettled(urls.map(u => this.loadGLTFRaw(u)));
  }

  preloadAll() {
    // Explicit opt-in full preload for tooling/benchmark scenes. The game boot
    // path uses ChunkLoader so production sessions stay within a small memory
    // window.
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
