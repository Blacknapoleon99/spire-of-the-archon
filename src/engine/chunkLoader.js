import { TextureGenerator } from '../graphics/textureGenerator.js';
import { assetLoader } from '../graphics/assetLoader.js';
import { getFloorBundle } from '../shared/assetManifest.js';

/**
 * Demand-driven floor streamer. Core floor assets load during boot; the next
 * floor is warmed after a checkpoint so memory stays bounded on mid-range GPUs.
 */
export class ChunkLoader {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    assetLoader.configureRenderer(renderer);
    this.loadedFloors = new Set();
    this.loadingFloors = new Map();
    this.floorErrors = new Map();
    this.residentFloors = new Set([1]);
    this.maxResidentFloors = 3;
    this.audioCache = new Map();
  }

  /**
   * Compatibility boot hook: warm only the pinned first-floor bundle and
   * lightweight audio hints. Active floors are streamed on demand below.
   */
  preloadEverything(renderer) {
    const rndr = renderer || this.renderer;

    // 1. Preload procedural PBR textures used by the first-floor kit.
    try {
      TextureGenerator.preloadAllTextures(rndr);
    } catch (err) {
      console.warn('[ChunkLoader] Texture preloading note:', err);
    }

    // 2. Pre-fetch Floor 2 & Floor 3 voice lines into browser cache
    const voices = [
      '/audio/voices/ignatius_act2_intro.mp3',
      '/audio/voices/ignatius_crucible_charge.mp3',
      '/audio/voices/ignatius_crucible_reset.mp3',
      '/audio/voices/ignatius_act2_complete.mp3',
      '/audio/voices/valerius_boss_intro.mp3',
      '/audio/voices/valerius_keystone_down.mp3',
      '/audio/voices/valerius_defeat.mp3'
    ];

    voices.forEach(url => {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = url;
        this.audioCache.set(url, audio);
      } catch (e) {}
    });

    return this.preloadFloor(1, { renderer: rndr });
  }

  preloadFloor(floorNumber, options = {}) {
    const floor = Number(floorNumber);
    if (!Number.isFinite(floor) || floor < 1 || floor > 15) return Promise.resolve({ floor, ready: false });
    if (this.loadedFloors.has(floor)) return Promise.resolve({ floor, ready: true, cached: true });
    if (this.loadingFloors.has(floor)) return this.loadingFloors.get(floor);
    const urls = getFloorBundle(floor);
    const promise = Promise.allSettled(urls.map(url => assetLoader.loadGLTF(url)))
      .then(results => {
        const rejected = results.filter(result => result.status === 'rejected');
        if (rejected.length) this.floorErrors.set(floor, rejected.map(result => result.reason?.message || 'asset load failed'));
        this.loadedFloors.add(floor);
        this.residentFloors.add(floor);
        this.evictDistantFloors(floor);
        if (options.onComplete) options.onComplete({ floor, loaded: urls.length - rejected.length, total: urls.length });
        return { floor, ready: true, loaded: urls.length - rejected.length, total: urls.length, errors: this.floorErrors.get(floor) || [] };
      })
      .catch(error => {
        this.floorErrors.set(floor, [error.message]);
        throw error;
      })
      .finally(() => this.loadingFloors.delete(floor));
    this.loadingFloors.set(floor, promise);
    return promise;
  }

  evictDistantFloors(activeFloor) {
    while (this.residentFloors.size > this.maxResidentFloors) {
      const candidate = [...this.residentFloors]
        .filter(floor => floor !== 1 && floor !== activeFloor && !this.loadingFloors.has(floor))
        .sort((a, b) => Math.abs(b - activeFloor) - Math.abs(a - activeFloor))[0];
      if (candidate === undefined) break;
      this.residentFloors.delete(candidate);

      // Only release URLs no longer shared by a resident floor. Revisit loads
      // them again instead of treating a disposed cache entry as ready.
      const remainingUrls = new Set([...this.residentFloors].flatMap(floor => getFloorBundle(floor)));
      for (const url of getFloorBundle(candidate)) {
        if (!remainingUrls.has(url)) assetLoader.releaseGLTF(url);
      }
      this.loadedFloors.delete(candidate);
    }
  }

  getFloorStatus(floorNumber) {
    const floor = Number(floorNumber);
    return {
      floor,
      ready: this.loadedFloors.has(floor),
      loading: this.loadingFloors.has(floor),
      errors: this.floorErrors.get(floor) || []
    };
  }

  startBackgroundPreload() {
    // Deprecated: No background loading allowed during active gameplay.
    // The caller chooses current + next floor so loading work stays bounded.
  }

  isFloorReady(floorNumber) {
    return this.loadedFloors.has(Number(floorNumber));
  }
}
