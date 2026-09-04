import * as THREE from 'three';
import { TextureGenerator } from './textureGenerator.js';

/**
 * High-Fidelity Ground Spells & Boss Visual FX System.
 * Renders cinematic animated ground-level magical fields, fissures,
 * clockwork dials, void chasms, and volcanic calderas.
 */
export class GroundSpellManager {
  constructor(scene) {
    this.scene = scene;
    this.activeSpells = [];

    // Shared Reusable Geometries
    this.geoDecalPlane = new THREE.PlaneGeometry(1, 1);
    this.geoGroundCircle = new THREE.CircleGeometry(1, 36);
    this.geoGroundRing = new THREE.RingGeometry(0.85, 1.0, 36);
    this.geoInnerRing = new THREE.RingGeometry(0.4, 0.55, 32);
    this.geoGearRing = new THREE.TorusGeometry(1.0, 0.06, 8, 36);
    this.geoClockHand = new THREE.BoxGeometry(0.12, 0.04, 1.0);
    this.geoLavaGeyser = new THREE.ConeGeometry(0.3, 2.4, 8);
    this.geoVoidTendril = new THREE.CylinderGeometry(0.06, 0.18, 2.2, 8);

    // Shared Materials with procedural PBR textures
    const lavaBasalt = TextureGenerator.createLavaBasaltPBR(512, 512);
    this.matLavaGround = lavaBasalt.material;
    this.matLavaGround.transparent = true;
    this.matLavaGround.opacity = 0.95;

    const chronoClock = TextureGenerator.createChronoClockworkPBR(512, 512);
    this.matChronoGround = chronoClock.material;
    this.matChronoGround.transparent = true;
    this.matChronoGround.opacity = 0.92;

    const voidRune = TextureGenerator.createRunicDecalPBR('#9333ea', 512, 512);
    this.matVoidGround = voidRune.material;
    this.matVoidGround.transparent = true;
    this.matVoidGround.opacity = 0.92;

    const fireRune = TextureGenerator.createSpellRuneRing('fire', 512, 512);
    this.matFireRune = fireRune.material;
    this.matFireRune.transparent = true;
    this.matFireRune.opacity = 0.9;

    const frostRune = TextureGenerator.createSpellRuneRing('frost', 512, 512);
    this.matFrostRune = frostRune.material;
    this.matFrostRune.transparent = true;
    this.matFrostRune.opacity = 0.9;
  }

