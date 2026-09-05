import * as THREE from 'three';
import { getSpellVfxProfile, hashVfxSeed } from './spellVfxProfiles.js';
import { assetLoader } from './assetLoader.js';

/**
 * Routes every player spell through one visual contract.  The director keeps
 * gameplay values out of the renderer and delegates reusable geometry to the
 * pooled ParticleSystem.
 */
export class SpellVfxDirector {
  constructor(scene, particleSystem, engineScene = null) {
    this.scene = scene;
    this.particles = particleSystem;
    this.engineScene = engineScene;
    this.qualityProfile = 'balanced';
    this.reducedMotion = false;
    this.castSequence = 0;
    this.stats = {
      casts: 0,
      localCasts: 0,
      remoteCasts: 0,
      lastCastMs: 0,
      dropped: 0,
      maxFrameMs: 0,
      hitchCount: 0
    };
  }

  setQualityProfile(profile = 'balanced') {
    this.qualityProfile = ['performance', 'balanced', 'ultra'].includes(profile) ? profile : 'balanced';
    this.particles.setQualityProfile?.(this.qualityProfile);
  }

  setReducedMotion(enabled = false) {
    this.reducedMotion = Boolean(enabled);
    this.particles.setReducedMotion?.(this.reducedMotion);
  }

  warmup(renderer, camera) {
    this.particles.warmupSpellVisuals(renderer, camera);
  }

  preloadHeroAssets() {
    const assets = [
      ['fire', '/models/spell_fire_tornado_core.glb'],
      ['fireball', '/models/spell_fireball.glb'],
      ['frost', '/models/spell_frost_crystal.glb'],
      ['light', '/models/spell_luminary_halo.glb'],
      ['chrono', '/models/spell_chrono_astrolabe.glb']
    ];
    return fetch('/models/spell-vfx-assets.json', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : { assets: [] })
      .catch(() => ({ assets: [] }))
      .then(manifest => Promise.allSettled(assets
        .filter(([type]) => Array.isArray(manifest.assets) && manifest.assets.includes(type))
        .map(async ([type, url]) => {
          try {
            const gltf = await assetLoader.loadGLTFRaw(url);
            if (gltf?.scene) this.particles.registerHeroAsset(type, gltf.scene);
            return type;
          } catch {
            // Procedural VFX remains the supported fallback when the optional
            // locally generated hero mesh has not been exported yet.
            return null;
          }
        })));
  }

  _pointAtDistance(origin, direction, distance) {
    return new THREE.Vector3(
      origin.x + direction.x * distance,
      origin.y + direction.y * distance,
      origin.z + direction.z * distance
    );
  }

  _groundTarget(origin, direction, distance) {
    const target = this._pointAtDistance(origin, direction, distance);
    target.y = 0;
    return target;
  }

