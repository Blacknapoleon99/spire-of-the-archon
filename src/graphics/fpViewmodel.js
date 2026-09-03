import * as THREE from 'three';
import { TextureGenerator } from './textureGenerator.js';

/**
 * High-Fidelity First-Person Sorcerer Viewmodel (Anatomical Hands & Ornate Staff)
 */
export class FPViewmodel {
  constructor(camera, wizardClass = 'pyromancer') {
    this.camera = camera;
    this.wizardClass = wizardClass;

    this.group = new THREE.Group();
    this.camera.add(this.group);

    this.time = 0;
    this.recoil = 0;
    this.castGesture = 0;
    this.walkCycle = 0;
    this.lookSwayX = 0;
    this.lookSwayY = 0;

    this.initViewmodel();
  }

  initViewmodel() {
    const classColors = {
      pyromancer: { hex: '#d32f2f', color: 0xd32f2f, light: 0xff5722 },
      cryomancer: { hex: '#0a84ff', color: 0x0a84ff, light: 0x00e5ff },
      luminary: { hex: '#ffc107', color: 0xffc107, light: 0xffd700 },
      stormcaller: { hex: '#ffd60a', color: 0xffd60a, light: 0xffea00 },
      chronomancer: { hex: '#bf5af2', color: 0xbf5af2, light: 0xd500f9 }
    };
    const colorConfig = classColors[this.wizardClass] || classColors.pyromancer;

    const clothMat = TextureGenerator.createClothWeavePBR(colorConfig.hex).material;
    const skinMat = TextureGenerator.createSkinPBR().material;
    const woodMat = TextureGenerator.createWoodGrainPBR().material;
    const brassPBR = TextureGenerator.createGildedBrassPBR();
    const goldMat = brassPBR.material;

    // ==========================================
    // RIGHT ARM & ORNATE STAFF
    // ==========================================
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.36, -0.32, -0.55);

    // Forearm Sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.065, 0.082, 0.46, 14);
    const sleeve = new THREE.Mesh(sleeveGeo, clothMat);
    sleeve.position.set(0, -0.16, 0.2);
    sleeve.rotation.x = Math.PI / 3;
    this.rightArmGroup.add(sleeve);

    // Gilded Archmage Bracer
    const bracerGeo = new THREE.CylinderGeometry(0.07, 0.076, 0.14, 14);
    const bracerMat = new THREE.MeshStandardMaterial({ color: 0x2b1d16, roughness: 0.6 });
    const bracer = new THREE.Mesh(bracerGeo, bracerMat);
    bracer.position.set(0, -0.05, 0.12);
    bracer.rotation.x = Math.PI / 3;
    this.rightArmGroup.add(bracer);

    const bracerRingGeo = new THREE.TorusGeometry(0.077, 0.008, 8, 16);
    const bracerRing = new THREE.Mesh(bracerRingGeo, goldMat);
    bracerRing.position.set(0, -0.05, 0.12);
    bracerRing.rotation.x = Math.PI / 3;
    this.rightArmGroup.add(bracerRing);

    // ==========================================
    // ANATOMICAL RIGHT HAND (CLASPING STAFF)
    // ==========================================
    this.rightHand = new THREE.Group();
    this.rightHand.position.set(0, 0.02, 0.02);

    // Contoured Palm
    const palmGeo = new THREE.BoxGeometry(0.072, 0.048, 0.085);
    const palm = new THREE.Mesh(palmGeo, skinMat);
    this.rightHand.add(palm);