  // =========================================================================
  // 1. IGNIS: MAGMA CALDERA (Ground Slam / Lava Pools)
  // =========================================================================
  spawnMagmaCaldera(pos, duration = 6.0, radius = 5.5, tickDamage = 35) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0.03, pos.z);

    // Layer 1: Scorched Magma Fissure Floor Disc
    const baseMat = this.matLavaGround.clone();
    baseMat.opacity = 0.95;
    const baseDisc = new THREE.Mesh(this.geoGroundCircle, baseMat);
    baseDisc.rotation.x = -Math.PI / 2;
    baseDisc.scale.setScalar(radius);
    group.add(baseDisc);

    // Layer 2: Erupting Molten Lava Core (pulsing emissive center)
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff4400,
      emissiveIntensity: 3.5,
      roughness: 0.2,
      metalness: 0.4
    });
    const coreDisc = new THREE.Mesh(this.geoGroundCircle, coreMat);
    coreDisc.rotation.x = -Math.PI / 2;
    coreDisc.position.y = 0.01;
    coreDisc.scale.setScalar(radius * 0.55);
    group.add(coreDisc);

    // Layer 3: Concentric Burning Lava Rim
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      emissive: 0xff2200,
      emissiveIntensity: 2.8,
      transparent: true,
      opacity: 0.85
    });
    const rim = new THREE.Mesh(this.geoGroundRing, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.02;
    rim.scale.setScalar(radius);
    group.add(rim);

    // Layer 4: 4 Volcanic Spouts / Geysers around the caldera perimeter
    const geysers = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
      const gx = Math.cos(angle) * (radius * 0.65);
      const gz = Math.sin(angle) * (radius * 0.65);
      const geyserMat = new THREE.MeshStandardMaterial({
        color: 0xff5500,
        emissive: 0xff3300,
        emissiveIntensity: 4.0,
        transparent: true,
        opacity: 0.8
      });
      const geyser = new THREE.Mesh(this.geoLavaGeyser, geyserMat);
      geyser.position.set(gx, 1.2, gz);
      group.add(geyser);
      geysers.push(geyser);
    }

    // Dynamic PointLight casting hot volcanic amber on the room
    const light = new THREE.PointLight(0xff4400, 3.8, radius * 3.5);
    light.position.set(0, 1.5, 0);
    group.add(light);

    this.scene.add(group);

    const spell = {
      id: `magma_caldera_${Date.now()}`,
      type: 'magma_caldera',
      group,
      baseDisc,
      coreDisc,
      rim,
      geysers,
      light,
      position: pos.clone(),
      radius,
      duration,
      life: duration,
      tickRate: 0.5,
      nextTick: 0.5,
      tickDamage,
      onUpdate: (dt, s) => {
        // Pulse molten core
        const pulse = 1.0 + Math.sin(s.life * 8.0) * 0.12;
        s.coreDisc.scale.setScalar(s.radius * 0.55 * pulse);
        s.rim.rotation.z += dt * 0.8;

        // Animate volcanic spouts (eruption bobbing)
        s.geysers.forEach((g, idx) => {
          const sp = Math.sin(s.life * 10 + idx * 1.5);
          g.scale.y = 0.7 + sp * 0.5;
          g.position.y = 1.0 + sp * 0.4;
        });

        // Flicker fire light
        s.light.intensity = 3.2 + Math.sin(s.life * 18.0) * 0.9;

        // Fade out on last second
        if (s.life < 1.0) {
          const alpha = s.life;
          s.baseDisc.material.opacity = alpha * 0.95;
          s.rim.material.opacity = alpha * 0.85;
          s.light.intensity *= alpha;
        }
      }
    };

    this.activeSpells.push(spell);
    return spell;
  }

  // =========================================================================
  // 2. IGNIS: MOLTEN SURGE (Expanding Hellfire Ground Shockwave)
  // =========================================================================
  spawnMoltenSurge(pos, maxRadius = 12.0, duration = 2.4) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0.04, pos.z);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff5500,
      emissiveIntensity: 4.5,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(this.geoGroundRing, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(0.5);
    group.add(ring);

    // Inner fiery rune ring
    const rune = new THREE.Mesh(this.geoGroundCircle, this.matFireRune.clone());
    rune.rotation.x = -Math.PI / 2;
    rune.position.y = 0.01;
    rune.scale.setScalar(0.5);
    group.add(rune);

    const light = new THREE.PointLight(0xff5500, 4.0, 16);
    light.position.set(0, 1.0, 0);
    group.add(light);

    this.scene.add(group);

    const spell = {
      id: `molten_surge_${Date.now()}`,
      type: 'molten_surge',
      group,
      ring,
      rune,
      light,
      maxRadius,
      duration,
      life: duration,
      onUpdate: (dt, s) => {
        const progress = 1.0 - (s.life / s.duration);
        const currentR = progress * s.maxRadius;
        s.ring.scale.setScalar(currentR);
        s.rune.scale.setScalar(currentR * 0.85);
        s.rune.rotation.z -= dt * 4.0;

        const fade = Math.max(0, 1.0 - progress);
        s.ring.material.opacity = fade;
        s.rune.material.opacity = fade * 0.9;
        s.light.intensity = 4.0 * fade;
      }
    };

    this.activeSpells.push(spell);
    return spell;
  }

  // =========================================================================
  // 3. XYRIS: VOID CATACLYSM CHASM (Event Horizon Black Hole on Floor)
  // =========================================================================
  spawnVoidCataclysm(pos, duration = 6.5, radius = 6.0, tickDamage = 40) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0.03, pos.z);

    // Dark void abyss hole (pitch black with deep purple glow)
    const holeMat = new THREE.MeshBasicMaterial({
      color: 0x010008,
      transparent: true,
      opacity: 0.98
    });
    const holeDisc = new THREE.Mesh(this.geoGroundCircle, holeMat);
    holeDisc.rotation.x = -Math.PI / 2;
    holeDisc.scale.setScalar(radius);
    group.add(holeDisc);

    // Swirling Void Accretion Ring on floor
    const accMat = new THREE.MeshStandardMaterial({
      color: 0x7700ee,
      emissive: 0x9900ff,
      emissiveIntensity: 3.5,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const accRing = new THREE.Mesh(this.geoGroundRing, accMat);
    accRing.rotation.x = -Math.PI / 2;
    accRing.position.y = 0.01;
    accRing.scale.setScalar(radius * 0.9);
    group.add(accRing);

    // Inner Event Horizon Singularity
    const singMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x6600cc,
      emissiveIntensity: 2.0,
      roughness: 0.1
    });
    const singDisc = new THREE.Mesh(this.geoGroundCircle, singMat);
    singDisc.rotation.x = -Math.PI / 2;
    singDisc.position.y = 0.02;
    singDisc.scale.setScalar(radius * 0.35);
    group.add(singDisc);

    // 4 Writhing Void Tendrils rising from floor edge
    const tendrils = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const tx = Math.cos(angle) * (radius * 0.7);
      const tz = Math.sin(angle) * (radius * 0.7);
      const tMat = new THREE.MeshStandardMaterial({
        color: 0x220044,
        emissive: 0x8800ff,
        emissiveIntensity: 2.5,
        roughness: 0.3
      });
      const tendril = new THREE.Mesh(this.geoVoidTendril, tMat);
      tendril.position.set(tx, 1.0, tz);
      group.add(tendril);
      tendrils.push(tendril);
    }

    // Abyssal Violet PointLight
    const light = new THREE.PointLight(0x9900ff, 4.2, radius * 3.5);
    light.position.set(0, 1.8, 0);
    group.add(light);

    this.scene.add(group);

    const spell = {
      id: `void_cataclysm_${Date.now()}`,
      type: 'void_cataclysm',
      group,
      holeDisc,
      accRing,
      singDisc,
      tendrils,
      light,
      position: pos.clone(),
      radius,
      duration,
      life: duration,
      tickRate: 0.5,
      nextTick: 0.5,
      tickDamage,
      onUpdate: (dt, s) => {
        // Spin accretion disk
        s.accRing.rotation.z += dt * 3.2;

        // Singularity breath
        const singScale = s.radius * 0.35 * (1.0 + Math.sin(s.life * 6) * 0.15);
        s.singDisc.scale.setScalar(singScale);

        // Writhing tendril sway
        s.tendrils.forEach((t, idx) => {
          t.rotation.x = Math.sin(s.life * 4 + idx * 1.5) * 0.3;
          t.rotation.z = Math.cos(s.life * 3.5 + idx * 2.0) * 0.3;
          t.position.y = 1.0 + Math.sin(s.life * 5 + idx) * 0.25;
        });

        s.light.intensity = 3.6 + Math.sin(s.life * 14.0) * 0.8;

        if (s.life < 1.0) {
          const alpha = s.life;
          s.holeDisc.material.opacity = alpha * 0.98;
          s.accRing.material.opacity = alpha * 0.85;
          s.light.intensity *= alpha;
        }
      }
    };

    this.activeSpells.push(spell);
    return spell;
  }

  // =========================================================================
  // 4. XYRIS: PRISMATIC MANDALA (Floor 10 Mirror Alignment Sigil)
  // =========================================================================
  spawnPrismaticMandala(pos, duration = 6.0, radius = 5.5) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0.04, pos.z);

    // Multi-tier rotating geometric light rings
    const mats = [
      new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ccff, emissiveIntensity: 3.5, transparent: true, opacity: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xcc00ff, emissiveIntensity: 3.5, transparent: true, opacity: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffcc00, emissiveIntensity: 3.5, transparent: true, opacity: 0.9 }),
    ];

    const rings = [];
    [0.9, 0.65, 0.4].forEach((scale, i) => {
      const rMesh = new THREE.Mesh(this.geoGroundRing, mats[i]);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.scale.setScalar(radius * scale);
      group.add(rMesh);
      rings.push(rMesh);
    });

    // Central radiant prism beacon
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 4.5,
      transparent: true,
      opacity: 0.9
    });
    const beacon = new THREE.Mesh(this.geoGroundCircle, beaconMat);
    beacon.rotation.x = -Math.PI / 2;
    beacon.scale.setScalar(radius * 0.25);
    group.add(beacon);

    const light = new THREE.PointLight(0x00ffff, 4.5, radius * 3.0);
    light.position.set(0, 2.0, 0);
    group.add(light);

    this.scene.add(group);

    const spell = {
      id: `prismatic_mandala_${Date.now()}`,
      type: 'prismatic_mandala',
      group,
      rings,
      beacon,
      light,
      duration,
      life: duration,
      onUpdate: (dt, s) => {
        s.rings[0].rotation.z += dt * 1.5;
        s.rings[1].rotation.z -= dt * 2.2;
        s.rings[2].rotation.z += dt * 3.0;

        const pulse = 1.0 + Math.sin(s.life * 10) * 0.2;
        s.beacon.scale.setScalar(radius * 0.25 * pulse);

        if (s.life < 1.0) {
          s.rings.forEach(r => { r.material.opacity = s.life * 0.9; });
          s.beacon.material.opacity = s.life * 0.9;
          s.light.intensity *= s.life;
        }
      }
    };

    this.activeSpells.push(spell);
    return spell;
  }

  // =========================================================================
  // 5. VALERIUS: CHRONO DILATION DIAL (Floor 15 Clockwork Field)
  // =========================================================================
  spawnChronoDilationDial(pos, duration = 6.0, radius = 7.0, tickDamage = 35) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0.04, pos.z);

    // Layer 1: Clockwork Chrono Dial on Floor (PBR Astrolabe texture)
    const dialMat = this.matChronoGround.clone();
    dialMat.opacity = 0.92;
    const dialDisc = new THREE.Mesh(this.geoGroundCircle, dialMat);
    dialDisc.rotation.x = -Math.PI / 2;
    dialDisc.scale.setScalar(radius);
    group.add(dialDisc);

    // Layer 2: Outer Golden Brass Gear Ring
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4aa00,
      emissive: 0xffaa00,
      emissiveIntensity: 2.2,
      metalness: 0.9,
      roughness: 0.2
    });
    const gearRing = new THREE.Mesh(this.geoGearRing, brassMat);
    gearRing.rotation.x = Math.PI / 2;
    gearRing.position.y = 0.02;
    gearRing.scale.setScalar(radius * 0.98);
    group.add(gearRing);

    // Layer 3: Inner Counter-Rotating Cog Ring
    const cogMat = new THREE.MeshStandardMaterial({
      color: 0xaa7700,
      emissive: 0x884400,
      emissiveIntensity: 1.8,
      metalness: 0.85
    });
    const innerCog = new THREE.Mesh(this.geoInnerRing, cogMat);
    innerCog.rotation.x = -Math.PI / 2;
    innerCog.position.y = 0.03;
    innerCog.scale.setScalar(radius * 0.6);
    group.add(innerCog);

    // Layer 4: Sweeping Clock Hands (Hour & Minute) on Ground
    const handMat = new THREE.MeshStandardMaterial({
      color: 0xffdd44,
      emissive: 0xffaa00,
      emissiveIntensity: 3.5
    });

    const hrHand = new THREE.Mesh(this.geoClockHand, handMat);
    hrHand.position.set(0, 0.04, -(radius * 0.22));
    hrHand.scale.set(1.0, 1.0, radius * 0.45);
    group.add(hrHand);

    const minHand = new THREE.Mesh(this.geoClockHand, handMat);
    minHand.position.set(0, 0.05, -(radius * 0.36));
    minHand.scale.set(0.7, 1.0, radius * 0.72);
    group.add(minHand);

    // Golden Arcane PointLight
    const light = new THREE.PointLight(0xffcc00, 4.0, radius * 3.2);
    light.position.set(0, 1.8, 0);
    group.add(light);

    this.scene.add(group);

    const spell = {
      id: `chrono_dial_${Date.now()}`,
      type: 'chrono_dial',
      group,
      dialDisc,
      gearRing,
      innerCog,
      hrHand,
      minHand,
      light,
      position: pos.clone(),
      radius,
      duration,
      life: duration,
      tickRate: 0.5,
      nextTick: 0.5,
      tickDamage,
      onUpdate: (dt, s) => {
        // Counter-rotating gear rings
        s.gearRing.rotation.z += dt * 0.5;
        s.innerCog.rotation.z -= dt * 1.2;

        // Sweeping clock hands
        s.hrHand.rotation.y += dt * 0.8;
        s.minHand.rotation.y += dt * 3.6;

        s.light.intensity = 3.5 + Math.sin(s.life * 12.0) * 0.8;

        if (s.life < 1.0) {
          const alpha = s.life;
          s.dialDisc.material.opacity = alpha * 0.92;
          s.gearRing.material.opacity = alpha;
          s.light.intensity *= alpha;
        }
      }
    };

    this.activeSpells.push(spell);
    return spell;
  }

  // =========================================================================
  // 6. VALERIUS: ASTRAL NOVA SUPERNOVA SIGIL (Expanding Zodiac Ground Chart)
  // =========================================================================
  spawnAstralNovaSigil(pos, maxRadius = 18.0, duration = 3.2) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0.05, pos.z);

    const sigilMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xff8800,
      emissiveIntensity: 4.0,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(this.geoGroundRing, sigilMat);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(1.0);
    group.add(ring);

    // Inner Star Chart Lines (8-pointed star on floor)
    const starGroup = new THREE.Group();
    for (let p = 0; p < 8; p++) {
      const angle = (p / 8) * Math.PI * 2;
      const lineGeo = new THREE.BoxGeometry(0.12, 0.02, maxRadius);
      const lineMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 3.0,
        transparent: true,
        opacity: 0.8
      });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.y = angle;
      line.position.y = 0.01;
      starGroup.add(line);
    }
    group.add(starGroup);

    const light = new THREE.PointLight(0xffdd66, 5.0, maxRadius * 2);
    light.position.set(0, 2.5, 0);
    group.add(light);

    this.scene.add(group);

    const spell = {
      id: `astral_nova_${Date.now()}`,
      type: 'astral_nova',
      group,
      ring,
      starGroup,
      light,
      maxRadius,
      duration,
      life: duration,
      onUpdate: (dt, s) => {
        const progress = 1.0 - (s.life / s.duration);
        const currentR = progress * s.maxRadius;
        s.ring.scale.setScalar(currentR);
        s.starGroup.rotation.y += dt * 0.8;
        s.starGroup.scale.setScalar(progress);

        const fade = Math.max(0, 1.0 - progress);
        s.ring.material.opacity = fade;
        s.light.intensity = 5.0 * fade;
      }
    };

    this.activeSpells.push(spell);
    return spell;
  }

  // =========================================================================
  // UPDATE LOOP: Call every frame from main animation loop
  // =========================================================================
  update(deltaTime, playerPos = null, onPlayerDamaged = null) {
    for (let i = this.activeSpells.length - 1; i >= 0; i--) {
      const spell = this.activeSpells[i];
      spell.life -= deltaTime;

      if (spell.onUpdate) {
        spell.onUpdate(deltaTime, spell);
      }

      // Check player damage if inside ground hazard radius
      if (playerPos && spell.tickDamage && onPlayerDamaged) {
        spell.nextTick -= deltaTime;
        if (spell.nextTick <= 0) {
          spell.nextTick = spell.tickRate || 0.5;
          const dx = playerPos.x - spell.position.x;
          const dz = playerPos.z - spell.position.z;
          const distSq = dx * dx + dz * dz;
          if (distSq <= spell.radius * spell.radius) {
            onPlayerDamaged(spell.tickDamage, spell.type);
          }
        }
      }

      if (spell.life <= 0) {
        this.scene.remove(spell.group);
        spell.group.traverse((c) => {
          if (c.isMesh) {
            if (c.geometry && !this._isSharedGeometry(c.geometry)) c.geometry.dispose();
            if (c.material && !this._isSharedMaterial(c.material)) {
              if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
              else c.material.dispose();
            }
          }
        });
        this.activeSpells.splice(i, 1);
      }
    }
  }

  _isSharedGeometry(geo) {
    return [
      this.geoDecalPlane, this.geoGroundCircle, this.geoGroundRing,
      this.geoInnerRing, this.geoGearRing, this.geoClockHand,
      this.geoLavaGeyser, this.geoVoidTendril
    ].includes(geo);
  }

  _isSharedMaterial(mat) {
    return [
      this.matLavaGround, this.matChronoGround, this.matVoidGround,
      this.matFireRune, this.matFrostRune
    ].includes(mat);
  }

  clear() {
    for (const spell of this.activeSpells) {
      this.scene.remove(spell.group);
    }
    this.activeSpells = [];
  }
}
