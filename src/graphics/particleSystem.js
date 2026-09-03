import * as THREE from 'three';
import { TextureGenerator } from './textureGenerator.js';
import { DecalManager } from './shaders/impactDecals.js';

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
  }

  /**
   * Spawns an animated magical projectile with unique 3D geometries per spell
   */
  spawnProjectile(origin, direction, spellType, element, speed = 24, maxDist = 35) {
    const group = new THREE.Group();
    group.position.copy(origin);
    group.position.y += 1.2;

    const normDir = direction.clone().normalize();
    const rotQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normDir);

    let matColor = 0xff3b30;
    let lightColor = 0xff5722;

    if (element === 'fire') {
      lightColor = 0xff5722;
      if (spellType === 'skill1') {
        // Fireball: Molten core with orbiting flaming spark ring & coronal spikes
        matColor = 0xff4500;
        const coreGeo = new THREE.SphereGeometry(0.42, 12, 12);
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0xff2200,
          emissive: 0xff4500,
          emissiveIntensity: 2.2,
          roughness: 0.2
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        const ringGeo = new THREE.TorusGeometry(0.68, 0.08, 8, 20);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd600 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        group.userData = { ring };
      } else if (spellType === 'skill2') {
        // Flame Wave: Horizontal crescent arc of fire
        matColor = 0xff6d00;
        const waveGeo = new THREE.TorusGeometry(1.1, 0.2, 8, 24, Math.PI);
        const waveMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, side: THREE.DoubleSide });
        const wave = new THREE.Mesh(waveGeo, waveMat);
        wave.quaternion.copy(rotQuat);
        wave.rotation.z = Math.PI / 2;
        group.add(wave);
      } else {
        // Basic Ember Bolt
        const boltGeo = new THREE.ConeGeometry(0.16, 0.7, 8);
        const boltMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
        const bolt = new THREE.Mesh(boltGeo, boltMat);
        bolt.quaternion.copy(rotQuat);
        group.add(bolt);
      }
    } else if (element === 'frost') {
      lightColor = 0x00e5ff;
      if (spellType === 'skill1') {
        // Ice Lance: Elongated crystalline spear
        matColor = 0x80d8ff;
        const lanceGeo = new THREE.ConeGeometry(0.24, 1.8, 6);
        const lanceMat = new THREE.MeshStandardMaterial({
          color: 0x00e5ff,
          emissive: 0x0091ea,
          emissiveIntensity: 1.8,
          roughness: 0.1,
          metalness: 0.3
        });
        const lance = new THREE.Mesh(lanceGeo, lanceMat);
        lance.quaternion.copy(rotQuat);
        group.add(lance);

        // Orbiting ice shards
        for (let s = 0; s < 3; s++) {
          const sGeo = new THREE.OctahedronGeometry(0.12, 0);
          const sMesh = new THREE.Mesh(sGeo, lanceMat);
          sMesh.position.set(Math.cos(s * 2.1) * 0.4, 0, Math.sin(s * 2.1) * 0.4);
          group.add(sMesh);
        }
      } else {
        // Frost Shard: Faceted crystal diamond
        matColor = 0x00e5ff;
        const shardGeo = new THREE.OctahedronGeometry(0.26, 0);
        const shardMat = new THREE.MeshStandardMaterial({
          color: 0x80d8ff,
          emissive: 0x00e5ff,
          emissiveIntensity: 1.2,
          roughness: 0.1
        });
        const shard = new THREE.Mesh(shardGeo, shardMat);
        group.add(shard);
      }
    } else if (element === 'light') {
      lightColor = 0xffd700;
      matColor = 0xfff9c4;
      const sparkGeo = new THREE.SphereGeometry(0.32, 10, 10);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      group.add(spark);

      // Holy halo
      const haloGeo = new THREE.RingGeometry(0.45, 0.58, 20);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.quaternion.copy(rotQuat);
      group.add(halo);
    } else {
      // Chrono
      lightColor = 0xbf5af2;
      matColor = 0xd500f9;
      const chronoGeo = new THREE.DodecahedronGeometry(0.28, 0);
      const chronoMat = new THREE.MeshStandardMaterial({
        color: 0xbf5af2,
        emissive: 0xaa00ff,
        emissiveIntensity: 2.0
      });
      const chrono = new THREE.Mesh(chronoGeo, chronoMat);
      group.add(chrono);

      // Orbiting time ring
      const tRingGeo = new THREE.TorusGeometry(0.5, 0.03, 8, 16);
      const tRingMat = new THREE.MeshBasicMaterial({ color: 0xd500f9 });
      const tRing = new THREE.Mesh(tRingGeo, tRingMat);
      group.add(tRing);
      group.userData = { ring: tRing };
    }

    const light = new THREE.PointLight(lightColor, 3.2, 9);
    group.add(light);

    this.scene.add(group);

    this.projectiles.push({
      mesh: group,
      light,
      baseIntensity: 3.2,
      direction: normDir,
      speed,
      distanceTraveled: 0,
      maxDist,
      element,
      spellType,
      trailTimer: 0
    });
  }

  /**
   * Spawns an expanding ground / air shockwave ring
   */
  spawnImpactShockwave(pos, color = 0xff5722, maxRadius = 3.5, duration = 0.45) {
    const ringGeo = new THREE.RingGeometry(0.2, 0.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.position.y = Math.max(0.1, pos.y);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);

    this.shockwaves.push({
      mesh: ring,
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
    const group = new THREE.Group();
    group.position.copy(groundPos);
    group.position.y = 0.05;

    // 1. Swirling Molten Scorch Rune Base on Ground with Lava PBR Texture
    const lavaPBR = TextureGenerator.createLavaTexturePBR();
    const groundRuneGeo = new THREE.RingGeometry(0.3, radius, 32);
    const groundRuneMat = new THREE.MeshStandardMaterial({
      map: lavaPBR.diffuseMap,
      emissive: new THREE.Color(0xff4500),
      emissiveIntensity: 2.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const groundRune = new THREE.Mesh(groundRuneGeo, groundRuneMat);
    groundRune.rotation.x = -Math.PI / 2;
    group.add(groundRune);

    // 2. Multi-tier spinning fire vortex funnel
    const vortexGroup = new THREE.Group();

    // Outer spiral fire funnel with texture wrapping & high emissive flame glow
    const funnelGeo = new THREE.CylinderGeometry(3.6, 0.4, 7.5, 24, 8, true);
    const funnelMat = new THREE.MeshStandardMaterial({
      map: lavaPBR.diffuseMap,
      color: 0xff3700,
      emissive: new THREE.Color(0xff2200),
      emissiveIntensity: 2.8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.82
    });
    const funnel = new THREE.Mesh(funnelGeo, funnelMat);
    funnel.position.y = 3.75;
    vortexGroup.add(funnel);

    // 3 Helical Flame Spiral Ribbons swirling around the funnel
    const helixRibbons = [];
    for (let r = 0; r < 3; r++) {
      const ribbonGeo = new THREE.TorusGeometry(1.8 + r * 0.6, 0.14, 8, 32, Math.PI * 1.5);
      const ribbonMat = new THREE.MeshBasicMaterial({
        color: r % 2 === 0 ? 0xff9100 : 0xff3d00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbon.position.y = 1.5 + r * 2.0;
      ribbon.rotation.x = Math.PI / 2.5;
      ribbon.rotation.z = (r * Math.PI * 2) / 3;
      vortexGroup.add(ribbon);
      helixRibbons.push(ribbon);
    }

    // Inner blinding white/gold plasma core column
    const coreGeo = new THREE.CylinderGeometry(1.5, 0.25, 7.0, 16, 4, true);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 3.5;
    vortexGroup.add(core);

    group.add(vortexGroup);

    // Dynamic flickering flame point light
    const light = new THREE.PointLight(0xff5722, 4.5, 20);
    light.position.y = 3.5;
    group.add(light);

    this.scene.add(group);

    this.vortices.push({
      type: 'fire_tornado',
      group,
      vortexGroup,
      funnel,
      core,
      helixRibbons,
      light,
      groundRune,
      position: groundPos.clone(),
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
    const group = new THREE.Group();
    group.position.copy(groundPos);
    group.position.y = 0.05;

    // Glowing Cathedral Dome
    const domeGeo = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffc107,
      emissiveIntensity: 1.6,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    group.add(dome);

    // Ground celestial seal
    const sealGeo = new THREE.RingGeometry(0.2, radius, 32);
    const sealMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const seal = new THREE.Mesh(sealGeo, sealMat);
    seal.rotation.x = -Math.PI / 2;
    group.add(seal);

    const light = new THREE.PointLight(0xffd700, 3.2, 18);
    light.position.y = 2.0;
    group.add(light);

    this.scene.add(group);

    this.vortices.push({
      type: 'divine_sanctuary',
      group,
      light,
      position: groundPos.clone(),
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
    const group = new THREE.Group();
    group.position.copy(groundPos);
    group.position.y = 0.05;

    // Glowing Frost Dome
    const domeGeo = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0a84ff,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    group.add(dome);

    // Ground Runic Frost Ring
    const runeGeo = new THREE.RingGeometry(0.5, radius, 32);
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0x80d8ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const rune = new THREE.Mesh(runeGeo, runeMat);
    rune.rotation.x = -Math.PI / 2;
    group.add(rune);

    // Central Ice Spire
    const spireGeo = new THREE.ConeGeometry(0.5, 4.2, 6);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0xe0f7fa,
      emissive: 0x00e5ff,
      emissiveIntensity: 2.2,
      roughness: 0.1
    });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.y = 2.1;
    group.add(spire);

    const light = new THREE.PointLight(0x00e5ff, 3.5, 16);
    light.position.y = 2.0;
    group.add(light);

    this.scene.add(group);

    this.vortices.push({
      type: 'blizzard',
      group,
      light,
      position: groundPos.clone(),
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
    const group = new THREE.Group();
    group.position.copy(groundPos);
    group.position.y = 0.05;

    // Violet Temporal Dome
    const domeGeo = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xbf5af2,
      emissive: 0x7b1fa2,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    group.add(dome);

    // Chronometer Gear Ring on Ground
    const gearGeo = new THREE.RingGeometry(1.0, radius, 32);
    const gearMat = new THREE.MeshBasicMaterial({
      color: 0xe040fb,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const gear = new THREE.Mesh(gearGeo, gearMat);
    gear.rotation.x = -Math.PI / 2;
    group.add(gear);

    const light = new THREE.PointLight(0xbf5af2, 3.5, 16);
    light.position.y = 2.0;
    group.add(light);

    this.scene.add(group);

    this.vortices.push({
      type: 'temporal_stasis',
      group,
      light,
      position: groundPos.clone(),
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
    const geo = new THREE.RingGeometry(0.5, 1.2, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xba68c8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(centerPos);
    mesh.position.y = 0.2;
    mesh.rotation.x = -Math.PI / 2;
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      life: duration,
      maxLife: duration,
      maxRadius,
      color: 0xba68c8
    });

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
  spawnBurst(pos, element, count = 28) {
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
    if (this.decalManager) {
      this.decalManager.spawnImpactDecal(pos, element);
    }

    // Trigger expanding ground shockwave ring
    this.spawnImpactShockwave(pos, color, 3.6, 0.45);

    const geo1 = new THREE.DodecahedronGeometry(0.12, 0);
    const geo2 = new THREE.OctahedronGeometry(0.15, 0);
    const mat1 = new THREE.MeshBasicMaterial({ color });
    const mat2 = new THREE.MeshBasicMaterial({ color: secondaryColor });

    for (let i = 0; i < count; i++) {
      const isSecondary = i % 3 === 0;
      const p = new THREE.Mesh(i % 2 === 0 ? geo1 : geo2, isSecondary ? mat2 : mat1);
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

    const geo = new THREE.OctahedronGeometry(0.13, 0);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      p.position.y += Math.random() * 0.8;

      const theta = (i / count) * Math.PI * 2;
      const radius = 0.4 + Math.random() * 0.7;
      const vel = new THREE.Vector3(
        Math.cos(theta) * radius,
        1.8 + Math.random() * 3.0,
        Math.sin(theta) * radius
      );

      this.scene.add(p);
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

    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(pos);
    sprite.position.y += 1.8;
    sprite.scale.set(2.4, 1.2, 1);
    this.scene.add(sprite);

    this.floatingTexts.push({
      sprite,
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

    const geo = new THREE.OctahedronGeometry(0.12, 0);
    const chronoMat = new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true });
    const violetMat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;
      const upward = 1.5 + Math.random() * 3.5;
      const mesh = new THREE.Mesh(geo, i % 2 === 0 ? chronoMat : violetMat);
      mesh.position.copy(pos);
      mesh.position.y += 1.0;
      this.scene.add(mesh);

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

    const geo = new THREE.TetrahedronGeometry(0.16, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

    for (let i = 0; i < 42; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 4.5,
        pos.y + Math.random() * 4.0,
        pos.z + (Math.random() - 0.5) * 1.5
      );
      this.scene.add(mesh);

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
    const geo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
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
   * Spawns a high-energy elemental muzzle flash flare at the casting point
   */
  spawnMuzzleFlash(origin, direction, element = 'fire') {
    const colors = {
      fire: 0xff3d00,
      frost: 0x00e5ff,
      light: 0xffd700,
      chrono: 0xbf5af2
    };
    const col = colors[element] || 0xff5722;

    // Momentary light flare
    const flare = new THREE.PointLight(col, 4.5, 7);
    flare.position.copy(origin);
    this.scene.add(flare);
    setTimeout(() => {
      this.scene.remove(flare);
    }, 85);

    // Radiating spark burst along direction
    const normDir = direction ? direction.clone().normalize() : new THREE.Vector3(0, 0, -1);
    const geo = new THREE.TetrahedronGeometry(0.06, 0);
    const mat = new THREE.MeshBasicMaterial({ color: col });

    for (let s = 0; s < 8; s++) {
      const spark = new THREE.Mesh(geo, mat);
      spark.position.copy(origin);
      this.scene.add(spark);

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
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const moveStep = p.speed * deltaTime;
      p.mesh.position.addScaledVector(p.direction, moveStep);
      p.distanceTraveled += moveStep;

      // Dynamic light flicker and pulse during flight
      if (p.light) {
        p.light.intensity = p.baseIntensity * (0.85 + Math.sin(p.distanceTraveled * 12) * 0.25);
      }

      // Animate spinning rings if present
      if (p.mesh.userData?.ring) {
        p.mesh.userData.ring.rotation.z += deltaTime * 14;
      }

      // Emit trailing spark showers
      p.trailTimer = (p.trailTimer || 0) + deltaTime;
      if (p.trailTimer > 0.035) {
        p.trailTimer = 0;
        let trailCol = 0xff5722;
        if (p.element === 'frost') trailCol = 0x00e5ff;
        if (p.element === 'light') trailCol = 0xffd700;
        if (p.element === 'chrono') trailCol = 0xbf5af2;
        if (p.element === 'storm') trailCol = 0xffd60a;

        for (let t = 0; t < 2; t++) {
          const trailGeo = new THREE.OctahedronGeometry(0.065, 0);
          const trailMat = new THREE.MeshBasicMaterial({ color: t === 1 ? 0xffffff : trailCol });
          const trailPart = new THREE.Mesh(trailGeo, trailMat);
          trailPart.position.copy(p.mesh.position);
          trailPart.position.x += (Math.random() - 0.5) * 0.15;
          trailPart.position.y += (Math.random() - 0.5) * 0.15;
          trailPart.position.z += (Math.random() - 0.5) * 0.15;
          this.scene.add(trailPart);

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
      if (onProjectileHit && onProjectileHit(p)) {
        this.spawnBurst(p.mesh.position, p.element, 28);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.distanceTraveled >= p.maxDist) {
        this.spawnBurst(p.mesh.position, p.element, 16);
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
        this.scene.remove(sw.mesh);
        this.shockwaves.splice(i, 1);
      }
    }

    // 3. Update Persistent Vortices (Fire Tornado, Divine Sanctuary, etc.)
    for (let i = this.vortices.length - 1; i >= 0; i--) {
      const v = this.vortices[i];
      v.life -= deltaTime;

      // Spin the funnel vortex fast
      if (v.vortexGroup) {
        v.vortexGroup.rotation.y += deltaTime * 9.5;
        v.vortexGroup.scale.y = 1.0 + Math.sin(v.life * 12) * 0.12;
      }
      if (v.helixRibbons) {
        v.helixRibbons.forEach((rib, idx) => {
          rib.rotation.z += deltaTime * (idx % 2 === 0 ? 8.0 : -10.0);
        });
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
        this.spawnBurst(v.position, v.type === 'fire_tornado' ? 'fire' : 'light', 32);
        this.scene.remove(v.group);
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
        this.scene.remove(part.mesh);
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
        this.scene.remove(ft.sprite);
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
          this.scene.remove(c.mesh);
          if (c.mesh.geometry) c.mesh.geometry.dispose();
          this.spawnBurst(c.mesh.position, 'light', 10);
          if (c.onCollect) c.onCollect(c.value);
          this.spawnFloatingText(c.mesh.position, `+${c.value} Gold 🪙`, '#ffd700');
          this.physicalCoins.splice(i, 1);
          continue;
        }
      }

      if (c.life <= 0) {
        this.scene.remove(c.mesh);
        if (c.mesh.geometry) c.mesh.geometry.dispose();
        this.physicalCoins.splice(i, 1);
      }
    }
  }

  clear() {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    for (const sw of this.shockwaves) this.scene.remove(sw.mesh);
    for (const v of this.vortices) this.scene.remove(v.group);
    for (const part of this.particles) this.scene.remove(part.mesh);
    for (const ft of this.floatingTexts) this.scene.remove(ft.sprite);
    for (const c of this.physicalCoins) this.scene.remove(c.mesh);
    if (this.decalManager) this.decalManager.clear();
    this.projectiles = [];
    this.shockwaves = [];
    this.vortices = [];
    this.particles = [];
    this.floatingTexts = [];
    this.physicalCoins = [];
  }
}