    // Articulated Thumb curling over front of shaft
    const thumbProximalGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.042, 8);
    const thumbProximal = new THREE.Mesh(thumbProximalGeo, skinMat);
    thumbProximal.position.set(-0.038, 0.012, -0.015);
    thumbProximal.rotation.z = 0.55;
    thumbProximal.rotation.y = 0.45;

    const thumbDistalGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.038, 8);
    const thumbDistal = new THREE.Mesh(thumbDistalGeo, skinMat);
    thumbDistal.position.set(-0.01, 0.03, -0.015);
    thumbDistal.rotation.x = -0.6;
    thumbProximal.add(thumbDistal);
    this.rightHand.add(thumbProximal);

    // 4 Curved Fingers wrapped tightly around staff
    const fingerConfigs = [
      { x: 0.025, len1: 0.042, len2: 0.038 }, // Index
      { x: 0.009, len1: 0.046, len2: 0.040 }, // Middle
      { x: -0.007, len1: 0.043, len2: 0.037 }, // Ring
      { x: -0.023, len1: 0.036, len2: 0.032 }  // Pinky
    ];

    fingerConfigs.forEach(fc => {
      const p1Geo = new THREE.CylinderGeometry(0.011, 0.013, fc.len1, 8);
      const p1 = new THREE.Mesh(p1Geo, skinMat);
      p1.position.set(fc.x, 0.024, -0.042);
      p1.rotation.x = -1.2;

      const p2Geo = new THREE.CylinderGeometry(0.009, 0.011, fc.len2, 8);
      const p2 = new THREE.Mesh(p2Geo, skinMat);
      p2.position.set(0, fc.len1 * 0.5, 0.012);
      p2.rotation.x = -0.9;
      p1.add(p2);

      this.rightHand.add(p1);
    });

    this.rightArmGroup.add(this.rightHand);

    // ==========================================
    // ORNATE ARCHMAGE STAFF
    // ==========================================
    this.staffGroup = new THREE.Group();
    this.staffGroup.position.set(0, 0.02, 0.02);
    this.staffGroup.rotation.x = -0.22;
    this.staffGroup.rotation.z = -0.14;

    // Carved Walnut Staff Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.024, 0.028, 1.85, 14);
    const shaft = new THREE.Mesh(shaftGeo, woodMat);
    shaft.position.set(0, 0.48, -0.32);
    shaft.rotation.x = Math.PI / 4;
    this.staffGroup.add(shaft);

    // Gold Spiral Ribbons & Bands along shaft
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.TorusGeometry(0.032, 0.007, 8, 16);
      const ring = new THREE.Mesh(ringGeo, goldMat);
      ring.position.set(0, 0.55 + i * 0.22, -0.38 - i * 0.22);
      ring.rotation.x = Math.PI / 4;
      this.staffGroup.add(ring);
    }

    // Crown Filigree Head Mount
    const mountGeo = new THREE.CylinderGeometry(0.055, 0.022, 0.16, 8);
    const mount = new THREE.Mesh(mountGeo, goldMat);
    mount.position.set(0, 1.18, -1.02);
    mount.rotation.x = Math.PI / 4;
    this.staffGroup.add(mount);

    // Class-specific Crown & Relic Details
    if (this.wizardClass === 'luminary') {
      const haloGeo = new THREE.TorusGeometry(0.18, 0.018, 8, 24);
      const halo = new THREE.Mesh(haloGeo, goldMat);
      halo.position.set(0, 1.27, -1.11);
      this.staffGroup.add(halo);
      this.haloMesh = halo;
    } else if (this.wizardClass === 'chronomancer') {
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.014, 8, 20), goldMat);
      ring1.position.set(0, 1.27, -1.11);
      ring1.rotation.x = Math.PI / 3;
      this.staffGroup.add(ring1);
      this.chronoRing = ring1;

      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 8, 16), goldMat);
      ring2.position.set(0, 1.27, -1.11);
      ring2.rotation.y = Math.PI / 4;
      this.staffGroup.add(ring2);
      this.chronoRing2 = ring2;
    } else if (this.wizardClass === 'stormcaller') {
      // Crackling Storm Rods
      for (let s = 0; s < 3; s++) {
        const rodGeo = new THREE.ConeGeometry(0.014, 0.18, 5);
        const rod = new THREE.Mesh(rodGeo, goldMat);
        const a = (s * Math.PI * 2) / 3;
        rod.position.set(Math.cos(a) * 0.06, 1.26, -1.11 + Math.sin(a) * 0.06);
        rod.rotation.x = Math.PI / 4;
        this.staffGroup.add(rod);
      }
    } else {
      // 4 Arcane Dragon Claws holding crystal
      for (let c = 0; c < 4; c++) {
        const clawGeo = new THREE.ConeGeometry(0.012, 0.14, 6);
        const claw = new THREE.Mesh(clawGeo, goldMat);
        const angle = (c * Math.PI) / 2;
        claw.position.set(Math.cos(angle) * 0.045, 1.25 + Math.sin(angle) * 0.01, -1.09);
        claw.rotation.x = Math.PI / 4;
        claw.rotation.z = angle;
        this.staffGroup.add(claw);
      }
    }

    // Glowing Prismatic Crystal Head
    const crystalGeo = new THREE.OctahedronGeometry(0.095, 1);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: colorConfig.color,
      emissive: colorConfig.color,
      emissiveIntensity: 1.8,
      roughness: 0.06,
      metalness: 0.2
    });
    this.crystal = new THREE.Mesh(crystalGeo, crystalMat);
    this.crystal.position.set(0, 1.27, -1.11);
    this.staffGroup.add(this.crystal);

    // Glowing Arcane Aura Core around Crystal
    const auraGeo = new THREE.IcosahedronGeometry(0.13, 1);
    const auraMat = new THREE.MeshBasicMaterial({
      color: colorConfig.light,
      transparent: true,
      opacity: 0.42,
      wireframe: true
    });
    this.crystalAura = new THREE.Mesh(auraGeo, auraMat);
    this.crystalAura.position.set(0, 1.27, -1.11);
    this.staffGroup.add(this.crystalAura);

    // Orbiting Mini Crystals & Elemental Sparks
    this.orbitShards = [];
    const shardCount = this.wizardClass === 'stormcaller' || this.wizardClass === 'pyromancer' ? 6 : 4;
    for (let s = 0; s < shardCount; s++) {
      const shardGeo = new THREE.OctahedronGeometry(s % 2 === 0 ? 0.038 : 0.024, 0);
      const shardMat = new THREE.MeshBasicMaterial({
        color: s % 2 === 0 ? colorConfig.light : 0xffffff
      });
      const shard = new THREE.Mesh(shardGeo, shardMat);
      this.staffGroup.add(shard);
      this.orbitShards.push(shard);
    }

    // Dynamic Staff Light
    this.staffLight = new THREE.PointLight(colorConfig.light, 2.4, 10);
    this.staffLight.position.set(0, 1.27, -1.11);
    this.staffGroup.add(this.staffLight);

    this.rightArmGroup.add(this.staffGroup);
    this.group.add(this.rightArmGroup);

    // ==========================================
    // LEFT HAND (SOMATIC SPELL-WEAVING)
    // ==========================================
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.35, -0.34, -0.5);

    // Left Sleeve
    const leftSleeve = new THREE.Mesh(sleeveGeo, clothMat);
    leftSleeve.position.set(0, -0.16, 0.2);
    leftSleeve.rotation.x = Math.PI / 3;
    this.leftArmGroup.add(leftSleeve);

    // Left Hand Palm
    this.leftHand = new THREE.Group();
    this.leftHand.position.set(0, 0.02, 0.02);

    const leftPalmGeo = new THREE.BoxGeometry(0.07, 0.045, 0.08);
    const leftPalm = new THREE.Mesh(leftPalmGeo, skinMat);
    this.leftHand.add(leftPalm);

    // Elegantly Splayed Somatic Fingers
    const leftFingerAngles = [-0.3, -0.1, 0.1, 0.3];
    leftFingerAngles.forEach((ang, idx) => {
      const fGeo = new THREE.CylinderGeometry(0.009, 0.012, 0.055, 8);
      const f = new THREE.Mesh(fGeo, skinMat);
      f.position.set((idx - 1.5) * 0.018, 0.015, -0.05);
      f.rotation.z = ang;
      f.rotation.x = 0.35;
      this.leftHand.add(f);
    });

    // Somatic Thumb
    const leftThumbGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.045, 8);
    const leftThumb = new THREE.Mesh(leftThumbGeo, skinMat);
    leftThumb.position.set(0.038, 0.01, -0.02);
    leftThumb.rotation.z = -0.55;
    this.leftHand.add(leftThumb);

    // Multi-tier Somatic Arcane Glyph System
    const runeRingGeo = new THREE.TorusGeometry(0.048, 0.005, 8, 24);
    const runeRingMat = new THREE.MeshBasicMaterial({ color: colorConfig.light, side: THREE.DoubleSide });
    this.leftRuneRing = new THREE.Mesh(runeRingGeo, runeRingMat);
    this.leftRuneRing.position.set(0, 0.05, 0);
    this.leftRuneRing.rotation.x = Math.PI / 2;
    this.leftHand.add(this.leftRuneRing);

    // Outer Somatic Astrolabe Ring
    const outerRuneGeo = new THREE.TorusGeometry(0.075, 0.004, 6, 28);
    this.leftOuterRune = new THREE.Mesh(outerRuneGeo, runeRingMat);
    this.leftOuterRune.position.set(0, 0.05, 0);
    this.leftOuterRune.rotation.x = Math.PI / 2;
    this.leftHand.add(this.leftOuterRune);

    // Floating Geometric Arcane Core
    const palmCoreGeo = new THREE.OctahedronGeometry(0.018, 0);
    const palmCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.palmCore = new THREE.Mesh(palmCoreGeo, palmCoreMat);
    this.palmCore.position.set(0, 0.05, 0);
    this.leftHand.add(this.palmCore);

    // Channeling Light
    this.leftHandLight = new THREE.PointLight(colorConfig.light, 1.4, 6);
    this.leftHandLight.position.set(0, 0.07, 0);
    this.leftHand.add(this.leftHandLight);

    // Levitating Arcane Grimoire Spellbook
    this.grimoireGroup = new THREE.Group();
    this.grimoireGroup.position.set(0, 0.08, -0.04);
    this.grimoireGroup.rotation.x = -0.3;

    // Leather Book Spine & Cover
    const coverGeo = new THREE.BoxGeometry(0.12, 0.012, 0.16);
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x1f142b, roughness: 0.7 });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    this.grimoireGroup.add(cover);

    // Gold Corner Brackets
    for (let c = 0; c < 4; c++) {
      const cornerGeo = new THREE.BoxGeometry(0.02, 0.014, 0.02);
      const corner = new THREE.Mesh(cornerGeo, goldMat);
      corner.position.set(
        (c % 2 === 0 ? 1 : -1) * 0.055,
        0,
        (c < 2 ? 1 : -1) * 0.075
      );
      this.grimoireGroup.add(corner);
    }

    // Open Parchment Left & Right Pages
    const parchmentMat = TextureGenerator.createParchmentPBR().material;
    const pageLeftGeo = new THREE.BoxGeometry(0.054, 0.008, 0.14);
    this.pageLeft = new THREE.Mesh(pageLeftGeo, parchmentMat);
    this.pageLeft.position.set(-0.028, 0.01, 0);
    this.pageLeft.rotation.z = 0.12;
    this.grimoireGroup.add(this.pageLeft);

    const pageRightGeo = new THREE.BoxGeometry(0.054, 0.008, 0.14);
    this.pageRight = new THREE.Mesh(pageRightGeo, parchmentMat);
    this.pageRight.position.set(0.028, 0.01, 0);
    this.pageRight.rotation.z = -0.12;
    this.grimoireGroup.add(this.pageRight);

    // Floating Illuminated Magic Sigil above Pages
    const glyphGeo = new THREE.RingGeometry(0.025, 0.045, 16);
    const glyphMat = new THREE.MeshBasicMaterial({
      color: colorConfig.light,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.grimoireGlyph = new THREE.Mesh(glyphGeo, glyphMat);
    this.grimoireGlyph.position.set(0, 0.04, 0);
    this.grimoireGlyph.rotation.x = -Math.PI / 2;
    this.grimoireGroup.add(this.grimoireGlyph);

    this.leftHand.add(this.grimoireGroup);

    this.leftArmGroup.add(this.leftHand);
    this.group.add(this.leftArmGroup);
  }

  triggerCast(slot = 'basic', intensity = 1.0) {
    this.currentSlot = slot;
    if (slot === 'ult') {
      this.recoil = 0.26 * intensity;
      this.castGesture = 1.8;
      if (this.crystal) this.crystal.material.emissiveIntensity = 5.6 * intensity;
      if (this.staffLight) this.staffLight.intensity = 7.2 * intensity;
      if (this.leftHandLight) this.leftHandLight.intensity = 4.5 * intensity;
    } else if (slot === 'skill2') {
      this.recoil = 0.18 * intensity;
      this.castGesture = 1.35;
      if (this.crystal) this.crystal.material.emissiveIntensity = 4.2 * intensity;
      if (this.staffLight) this.staffLight.intensity = 5.2 * intensity;
      if (this.leftHandLight) this.leftHandLight.intensity = 3.2 * intensity;
    } else if (slot === 'skill1') {
      this.recoil = 0.14 * intensity;
      this.castGesture = 1.15;
      if (this.crystal) this.crystal.material.emissiveIntensity = 3.8 * intensity;
      if (this.staffLight) this.staffLight.intensity = 4.6 * intensity;
      if (this.leftHandLight) this.leftHandLight.intensity = 2.6 * intensity;
    } else {
      // Basic wand cast
      this.recoil = 0.10 * intensity;
      this.castGesture = 0.85;
      if (this.crystal) this.crystal.material.emissiveIntensity = 3.2 * intensity;
      if (this.staffLight) this.staffLight.intensity = 3.8 * intensity;
      if (this.leftHandLight) this.leftHandLight.intensity = 1.9 * intensity;
    }
  }

  triggerRecoil(intensity = 1.0) {
    this.triggerCast('basic', intensity);
  }

  update(deltaTime, isMoving, mouseDelta) {
    this.time += deltaTime;

    // Mouse look inertia sway (lag behind camera turns)
    if (mouseDelta) {
      const targetLookX = -mouseDelta.dx * 0.00065;
      const targetLookY = mouseDelta.dy * 0.00065;
      this.lookSwayX += (targetLookX - this.lookSwayX) * Math.min(1.0, deltaTime * 14);
      this.lookSwayY += (targetLookY - this.lookSwayY) * Math.min(1.0, deltaTime * 14);
    } else {
      this.lookSwayX += (0 - this.lookSwayX) * Math.min(1.0, deltaTime * 9);
      this.lookSwayY += (0 - this.lookSwayY) * Math.min(1.0, deltaTime * 9);
    }
    this.lookSwayX = Math.max(-0.06, Math.min(0.06, this.lookSwayX));
    this.lookSwayY = Math.max(-0.06, Math.min(0.06, this.lookSwayY));

    // Organic Figure-8 Breathing / Walking Sway
    let swayX = 0;
    let swayY = 0;
    if (isMoving) {
      this.walkCycle += deltaTime * 9.5;
      swayX = Math.sin(this.walkCycle * 0.5) * 0.026;
      swayY = Math.abs(Math.sin(this.walkCycle)) * 0.030;
    } else {
      // Natural Lissajous breathing curve
      swayX = Math.sin(this.time * 1.8) * 0.009;
      swayY = Math.sin(this.time * 3.6) * 0.007;
    }

    // Decay recoil and cast gesture smoothly
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - deltaTime * 0.95);
    }
    if (this.castGesture > 0) {
      this.castGesture = Math.max(0, this.castGesture - deltaTime * 2.6);
    }

    // Restore crystal and light intensity smoothly
    if (this.crystal) {
      this.crystal.material.emissiveIntensity = THREE.MathUtils.lerp(this.crystal.material.emissiveIntensity, 1.8, deltaTime * 6);
    }
    if (this.staffLight) {
      this.staffLight.intensity = THREE.MathUtils.lerp(this.staffLight.intensity, 2.4, deltaTime * 6);
    }
    if (this.leftHandLight) {
      this.leftHandLight.intensity = THREE.MathUtils.lerp(this.leftHandLight.intensity, 1.4, deltaTime * 5);
    }

    // Update Right Arm / Staff with sway and recoil and mouse inertia
    this.rightArmGroup.position.set(
      0.36 + swayX + this.lookSwayX,
      -0.32 - swayY - this.recoil * 0.5 + this.lookSwayY,
      -0.55 + this.recoil
    );
    this.staffGroup.rotation.x = -0.22 - this.recoil * 1.6 + this.lookSwayY * 1.6;
    this.staffGroup.rotation.z = -0.14 - this.lookSwayX * 2.2;

    // Rotate and pulse staff crystal and aura
    if (this.crystal) {
      this.crystal.rotation.y += deltaTime * 3.2;
      this.crystal.rotation.z += deltaTime * 1.6;
    }
    if (this.crystalAura) {
      this.crystalAura.rotation.y -= deltaTime * 3.8;
      this.crystalAura.rotation.x += deltaTime * 2.4;
      const auraPulse = 1.0 + Math.sin(this.time * 4.5) * 0.14 + this.castGesture * 0.5;
      this.crystalAura.scale.set(auraPulse, auraPulse, auraPulse);
    }

    // Class specific accessory rotations
    if (this.chronoRing) {
      this.chronoRing.rotation.z += deltaTime * 4.2;
    }
    if (this.chronoRing2) {
      this.chronoRing2.rotation.y -= deltaTime * 3.5;
    }
    if (this.haloMesh) {
      this.haloMesh.rotation.z += deltaTime * 1.8;
    }

    // Rotate orbiting shards and elemental sparks around crystal
    if (this.orbitShards) {
      this.orbitShards.forEach((shard, i) => {
        const speed = i % 2 === 0 ? 3.8 : -3.0;
        const theta = this.time * speed + (i * Math.PI * 2) / this.orbitShards.length;
        const rad = i % 2 === 0 ? 0.18 : 0.14;
        shard.position.set(
          Math.cos(theta) * rad,
          1.27 + Math.sin(theta * 2 + i) * 0.05,
          -1.11 + Math.sin(theta) * rad
        );
        shard.rotation.x += deltaTime * 6;
        shard.rotation.y += deltaTime * 5;
      });
    }

    // Levitating Grimoire floating oscillation, page fluttering & glyph rotation
    if (this.grimoireGroup) {
      this.grimoireGroup.position.y = 0.08 + Math.sin(this.time * 2.4) * 0.014;
      this.grimoireGroup.rotation.y = Math.sin(this.time * 1.6) * 0.09;
      if (this.pageLeft && this.pageRight) {
        const flutter = Math.sin(this.time * 8.0) * (0.04 + this.castGesture * 0.14);
        this.pageLeft.rotation.z = 0.12 + flutter;
        this.pageRight.rotation.z = -0.12 - flutter;
      }
      if (this.grimoireGlyph) {
        this.grimoireGlyph.rotation.z += deltaTime * 2.8;
        const gScale = 1.0 + Math.sin(this.time * 3.0) * 0.16 + this.castGesture * 0.35;
        this.grimoireGlyph.scale.set(gScale, gScale, gScale);
      }
    }

    // Update Left Somatic Hand with casting thrust
    const thrust = this.castGesture * 0.18;
    this.leftArmGroup.position.set(
      -0.35 - swayX - this.lookSwayX * 0.85 + thrust * 0.45,
      -0.34 - swayY - this.lookSwayY * 0.85 + thrust * 0.85,
      -0.5 - thrust * 1.4
    );
    this.leftHand.rotation.x = this.castGesture * 0.9;

    // Spin somatic rune rings and core
    if (this.leftRuneRing) {
      this.leftRuneRing.rotation.z += deltaTime * 5.0;
      const runeScale = 1.0 + this.castGesture * 0.5;
      this.leftRuneRing.scale.set(runeScale, runeScale, runeScale);
    }
    if (this.leftOuterRune) {
      this.leftOuterRune.rotation.z -= deltaTime * 3.4;
      const outerScale = 1.0 + this.castGesture * 0.7;
      this.leftOuterRune.scale.set(outerScale, outerScale, outerScale);
    }
    if (this.palmCore) {
      this.palmCore.rotation.x += deltaTime * 4.0;
      this.palmCore.rotation.y += deltaTime * 3.0;
      const coreScale = 1.0 + this.castGesture * 0.8;
      this.palmCore.scale.set(coreScale, coreScale, coreScale);
    }
  }

  destroy() {
    this.camera.remove(this.group);
  }
}
