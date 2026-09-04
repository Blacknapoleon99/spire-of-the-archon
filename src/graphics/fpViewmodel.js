import * as THREE from 'three';
import { TextureGenerator } from './textureGenerator.js';
import { assetLoader } from './assetLoader.js';

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
    this.verticalBob = 0;

    // 3D Rigged Animated Viewmodel State
    this.hasRiggedModel = false;
    this.mixer = null;
    this.actions = {};
    this.currentAction = null;

    this.riggedGroup = new THREE.Group();
    this.riggedGroup.visible = false;
    this.group.add(this.riggedGroup);

    this.proceduralGroup = new THREE.Group();
    this.group.add(this.proceduralGroup);

    this.initViewmodel();
  }

  initViewmodel() {
    const classColors = {
      pyromancer: { hex: '#d32f2f', color: 0xd32f2f, light: 0xff5722 },
      cryomancer: { hex: '#0a84ff', color: 0x0a84ff, light: 0x00e5ff },
      luminary: { hex: '#ffc107', color: 0xffc107, light: 0xffd700 },
      chronomancer: { hex: '#bf5af2', color: 0xbf5af2, light: 0xd500f9 }
    };
    const colorConfig = classColors[this.wizardClass] || classColors.pyromancer;

    // High-Fidelity PBR Materials
    const gauntletPBR = TextureGenerator.createArchmageGauntletPBR(colorConfig.hex);
    const gauntletMat = gauntletPBR.material;
    const elderwoodPBR = TextureGenerator.createTwistedElderwoodPBR();
    const staffWoodMat = elderwoodPBR.material;
    const leatherWrapPBR = TextureGenerator.createLeatherWrapPBR();
    const leatherWrapMat = leatherWrapPBR.material;
    const clothMat = TextureGenerator.createClothWeavePBR(colorConfig.hex).material;
    const brassPBR = TextureGenerator.createGildedBrassPBR();
    const goldMat = brassPBR.material;

    // ==========================================
    // RIGHT ARM & ORNATE STAFF
    // ==========================================
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.36, -0.32, -0.55);

    // Forearm Velvet/Cloth Sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.065, 0.082, 0.46, 16);
    const sleeve = new THREE.Mesh(sleeveGeo, clothMat);
    sleeve.position.set(0, -0.16, 0.2);
    sleeve.rotation.x = Math.PI / 3;
    this.rightArmGroup.add(sleeve);

    // Gilded Archmage Bracer with Gold Filigree Trim
    const bracerGeo = new THREE.CylinderGeometry(0.072, 0.078, 0.14, 16);
    const bracerMat = new THREE.MeshStandardMaterial({
      color: 0x1c1322,
      roughness: 0.32,
      metalness: 0.65
    });
    const bracer = new THREE.Mesh(bracerGeo, bracerMat);
    bracer.position.set(0, -0.05, 0.12);
    bracer.rotation.x = Math.PI / 3;
    this.rightArmGroup.add(bracer);

    const bracerRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.007, 8, 20), goldMat);
    bracerRing1.position.set(0, -0.01, 0.10);
    bracerRing1.rotation.x = Math.PI / 3;
    this.rightArmGroup.add(bracerRing1);

    const bracerRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.007, 8, 20), goldMat);
    bracerRing2.position.set(0, -0.09, 0.14);
    bracerRing2.rotation.x = Math.PI / 3;
    this.rightArmGroup.add(bracerRing2);

    // ==========================================
    // ANATOMICAL RIGHT HAND (GAUNTLET & CLASP)
    // ==========================================
    this.rightHand = new THREE.Group();
    this.rightHand.position.set(0, 0.02, 0.02);

    // Organic Contoured Palm (Rounded & Beveled)
    const palmGeo = new THREE.SphereGeometry(0.046, 14, 12);
    const palm = new THREE.Mesh(palmGeo, gauntletMat);
    palm.scale.set(1.0, 0.74, 1.25);
    this.rightHand.add(palm);

    // Thenar Muscle Base (Fleshy thumb root)
    const thenarGeo = new THREE.SphereGeometry(0.024, 10, 10);
    const thenar = new THREE.Mesh(thenarGeo, gauntletMat);
    thenar.scale.set(1.1, 0.9, 1.3);
    thenar.position.set(-0.028, -0.008, 0.01);
    this.rightHand.add(thenar);

    // Dorsal Arcane Metacarpal Plate with Gold Inlay
    const dorsalPlateGeo = new THREE.BoxGeometry(0.055, 0.012, 0.058);
    const dorsalPlateMat = new THREE.MeshStandardMaterial({
      color: 0x241a2e,
      roughness: 0.25,
      metalness: 0.75
    });
    const dorsalPlate = new THREE.Mesh(dorsalPlateGeo, dorsalPlateMat);
    dorsalPlate.position.set(0, 0.028, -0.005);
    this.rightHand.add(dorsalPlate);

    // 4 Articulated Fingers (3 Anatomical Segments + Spherical Knuckles Each)
    const fingerConfigs = [
      { x: 0.024, l1: 0.028, l2: 0.024, l3: 0.020, curl: 1.1 }, // Index
      { x: 0.008, l1: 0.031, l2: 0.026, l3: 0.022, curl: 1.15 }, // Middle
      { x: -0.008, l1: 0.029, l2: 0.024, l3: 0.020, curl: 1.1 }, // Ring
      { x: -0.024, l1: 0.024, l2: 0.020, l3: 0.017, curl: 1.05 }  // Pinky
    ];

    fingerConfigs.forEach(fc => {
      // Metacarpophalangeal (MCP) Knuckle Guard Sphere
      const knuckleGeo = new THREE.SphereGeometry(0.013, 8, 8);
      const knuckle = new THREE.Mesh(knuckleGeo, goldMat);
      knuckle.position.set(fc.x, 0.022, -0.040);
      this.rightHand.add(knuckle);

      // Proximal Phalanx
      const p1Geo = new THREE.CylinderGeometry(0.010, 0.012, fc.l1, 8);
      const p1 = new THREE.Mesh(p1Geo, gauntletMat);
      p1.position.set(fc.x, 0.018, -0.046);
      p1.rotation.x = -fc.curl;

      // PIP Joint Knuckle Sphere
      const pipKnuckle = new THREE.Mesh(new THREE.SphereGeometry(0.010, 8, 8), goldMat);
      pipKnuckle.position.set(0, fc.l1 * 0.5, 0);
      p1.add(pipKnuckle);

      // Intermediate Phalanx
      const p2Geo = new THREE.CylinderGeometry(0.009, 0.010, fc.l2, 8);
      const p2 = new THREE.Mesh(p2Geo, gauntletMat);
      p2.position.set(0, fc.l1 * 0.5 + fc.l2 * 0.5, 0.006);
      p2.rotation.x = -0.7;
      p1.add(p2);

      // DIP Joint Knuckle & Fingertip Claws
      const dipKnuckle = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), goldMat);
      dipKnuckle.position.set(0, fc.l2 * 0.5, 0);
      p2.add(dipKnuckle);

      const p3Geo = new THREE.ConeGeometry(0.008, fc.l3, 8);
      const p3 = new THREE.Mesh(p3Geo, goldMat);
      p3.position.set(0, fc.l2 * 0.5 + fc.l3 * 0.5, 0.004);
      p3.rotation.x = -0.5;
      p2.add(p3);

      this.rightHand.add(p1);
    });

    // 3-Segment Articulated Thumb wrapped around front of staff
    const thumbKnuckle = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), goldMat);
    thumbKnuckle.position.set(-0.036, 0.012, -0.012);
    this.rightHand.add(thumbKnuckle);

    const thumbP1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.034, 8), gauntletMat);
    thumbP1.position.set(-0.036, 0.012, -0.012);
    thumbP1.rotation.z = 0.55;
    thumbP1.rotation.y = 0.45;

    const thumbP2 = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.012, 0.028, 8), gauntletMat);
    thumbP2.position.set(-0.008, 0.026, -0.012);
    thumbP2.rotation.x = -0.65;
    thumbP1.add(thumbP2);

    const thumbTip = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.022, 8), goldMat);
    thumbTip.position.set(0, 0.022, -0.005);
    thumbTip.rotation.x = -0.4;
    thumbP2.add(thumbTip);

    this.rightHand.add(thumbP1);
    this.rightArmGroup.add(this.rightHand);

    // ==========================================
    // ORNATE ARCHMAGE STAFF
    // ==========================================
    this.staffGroup = new THREE.Group();
    this.staffGroup.position.set(0, 0.02, 0.02);
    this.staffGroup.rotation.x = -0.22;
    this.staffGroup.rotation.z = -0.14;

    // Carved Elderwood Staff Shaft with PBR Wood Texture
    const shaftGeo = new THREE.CylinderGeometry(0.022, 0.027, 1.95, 16);
    const shaft = new THREE.Mesh(shaftGeo, staffWoodMat);
    shaft.position.set(0, 0.48, -0.32);
    shaft.rotation.x = Math.PI / 4;
    this.staffGroup.add(shaft);

    // Cross-Stitched Leather Wrap Handle Grip
    const gripGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.28, 16);
    const grip = new THREE.Mesh(gripGeo, leatherWrapMat);
    grip.position.set(0, 0.08, 0.02);
    grip.rotation.x = Math.PI / 4;
    this.staffGroup.add(grip);

    // Spiral Gold Filigree Vines winding up along the entire shaft length
    const vineKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.030, 0.005, 64, 8, 2, 9), goldMat);
    vineKnot.position.set(0, 0.65, -0.48);
    vineKnot.rotation.x = Math.PI / 4;
    vineKnot.scale.set(1.0, 1.0, 4.2);
    this.staffGroup.add(vineKnot);

    // Lower Staff Pommel with Gold Ferrule & Counterweight Crystal
    const pommelGeo = new THREE.CylinderGeometry(0.034, 0.018, 0.12, 12);
    const pommel = new THREE.Mesh(pommelGeo, goldMat);
    pommel.position.set(0, -0.22, 0.38);
    pommel.rotation.x = Math.PI / 4;
    this.staffGroup.add(pommel);

    const pommelGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), new THREE.MeshStandardMaterial({
      color: colorConfig.color,
      emissive: colorConfig.color,
      emissiveIntensity: 1.4
    }));
    pommelGem.position.set(0, -0.28, 0.44);
    this.staffGroup.add(pommelGem);

    // Crown Capital Mount
    const mountGeo = new THREE.CylinderGeometry(0.058, 0.024, 0.18, 12);
    const mount = new THREE.Mesh(mountGeo, goldMat);
    mount.position.set(0, 1.18, -1.02);
    mount.rotation.x = Math.PI / 4;
    this.staffGroup.add(mount);

    // 4 Swept Dragon Talons Grasping the Focus Orb
    for (let c = 0; c < 4; c++) {
      const angle = (c * Math.PI) / 2;
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.18, 6), goldMat);
      claw.position.set(Math.cos(angle) * 0.052, 1.25 + Math.sin(angle) * 0.012, -1.09);
      claw.rotation.x = Math.PI / 4;
      claw.rotation.z = angle;
      this.staffGroup.add(claw);
    }

    // Dual Counter-Rotating Astrolabe Rings around the crystal
    const astrolabeOuter = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.008, 8, 24), goldMat);
    astrolabeOuter.position.set(0, 1.27, -1.11);
    astrolabeOuter.rotation.x = Math.PI / 3;
    this.staffGroup.add(astrolabeOuter);
    this.chronoRing = astrolabeOuter;

    const astrolabeInner = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.006, 8, 20), goldMat);
    astrolabeInner.position.set(0, 1.27, -1.11);
    astrolabeInner.rotation.y = Math.PI / 4;
    this.staffGroup.add(astrolabeInner);
    this.chronoRing2 = astrolabeInner;

    // Glowing Prismatic Faceted Crystal Focus Head
    const crystalGeo = new THREE.OctahedronGeometry(0.105, 1);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: colorConfig.color,
      emissive: colorConfig.color,
      emissiveIntensity: 2.2,
      roughness: 0.04,
      metalness: 0.35,
      transparent: true,
      opacity: 0.95
    });
    this.crystal = new THREE.Mesh(crystalGeo, crystalMat);
    this.crystal.position.set(0, 1.27, -1.11);
    this.staffGroup.add(this.crystal);

    // Glowing Arcane Aura Core around Crystal
    const auraGeo = new THREE.IcosahedronGeometry(0.14, 1);
    const auraMat = new THREE.MeshBasicMaterial({
      color: colorConfig.light,
      transparent: true,
      opacity: 0.45,
      wireframe: true
    });
    this.crystalAura = new THREE.Mesh(auraGeo, auraMat);
    this.crystalAura.position.set(0, 1.27, -1.11);
    this.staffGroup.add(this.crystalAura);

    // 6 Orbiting Mini Crystals & Elemental Sparks
    this.orbitShards = [];
    for (let s = 0; s < 6; s++) {
      const shardGeo = new THREE.OctahedronGeometry(s % 2 === 0 ? 0.036 : 0.024, 0);
      const shardMat = new THREE.MeshBasicMaterial({
        color: s % 2 === 0 ? colorConfig.light : 0xffffff
      });
      const shard = new THREE.Mesh(shardGeo, shardMat);
      this.staffGroup.add(shard);
      this.orbitShards.push(shard);
    }

    // Dynamic Staff PointLight
    this.staffLight = new THREE.PointLight(colorConfig.light, 2.8, 11);
    this.staffLight.position.set(0, 1.27, -1.11);
    this.staffGroup.add(this.staffLight);

    this.rightArmGroup.add(this.staffGroup);
    this.proceduralGroup.add(this.rightArmGroup);

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

    // Left Hand
    this.leftHand = new THREE.Group();
    this.leftHand.position.set(0, 0.02, 0.02);

    // Organic Contoured Left Palm
    const leftPalm = new THREE.Mesh(palmGeo, gauntletMat);
    leftPalm.scale.set(1.0, 0.74, 1.25);
    this.leftHand.add(leftPalm);

    // Thenar Muscle Base
    const leftThenar = new THREE.Mesh(thenarGeo, gauntletMat);
    leftThenar.scale.set(1.1, 0.9, 1.3);
    leftThenar.position.set(0.028, -0.008, 0.01);
    this.leftHand.add(leftThenar);

    // Dorsal Arcane Metacarpal Plate
    const leftDorsalPlate = new THREE.Mesh(dorsalPlateGeo, dorsalPlateMat);
    leftDorsalPlate.position.set(0, 0.028, -0.005);
    this.leftHand.add(leftDorsalPlate);

    // 4 Splayed Somatic Fingers with 3 Segments & Rounded Knuckles
    const leftFingerAngles = [-0.35, -0.12, 0.12, 0.35];
    leftFingerAngles.forEach((ang, idx) => {
      const fx = (idx - 1.5) * 0.018;

      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), goldMat);
      knuckle.position.set(fx, 0.020, -0.045);
      this.leftHand.add(knuckle);

      const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.028, 8), gauntletMat);
      f1.position.set(fx, 0.018, -0.052);
      f1.rotation.z = ang;
      f1.rotation.x = 0.35;

      const midKnuckle = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), goldMat);
      midKnuckle.position.set(0, 0.016, 0);
      f1.add(midKnuckle);

      const f2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.024, 8), gauntletMat);
      f2.position.set(0, 0.028, -0.006);
      f2.rotation.x = 0.25;
      f1.add(f2);

      const tipClaw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.018, 8), goldMat);
      tipClaw.position.set(0, 0.020, -0.004);
      tipClaw.rotation.x = 0.15;
      f2.add(tipClaw);

      this.leftHand.add(f1);
    });

    // Articulated Somatic Thumb
    const leftThumbK = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), goldMat);
    leftThumbK.position.set(0.036, 0.010, -0.018);
    this.leftHand.add(leftThumbK);

    const leftThumb = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.034, 8), gauntletMat);
    leftThumb.position.set(0.036, 0.010, -0.018);
    leftThumb.rotation.z = -0.55;
    leftThumb.rotation.x = 0.25;

    const leftThumbTip = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.022, 8), goldMat);
    leftThumbTip.position.set(0, 0.022, -0.004);
    leftThumb.add(leftThumbTip);
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
    this.proceduralGroup.add(this.leftArmGroup);

    // Asynchronously load the 3D local rigged viewmodel & wand
    this.loadRiggedModel(colorConfig);
  }

  loadRiggedModel(colorConfig) {
    assetLoader.loadGLTFRaw('/models/fp_viewmodel_wand.glb')
      .then((gltf) => {
        const model = gltf.scene;
        // Position and scale first-person viewmodel in front of camera
        model.scale.set(0.68, 0.68, 0.68);
        model.position.set(0.04, -0.28, -0.32);

        // Customize materials and glowing crystal / runes safely
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material && (child.name.includes('Crystal') || child.name.includes('Gem') || child.name.includes('Shard') || child.name.includes('Rune'))) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach(m => {
                if (m.emissive) {
                  m.emissive.set(colorConfig.light);
                  m.emissiveIntensity = 4.2;
                }
                if (m.color) m.color.set(colorConfig.color);
              });
            }
          }
        });

        // Wand Tip Effect: Add High-Intensity Elemental Point Light
        let wandTip = model.getObjectByName('FocusCrystal') || model.getObjectByName('WandShaft') || model;
        const wandLight = new THREE.PointLight(colorConfig.light, 3.4, 4.5);
        wandTip.add(wandLight);
        this.riggedWandLight = wandLight;

        // Wand Tip Effect: Swirling Corona Aura Mesh
        const auraGeo = new THREE.SphereGeometry(0.065, 14, 12);
        const auraMat = new THREE.MeshBasicMaterial({
          color: colorConfig.light,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          wireframe: true
        });
        const auraMesh = new THREE.Mesh(auraGeo, auraMat);
        wandTip.add(auraMesh);
        this.riggedWandAura = auraMesh;

        // Wand Tip Effect: Orbiting Elemental Sparkles
        const sparkCount = 24;
        const sparkGeo = new THREE.BufferGeometry();
        const sparkPos = new Float32Array(sparkCount * 3);
        for (let i = 0; i < sparkCount; i++) {
          const theta = (i / sparkCount) * Math.PI * 2;
          const rad = 0.05 + Math.random() * 0.04;
          sparkPos[i * 3] = Math.cos(theta) * rad;
          sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 0.06;
          sparkPos[i * 3 + 2] = Math.sin(theta) * rad;
        }
        sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
        const sparkMat = new THREE.PointsMaterial({
          color: colorConfig.light,
          size: 0.024,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending
        });
        const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
        wandTip.add(sparkPoints);
        this.riggedWandSparks = sparkPoints;

        // Setup Skeletal Animation Mixer
        this.mixer = new THREE.AnimationMixer(model);
        this.actions = {};
        if (gltf.animations && gltf.animations.length > 0) {
          gltf.animations.forEach((clip) => {
            const act = this.mixer.clipAction(clip);
            this.actions[clip.name] = act;
          });
          if (this.actions['Idle']) {
            this.currentAction = this.actions['Idle'];
            this.currentAction.play();
          }

          // Smoothly crossfade back to current locomotion action when cast animation finishes
          this.mixer.addEventListener('finished', (e) => {
            if (this.actions['Cast_Basic'] && e.action === this.actions['Cast_Basic']) {
              if (this.currentAction) {
                this.currentAction.reset().fadeIn(0.14).play();
              }
            }
          });
        }

        this.riggedGroup.add(model);
        this.riggedGroup.visible = true;
        this.hasRiggedModel = true;

        // Hide procedural fallback viewmodel and disable dormant procedural lights
        if (this.proceduralGroup) {
          this.proceduralGroup.visible = false;
        }
        if (this.staffLight) this.staffLight.intensity = 0;
        if (this.leftHandLight) this.leftHandLight.intensity = 0;
      })
      .catch((err) => {
        console.warn('[FPViewmodel] Could not load rigged 3D viewmodel, using procedural PBR fallback:', err);
      });
  }

  triggerCast(slot = 'basic', intensity = 1.0) {
    this.currentSlot = slot;

    // Trigger rigged 3D skeletal animation
    if (this.hasRiggedModel && this.actions && this.actions['Cast_Basic']) {
      const cast = this.actions['Cast_Basic'];
      cast.reset();
      cast.setLoop(THREE.LoopOnce);
      cast.clampWhenFinished = false;
      cast.play();
    }
    if (this.riggedWandLight) this.riggedWandLight.intensity = 6.8 * intensity;
    if (this.riggedWandAura) this.riggedWandAura.scale.set(1.6, 1.6, 1.6);

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

  triggerJump() {
    this.verticalBob = -0.07;
  }

  triggerLanding() {
    this.verticalBob = 0.055;
  }

  update(deltaTime, isMoving, mouseDelta) {
    this.time += deltaTime;

    // Smoothly decay jump/landing vertical bob
    if (this.verticalBob !== undefined && Math.abs(this.verticalBob) > 0.001) {
      this.verticalBob = THREE.MathUtils.lerp(this.verticalBob, 0, Math.min(1.0, deltaTime * 8));
    } else {
      this.verticalBob = 0;
    }

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

    // ==========================================
    // UPDATE RIGGED 3D VIEWMODEL (MIXER & FX)
    // ==========================================
    if (this.mixer) {
      this.mixer.update(deltaTime);

      // Blend between Idle and Walk animations smoothly
      const isCasting = this.actions['Cast_Basic'] && this.actions['Cast_Basic'].isRunning();
      if (!isCasting) {
        if (isMoving) {
          if (this.actions['Walk'] && this.currentAction !== this.actions['Walk']) {
            this.actions['Walk'].reset().fadeIn(0.22).play();
            if (this.currentAction) this.currentAction.fadeOut(0.22);
            this.currentAction = this.actions['Walk'];
          }
        } else {
          if (this.actions['Idle'] && this.currentAction !== this.actions['Idle']) {
            this.actions['Idle'].reset().fadeIn(0.22).play();
            if (this.currentAction) this.currentAction.fadeOut(0.22);
            this.currentAction = this.actions['Idle'];
          }
        }
      }
    }

    // Rigged Model First-Person Transforms (Sway, Recoil, Jump Bob)
    if (this.riggedGroup && this.hasRiggedModel) {
      this.riggedGroup.position.set(
        0.04 + swayX * 0.75 + this.lookSwayX,
        -0.28 - swayY * 0.75 + this.lookSwayY + this.verticalBob,
        -0.32 + this.recoil * 0.5
      );
      this.riggedGroup.rotation.x = this.lookSwayY * 1.3 - this.recoil * 0.7;
      this.riggedGroup.rotation.y = -this.lookSwayX * 1.6;

      // Wand Tip FX: Spinning Corona Aura, Sparkle Field, and PointLight
      if (this.riggedWandAura) {
        this.riggedWandAura.rotation.y += deltaTime * 4.2;
        this.riggedWandAura.rotation.z += deltaTime * 2.8;
        const pulse = 1.0 + Math.sin(this.time * 6.5) * 0.15 + (this.castGesture || 0) * 0.45;
        this.riggedWandAura.scale.set(pulse, pulse, pulse);
      }
      if (this.riggedWandSparks) {
        this.riggedWandSparks.rotation.y -= deltaTime * 3.6;
        this.riggedWandSparks.rotation.x += deltaTime * 1.8;
      }
      if (this.riggedWandLight) {
        this.riggedWandLight.intensity = THREE.MathUtils.lerp(this.riggedWandLight.intensity, 3.4, deltaTime * 5);
      }
    } else {
      // Procedural Viewmodel updates (only when 3D rigged model is not active)
      if (this.crystal) {
        this.crystal.material.emissiveIntensity = THREE.MathUtils.lerp(this.crystal.material.emissiveIntensity, 2.2, deltaTime * 6);
      }
      if (this.staffLight) {
        this.staffLight.intensity = THREE.MathUtils.lerp(this.staffLight.intensity, 2.8, deltaTime * 6);
      }
      if (this.leftHandLight) {
        this.leftHandLight.intensity = THREE.MathUtils.lerp(this.leftHandLight.intensity, 1.4, deltaTime * 5);
      }

      // Update Right Arm / Staff with sway, recoil, mouse inertia, and jump bob
      this.rightArmGroup.position.set(
        0.36 + swayX + this.lookSwayX,
        -0.32 - swayY - this.recoil * 0.5 + this.lookSwayY + this.verticalBob,
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

      // Update Left Somatic Hand with casting thrust and jump bob
      const thrust = this.castGesture * 0.18;
      this.leftArmGroup.position.set(
        -0.35 - swayX - this.lookSwayX * 0.85 + thrust * 0.45,
        -0.34 - swayY - this.lookSwayY * 0.85 + thrust * 0.85 + this.verticalBob,
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

    // Update Left Somatic Hand with casting thrust and jump bob
    const thrust = this.castGesture * 0.18;
    this.leftArmGroup.position.set(
      -0.35 - swayX - this.lookSwayX * 0.85 + thrust * 0.45,
      -0.34 - swayY - this.lookSwayY * 0.85 + thrust * 0.85 + this.verticalBob,
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
