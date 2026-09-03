import { TextureGenerator } from '../graphics/textureGenerator.js';

/**
 * Asynchronous Background Asset & Chunk Preloader
 * Progressively loads Floor 2 (Forge) and Floor 3 (Observatory) textures and voice files
 * in idle micro-slices while player explores Floor 1, preventing initial and transition lag.
 */
export class ChunkLoader {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.loadedFloors = new Set([1]);
    this.isPreloading = false;
    this.audioCache = new Map();
  }

  /**
   * Starts background progressive loading using requestIdleCallback / micro-delays
   */
  startBackgroundPreload() {
    if (this.isPreloading) return;
    this.isPreloading = true;

    const schedule = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : (fn) => setTimeout(fn, 16);

    // Give Floor 1 a 2-second grace period for smooth immediate player onboarding
    setTimeout(() => {
      schedule(() => this.preloadFloor2(schedule));
    }, 2000);
  }

  /**
   * Preload Floor 2 (Alchemical Crucible & Forge) assets
   */
  preloadFloor2(schedule) {
    // 1. Generate & GPU-cache Floor 2 PBR textures
    try {
      const lavaTex = TextureGenerator.createLavaTexturePBR();
      if (this.renderer && lavaTex?.diffuseMap) {
        this.renderer.initTexture(lavaTex.diffuseMap);
      }
      const rustTex = TextureGenerator.createRustedIronPBR();
      if (this.renderer && rustTex?.diffuseMap) {
        this.renderer.initTexture(rustTex.diffuseMap);
      }
    } catch (e) {
      console.warn('[ChunkLoader] Texture pre-generation warning (F2):', e);
    }

    // 2. Pre-fetch Floor 2 voice lines into browser cache
    const f2Voices = [
      '/audio/voices/ignatius_act2_intro.mp3',
      '/audio/voices/ignatius_crucible_charge.mp3',
      '/audio/voices/ignatius_crucible_reset.mp3',
      '/audio/voices/ignatius_act2_complete.mp3'
    ];

    f2Voices.forEach(url => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      this.audioCache.set(url, audio);
    });

    this.loadedFloors.add(2);
    console.log('⚡ [ChunkLoader] Floor 2 (Forge & Crucible) assets pre-warmed in background!');

    // Sliced transition to Floor 3 preloading after another short breather
    setTimeout(() => {
      schedule(() => this.preloadFloor3());
    }, 1500);
  }

  /**
   * Preload Floor 3 (Observatory & Celestial Pinnacle) assets
   */
  preloadFloor3() {
    try {
      const stainedGlass = TextureGenerator.createStainedGlassPBR(280);
      if (this.renderer && stainedGlass?.diffuseMap) {
        this.renderer.initTexture(stainedGlass.diffuseMap);
      }
      const parchment = TextureGenerator.createParchmentPBR();
      if (this.renderer && parchment?.diffuseMap) {
        this.renderer.initTexture(parchment.diffuseMap);
      }
    } catch (e) {
      console.warn('[ChunkLoader] Texture pre-generation warning (F3):', e);
    }

    // Pre-fetch Floor 3 boss voice lines
    const f3Voices = [
      '/audio/voices/valerius_boss_intro.mp3',
      '/audio/voices/valerius_keystone_down.mp3',
      '/audio/voices/valerius_defeat.mp3'
    ];

    f3Voices.forEach(url => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      this.audioCache.set(url, audio);
    });

    this.loadedFloors.add(3);
    console.log('⚡ [ChunkLoader] Floor 3 (Observatory & Valerius) assets pre-warmed in background!');
  }

  isFloorReady(floorNumber) {
    return this.loadedFloors.has(floorNumber);
  }
}
