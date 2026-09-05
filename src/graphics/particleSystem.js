import * as THREE from 'three';
import { TextureGenerator } from './textureGenerator.js';
import { DecalManager } from './shaders/impactDecals.js';

const AIR_IMPACT_NORMAL = Object.freeze({ x: 0, y: 0, z: 0 });

/**
 * High-performance 3D Particle, Projectile, Shockwave & Persistent Vortex/AOE System
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.vortices = [];
    this.physicalCoins = [];
    this.decalManager = new DecalManager(this.scene);

    // VFX runtime controls.  Combat effects are capped and pooled so a spell
    // cast never has to build a new scene graph or trigger garbage collection
    // in the middle of a frame.
    this.qualityProfile = 'balanced';
    this.reducedMotion = false;
    this.spellEffects = [];
    this.heroAssets = {};
    this.particleMeshPool = [];
    this.shockwavePool = [];
    this.floatingTextPool = [];
    this.floatingTextMaterials = new Map();
    this.spellEffectPool = { heal_beam: [], cleansing_wave: [], glacial_bulwark: [], temporal_rewind: [], time_dilation: [] };
    this.vortexPool = { fire_tornado: [], divine_sanctuary: [], blizzard: [], stasis_dome: [] };
    this.vortexLightsPool = [];
    this.activeVortexLights = new Set();
    this.vfxStats = { casts: 0, droppedEffects: 0, poolExpansions: 0 };

    // High-Fidelity Pre-allocated Geometries for Upgraded Spells
    this.geoCore = new THREE.SphereGeometry(0.38, 14, 14);
    this.geoCoreHighPoly = new THREE.SphereGeometry(0.48, 18, 18);
    // Hero fireball layers.  The generated GLB can replace the shell at load
    // time, while these pooled shader layers keep the spell spectacular when
    // the optional local asset is unavailable.
    this.geoFireballShell = new THREE.IcosahedronGeometry(0.58, 2);
    this.geoFireballFlameCard = new THREE.PlaneGeometry(0.72, 1.5, 1, 10);
    this.geoTorusFire = new THREE.TorusGeometry(0.68, 0.08, 8, 20);
    this.geoFlameWave = new THREE.TorusGeometry(1.2, 0.22, 8, 24, Math.PI);
    this.geoEmberBolt = new THREE.ConeGeometry(0.18, 0.8, 8);
    this.geoIceLance = new THREE.ConeGeometry(0.24, 2.0, 8);
    this.geoIceShard = new THREE.OctahedronGeometry(0.14, 0);
    this.geoFrostDiamond = new THREE.OctahedronGeometry(0.34, 1);
    this.geoSparkSphere = new THREE.SphereGeometry(0.35, 12, 12);
    this.geoHaloRing = new THREE.RingGeometry(0.45, 0.65, 24);
    this.geoRuneRingPlane = new THREE.PlaneGeometry(1.3, 1.3);
    this.geoAstrolabeOuter = new THREE.TorusGeometry(0.66, 0.04, 8, 24);
    this.geoAstrolabeInner = new THREE.TorusGeometry(0.48, 0.03, 8, 24);
    this.geoEmberSpiral = new THREE.TorusKnotGeometry(0.22, 0.04, 32, 6, 2, 3);
    this.geoCrossFlare = new THREE.PlaneGeometry(0.85, 0.14);
    this.geoChronoDodeca = new THREE.DodecahedronGeometry(0.32, 0);
    this.geoChronoRing = new THREE.TorusGeometry(0.55, 0.04, 8, 20);
    this.geoMuzzleSpark = new THREE.TetrahedronGeometry(0.08, 0);
    this.geoTrailOcta = new THREE.OctahedronGeometry(0.075, 0);
    this.geoBurstDodeca = new THREE.DodecahedronGeometry(0.14, 0);
    this.geoBurstOcta = new THREE.OctahedronGeometry(0.16, 0);
    this.geoShockwaveRing = new THREE.RingGeometry(0.2, 0.6, 24);

    // Pre-generate Procedural PBR Spell Textures
    const flamePBR = TextureGenerator.createFlamePlasmaPBR();
    const frostPBR = TextureGenerator.createFrostCrystallinePBR();
    const solarPBR = TextureGenerator.createSolarHaloPBR();
    const chronoPBR = TextureGenerator.createChronoClockworkPBR();
    const fireRunePBR = TextureGenerator.createSpellRuneRing('fire');
    const frostRunePBR = TextureGenerator.createSpellRuneRing('frost');

    // Upgraded PBR Materials
    this.matFirePlasmaCore = flamePBR.material;
    this.matFireRuneRing = fireRunePBR.material;
    this.matFrostCrystal = frostPBR.material;
    this.matFrostRuneRing = frostRunePBR.material;
    this.matSolarCore = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xffd700),
      emissiveIntensity: 3.0,
      roughness: 0.1
    });
    this.matSolarHalo = solarPBR.material;
    this.matSolarFlare = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    this.matChronoDial = chronoPBR.material;
    this.matChronoRingTorus = new THREE.MeshStandardMaterial({
      color: 0xbf5af2,
      emissive: new THREE.Color(0xaa00ff),
      emissiveIntensity: 2.2,
      metalness: 0.6,
      roughness: 0.2
    });

    // Base materials
    this.matFireCore = this.matFirePlasmaCore;
    this.matFireRing = new THREE.MeshBasicMaterial({ color: 0xffd600 });
    this.matFireWave = new THREE.MeshStandardMaterial({
      map: flamePBR.diffuseMap,
      emissive: new THREE.Color(0xff3d00),
      emissiveIntensity: 2.5,
      side: THREE.DoubleSide
    });
    this.matFireballShell = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xff4b0a) }
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec3 p = position;
          float pulse = sin(uTime * 8.0 + position.y * 7.0 + position.x * 4.0) * 0.035;
          p += normalize(position) * pulse;
          vPosition = p;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float rim = pow(1.0 - max(0.0, dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 1.8);
          float turbulence = 0.72 + 0.28 * sin(uTime * 10.0 + vPosition.x * 8.0 + vPosition.y * 9.0);
          vec3 hot = mix(uColor * 0.65, vec3(1.0, 0.58, 0.08), rim * 0.8 + 0.2);
          gl_FragColor = vec4(hot * turbulence, 0.92);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.matFireballFlameCard = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPhase: { value: 0 },
        uColor: { value: new THREE.Color(0xff5a00) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPhase;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.x += sin(uTime * 9.0 + uPhase + uv.y * 12.0) * (0.04 + uv.y * 0.09);
          p.z += cos(uTime * 7.0 + uPhase + uv.y * 8.0) * (0.03 + uv.y * 0.06);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPhase;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float edge = 1.0 - smoothstep(0.08, 0.5, abs(vUv.x - 0.5));
          float fade = smoothstep(0.0, 0.14, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
          float lick = 0.72 + 0.28 * sin(uTime * 10.0 + uPhase + vUv.y * 14.0);
          vec3 color = mix(uColor * 0.55, vec3(1.0, 0.72, 0.16), vUv.y);
          gl_FragColor = vec4(color, edge * fade * lick * 0.68);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.matFireBolt = this.matFirePlasmaCore;
    this.matIceLance = this.matFrostCrystal;
    this.matFrostDiamond = this.matFrostCrystal;
    this.matLightCore = this.matSolarCore;
    this.matLightHalo = this.matSolarHalo;
    this.matChronoCore = new THREE.MeshStandardMaterial({
      color: 0xbf5af2,
      emissive: new THREE.Color(0xaa00ff),
      emissiveIntensity: 2.5,
      roughness: 0.1
    });
    this.matChronoRing = this.matChronoDial;

    this.trailWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.trailMats = {
      fire: new THREE.MeshBasicMaterial({ color: 0xff5722 }),
      frost: new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
      light: new THREE.MeshBasicMaterial({ color: 0xffd700 }),
      chrono: new THREE.MeshBasicMaterial({ color: 0xbf5af2 }),
      storm: new THREE.MeshBasicMaterial({ color: 0xffd60a })
    };

    this.muzzleSparkMaterials = {
      fire: new THREE.MeshBasicMaterial({ color: 0xff3d00 }),
      frost: new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
      light: new THREE.MeshBasicMaterial({ color: 0xffd700 }),
      chrono: new THREE.MeshBasicMaterial({ color: 0xbf5af2 })
    };

    this.elementColors = {
      fire: 0xff3d00,
      frost: 0x00e5ff,
      light: 0xffd700,
      chrono: 0xbf5af2,
      storm: 0xffd60a
    };

    // Persistent Muzzle Flash Light (Never added/removed from scene to prevent WebGL shader recompilation)
    this.muzzleFlashLight = new THREE.PointLight(0xff5722, 0, 8);
    this.scene.add(this.muzzleFlashLight);
    this.muzzleFlashTimer = 0;

    // Persistent Projectile Lights Pool
    this.projectileLightsPool = [
      new THREE.PointLight(0xff5722, 0, 9),
      new THREE.PointLight(0x00e5ff, 0, 9),
      new THREE.PointLight(0xffd700, 0, 9),
      new THREE.PointLight(0xbf5af2, 0, 9)
    ];
    this.projectileLightsPool.forEach(l => this.scene.add(l));
    this.activeProjectileLights = new Set();

    // Persistent Ultimate / Vortex Light (Never added/removed dynamically to prevent WebGL shader recompilation)
    this.vortexLight = new THREE.PointLight(0xff5722, 0, 24);
    this.scene.add(this.vortexLight);

    // Pre-allocated reusable physical coin geometry to eliminate runtime GC allocations & disposal crashes
    this.geoCoin = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);

    // Pre-allocated Vortex Geometries for Zero-Allocation Ultimate Casting
    this.geoVortexFunnel = new THREE.CylinderGeometry(2.8, 0.32, 6.8, 48, 12, true);
    // Closed volume used by the authored fire asset and by the procedural
    // fallback. Its noise shader gives the tornado a fire/smoke body instead
    // of a flat cone or camera-facing flame cards.
    this.geoVortexVolume = new THREE.CylinderGeometry(1.45, 0.28, 5.8, 64, 24, false);
    this.geoVortexCore = new THREE.CylinderGeometry(0.9, 0.18, 6.4, 32, 8, true);
    this.geoVortexRibbons = [
      new THREE.TorusGeometry(1.25, 0.055, 8, 64, Math.PI * 1.7),
      new THREE.TorusGeometry(1.9, 0.06, 8, 64, Math.PI * 1.7),
      new THREE.TorusGeometry(2.45, 0.065, 8, 64, Math.PI * 1.7)
    ];
    this.geoVortexWindRings = [
      new THREE.TorusGeometry(0.85, 0.018, 6, 64),
      new THREE.TorusGeometry(1.45, 0.022, 6, 64),
      new THREE.TorusGeometry(2.05, 0.026, 6, 64),
      new THREE.TorusGeometry(2.55, 0.03, 6, 64)
    ];
    this.geoVortexHelixes = [
      this._createVortexHelixGeometry(0.45, 2.65, 6.4, 1.65, 72, 0.055, 0.0),
      this._createVortexHelixGeometry(0.65, 2.4, 6.1, 1.9, 72, 0.07, Math.PI * 0.5),
      this._createVortexHelixGeometry(0.35, 2.2, 5.7, 2.15, 72, 0.045, Math.PI),
      this._createVortexHelixGeometry(0.75, 2.75, 6.7, 1.45, 72, 0.04, Math.PI * 1.5)
    ];
    this.geoVortexFlameCore = new THREE.SphereGeometry(1.0, 32, 20);
    this.geoVortexFlameCard = new THREE.PlaneGeometry(0.82, 4.9, 1, 12);
    this.geoVortexEmbers = this._createVortexEmberGeometry(72, 2.75, 6.5);
    // A narrow annulus reads as a rune boundary. The previous 0.3→5.5 ring
    // was effectively a glowing floor disk that overwhelmed the actual fire.
    this.geoVortexRuneRing = new THREE.RingGeometry(4.65, 5.5, 64);
    this.geoDomeHalf = new THREE.SphereGeometry(6.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    this.geoDomeRuneRing = new THREE.RingGeometry(0.3, 6.5, 32);
    this.geoIceSpire = new THREE.ConeGeometry(0.5, 4.2, 6);
    this.geoIceShardSpire = new THREE.ConeGeometry(0.28, 2.2, 5);

    // Compact reusable shapes for support, defensive and telegraph effects.
    this.geoSpellPulse = new THREE.RingGeometry(0.35, 0.52, 32);
    this.geoSpellBeam = new THREE.CylinderGeometry(0.07, 0.18, 1.4, 8, 1, true);
    this.geoShieldBubble = new THREE.SphereGeometry(1.15, 16, 12);
    this.geoTimeGlyph = new THREE.TorusGeometry(1.0, 0.045, 8, 32);
    this.geoSpellStar = new THREE.TetrahedronGeometry(0.11, 0);

    // Pre-allocated Vortex Shared Materials
    const lavaPBR = TextureGenerator.createLavaTexturePBR();
    const lavaTex = (lavaPBR && (lavaPBR.diffuseMap || lavaPBR.diffuseTex)) || null;
    this.matVortexFunnel = new THREE.MeshStandardMaterial({
      map: lavaTex,
      color: 0xff3700,
      emissive: new THREE.Color(0xff2200),
      emissiveIntensity: 2.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.matVortexVolume = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.42 },
        uColorHot: { value: new THREE.Color(0xff8a00) },
        uColorDeep: { value: new THREE.Color(0x7b1200) }
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vLocal;
        void main() {
          vLocal = position;
          vec3 p = position;
          float h = clamp((position.y + 2.9) / 5.8, 0.0, 1.0);
          float wind = sin(uTime * 2.4 + position.y * 1.6) * (0.035 + h * 0.12);
          p.x += wind + sin(uTime * 1.6 + position.y * 3.1) * h * 0.045;
          p.z += cos(uTime * 1.9 + position.y * 2.4) * h * 0.045;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColorHot;
        uniform vec3 uColorDeep;
        varying vec3 vLocal;

        float hash31(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }
        float noise3(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
                         mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                         mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        void main() {
          float h = clamp((vLocal.y + 2.9) / 5.8, 0.0, 1.0);
          float bodyRadius = mix(0.28, 1.45, h);
          float radial = length(vLocal.xz) / max(0.001, bodyRadius);
          float edge = 1.0 - smoothstep(0.45, 1.04, radial);
          float n = noise3(vLocal * vec3(2.0, 1.25, 2.0) + vec3(0.0, uTime * 1.8, 0.0));
          float n2 = noise3(vLocal * vec3(4.8, 2.1, 4.8) - vec3(uTime * 0.7, uTime * 1.2, 0.0));
          float flame = smoothstep(0.25, 0.78, n * 0.72 + n2 * 0.38);
          float taper = smoothstep(0.02, 0.16, h) * (1.0 - smoothstep(0.9, 1.0, h) * 0.35);
          vec3 color = mix(uColorDeep, uColorHot, clamp(flame + (1.0 - radial) * 0.4, 0.0, 1.0));
          float alpha = edge * flame * taper * uOpacity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.matVortexCore = new THREE.MeshBasicMaterial({
      color: 0xffa000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.075,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.matVortexRune = new THREE.MeshStandardMaterial({
      map: lavaTex,
      emissive: new THREE.Color(0xff4500),
      emissiveIntensity: 1.8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.30,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.matVortexRibbon1 = new THREE.MeshBasicMaterial({ color: 0xffb300, side: THREE.DoubleSide, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false });
    this.matVortexRibbon2 = new THREE.MeshBasicMaterial({ color: 0xff4d00, side: THREE.DoubleSide, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false });
    this.matVortexHelixFire = new THREE.MeshBasicMaterial({ color: 0xff5a00, side: THREE.DoubleSide, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending, depthWrite: false });
    this.matVortexHelixHot = new THREE.MeshBasicMaterial({ color: 0xffd54f, side: THREE.DoubleSide, transparent: true, opacity: 0.76, blending: THREE.AdditiveBlending, depthWrite: false });
    this.matVortexWind = new THREE.MeshBasicMaterial({ color: 0xffc107, side: THREE.DoubleSide, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
    this.matVortexFlameCore = new THREE.MeshBasicMaterial({ color: 0xff6d00, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
    this.matVortexEmbers = new THREE.PointsMaterial({ color: 0xffd54f, size: 0.085, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    this.matVortexFlameCard = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPhase: { value: 0 },
        uColor: { value: new THREE.Color(0xff6d00) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPhase;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float sway = sin(uTime * 5.0 + uPhase + uv.y * 8.0) * (0.05 + uv.y * 0.16);
          p.x += sway;
          p.z += cos(uTime * 4.0 + uPhase + uv.y * 6.0) * (0.03 + uv.y * 0.08);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPhase;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float sideFade = pow(1.0 - smoothstep(0.08, 0.5, abs(vUv.x - 0.5)), 1.6);
          float baseFade = smoothstep(0.0, 0.12, vUv.y);
          float tipFade = 1.0 - smoothstep(0.44, 0.9, vUv.y);
          float lick = 0.72 + 0.28 * sin(uTime * 7.0 + uPhase + vUv.y * 12.0);
          float alpha = sideFade * baseFade * tipFade * lick * 0.28;
          vec3 hot = mix(uColor * 0.72, vec3(1.0, 0.55, 0.08), pow(vUv.y, 1.8));
          gl_FragColor = vec4(hot, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.matDomeDivine = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffc107,
      emissiveIntensity: 1.6,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    this.matSealDivine = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });

    this.matDomeFrost = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0a84ff,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.matRuneFrost = new THREE.MeshBasicMaterial({
      color: 0x80d8ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    this.matSpireFrost = new THREE.MeshStandardMaterial({
      color: 0xe0f7fa,
      emissive: 0x00e5ff,
      emissiveIntensity: 2.2,
      roughness: 0.1
    });

    this.matDomeStasis = new THREE.MeshStandardMaterial({
      color: 0xbf5af2,
      emissive: 0x7b1fa2,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    this.matGearStasis = new THREE.MeshBasicMaterial({
      color: 0xe040fb,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });

    this.matSpellLight = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    this.matSpellFrost = new THREE.MeshStandardMaterial({ color: 0xdffbff, emissive: 0x00e5ff, emissiveIntensity: 2.4, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
    this.matSpellChrono = new THREE.MeshBasicMaterial({ color: 0xbf5af2, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    this.matSpellFire = new THREE.MeshBasicMaterial({ color: 0xff5722, transparent: true, opacity: 0.84, side: THREE.DoubleSide, depthWrite: false });
    this.matSoul = new THREE.MeshBasicMaterial({ color: 0x9333ea, transparent: true, opacity: 0.9 });
    this.matChronoGold = new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true });
    this.matGateGold = new THREE.MeshBasicMaterial({ color: 0xffd700 });

    // Keep a small resident light pool.  Unlike the old single shared vortex
    // light, simultaneous co-op fields now retain their own illumination.
    this.vortexLightsPool = [this.vortexLight];
    for (let i = 1; i < 4; i++) {
      const light = new THREE.PointLight(0xff5722, 0, 24);
      this.scene.add(light);
      this.vortexLightsPool.push(light);
    }

    this._setupTransientPools();
  }

  _createVortexHelixGeometry(baseRadius, topRadius, height, turns, segments, tubeRadius, phase = 0) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = phase + t * turns * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(baseRadius, topRadius, t);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0.12 + t * height,
        Math.sin(angle) * radius
      ));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, segments, tubeRadius, 6, false);
  }

  _createVortexEmberGeometry(count, radius, height) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Deterministic distribution keeps asset warmup and replay captures
      // stable while still giving the column a natural turbulent profile.
      const t = (i * 0.61803398875) % 1;
      const angle = t * Math.PI * 2 * 7.0 + (i % 5) * 0.37;
      const radial = 0.18 + ((i * 17) % 101) / 100 * radius * (0.35 + t * 0.65);
      positions[i * 3] = Math.cos(angle) * radial;
      positions[i * 3 + 1] = 0.18 + t * height;
      positions[i * 3 + 2] = Math.sin(angle) * radial;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }

  _setupTransientPools() {
    // Meshes remain in the scene graph but invisible.  Reusing them avoids the
    // add/remove/compile churn that used to happen during dense spell bursts.
    for (let i = 0; i < 512; i++) {
      const mesh = new THREE.Mesh(this.geoBurstDodeca, this.trailWhiteMat);
      mesh.visible = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.userData._vfxPoolEntry = { mesh, active: false };
      this.scene.add(mesh);
      this.particleMeshPool.push(mesh.userData._vfxPoolEntry);
    }

    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(this.geoShockwaveRing, mat);
      mesh.visible = false;
      mesh.rotation.x = -Math.PI / 2;
      this.scene.add(mesh);
      this.shockwavePool.push({ mesh, active: false });
    }

    // A 1px placeholder keeps every pooled SpriteMaterial on the same shader
    // variant before the first combat text arrives.
    const pixel = new Uint8Array([255, 255, 255, 255]);
    this.textPlaceholderTexture = new THREE.DataTexture(pixel, 1, 1, THREE.RGBAFormat);
    this.textPlaceholderTexture.needsUpdate = true;
    for (let i = 0; i < 24; i++) {
      const material = new THREE.SpriteMaterial({
        map: this.textPlaceholderTexture,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.userData._vfxPoolEntry = { sprite, active: false };
      this.scene.add(sprite);
      this.floatingTextPool.push(sprite.userData._vfxPoolEntry);
    }

    // Four concurrent co-op casters is the supported room size.  Keeping one
    // resident entry per possible caster prevents a second player from
    // expanding the pool during an ultimate cast.
    for (const type of Object.keys(this.vortexPool)) {
      for (let i = 0; i < 4; i++) this.vortexPool[type].push(this._createVortexPoolEntry(type));
    }
    for (const type of Object.keys(this.spellEffectPool)) {
      for (let i = 0; i < 4; i++) this.spellEffectPool[type].push(this._createSpellEffectEntry(type));
    }
  }

  setQualityProfile(profile = 'balanced') {
    this.qualityProfile = ['performance', 'balanced', 'ultra'].includes(profile) ? profile : 'balanced';
  }

  setReducedMotion(enabled = false) {
    this.reducedMotion = Boolean(enabled);
  }

  getParticleBudget() {
    if (this.qualityProfile === 'performance') return 260;
    if (this.qualityProfile === 'ultra') return 900;
    return 560;
  }

  _acquireParticleMesh(geometry, material) {
    const budget = this.getParticleBudget();
    if (this.particles.length >= budget) {
      this.vfxStats.droppedEffects += 1;
      return null;
    }
    const entry = this.particleMeshPool.find(candidate => !candidate.active);
    if (!entry) {
      this.vfxStats.droppedEffects += 1;
      return null;
    }
    entry.active = true;
    entry.mesh.visible = true;
    entry.mesh.geometry = geometry;
    entry.mesh.material = material;
    entry.mesh.scale.setScalar(1);
    entry.mesh.rotation.set(0, 0, 0);
    return entry.mesh;
  }

  _releaseParticleMesh(mesh) {
    const entry = mesh?.userData?._vfxPoolEntry;
    if (!entry) return;
    entry.active = false;
    mesh.visible = false;
  }

  _acquireShockwave() {
    const entry = this.shockwavePool.find(candidate => !candidate.active);
    if (!entry) {
      this.vfxStats.droppedEffects += 1;
      return null;
    }
    entry.active = true;
    entry.mesh.visible = true;
    return entry;
  }

  _releaseShockwave(entry) {
    if (!entry) return;
    entry.active = false;
    entry.mesh.visible = false;
    entry.mesh.material.opacity = 0;
  }

  _acquireFloatingText() {
    const entry = this.floatingTextPool.find(candidate => !candidate.active);
    if (!entry) {
      this.vfxStats.droppedEffects += 1;
      return null;
    }
    entry.active = true;
    entry.sprite.visible = true;
    return entry;
  }

  _releaseFloatingText(entry) {
    if (!entry) return;
    entry.active = false;
    entry.sprite.visible = false;
    entry.sprite.material.opacity = 0;
  }

  acquireVortexLight(colorHex, pos) {
    for (const light of this.vortexLightsPool) {
      if (!this.activeVortexLights.has(light)) {
        this.activeVortexLights.add(light);
        light.color.setHex(colorHex);
        light.position.copy(pos);
        light.intensity = 0;
        return light;
      }
    }
    return null;
  }

  releaseVortexLight(light) {
    if (!light) return;
    light.intensity = 0;
    this.activeVortexLights.delete(light);
  }

  registerHeroAsset(type, model) {
    if (!model) return false;
    this.heroAssets[type] = model;
    const targetTypes = {
      fire: ['fire_tornado'],
      frost: ['blizzard'],
      light: ['divine_sanctuary'],
      chrono: ['stasis_dome']
    }[type] || [];
    for (const targetType of targetTypes) {
      for (const entry of this.vortexPool[targetType] || []) {
        if (entry.heroAsset) continue;
        const clone = model.clone(true);
        // Fit authored assets by their measured bounds so Blender/external
        // generator origin conventions cannot leave a spell floating or
        // buried in the floor.
        clone.position.set(0, 0, 0);
        clone.scale.setScalar(1);
        clone.updateMatrixWorld(true);
        const sourceBounds = new THREE.Box3().setFromObject(clone);
        const sourceHeight = Math.max(0.1, sourceBounds.max.y - sourceBounds.min.y);
        const targetHeight = type === 'fire' ? 5.8 : 2.8;
        clone.scale.setScalar(targetHeight / sourceHeight);
        clone.updateMatrixWorld(true);
        const fittedBounds = new THREE.Box3().setFromObject(clone);
        clone.position.y += 0.06 - fittedBounds.min.y;
        clone.userData.baseScale = clone.scale.clone();
        clone.traverse(child => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            child.frustumCulled = true;
          }
        });
        clone.userData.emissiveMaterials = [];
        clone.traverse(child => {
          if (!child.isMesh) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(material => {
            if (material?.emissive) clone.userData.emissiveMaterials.push(material);
          });
        });
        entry.group.add(clone);
        entry.heroAsset = clone;
        // The authored 3D volume becomes the primary fire silhouette. Keep
        // only the ground rune, pooled embers, lighting, and burst fallback;
        // the older flat procedural ribbons are hidden when the asset exists.
        if (type === 'fire') {
          [entry.funnel, entry.core, ...(entry.helixRibbons || []), ...(entry.flameHelixes || []),
            ...(entry.windRings || []), entry.flameCore, ...(entry.flameCards || [])]
            .filter(Boolean)
            .forEach(part => { part.visible = false; });
        }
      }
    }
    return true;
  }

  _createVortexPoolEntry(type) {
    const group = new THREE.Group();
    group.visible = false;
    group.frustumCulled = true;
    const entry = { type, group, active: false, position: new THREE.Vector3(), light: null };

    if (type === 'fire_tornado') {
      const groundRune = new THREE.Mesh(this.geoVortexRuneRing, this.matVortexRune);
      groundRune.rotation.x = -Math.PI / 2;
      const vortexGroup = new THREE.Group();
      const volume = new THREE.Mesh(this.geoVortexVolume, this.matVortexVolume.clone());
      volume.position.y = 2.9;
      vortexGroup.add(volume);
      const funnel = new THREE.Mesh(this.geoVortexFunnel, this.matVortexFunnel);
      funnel.position.y = 3.42;
      vortexGroup.add(funnel);
      const helixRibbons = [];
      for (let r = 0; r < 3; r++) {
        const ribbon = new THREE.Mesh(this.geoVortexRibbons[r], r % 2 === 0 ? this.matVortexRibbon1 : this.matVortexRibbon2);
        ribbon.position.y = 0.75 + r * 1.8;
        ribbon.rotation.x = Math.PI / 2.5;
        ribbon.rotation.z = (r * Math.PI * 2) / 3;
        vortexGroup.add(ribbon);
        helixRibbons.push(ribbon);
      }
      const core = new THREE.Mesh(this.geoVortexCore, this.matVortexCore);
      core.position.y = 3.2;
      vortexGroup.add(core);

      const flameHelixes = [];
      this.geoVortexHelixes.forEach((geometry, idx) => {
        const strand = new THREE.Mesh(geometry, idx % 3 === 1 ? this.matVortexHelixHot : this.matVortexHelixFire);
        strand.rotation.y = (idx * Math.PI * 2) / this.geoVortexHelixes.length;
        vortexGroup.add(strand);
        flameHelixes.push(strand);
      });

      const windRings = [];
      this.geoVortexWindRings.forEach((geometry, idx) => {
        const ring = new THREE.Mesh(geometry, this.matVortexWind);
        ring.position.y = 0.55 + idx * 1.45;
        ring.scale.set(0.82 + idx * 0.14, 1, 0.82 + idx * 0.14);
        ring.rotation.x = Math.PI / 2;
        vortexGroup.add(ring);
        windRings.push(ring);
      });

      const flameCore = new THREE.Mesh(this.geoVortexFlameCore, this.matVortexFlameCore);
      flameCore.position.y = 3.15;
      flameCore.scale.set(0.8, 2.6, 0.8);
      vortexGroup.add(flameCore);

      const flameCards = [];
      for (let c = 0; c < 6; c++) {
        const cardMaterial = this.matVortexFlameCard.clone();
        cardMaterial.uniforms.uPhase.value = (c / 6) * Math.PI * 2;
        cardMaterial.uniforms.uColor.value.setHex(c % 2 === 0 ? 0xff4d00 : 0xffa000);
        const card = new THREE.Mesh(this.geoVortexFlameCard, cardMaterial);
        const angle = (c / 6) * Math.PI * 2;
        const cardRadius = 0.92 + (c % 2) * 0.2;
        card.position.set(Math.cos(angle) * cardRadius, 2.25 + (c % 3) * 0.32, Math.sin(angle) * cardRadius);
        // Tangential cards catch the wind from the side instead of stacking
        // into a flat orange wall when viewed head-on.
        card.rotation.y = angle + Math.PI / 2;
        card.scale.set(0.72 + (c % 3) * 0.09, 1.0 + (c % 2) * 0.08, 1);
        vortexGroup.add(card);
        flameCards.push(card);
      }

      const emberCloud = new THREE.Points(this.geoVortexEmbers, this.matVortexEmbers);
      emberCloud.position.y = 0.1;
      vortexGroup.add(emberCloud);

      group.add(groundRune, vortexGroup);
      Object.assign(entry, { groundRune, vortexGroup, volume, funnel, core, helixRibbons, flameHelixes, windRings, flameCore, flameCards, emberCloud });
    } else if (type === 'divine_sanctuary') {
      const dome = new THREE.Mesh(this.geoDomeHalf, this.matDomeDivine);
      const seal = new THREE.Mesh(this.geoDomeRuneRing, this.matSealDivine);
      seal.rotation.x = -Math.PI / 2;
      group.add(dome, seal);
      Object.assign(entry, { dome, seal });
    } else if (type === 'blizzard') {
      const dome = new THREE.Mesh(this.geoDomeHalf, this.matDomeFrost);
      const rune = new THREE.Mesh(this.geoDomeRuneRing, this.matRuneFrost);
      rune.rotation.x = -Math.PI / 2;
      const spire = new THREE.Mesh(this.geoIceSpire, this.matSpireFrost);
      spire.position.y = 2.1;
      group.add(dome, rune, spire);
      Object.assign(entry, { dome, rune, spire });
    } else if (type === 'stasis_dome') {
      const dome = new THREE.Mesh(this.geoDomeHalf, this.matDomeStasis);
      const gear = new THREE.Mesh(this.geoDomeRuneRing, this.matGearStasis);
      gear.rotation.x = -Math.PI / 2;
      group.add(dome, gear);
      Object.assign(entry, { dome, gear });
    }

    this.scene.add(group);
    return entry;
  }

  _acquireVortexEntry(type) {
    const pool = this.vortexPool[type] || [];
    const entry = pool.find(candidate => !candidate.active);
    if (!entry) {
      this.vfxStats.droppedEffects += 1;
      return null;
    }
    entry.active = true;
    entry.group.visible = true;
    entry.group.scale.set(1, 1, 1);
    entry.group.rotation.set(0, 0, 0);
    return entry;
  }

  _releaseVortexEntry(entry) {
    if (!entry) return;
    entry.active = false;
    entry.group.visible = false;
    entry.group.rotation.set(0, 0, 0);
    entry.group.scale.set(1, 1, 1);
    if (entry.heroAsset) {
      entry.heroAsset.rotation.set(0, 0, 0);
      if (entry.heroAsset.userData.baseScale) entry.heroAsset.scale.copy(entry.heroAsset.userData.baseScale);
    }
    entry.flameHelixes?.forEach((strand, idx) => {
      strand.rotation.set(0, (idx * Math.PI * 2) / entry.flameHelixes.length, 0);
      strand.scale.set(1, 1, 1);
    });
    entry.windRings?.forEach((ring, idx) => {
      ring.rotation.set(Math.PI / 2, 0, idx * 0.7);
      ring.scale.y = 1;
    });
    if (entry.flameCore) entry.flameCore.scale.set(0.8, 2.6, 0.8);
    entry.flameCards?.forEach((card, idx) => {
      card.rotation.set(0, (idx / entry.flameCards.length) * Math.PI * 2 + Math.PI / 2, 0);
      card.material.uniforms.uTime.value = 0;
    });
    if (entry.emberCloud) entry.emberCloud.rotation.set(0, 0, 0);
    this.releaseVortexLight(entry.light);
    entry.light = null;
  }

  _createSpellEffectEntry(type) {
    const group = new THREE.Group();
    group.visible = false;
    group.frustumCulled = true;
    const entry = { type, group, active: false, position: new THREE.Vector3(), target: new THREE.Vector3() };

    if (type === 'heal_beam') {
      const beam = new THREE.Mesh(this.geoSpellBeam, this.matSpellLight.clone());
      const pulse = new THREE.Mesh(this.geoSpellPulse, this.matSpellLight.clone());
      pulse.rotation.x = -Math.PI / 2;
      const stars = [];
      for (let i = 0; i < 4; i++) {
        const star = new THREE.Mesh(this.geoSpellStar, this.matSpellLight.clone());
        stars.push(star);
        group.add(star);
      }
      group.add(beam, pulse);
      Object.assign(entry, { beam, pulse, stars });
    } else if (type === 'cleansing_wave') {
      const wave = new THREE.Mesh(this.geoSpellPulse, this.matSpellLight.clone());
      const inner = new THREE.Mesh(this.geoSpellPulse, this.matSpellLight.clone());
      wave.rotation.x = -Math.PI / 2;
      inner.rotation.x = -Math.PI / 2;
      const stars = [];
      for (let i = 0; i < 6; i++) {
        const star = new THREE.Mesh(this.geoSpellStar, this.matSpellLight.clone());
        stars.push(star);
        group.add(star);
      }
      group.add(wave, inner);
      Object.assign(entry, { wave, inner, stars });
    } else if (type === 'glacial_bulwark') {
      const bubble = new THREE.Mesh(this.geoShieldBubble, this.matSpellFrost.clone());
      const ring = new THREE.Mesh(this.geoSpellPulse, this.matFrostRuneRing.clone());
      ring.rotation.x = -Math.PI / 2;
      group.add(bubble, ring);
      Object.assign(entry, { bubble, ring });
    } else if (type === 'temporal_rewind') {
      const outer = new THREE.Mesh(this.geoTimeGlyph, this.matSpellChrono.clone());
      const inner = new THREE.Mesh(this.geoTimeGlyph, this.matSpellLight.clone());
      outer.rotation.x = Math.PI / 2;
      inner.rotation.x = Math.PI / 2;
      group.add(outer, inner);
      Object.assign(entry, { outer, inner });
    } else if (type === 'time_dilation') {
      const outer = new THREE.Mesh(this.geoTimeGlyph, this.matSpellChrono.clone());
      const inner = new THREE.Mesh(this.geoSpellPulse, this.matSpellChrono.clone());
      outer.rotation.x = Math.PI / 2;
      inner.rotation.x = -Math.PI / 2;
      group.add(outer, inner);
      Object.assign(entry, { outer, inner });
    }

    this.scene.add(group);
    return entry;
  }

  _acquireSpellEffect(type) {
    const pool = this.spellEffectPool[type] || [];
    const entry = pool.find(candidate => !candidate.active);
    if (!entry) {
      this.vfxStats.droppedEffects += 1;
      return null;
    }
    entry.active = true;
    entry.group.visible = true;
    entry.group.rotation.set(0, 0, 0);
    entry.group.scale.set(1, 1, 1);
    return entry;
  }

  _releaseSpellEffect(entry) {
    if (!entry) return;
    entry.active = false;
    entry.group.visible = false;
    entry.group.rotation.set(0, 0, 0);
    entry.group.scale.set(1, 1, 1);
    entry.group.traverse(child => {
      if (child.material?.opacity !== undefined) child.material.opacity = 0.8;
    });
  }

  _setBeamBetween(beam, origin, target) {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dz = target.z - origin.z;
    const distance = Math.max(0.25, Math.hypot(dx, dy, dz));
    beam.position.set(0, distance * 0.5, 0);
    beam.scale.set(1, distance / 1.4, 1);
    if (!this._beamAxis) this._beamAxis = new THREE.Vector3(0, 1, 0);
    if (!this._beamDirection) this._beamDirection = new THREE.Vector3();
    this._beamDirection.set(dx / distance, dy / distance, dz / distance);
    beam.quaternion.setFromUnitVectors(this._beamAxis, this._beamDirection);
    return distance;
  }

  spawnHealingBeam(origin, target = origin, duration = 0.8, element = 'light') {
    const entry = this._acquireSpellEffect('heal_beam');
    if (!entry) return null;
    entry.group.position.copy(origin);
    entry.position.copy(origin);
    entry.target.copy(target);
    entry.life = duration;
    entry.maxLife = duration;
    entry.beam.material.color.setHex(element === 'chrono' ? 0xbf5af2 : 0xffd700);
    entry.pulse.material.color.setHex(element === 'chrono' ? 0xbf5af2 : 0xffd700);
    entry.pulse.position.set(target.x - origin.x, target.y - origin.y, target.z - origin.z);
    this._setBeamBetween(entry.beam, origin, target);
    entry.stars.forEach((star, idx) => {
      const t = (idx + 1) / (entry.stars.length + 1);
      star.position.set((target.x - origin.x) * t, (target.y - origin.y) * t, (target.z - origin.z) * t);
      star.scale.setScalar(0.7);
    });
    this.spellEffects.push(entry);
    return entry;
  }

  spawnCleansingWave(pos, duration = 1.0) {
    const entry = this._acquireSpellEffect('cleansing_wave');
    if (!entry) return null;
    entry.group.position.set(pos.x, 0.06, pos.z);
    entry.position.copy(pos);
    entry.life = duration;
    entry.maxLife = duration;
    entry.wave.scale.setScalar(0.25);
    entry.inner.scale.setScalar(0.15);
    entry.wave.material.opacity = 0.95;
    entry.inner.material.opacity = 0.65;
    entry.stars.forEach((star, idx) => {
      const angle = (idx / entry.stars.length) * Math.PI * 2;
      star.position.set(Math.cos(angle) * 0.8, 0.35, Math.sin(angle) * 0.8);
      star.scale.setScalar(0.8);
    });
    this.spellEffects.push(entry);
    return entry;
  }

  spawnGlacialBulwark(pos, duration = 5.0) {
    const entry = this._acquireSpellEffect('glacial_bulwark');
    if (!entry) return null;
    entry.group.position.set(pos.x, 1.0, pos.z);
    entry.position.copy(pos);
    entry.life = duration;
    entry.maxLife = duration;
    entry.bubble.scale.setScalar(1.55);
    entry.ring.scale.setScalar(1.6);
    entry.bubble.material.opacity = 0.32;
    entry.ring.material.opacity = 0.8;
    this.spellEffects.push(entry);
    return entry;
  }

  spawnTemporalRewind(pos, duration = 1.2) {
    const entry = this._acquireSpellEffect('temporal_rewind');
    if (!entry) return null;
    entry.group.position.set(pos.x, 1.0, pos.z);
    entry.position.copy(pos);
    entry.life = duration;
    entry.maxLife = duration;
    entry.outer.scale.setScalar(1.5);
    entry.inner.scale.setScalar(0.9);
    entry.outer.material.opacity = 0.85;
    entry.inner.material.opacity = 0.75;
    this.spellEffects.push(entry);
    return entry;
  }

  spawnTimeDilation(pos, radius = 5.5, duration = 3.0) {
    const entry = this._acquireSpellEffect('time_dilation');
    if (!entry) return null;
    entry.group.position.set(pos.x, 0.08, pos.z);
    entry.position.copy(pos);
    entry.life = duration;
    entry.maxLife = duration;
    entry.radius = radius;
    entry.outer.scale.setScalar(radius);
    entry.inner.scale.setScalar(radius * 0.72);
    entry.outer.material.opacity = 0.75;
    entry.inner.material.opacity = 0.48;
    this.spellEffects.push(entry);
    return entry;
  }

  acquireProjectileLight(colorHex, pos) {
    for (const light of this.projectileLightsPool) {
      if (!this.activeProjectileLights.has(light)) {
        this.activeProjectileLights.add(light);
        light.color.setHex(colorHex);
        light.position.copy(pos);
        light.intensity = 3.2;
        return light;
      }
    }
    return null;
  }

  releaseProjectileLight(light) {
    if (light) {
      light.intensity = 0;
      this.activeProjectileLights.delete(light);
    }
  }

  /**
   * Spawns an animated magical projectile with unique 3D geometries per spell (zero dynamic allocations)
   */
  spawnProjectile(origin, direction, spellType, element, speed = 24, maxDist = 35, worldImpact = null) {
    const group = new THREE.Group();
    group.position.copy(origin);

    const normDir = direction.clone().normalize();
    const rotQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normDir);

    let lightColor = this.elementColors[element] || 0xff5722;

    if (element === 'fire') {
      if (spellType === 'skill1') {
        // Fireball: a layered 3D molten shell, animated flame cards, dual
        // coronal rings, and orbiting plasma embers.  The shell is deliberately
        // separate from the optional generated GLB so the fallback remains
        // visually complete on every device.
        const shell = new THREE.Mesh(this.geoFireballShell, this.matFireballShell);
        group.add(shell);

        const core = new THREE.Mesh(this.geoCoreHighPoly, this.matFirePlasmaCore);
        core.scale.setScalar(0.72);
        group.add(core);

        const ringOuter = new THREE.Mesh(this.geoAstrolabeOuter, this.matFireRuneRing);
        ringOuter.rotation.x = Math.PI / 2;
        group.add(ringOuter);

        const ringInner = new THREE.Mesh(this.geoAstrolabeInner, this.matFireRuneRing);
        ringInner.rotation.y = Math.PI / 2;
        group.add(ringInner);

        const orbiters = [];
        for (let o = 0; o < 4; o++) {
          const orb = new THREE.Mesh(this.geoBurstOcta, this.matFirePlasmaCore);
          group.add(orb);
          orbiters.push(orb);
        }

        const flameCards = [];
        for (let c = 0; c < 4; c++) {
          const cardMaterial = this.matFireballFlameCard.clone();
          cardMaterial.uniforms.uPhase.value = c * Math.PI * 0.5;
          const card = new THREE.Mesh(this.geoFireballFlameCard, cardMaterial);
          const angle = c * Math.PI * 0.5;
          card.position.set(Math.cos(angle) * 0.26, 0.05, Math.sin(angle) * 0.26);
          card.rotation.y = angle;
          card.scale.set(0.72, 0.92 + (c % 2) * 0.12, 1);
          group.add(card);
          flameCards.push(card);
        }

        const heroAsset = this.heroAssets.fireball?.clone?.(true) || null;
        if (heroAsset) {
          heroAsset.name = 'FireballHeroAsset';
          heroAsset.scale.setScalar(0.95);
          heroAsset.traverse(child => {
            if (child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;
              child.frustumCulled = true;
            }
          });
          group.add(heroAsset);
        }
        group.userData = { ringOuter, ringInner, orbiters, flameCards, shell, heroAsset, orbitRadius: 0.72 };
      } else if (spellType === 'skill2') {
        // Flame Wave: Tiered crescent magma wave with forward thermal crest
        const wave = new THREE.Mesh(this.geoFlameWave, this.matFireWave);
        wave.quaternion.copy(rotQuat);
        wave.rotation.z = Math.PI / 2;
        group.add(wave);

        const crest = new THREE.Mesh(this.geoAstrolabeInner, this.matFireRuneRing);
        crest.quaternion.copy(rotQuat);
        group.add(crest);
        group.userData = { ringOuter: crest };
      } else {
        // Basic Ember Bolt: High-energy plasma teardrop with spinning flame spiral knot
        const bolt = new THREE.Mesh(this.geoEmberBolt, this.matFirePlasmaCore);
        bolt.quaternion.copy(rotQuat);
        group.add(bolt);

        const spiral = new THREE.Mesh(this.geoEmberSpiral, this.matFireRuneRing);
        spiral.quaternion.copy(rotQuat);
        group.add(spiral);
        group.userData = { spiral };
      }
    } else if (element === 'frost') {
      if (spellType === 'skill1') {
        // Ice Lance: Faceted crystalline spear with base frost rune disc & orbiting ice shards
        const lance = new THREE.Mesh(this.geoIceLance, this.matFrostCrystal);
        lance.quaternion.copy(rotQuat);
        group.add(lance);

        const runeBase = new THREE.Mesh(this.geoRuneRingPlane, this.matFrostRuneRing);
        runeBase.quaternion.copy(rotQuat);
        group.add(runeBase);

        const orbiters = [];
        for (let s = 0; s < 4; s++) {
          const sMesh = new THREE.Mesh(this.geoIceShard, this.matFrostCrystal);
          group.add(sMesh);
          orbiters.push(sMesh);
        }
        group.userData = { dial: runeBase, orbiters, orbitRadius: 0.62 };
      } else {
        // Frost Shard: Faceted shimmering crystal diamond with frost halo
        const shard = new THREE.Mesh(this.geoFrostDiamond, this.matFrostCrystal);
        group.add(shard);

        const halo = new THREE.Mesh(this.geoHaloRing, this.matFrostRuneRing);
        halo.quaternion.copy(rotQuat);
        group.add(halo);
        group.userData = { halo };
      }
    } else if (element === 'light') {
      // Sacred Spark: Pulsing solar orb with rotating celestial halo & radiant cross glints
      const spark = new THREE.Mesh(this.geoSparkSphere, this.matSolarCore);
      group.add(spark);

      const halo = new THREE.Mesh(this.geoRuneRingPlane, this.matSolarHalo);
      halo.quaternion.copy(rotQuat);
      group.add(halo);

      const flareH = new THREE.Mesh(this.geoCrossFlare, this.matSolarFlare);
      flareH.quaternion.copy(rotQuat);
      group.add(flareH);

      const flareV = new THREE.Mesh(this.geoCrossFlare, this.matSolarFlare);
      flareV.quaternion.copy(rotQuat);
      flareV.rotation.z += Math.PI / 2;
      group.add(flareV);

      group.userData = { halo, flareH, flareV };
    } else {
      // Chronomancer: Astral stardrop with dual astrolabe gimbal rings & clockwork dial
      const chrono = new THREE.Mesh(this.geoChronoDodeca, this.matChronoCore);
      group.add(chrono);

      const ringOuter = new THREE.Mesh(this.geoAstrolabeOuter, this.matChronoRingTorus);
      group.add(ringOuter);

      const ringInner = new THREE.Mesh(this.geoAstrolabeInner, this.matChronoRingTorus);
      ringInner.rotation.x = Math.PI / 2;
      group.add(ringInner);

      const dial = new THREE.Mesh(this.geoRuneRingPlane, this.matChronoDial);
      dial.quaternion.copy(rotQuat);
      group.add(dial);

      group.userData = { ringOuter, ringInner, dial };
    }

    const pooledLight = this.acquireProjectileLight(lightColor, group.position);

    this.scene.add(group);

    this.projectiles.push({
      mesh: group,
      light: pooledLight,
      baseIntensity: 3.2,
      direction: normDir,
      speed,
      distanceTraveled: 0,
      maxDist,
      element,
      spellType,
      worldImpact,
      collisionRadius: spellType === 'skill1' ? 0.52 : (spellType === 'skill2' ? 0.38 : 0.22),
      previousPosition: group.position.clone(),
      trailTimer: 0
    });
  }

  /**
   * A surface-aware impact used by the shared collision path.  Ground hits
   * receive the full decal/shockwave treatment; wall and ceiling hits still
   * get the burst without placing a floor decal at the wrong height.
   */
  spawnSurfaceImpact(pos, element = 'fire', normal = null) {
    const isGround = !normal || Math.abs(Number(normal.y) || 0) > 0.55;
    if (isGround) {
      this.spawnBurst(pos, element, this.qualityProfile === 'ultra' ? 32 : 22, { addDecal: true });
    } else {
      const count = this.qualityProfile === 'performance' ? 10 : 16;
      this.spawnBurst(pos, element, count, { addDecal: false });
    }
  }

  /**
   * Spawns an expanding ground / air shockwave ring
   */
  spawnImpactShockwave(pos, color = 0xff5722, maxRadius = 3.5, duration = 0.45) {
    const pooled = this._acquireShockwave();
    if (!pooled) return null;
    const ring = pooled.mesh;
    ring.material.color.setHex(color);
    ring.material.opacity = 0.85;
    ring.position.copy(pos);
    ring.position.y = Math.max(0.1, pos.y);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.set(1, 1, 1);
    this.scene.add(ring);

    this.shockwaves.push({
      mesh: ring,
      poolEntry: pooled,
      radius: 0.4,
      maxRadius,
      duration,
      life: duration,
      initialOpacity: 0.85
    });
  }

  /**
   * Spawns an animated 5-Second Infernal Fire Tornado
   * Multi-stage swirling flame vortex with real PBR lava/fire textures,
   * 3 counter-rotating spiral flame ribbons, white-hot plasma eye, and swirling ember helix!
   */
  spawnFireTornado(groundPos, duration = 5.0, tickDamage = 32, radius = 5.5) {
    const entry = this._acquireVortexEntry('fire_tornado');
    if (!entry) return null;
    const group = entry.group;
    group.position.copy(groundPos);
    group.position.y = 0.05;
    entry.position.copy(groundPos);
    entry.groundRune.rotation.z = 0;
    entry.vortexGroup.rotation.set(0, 0, 0);
    const visualScale = THREE.MathUtils.clamp(radius / 5.5, 0.78, 1.45);
    entry.vortexGroup.scale.set(visualScale, visualScale, visualScale);
    entry.helixRibbons.forEach((ribbon, idx) => {
      ribbon.rotation.z = (idx * Math.PI * 2) / 3;
    });
    entry.flameHelixes?.forEach((strand, idx) => {
      strand.rotation.y = (idx * Math.PI * 2) / entry.flameHelixes.length;
      strand.scale.set(1, 1, 1);
    });
    entry.windRings?.forEach((ring, idx) => {
      ring.rotation.z = idx * 0.7;
      ring.scale.y = 1;
    });
    if (entry.flameCore) entry.flameCore.scale.set(0.8, 2.6, 0.8);
    entry.flameCards?.forEach((card, idx) => {
      card.rotation.set(0, (idx / entry.flameCards.length) * Math.PI * 2 + Math.PI / 2, 0);
      card.material.uniforms.uTime.value = 0;
    });
    if (entry.emberCloud) entry.emberCloud.rotation.set(0, 0, 0);
    const light = this.acquireVortexLight(0xff5722, groundPos);
    if (light) {
      light.position.y += 3.5;
      light.intensity = this.reducedMotion ? 2.6 : 4.8;
    }
    this.vortices.push({
      type: 'fire_tornado',
      group,
      vortexGroup: entry.vortexGroup,
      funnel: entry.funnel,
      core: entry.core,
      volume: entry.volume,
      helixRibbons: entry.helixRibbons,
      flameHelixes: entry.flameHelixes,
      windRings: entry.windRings,
      flameCore: entry.flameCore,
      flameCards: entry.flameCards,
      emberCloud: entry.emberCloud,
      heroAsset: entry.heroAsset,
      visualScale,
      light,
      groundRune: entry.groundRune,
      poolEntry: entry,
      position: entry.position,
      life: duration,
      maxLife: duration,
      radius,
      tickDamage,
      tickRate: 0.35,
      nextTick: 0.35
    });
  }

  /**
   * Spawns Divine Sanctuary Golden Cathedral Dome
   */
  spawnDivineSanctuary(groundPos, duration = 6.0, radius = 6.0) {
    const entry = this._acquireVortexEntry('divine_sanctuary');
    if (!entry) return null;
    const group = entry.group;
    group.position.copy(groundPos);
    group.position.y = 0.05;
    entry.position.copy(groundPos);
    entry.seal.rotation.z = 0;
    entry.dome.material.opacity = 0.38;
    entry.seal.material.opacity = 0.75;
    const light = this.acquireVortexLight(0xffd700, groundPos);
    if (light) { light.position.y += 2.0; light.intensity = this.reducedMotion ? 2.0 : 3.8; }

    this.vortices.push({
      type: 'divine_sanctuary',
      group,
      dome: entry.dome,
      seal: entry.seal,
      light,
      poolEntry: entry,
      position: entry.position,
      life: duration,
      maxLife: duration,
      radius,
      tickRate: 0.8,
      nextTick: 0.8
    });
  }

  /**
   * Spawns Cryomancer Glacial Blizzard Zone
   */
  spawnBlizzardZone(groundPos, duration = 6.0, radius = 7.0, tickDamage = 28) {
    const entry = this._acquireVortexEntry('blizzard');
    if (!entry) return null;
    const group = entry.group;
    group.position.copy(groundPos);
    group.position.y = 0.05;
    entry.position.copy(groundPos);
    entry.rune.rotation.z = 0;
    entry.dome.material.opacity = 0.35;
    entry.rune.material.opacity = 0.75;
    entry.spire.scale.set(1, 1, 1);
    const light = this.acquireVortexLight(0x00e5ff, groundPos);
    if (light) { light.position.y += 2.0; light.intensity = this.reducedMotion ? 1.8 : 3.6; }

    this.vortices.push({
      type: 'blizzard',
      group,
      dome: entry.dome,
      rune: entry.rune,
      spire: entry.spire,
      light,
      poolEntry: entry,
      position: entry.position,
      life: duration,
      maxLife: duration,
      radius,
      tickDamage,
      tickRate: 0.4,
      nextTick: 0.4
    });
  }

  /**
   * Spawns Chronomancer Temporal Stasis Dome
   */
  spawnTemporalStasisDome(groundPos, duration = 5.0, radius = 6.5, tickDamage = 35) {
    const entry = this._acquireVortexEntry('stasis_dome');
    if (!entry) return null;
    const group = entry.group;
    group.position.copy(groundPos);
    group.position.y = 0.05;
    entry.position.copy(groundPos);
    entry.gear.rotation.z = 0;
    entry.dome.material.opacity = 0.38;
    entry.gear.material.opacity = 0.75;
    const light = this.acquireVortexLight(0xbf5af2, groundPos);
    if (light) { light.position.y += 2.0; light.intensity = this.reducedMotion ? 1.8 : 3.6; }

    this.vortices.push({
      type: 'stasis_dome',
      group,
      dome: entry.dome,
      gear: entry.gear,
      light,
      poolEntry: entry,
      position: entry.position,
      life: duration,
      maxLife: duration,
      radius,
      tickDamage,
      tickRate: 0.5,
      nextTick: 0.5
    });
  }

  /**
   * Spawns Arcane Barrage Telegraph Ground Warning & Meteor Barrage
   */
  spawnArcaneBarrageTelegraph(targetPos, duration = 2.0) {
    const group = new THREE.Group();
    group.position.copy(targetPos);
    group.position.y = 0.08;

    // Outer warning reticle ring
    const ringGeo = new THREE.RingGeometry(3.2, 3.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe040fb,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    // Inner charging circle
    const innerGeo = new THREE.CircleGeometry(3.2, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x9c27b0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = -Math.PI / 2;
    group.add(inner);

    const light = new THREE.PointLight(0xe040fb, 2.5, 12);
    light.position.y = 0.5;
    group.add(light);

    this.scene.add(group);

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.05;
      ring.scale.setScalar(1 + 0.1 * Math.sin(elapsed * 15));
      inner.scale.setScalar(Math.min(1.0, elapsed / duration));
      if (elapsed >= duration) {
        clearInterval(interval);
        this.scene.remove(group);
        // Rain down arcane meteors
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            const offset = new THREE.Vector3(
              (Math.random() - 0.5) * 4.0,
              12 + Math.random() * 4,
              (Math.random() - 0.5) * 4.0
            );
            const dropPos = targetPos.clone().add(offset);
            const target = targetPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3));
            const dir = target.clone().sub(dropPos).normalize();
            this.spawnProjectile(dropPos, dir, 'ult', 'chrono');
          }, i * 160);
        }
      }
    }, 50);
  }

  /**
   * Spawns Expanding Astral Nova Celestial Shockwave
   */
  spawnAstralNova(centerPos, maxRadius = 18.0, duration = 2.8) {
    this.spawnImpactShockwave(centerPos, 0xba68c8, maxRadius, duration);

    this.spawnBurst(centerPos, 'chrono', 48);
  }

  /**
   * Spawns Chrono Vortex Time Slow Zone
   */
  spawnChronoVortex(pos, duration = 4.0, radius = 7.0) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.position.y = 0.08;

    const ringGeo = new THREE.RingGeometry(1.5, radius, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7c4dff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    const light = new THREE.PointLight(0x7c4dff, 3.0, 15);
    light.position.y = 1.0;
    group.add(light);

    this.scene.add(group);

    this.vortices.push({
      type: 'chrono_vortex',
      group,
      light,
      position: pos.clone(),
      life: duration,
      maxLife: duration,
      radius,
      tickRate: 0.5,
      nextTick: 0.5
    });
  }

  /**
   * Spawns an explosion / burst of particles and expanding shockwave
   */
  spawnBurst(pos, element, count = 28, options = {}) {
    let color = 0xff5722;
    let secondaryColor = 0xffd600;
    if (element === 'frost') {
      color = 0x00e5ff;
      secondaryColor = 0xffffff;
    } else if (element === 'light') {
      color = 0xffd700;
      secondaryColor = 0xfff9c4;
    } else if (element === 'chrono') {
      color = 0xbf5af2;
      secondaryColor = 0xff007f;
    } else if (element === 'storm') {
      color = 0xffd60a;
      secondaryColor = 0x00e5ff;
    }

    // Trigger dynamic spell impact decal mark on ground
    if (this.decalManager && options.addDecal !== false) {
      this.decalManager.spawnImpactDecal(pos, element);
    }

    // Trigger expanding ground shockwave ring
    this.spawnImpactShockwave(pos, color, 3.6, 0.45);

    // Safety particle pool cap to prevent frame drops in intense combat
    while (this.particles.length > Math.max(24, this.getParticleBudget() - count)) {
      const old = this.particles.shift();
      if (old && old.mesh) this._releaseParticleMesh(old.mesh);
    }

    const geo1 = this.geoBurstDodeca;
    const geo2 = this.geoBurstOcta;
    const mat1 = this.trailMats[element] || this.trailMats.fire;
    const mat2 = this.trailWhiteMat;

    for (let i = 0; i < count; i++) {
      const isSecondary = i % 3 === 0;
      const p = this._acquireParticleMesh(i % 2 === 0 ? geo1 : geo2, isSecondary ? mat2 : mat1);
      if (!p) break;
      p.position.copy(pos);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 4.5 + Math.random() * 9.5;

      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed + 2.5,
        Math.cos(phi) * speed
      );

      this.scene.add(p);
      this.particles.push({
        mesh: p,
        velocity: vel,
        life: 0.6 + Math.random() * 0.45,
        maxLife: 1.05,
        canBounce: true,
        rotSpeed: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10)
      });
    }
  }

  /**
   * Spawns floating upward soul dissolution when enemies die
   */
  spawnSoulDissolution(pos, color = 0x9333ea, count = 24) {
    this.spawnImpactShockwave(pos, color, 3.2, 0.65);

    const geo = this.geoBurstOcta;
    const mat = this.matSoul;
    mat.color.setHex(color);
    mat.opacity = 0.9;

    for (let i = 0; i < count; i++) {
      const p = this._acquireParticleMesh(geo, mat);
      if (!p) break;
      p.position.copy(pos);
      p.position.y += Math.random() * 0.8;

      const theta = (i / count) * Math.PI * 2;
      const radius = 0.4 + Math.random() * 0.7;
      const vel = new THREE.Vector3(
        Math.cos(theta) * radius,
        1.8 + Math.random() * 3.0,
        Math.sin(theta) * radius
      );

      this.particles.push({
        mesh: p,
        velocity: vel,
        life: 0.9 + Math.random() * 0.7,
        maxLife: 1.6,
        canBounce: false,
        rotSpeed: new THREE.Vector3(3, 4, 3)
      });
    }
  }

  /**
   * Floating Combat Text (Billboards with cached canvas textures & sprite pooling)
   */
  spawnFloatingText(pos, text, color = '#ff3b30') {
    if (!this.textTextureCache) this.textTextureCache = new Map();
    const cacheKey = `${text}_${color}`;
    let texture = this.textTextureCache.get(cacheKey);

    if (!texture) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillStyle = color;
      ctx.fillText(text, 128, 64);

      texture = new THREE.CanvasTexture(canvas);
      this.textTextureCache.set(cacheKey, texture);
    }

    const entry = this._acquireFloatingText();
    if (!entry) return;
    const sprite = entry.sprite;
    sprite.material.map = texture;
    sprite.material.needsUpdate = true;
    sprite.material.opacity = 1;
    sprite.position.copy(pos);
    sprite.position.y += 1.8;
    sprite.scale.set(2.4, 1.2, 1);

    this.floatingTexts.push({
      sprite,
      poolEntry: entry,
      life: 0.85,
      maxLife: 0.85
    });
  }

  /**
   * Chronomancy Time-Reversal Burst (Golden gears, spiral clock runes, reverse time sparkles)
   */
  spawnChronomancyBurst(pos, color = 0xd500f9) {
    this.spawnImpactShockwave(pos, 0xffd700, 4.2, 0.75);
    this.spawnImpactShockwave(pos, color, 2.8, 0.55);

    const geo = this.geoBurstOcta;
    const chronoMat = this.matChronoGold;
    const violetMat = this.matSpellChrono;
    violetMat.color.setHex(color);

    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;
      const upward = 1.5 + Math.random() * 3.5;
      const mesh = this._acquireParticleMesh(geo, i % 2 === 0 ? chronoMat : violetMat);
      if (!mesh) break;
      mesh.position.copy(pos);
      mesh.position.y += 1.0;

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upward,
          Math.sin(angle) * speed
        ),
        life: 0.9 + Math.random() * 0.4,
        maxLife: 1.3,
        canBounce: false,
        rotSpeed: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6)
      });
    }
  }

  /**
   * Radiant Gate Dissolve effect when the starting room Runegate opens
   */
  spawnGateDissolve(pos) {
    this.spawnImpactShockwave(pos, 0xffd700, 6.0, 0.9);
    this.spawnImpactShockwave(pos, 0x00e5ff, 4.5, 0.7);

    const geo = this.geoSpellStar;
    const mat = this.matGateGold;

    for (let i = 0; i < 42; i++) {
      const mesh = this._acquireParticleMesh(geo, mat);
      if (!mesh) break;
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 4.5,
        pos.y + Math.random() * 4.0,
        pos.z + (Math.random() - 0.5) * 1.5
      );
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3.5,
          2.0 + Math.random() * 4.0,
          (Math.random() - 0.5) * 3.5
        ),
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        canBounce: false,
        rotSpeed: new THREE.Vector3(4, 5, 4)
      });
    }
  }

  /**
   * Spawns physical 3D gold coins that explode outwards, bounce with gravity, and magnetize to player
   */
  spawnPhysicalCoins(origin, count = 5, totalGold = 25, onCollect = null) {
    const coinPBR = TextureGenerator.createGoldCoinPBR();
    const geo = this.geoCoin || new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
    const valuePerCoin = Math.max(1, Math.floor(totalGold / Math.max(1, count)));

    for (let c = 0; c < count; c++) {
      const mesh = new THREE.Mesh(geo, coinPBR.material);
      mesh.position.copy(origin);
      mesh.position.y += 0.8;
      mesh.castShadow = true;

      // Golden gleam light
      const light = new THREE.PointLight(0xffd700, 1.4, 4);
      mesh.add(light);

      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const horizontalSpeed = 1.6 + Math.random() * 2.8;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * horizontalSpeed,
        3.2 + Math.random() * 2.4,
        Math.sin(angle) * horizontalSpeed
      );

      const rotVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 16
      );

      this.physicalCoins.push({
        mesh,
        light,
        velocity,
        rotVelocity,
        value: valuePerCoin,
        life: 25.0,
        maxLife: 25.0,
        onCollect
      });
    }
  }

  /**
   * Spawns a high-energy elemental muzzle flash flare at the casting point (zero-allocation)
   */
  spawnMuzzleFlash(origin, direction, element = 'fire') {
    const col = this.elementColors[element] || 0xff5722;

    // Modulate persistent light without mutating scene graph
    this.muzzleFlashLight.color.setHex(col);
    this.muzzleFlashLight.position.copy(origin);
    this.muzzleFlashLight.intensity = 4.5;
    this.muzzleFlashTimer = 0.085;

    // Radiating spark burst along direction using shared geo & mat
    const normDir = direction ? direction.clone().normalize() : new THREE.Vector3(0, 0, -1);
    const mat = this.muzzleSparkMaterials[element] || this.muzzleSparkMaterials.fire;

    for (let s = 0; s < 8; s++) {
      const spark = this._acquireParticleMesh(this.geoMuzzleSpark, mat);
      if (!spark) break;
      spark.position.copy(origin);

      this.particles.push({
        mesh: spark,
        velocity: new THREE.Vector3(
          normDir.x * 4.0 + (Math.random() - 0.5) * 2.5,
          normDir.y * 4.0 + (Math.random() - 0.5) * 2.5,
          normDir.z * 4.0 + (Math.random() - 0.5) * 2.5
        ),
        life: 0.16 + Math.random() * 0.1,
        maxLife: 0.26,
        canBounce: false
      });
    }
  }

  /**
   * Main Frame Tick for Particles, Projectiles, Shockwaves, Physical Coins, and Vortexes
   */
  update(deltaTime, onProjectileHit = null, onVortexTick = null, playerPos = null) {
    // 0. Tick Persistent Muzzle Flash Light
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= deltaTime;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashLight.intensity = 0;
      }
    }

    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.previousPosition.copy(p.mesh.position);
      const moveStep = p.speed * deltaTime;
      p.mesh.position.addScaledVector(p.direction, moveStep);
      p.distanceTraveled += moveStep;

      // Update pooled light position and pulse
      if (p.light) {
        p.light.position.copy(p.mesh.position);
        p.light.intensity = p.baseIntensity * (0.85 + Math.sin(p.distanceTraveled * 12) * 0.25);
      }

      // Animate multi-layered spinning projectile components smoothly
      if (p.mesh.userData) {
        const ud = p.mesh.userData;
        if (ud.ringOuter) ud.ringOuter.rotation.z += deltaTime * 12;
        if (ud.ringInner) ud.ringInner.rotation.x -= deltaTime * 15;
        if (ud.dial) ud.dial.rotation.z -= deltaTime * 8;
        if (ud.halo) ud.halo.rotation.z += deltaTime * 6;
        if (ud.flareH) ud.flareH.rotation.z += deltaTime * 4;
        if (ud.flareV) ud.flareV.rotation.z += deltaTime * 4;
        if (ud.spiral) {
          ud.spiral.rotation.y += deltaTime * 16;
          ud.spiral.rotation.z += deltaTime * 8;
        }
        if (ud.shell?.material?.uniforms?.uTime) ud.shell.material.uniforms.uTime.value += deltaTime;
        if (ud.flameCards) {
          ud.flameCards.forEach((card, idx) => {
            const uniforms = card.material?.uniforms;
            if (uniforms?.uTime) uniforms.uTime.value += deltaTime;
            card.rotation.z += deltaTime * (idx % 2 === 0 ? 3.5 : -2.8);
            const pulse = 1.0 + Math.sin((p.distanceTraveled + idx) * 7.0) * 0.08;
            card.scale.y = pulse * (0.92 + (idx % 2) * 0.12);
          });
        }
        if (ud.orbiters) {
          p.orbitAngle = (p.orbitAngle || 0) + deltaTime * 8;
          const rad = ud.orbitRadius || 0.65;
          ud.orbiters.forEach((orb, idx) => {
            const angle = p.orbitAngle + (idx * Math.PI * 2) / ud.orbiters.length;
            orb.position.set(Math.cos(angle) * rad, Math.sin(angle * 1.6) * 0.22, Math.sin(angle) * rad);
            orb.rotation.y += deltaTime * 8;
          });
        }
      }

      // Emit trailing spark showers using pre-allocated geometries & materials
      p.trailTimer = (p.trailTimer || 0) + deltaTime;
      if (!this.reducedMotion && p.trailTimer > 0.035) {
        p.trailTimer = 0;
        const trailMat = this.trailMats[p.element] || this.trailMats.fire;

        for (let t = 0; t < 2; t++) {
          const trailPart = this._acquireParticleMesh(this.geoTrailOcta, t === 1 ? this.trailWhiteMat : trailMat);
          if (!trailPart) break;
          trailPart.position.copy(p.mesh.position);
          trailPart.position.x += (Math.random() - 0.5) * 0.15;
          trailPart.position.y += (Math.random() - 0.5) * 0.15;
          trailPart.position.z += (Math.random() - 0.5) * 0.15;
          this.particles.push({
            mesh: trailPart,
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 1.2 - p.direction.x * 2.0,
              (Math.random() - 0.5) * 1.2 - p.direction.y * 2.0,
              (Math.random() - 0.5) * 1.2 - p.direction.z * 2.0
            ),
            life: 0.28,
            maxLife: 0.28,
            canBounce: false
          });
        }
      }

      // Check collision callback
      const collision = onProjectileHit ? onProjectileHit(p) : null;
      if (collision) {
        const impactPoint = collision.point || collision.position;
        if (impactPoint) p.mesh.position.copy(impactPoint);
        this.spawnSurfaceImpact(p.mesh.position, p.element, collision === true ? AIR_IMPACT_NORMAL : (collision.normal || null));
        if (p.light) this.releaseProjectileLight(p.light);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.distanceTraveled >= p.maxDist) {
        if (p.worldImpact?.point) p.mesh.position.set(p.worldImpact.point.x, p.worldImpact.point.y, p.worldImpact.point.z);
        this.spawnSurfaceImpact(p.mesh.position, p.element, p.worldImpact?.normal || null);
        if (p.light) this.releaseProjectileLight(p.light);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Expanding Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= deltaTime;
      const progress = 1.0 - sw.life / sw.duration;
      const currentRadius = sw.radius + (sw.maxRadius - sw.radius) * progress;
      sw.mesh.scale.set(currentRadius, currentRadius, 1);
      sw.mesh.material.opacity = sw.initialOpacity * (sw.life / sw.duration);

      if (sw.life <= 0) {
        this._releaseShockwave(sw.poolEntry);
        this.shockwaves.splice(i, 1);
      }
    }

    // 2b. Update pooled support/defensive spell layers.
    for (let i = this.spellEffects.length - 1; i >= 0; i--) {
      const effect = this.spellEffects[i];
      effect.life -= deltaTime;
      const progress = Math.max(0, 1 - effect.life / effect.maxLife);
      const fade = Math.min(1, effect.life / Math.max(0.001, effect.maxLife));
      if (effect.type === 'heal_beam') {
        effect.beam.material.opacity = (this.reducedMotion ? 0.55 : 0.9) * fade;
        effect.pulse.scale.setScalar(0.8 + progress * 1.8);
        effect.pulse.material.opacity = 0.95 * fade;
        effect.stars.forEach((star, idx) => {
          const phase = (progress * 5 + idx * 0.7) % 1;
          star.scale.setScalar(0.55 + (1 - phase) * 0.65);
          star.rotation.y += deltaTime * 5;
        });
      } else if (effect.type === 'cleansing_wave') {
        effect.wave.scale.setScalar(0.25 + progress * 4.0);
        effect.inner.scale.setScalar(0.15 + progress * 2.8);
        effect.wave.material.opacity = 0.95 * fade;
        effect.inner.material.opacity = 0.65 * fade;
        effect.group.rotation.y += deltaTime * 1.2;
      } else if (effect.type === 'glacial_bulwark') {
        const pulse = 1 + Math.sin((1 - progress) * 18) * (this.reducedMotion ? 0.03 : 0.08);
        effect.bubble.scale.setScalar(1.55 * pulse);
        effect.ring.rotation.z += deltaTime * 2.2;
        effect.bubble.material.opacity = 0.32 * Math.min(1, fade * 3);
        effect.ring.material.opacity = 0.8 * Math.min(1, fade * 3);
      } else if (effect.type === 'temporal_rewind') {
        effect.outer.rotation.z -= deltaTime * 5.5;
        effect.inner.rotation.z += deltaTime * 8;
        effect.outer.scale.setScalar(1.5 + progress * 0.8);
        effect.inner.scale.setScalar(0.9 + progress * 0.6);
        effect.outer.material.opacity = 0.85 * fade;
        effect.inner.material.opacity = 0.75 * fade;
      } else if (effect.type === 'time_dilation') {
        effect.outer.rotation.z += deltaTime * 1.2;
        effect.inner.rotation.z -= deltaTime * 2.4;
        effect.outer.material.opacity = 0.75 * fade;
        effect.inner.material.opacity = 0.48 * fade;
      }
      if (effect.life <= 0) {
        this._releaseSpellEffect(effect);
        this.spellEffects.splice(i, 1);
      }
    }

    // 3. Update Persistent Vortices (Fire Tornado, Divine Sanctuary, etc.)
    for (let i = this.vortices.length - 1; i >= 0; i--) {
      const v = this.vortices[i];
      v.life -= deltaTime;

      // Spin the funnel vortex fast
      if (v.vortexGroup) {
        v.vortexGroup.rotation.y += deltaTime * 9.5;
        const pulse = 1.0 + Math.sin(v.life * 12) * 0.08;
        const baseScale = v.visualScale || 1;
        v.vortexGroup.scale.y = baseScale * pulse;
      }
      if (v.heroAsset) {
        const fireTime = v.maxLife - v.life;
        v.heroAsset.rotation.y += deltaTime * 2.7;
        v.heroAsset.rotation.z = Math.sin(fireTime * 2.2) * 0.045;
        const baseScale = v.heroAsset.userData.baseScale;
        const pulse = 1 + Math.sin(fireTime * 11.0) * 0.035;
        if (baseScale) {
          v.heroAsset.scale.set(
            baseScale.x * pulse,
            baseScale.y * (1 + Math.sin(fireTime * 8.0) * 0.045),
            baseScale.z * pulse
          );
        }
        const glow = 1.0 + Math.sin(fireTime * 13.0) * 0.22;
        (v.heroAsset.userData.emissiveMaterials || []).forEach(material => {
          material.emissiveIntensity = Math.max(0.35, glow * 2.2);
        });
      }
      if (v.volume) {
        const fireTime = v.maxLife - v.life;
        v.volume.material.uniforms.uTime.value = fireTime;
        v.volume.material.uniforms.uOpacity.value = this.qualityProfile === 'ultra' ? 0.52 : this.qualityProfile === 'performance' ? 0.24 : 0.42;
        v.volume.rotation.y -= deltaTime * 1.4;
      }
      if (v.helixRibbons) {
        v.helixRibbons.forEach((rib, idx) => {
          rib.rotation.z += deltaTime * (idx % 2 === 0 ? 7.0 : -9.0);
          rib.scale.x = 0.88 + Math.sin(v.life * 8 + idx) * 0.1;
        });
      }
      if (v.flameHelixes) {
        v.flameHelixes.forEach((strand, idx) => {
          strand.rotation.y += deltaTime * (idx % 2 === 0 ? 5.5 : -7.0);
          const flare = 1.0 + Math.sin(v.life * (7.5 + idx) + idx * 1.7) * 0.12;
          strand.scale.set(flare, 0.96 + Math.sin(v.life * 9 + idx) * 0.06, flare);
        });
      }
      if (v.windRings) {
        v.windRings.forEach((ring, idx) => {
          ring.rotation.z += deltaTime * (idx % 2 === 0 ? 4.5 : -5.5);
          ring.rotation.y += deltaTime * 1.4;
          const ringPulse = 1.0 + Math.sin(v.life * 10 + idx * 1.2) * 0.09;
          ring.scale.x = ringPulse;
          ring.scale.z = ringPulse;
        });
      }
      if (v.flameCore) {
        const corePulse = 0.94 + Math.sin(v.life * 14) * 0.1;
        v.flameCore.scale.set(0.8 * corePulse, 2.6 * (1.0 + Math.sin(v.life * 10) * 0.08), 0.8 * corePulse);
      }
      if (v.flameCards) {
        const flameTime = v.maxLife - v.life;
        v.flameCards.forEach((card, idx) => {
          card.material.uniforms.uTime.value = flameTime;
          card.rotation.y += deltaTime * (idx % 2 === 0 ? 0.65 : -0.8);
          const cardPulse = 1.0 + Math.sin(flameTime * 6.0 + idx) * 0.08;
          card.scale.x = (0.72 + (idx % 3) * 0.09) * cardPulse;
        });
      }
      if (v.emberCloud) {
        v.emberCloud.rotation.y -= deltaTime * 4.2;
        v.emberCloud.rotation.x += deltaTime * 0.45;
      }
      if (v.groundRune) {
        v.groundRune.rotation.z -= deltaTime * 3.5;
      }
      if (v.light) {
        v.light.intensity = 3.6 + Math.sin(v.life * 20) * 1.5;
      }

      // Tick callback for damage / healing
      v.nextTick -= deltaTime;
      if (v.nextTick <= 0) {
        v.nextTick = v.tickRate || 0.5;
        if (onVortexTick) onVortexTick(v);
      }

      if (v.life <= 0) {
        const endElement = {
          fire_tornado: 'fire',
          blizzard: 'frost',
          stasis_dome: 'chrono',
          divine_sanctuary: 'light',
          chrono_vortex: 'chrono'
        }[v.type] || 'light';
        this.spawnBurst(v.position, endElement, 32);
        if (v.poolEntry) this._releaseVortexEntry(v.poolEntry);
        else {
          if (v.light) v.light.intensity = 0;
          this.scene.remove(v.group);
        }
        this.vortices.splice(i, 1);
      }
    }

    // 4. Update Particles with Floor Bouncing Physics
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life -= deltaTime;
      part.mesh.position.addScaledVector(part.velocity, deltaTime);
      part.velocity.y -= 9.8 * deltaTime * 0.4; // Gravity

      // Floor bounce check
      if (part.canBounce && part.mesh.position.y < 0.08 && part.velocity.y < 0) {
        part.mesh.position.y = 0.08;
        part.velocity.y = -part.velocity.y * 0.45;
        part.velocity.x *= 0.65;
        part.velocity.z *= 0.65;
      }

      part.mesh.scale.setScalar(Math.max(0.01, part.life / part.maxLife));

      if (part.rotSpeed) {
        part.mesh.rotation.x += part.rotSpeed.x * deltaTime;
        part.mesh.rotation.y += part.rotSpeed.y * deltaTime;
      }

      if (part.life <= 0) {
        this._releaseParticleMesh(part.mesh);
        this.particles.splice(i, 1);
      }
    }

    // 5. Update Floating Combat Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= deltaTime;
      ft.sprite.position.y += deltaTime * 1.6;
      ft.sprite.material.opacity = Math.max(0, ft.life / ft.maxLife);

      if (ft.life <= 0) {
        this._releaseFloatingText(ft.poolEntry);
        this.floatingTexts.splice(i, 1);
      }
    }

    // 6. Update Dynamic Impact Decals
    if (this.decalManager) {
      this.decalManager.update(deltaTime);
    }

    // 7. Update 3D Physical Gold Coins (Gravity, Floor Bounce & Player Magnetism)
    for (let i = this.physicalCoins.length - 1; i >= 0; i--) {
      const c = this.physicalCoins[i];
      c.life -= deltaTime;

      // Gravity
      c.velocity.y -= 9.8 * deltaTime;
      c.mesh.position.addScaledVector(c.velocity, deltaTime);

      // Floor bounce & friction
      if (c.mesh.position.y < 0.1) {
        c.mesh.position.y = 0.1;
        c.velocity.y = -c.velocity.y * 0.42;
        c.velocity.x *= 0.8;
        c.velocity.z *= 0.8;
        c.rotVelocity.multiplyScalar(0.85);
      }

      // Rotation
      c.mesh.rotation.x += c.rotVelocity.x * deltaTime;
      c.mesh.rotation.y += c.rotVelocity.y * deltaTime;
      c.mesh.rotation.z += c.rotVelocity.z * deltaTime;

      // Magnetic attraction to player
      if (playerPos) {
        const dx = playerPos.x - c.mesh.position.x;
        const dy = (playerPos.y + 1.1) - c.mesh.position.y;
        const dz = playerPos.z - c.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 4.8) {
          const pull = 16.0 / Math.max(0.5, dist);
          c.velocity.x += (dx / dist) * pull * deltaTime;
          c.velocity.y += (dy / dist) * pull * deltaTime;
          c.velocity.z += (dz / dist) * pull * deltaTime;
          c.rotVelocity.y += deltaTime * 30;
        }

        if (dist < 0.95) {
          // Player collected coin!
          if (c.light) c.mesh.remove(c.light);
          this.scene.remove(c.mesh);
          this.spawnBurst(c.mesh.position, 'light', 10);
          if (c.onCollect) c.onCollect(c.value);
          this.spawnFloatingText(c.mesh.position, `+${c.value} Gold 🪙`, '#ffd700');
          this.physicalCoins.splice(i, 1);
          continue;
        }
      }

      if (c.life <= 0) {
        if (c.light) c.mesh.remove(c.light);
        this.scene.remove(c.mesh);
        this.physicalCoins.splice(i, 1);
      }
    }
  }

  /**
   * Pre-instantiates all spell models, procedural PBR textures & materials,
   * and compiles all WebGL shaders upfront during loading to guarantee 0ms combat stutter.
   */
  warmupSpellVisuals(renderer, camera) {
    if (!renderer || !camera) return;
    try {
      const dummyOrigin = new THREE.Vector3(0, -9999, 0);
      const dummyDir = new THREE.Vector3(0, 0, 1);
      const elements = ['fire', 'frost', 'light', 'chrono'];
      const spellTypes = ['basic', 'skill1', 'skill2'];

      // 1. Pre-instantiate all elemental projectile types and rings
      for (const el of elements) {
        for (const st of spellTypes) {
          this.spawnProjectile(dummyOrigin, dummyDir, st, el, 1, 1);
        }
      }

      // 2. Pre-instantiate particle bursts for all elements
      for (const el of elements) {
        this.spawnBurst(dummyOrigin, el, 4);
      }

      // 3. Pre-warm muzzle flash
      this.spawnMuzzleFlash(dummyOrigin, dummyDir, 'fire');

      // 4. Pre-warm all 4 class Ultimate Vortex & AoE spells (Tornado, Sanctuary, Blizzard, Stasis)
      this.spawnFireTornado(dummyOrigin, 0.05, 1);
      this.spawnDivineSanctuary(dummyOrigin, 0.05);
      this.spawnBlizzardZone(dummyOrigin, 0.05);
      this.spawnTemporalStasisDome(dummyOrigin, 0.05);

      // Pre-warm support and defensive spell shader variants as well.
      this.spawnHealingBeam(dummyOrigin, dummyOrigin, 0.05, 'light');
      this.spawnCleansingWave(dummyOrigin, 0.05);
      this.spawnGlacialBulwark(dummyOrigin, 0.05);
      this.spawnTemporalRewind(dummyOrigin, 0.05);
      this.spawnTimeDilation(dummyOrigin, 2.0, 0.05);

      // 5. Force WebGL driver to compile every material shader & bind all textures in GPU VRAM
      renderer.compile(this.scene, camera);

      // 6. Clean up dummy warmup entities
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        if (p.mesh.position.y < -9000) {
          if (p.light) this.releaseProjectileLight(p.light);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const part = this.particles[i];
        if (part.mesh.position.y < -9000) {
          this._releaseParticleMesh(part.mesh);
          this.particles.splice(i, 1);
        }
      }
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        if (sw.mesh.position.y < -9000) {
          this._releaseShockwave(sw.poolEntry);
          this.shockwaves.splice(i, 1);
        }
      }
      for (let i = this.vortices.length - 1; i >= 0; i--) {
        const v = this.vortices[i];
        if (v.position.y < -9000) {
          this._releaseVortexEntry(v.poolEntry);
          this.vortices.splice(i, 1);
        }
      }
      for (let i = this.spellEffects.length - 1; i >= 0; i--) {
        const effect = this.spellEffects[i];
        if (effect.position?.y < -9000) {
          this._releaseSpellEffect(effect);
          this.spellEffects.splice(i, 1);
        }
      }
      this.vortexLightsPool.forEach(light => this.releaseVortexLight(light));

      console.log('[ParticleSystem] All spell visuals, Ultimate vortices, procedural PBR textures & WebGL pipelines pre-warmed & cached in VRAM.');
    } catch (err) {
      console.warn('[ParticleSystem] Spell visuals pre-warming notice:', err);
    }
  }

  clear() {
    for (const p of this.projectiles) {
      if (p.light) this.releaseProjectileLight(p.light);
      this.scene.remove(p.mesh);
    }
    for (const sw of this.shockwaves) this._releaseShockwave(sw.poolEntry);
    for (const v of this.vortices) {
      if (v.poolEntry) this._releaseVortexEntry(v.poolEntry);
      else this.scene.remove(v.group);
    }
    for (const part of this.particles) this._releaseParticleMesh(part.mesh);
    for (const ft of this.floatingTexts) this._releaseFloatingText(ft.poolEntry);
    for (const c of this.physicalCoins) this.scene.remove(c.mesh);
    this.vortexLightsPool.forEach(light => this.releaseVortexLight(light));
    this.muzzleFlashLight.intensity = 0;
    this.muzzleFlashTimer = 0;
    for (const effect of this.spellEffects) this._releaseSpellEffect(effect);
    if (this.decalManager) this.decalManager.destroy?.();
    this.projectiles = [];
    this.shockwaves = [];
    this.vortices = [];
    this.particles = [];
    this.floatingTexts = [];
    this.physicalCoins = [];
    this.spellEffects = [];
  }
}