  playCast({
    spellId,
    spellType = 'basic',
    element,
    origin,
    direction,
    target = null,
    damage = 0,
    duration = null,
    source = 'local',
    seed = null,
    worldImpact = null
  }) {
    if (!spellId || !origin || !direction) return null;
    const started = typeof performance !== 'undefined' ? performance.now() : 0;
    const profile = getSpellVfxProfile(spellId);
    const safeDirection = direction.clone().normalize();
    const visualSeed = seed ?? `${spellId}:${source}:${this.castSequence++}`;
    const reduced = this.reducedMotion || this.qualityProfile === 'performance';

    this.stats.casts += 1;
    if (source === 'local') this.stats.localCasts += 1;
    else this.stats.remoteCasts += 1;

    if (profile.kind === 'field') {
      if (spellId === 'fire_tornado') {
        const ground = target || worldImpact?.point || this._groundTarget(origin, safeDirection, 10);
        this.particles.spawnFireTornado(ground, duration || profile.duration, damage || 32, profile.radius);
        if (!reduced) this.particles.spawnBurst(ground, 'fire', this.qualityProfile === 'ultra' ? 18 : 10);
      } else if (spellId === 'divine_sanctuary') {
        const ground = target || new THREE.Vector3(origin.x, 0, origin.z);
        this.particles.spawnDivineSanctuary(ground, duration || profile.duration, profile.radius);
        this.particles.spawnCleansingWave(ground, reduced ? 0.55 : 0.9);
      } else if (spellId === 'frost_nova') {
        const ground = target || worldImpact?.point || this._groundTarget(origin, safeDirection, 9);
        this.particles.spawnBlizzardZone(ground, duration || profile.duration, profile.radius, damage || 28);
        this.particles.spawnImpactShockwave(ground, 0x80d8ff, profile.radius, reduced ? 0.35 : 0.7);
      } else if (spellId === 'temporal_stasis') {
        const ground = target || worldImpact?.point || this._groundTarget(origin, safeDirection, 10);
        this.particles.spawnTemporalStasisDome(ground, duration || profile.duration, profile.radius, damage || 35);
        this.particles.spawnTemporalRewind(ground, reduced ? 0.55 : 1.0);
      } else if (spellId === 'time_dilation') {
        const ground = target || worldImpact?.point || this._groundTarget(origin, safeDirection, 7);
        this.particles.spawnTimeDilation(ground, profile.radius, duration || profile.duration);
        this.particles.spawnImpactShockwave(ground, 0x7c4dff, profile.radius, reduced ? 0.35 : 0.65);
      }
    } else if (spellId === 'glacial_bulwark') {
      const position = new THREE.Vector3(origin.x, 0, origin.z);
      this.particles.spawnGlacialBulwark(position, duration || profile.duration);
      if (!reduced) this.particles.spawnBurst(position, 'frost', 10);
    } else if (spellId === 'radiant_heal') {
      const healTarget = target || new THREE.Vector3(origin.x, origin.y - 0.7, origin.z);
      this.particles.spawnHealingBeam(origin, healTarget, duration || profile.duration, 'light');
      this.particles.spawnBurst(healTarget, 'light', reduced ? 8 : 16);
    } else if (spellId === 'cleansing_wave') {
      const position = new THREE.Vector3(origin.x, 0, origin.z);
      this.particles.spawnCleansingWave(position, duration || profile.duration);
      this.particles.spawnBurst(position, 'light', reduced ? 8 : 16);
    } else if (spellId === 'temporal_rewind') {
      const position = new THREE.Vector3(origin.x, 0, origin.z);
      this.particles.spawnTemporalRewind(position, duration || profile.duration);
      this.particles.spawnBurst(position, 'chrono', reduced ? 8 : 16);
    } else {
      // Basic attacks and offensive skills use the richer elemental projectile
      // models already owned by ParticleSystem, plus a cheap directional flare.
      const travelDistance = Number(worldImpact?.distance);
      this.particles.spawnProjectile(
        origin,
        safeDirection,
        spellType,
        element,
        24,
        Number.isFinite(travelDistance) ? Math.max(0.5, travelDistance) : 35,
        worldImpact
      );
      this.particles.spawnMuzzleFlash(origin, safeDirection, element);
    }

    this.particles.vfxStats.casts += 1;
    this.stats.dropped = this.particles.vfxStats.droppedEffects;
    this.stats.lastCastMs = typeof performance !== 'undefined' ? performance.now() - started : 0;
    this._publishDebugStats(visualSeed);
    return profile;
  }

  _publishDebugStats(seed) {
    if (typeof window === 'undefined') return;
    window.__vfxPerf = {
      ...this.stats,
      seed: hashVfxSeed(seed),
      quality: this.qualityProfile,
      reducedMotion: this.reducedMotion,
      activeParticles: this.particles.particles.length,
      activeVortices: this.particles.vortices.length,
      activeEffects: this.particles.spellEffects.length,
      activeText: this.particles.floatingTexts.length,
      heroAssets: Object.keys(this.particles.heroAssets || {})
    };
  }

  update(deltaTime, context = {}) {
    if (context.quality && context.quality !== this.qualityProfile) this.setQualityProfile(context.quality);
    if (context.reducedMotion !== undefined && context.reducedMotion !== this.reducedMotion) this.setReducedMotion(context.reducedMotion);
    const frameMs = Math.max(0, Number(deltaTime) || 0) * 1000;
    this.stats.maxFrameMs = Math.max(this.stats.maxFrameMs, frameMs);
    if (frameMs > 50) this.stats.hitchCount += 1;
    this._publishDebugStats('frame');
  }

  clear() {
    this.particles.clear();
    if (typeof window !== 'undefined') delete window.__vfxPerf;
  }
}
