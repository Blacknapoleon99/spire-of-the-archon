import * as THREE from 'three';
import { TextureGenerator } from './textureGenerator.js';
import { assetLoader } from './assetLoader.js';

/**
 * High-Fidelity 3D Model Factory for The Spire of the Archon.
 * Produces realistic, high-subdivision PBR models with detailed materials and normal/bump maps.
 */
export class ModelFactory {
  /**
   * Builds a high-detail realistic Sorcerer / Magician character model with class-specific staves
   */
  static createWizardMesh(wizardClass = 'pyromancer', customColor = null) {
    const classConfigs = {
      pyromancer: { hex: '#c62828', color: 0xc62828, light: 0xff5722, staff: 'dragon_flame' },
      cryomancer: { hex: '#0288d1', color: 0x0288d1, light: 0x00e5ff, staff: 'frost_lotus' },
      luminary: { hex: '#ffc107', color: 0xffc107, light: 0xffd700, staff: 'solar_halo' },
      stormcaller: { hex: '#fbc02d', color: 0xfbc02d, light: 0xffea00, staff: 'thunder_spire' },
      chronomancer: { hex: '#8e24aa', color: 0x8e24aa, light: 0xd500f9, staff: 'time_astrolabe' }
    };
    const config = classConfigs[wizardClass] || classConfigs.pyromancer;

    const clothPBR = TextureGenerator.createClothWeavePBR(config.hex);
    const skinPBR = TextureGenerator.createSkinPBR();
    const woodPBR = TextureGenerator.createWoodGrainPBR();
    const brassPBR = TextureGenerator.createGildedBrassPBR();

    const goldMat = brassPBR.material;

    const group = new THREE.Group();
    group.name = `RealisticSorcerer_${wizardClass}`;

    // Ground Arcane Rune Ring at feet
    const runeRingGeo = new THREE.RingGeometry(0.5, 0.95, 32);
    const runeRingMat = new THREE.MeshBasicMaterial({
      color: config.light,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.02;
    group.add(runeRing);

    // Inner Visual Offset Group (Allows breathing/walking bobbing without overriding world position)
    const visualOffsetGroup = new THREE.Group();
    group.add(visualOffsetGroup);

    // Flowing Robe Skirt (High-segment curved drape)
    const skirtGeo = new THREE.CylinderGeometry(0.45, 0.75, 1.3, 24, 4);
    const skirt = new THREE.Mesh(skirtGeo, clothPBR.material);
    skirt.position.y = 0.65;
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    visualOffsetGroup.add(skirt);

    // Torso / Surcoat with Gilded Trim
    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.45, 0.75, 20);
    const torso = new THREE.Mesh(torsoGeo, clothPBR.material);
    torso.position.y = 1.35;
    torso.castShadow = true;
    visualOffsetGroup.add(torso);

    // Golden Pauldrons (Shoulder Guards)
    const pauldronGeo = new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const leftPauldron = new THREE.Mesh(pauldronGeo, goldMat);
    leftPauldron.position.set(-0.42, 1.62, 0);
    leftPauldron.rotation.z = 0.4;
    visualOffsetGroup.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(pauldronGeo, goldMat);
    rightPauldron.position.set(0.42, 1.62, 0);
    rightPauldron.rotation.z = -0.4;
    visualOffsetGroup.add(rightPauldron);

    // Leather Belt & Golden Buckle
    const beltGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.08, 20);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.7 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 1.05;
    visualOffsetGroup.add(belt);

    const buckleGeo = new THREE.BoxGeometry(0.12, 0.1, 0.04);
    const buckle = new THREE.Mesh(buckleGeo, goldMat);
    buckle.position.set(0, 1.05, 0.43);
    visualOffsetGroup.add(buckle);

    // Sorcerer Head / Face
    const headGeo = new THREE.SphereGeometry(0.24, 20, 20);
    const head = new THREE.Mesh(headGeo, skinPBR.material);
    head.position.y = 1.82;
    visualOffsetGroup.add(head);

    // Detailed Sorcerer Cowl / Hood
    const hoodGeo = new THREE.SphereGeometry(0.32, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const hood = new THREE.Mesh(hoodGeo, clothPBR.material);
    hood.position.set(0, 1.85, -0.04);
    visualOffsetGroup.add(hood);

    // Ornate Conical Archmage Hat
    const hatBrimGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.04, 24);
    const hatBrim = new THREE.Mesh(hatBrimGeo, clothPBR.material);
    hatBrim.position.y = 1.96;
    hatBrim.rotation.x = 0.05;
    visualOffsetGroup.add(hatBrim);

    const hatConeGeo = new THREE.ConeGeometry(0.36, 0.85, 20);
    const hatCone = new THREE.Mesh(hatConeGeo, clothPBR.material);
    hatCone.position.set(0, 2.38, -0.06);
    hatCone.rotation.x = -0.15;
    visualOffsetGroup.add(hatCone);

    // Glowing Sorcerer Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 10, 10);
    const eyeMat = new THREE.MeshBasicMaterial({ color: config.light });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.08, 1.83, 0.22);
    visualOffsetGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.08, 1.83, 0.22);
    visualOffsetGroup.add(eyeR);

    // Right Arm & Class-Specific Ornate Staff
    const armGroup = new THREE.Group();
    armGroup.position.set(0.42, 1.45, 0);

    const armGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.6, 14);
    const arm = new THREE.Mesh(armGeo, clothPBR.material);
    arm.position.set(0.1, -0.18, 0.18);
    arm.rotation.x = Math.PI / 4;
    armGroup.add(arm);

    // Staff
    const staffGroup = new THREE.Group();
    staffGroup.position.set(0.2, -0.05, 0.45);

    const shaftGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.3, 14);
    const shaft = new THREE.Mesh(shaftGeo, woodPBR.material);
    shaft.castShadow = true;
    staffGroup.add(shaft);

    // Staff Head based on class
    const crystalGeo = new THREE.OctahedronGeometry(0.2, 1);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 1.5,
      roughness: 0.08,
      metalness: 0.2
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 1.22;
    staffGroup.add(crystal);

    // Class Staff Filigree Crown
    if (config.staff === 'dragon_flame') {
      const crownGeo = new THREE.ConeGeometry(0.14, 0.25, 4);
      const crown = new THREE.Mesh(crownGeo, goldMat);
      crown.position.y = 1.08;
      staffGroup.add(crown);
    } else if (config.staff === 'solar_halo') {
      const haloGeo = new THREE.TorusGeometry(0.25, 0.025, 8, 24);
      const halo = new THREE.Mesh(haloGeo, goldMat);
      halo.position.y = 1.22;
      staffGroup.add(halo);
    } else if (config.staff === 'time_astrolabe') {
      const astrolabeGeo = new THREE.TorusGeometry(0.22, 0.02, 8, 20);
      const astrolabe = new THREE.Mesh(astrolabeGeo, goldMat);
      astrolabe.position.y = 1.22;
      astrolabe.rotation.x = Math.PI / 2;
      staffGroup.add(astrolabe);
    }

    const staffLight = new THREE.PointLight(config.light, 1.8, 7);
    staffLight.position.y = 1.22;
    staffGroup.add(staffLight);

    armGroup.add(staffGroup);
    visualOffsetGroup.add(armGroup);

    group.userData = { armGroup, staffGroup, crystal, skirt, staffLight, runeRing, visualOffsetGroup };
    return group;
  }

  /**
   * Realistic Stone Golem with chiseled rock plates, magma fracture pauldrons, and massive Warhammer
   */
  static createGolemMesh() {
    const glb = assetLoader.getModel('/models/heavy_warrior.glb');
    if (glb) {
      const group = new THREE.Group();
      group.name = 'RealisticGolem_GLTF';
      glb.scale.set(1.4, 1.4, 1.4);
      group.add(glb);
      group.userData = { isGltf: true };
      return group;
    }

    const stonePBR = TextureGenerator.createCobblestonePBR();
    const lavaPBR = TextureGenerator.createLavaTexturePBR();
    const rustMat = TextureGenerator.createRustedIronPBR().material;

    const group = new THREE.Group();
    group.name = 'RealisticGolem';

    // Massive Chiseled Torso with Magma Fractures
    const torsoGeo = new THREE.DodecahedronGeometry(1.25, 2);
    const torso = new THREE.Mesh(torsoGeo, stonePBR.material);
    torso.position.y = 1.75;
    torso.castShadow = true;
    group.add(torso);

    // Magma Chest Heart Core
    const veinGeo = new THREE.BoxGeometry(0.22, 0.95, 0.16);
    const vein = new THREE.Mesh(veinGeo, lavaPBR.material);
    vein.position.set(0, 1.75, 1.18);
    group.add(vein);

    // Spiked Volcanic Magma Pauldrons
    const pauldronGeo = new THREE.DodecahedronGeometry(0.55, 1);
    const leftPauldron = new THREE.Mesh(pauldronGeo, stonePBR.material);
    leftPauldron.position.set(-1.45, 2.35, 0);
    group.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(pauldronGeo, stonePBR.material);
    rightPauldron.position.set(1.45, 2.35, 0);
    group.add(rightPauldron);

    // Horned Boulder Head
    const headGeo = new THREE.BoxGeometry(0.78, 0.65, 0.78);
    const head = new THREE.Mesh(headGeo, stonePBR.material);
    head.position.set(0, 2.75, 0.32);
    group.add(head);

    // Glowing Magma Eyes
    const eyeGeo = new THREE.BoxGeometry(0.48, 0.09, 0.12);
    const eye = new THREE.Mesh(eyeGeo, lavaPBR.material);
    eye.position.set(0, 2.75, 0.72);
    group.add(eye);

    // Left Fist
    const fistGeo = new THREE.DodecahedronGeometry(0.65, 1);
    const leftFist = new THREE.Mesh(fistGeo, stonePBR.material);
    leftFist.position.set(-1.45, 1.35, 0.3);
    leftFist.castShadow = true;
    group.add(leftFist);

    // Right Arm & Stone Warhammer
    const rightArm = new THREE.Group();
    rightArm.position.set(1.4, 1.7, 0.2);

    const armGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.8, 8);
    const armMesh = new THREE.Mesh(armGeo, stonePBR.material);
    armMesh.position.set(0, -0.4, 0);
    rightArm.add(armMesh);

    const rightFistMesh = new THREE.Mesh(fistGeo, stonePBR.material);
    rightFistMesh.position.set(0, -0.85, 0.1);
    rightArm.add(rightFistMesh);

    // Chained Volcanic Stone Warhammer
    const hammerGroup = new THREE.Group();
    hammerGroup.position.set(0, -0.85, 0.1);

    const shaftGeo = new THREE.CylinderGeometry(0.08, 0.09, 2.4, 8);
    const shaft = new THREE.Mesh(shaftGeo, rustMat);
    shaft.position.set(0, 0.4, 0.3);
    shaft.rotation.x = Math.PI / 4;
    hammerGroup.add(shaft);

    const hammerHeadGeo = new THREE.BoxGeometry(0.85, 0.75, 1.1);
    const hammerHead = new THREE.Mesh(hammerHeadGeo, stonePBR.material);
    hammerHead.position.set(0, 1.35, -0.65);
    hammerHead.rotation.x = Math.PI / 4;
    hammerGroup.add(hammerHead);

    // Magma Inlay on Hammer
    const hammerGlowGeo = new THREE.BoxGeometry(0.18, 0.55, 1.15);
    const hammerGlow = new THREE.Mesh(hammerGlowGeo, lavaPBR.material);
    hammerGlow.position.set(0, 1.35, -0.65);
    hammerGlow.rotation.x = Math.PI / 4;
    hammerGroup.add(hammerGlow);

    rightArm.add(hammerGroup);
    group.add(rightArm);

    // Heavy Stone Legs
    const legGeo = new THREE.CylinderGeometry(0.42, 0.52, 1.15, 10);
    const leftLeg = new THREE.Mesh(legGeo, stonePBR.material);
    leftLeg.position.set(-0.62, 0.58, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, stonePBR.material);
    rightLeg.position.set(0.62, 0.58, 0);
    group.add(rightLeg);

    group.userData = { torso, head, leftFist, rightArm, weapon: hammerGroup };
    return group;
  }

  /**
   * Realistic Arcane Sentinel with clockwork wings, astrolabe rings, and Runic Glaive
   */
  static createSentinelMesh() {
    const group = new THREE.Group();
    group.name = 'RealisticSentinel';

    const brassPBR = TextureGenerator.createGildedBrassPBR();
    const goldMat = brassPBR.material;

    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x1e222a,
      roughness: 0.35,
      metalness: 0.85
    });

    const cyanGlow = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b4d8,
      emissiveIntensity: 2.2,
      roughness: 0.1
    });

    // Armored Clockwork Torso
    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.85, 12);
    const torso = new THREE.Mesh(torsoGeo, darkMetal);
    torso.position.y = 1.7;
    group.add(torso);

    // Gilded Chestplate & Pauldrons
    const chestPlateGeo = new THREE.BoxGeometry(0.55, 0.65, 0.42);
    const chestPlate = new THREE.Mesh(chestPlateGeo, goldMat);
    chestPlate.position.set(0, 1.75, 0.12);
    group.add(chestPlate);

    // Glowing Heart Core
    const coreGeo = new THREE.OctahedronGeometry(0.25, 1);
    const core = new THREE.Mesh(coreGeo, cyanGlow);
    core.position.set(0, 1.75, 0.35);
    group.add(core);

    // Clockwork Wings (Articulated Gilded Blades on Back)
    for (let w = 0; w < 4; w++) {
      const wingGeo = new THREE.BoxGeometry(0.08, 0.9, 0.04);
      const leftWing = new THREE.Mesh(wingGeo, goldMat);
      leftWing.position.set(-0.35 - w * 0.15, 2.0 + w * 0.18, -0.25);
      leftWing.rotation.z = -0.5 - w * 0.2;
      group.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, goldMat);
      rightWing.position.set(0.35 + w * 0.15, 2.0 + w * 0.18, -0.25);
      rightWing.rotation.z = 0.5 + w * 0.2;
      group.add(rightWing);
    }

    // Armored Visor Head
    const headGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.42, 10);
    const head = new THREE.Mesh(headGeo, darkMetal);
    head.position.set(0, 2.35, 0.05);
    group.add(head);

    // Glowing Cyan Visor Slit
    const visorGeo = new THREE.BoxGeometry(0.32, 0.08, 0.15);
    const visor = new THREE.Mesh(visorGeo, cyanGlow);
    visor.position.set(0, 2.35, 0.25);
    group.add(visor);

    // Concentric Astrolabe Halo Rings
    const ring1Geo = new THREE.TorusGeometry(0.95, 0.038, 12, 32);
    const ring1 = new THREE.Mesh(ring1Geo, goldMat);
    ring1.position.set(0, 1.75, -0.2);
    group.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(1.25, 0.032, 12, 32);
    const ring2 = new THREE.Mesh(ring2Geo, darkMetal);
    ring2.position.set(0, 1.75, -0.2);
    group.add(ring2);

    // Right Arm with Runic Arcane Glaive / Halberd
    const rightArm = new THREE.Group();
    rightArm.position.set(0.65, 1.9, 0);

    const armGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.65, 8);
    const armMesh = new THREE.Mesh(armGeo, goldMat);
    armMesh.position.set(0, -0.3, 0);
    rightArm.add(armMesh);

    // Runic Halberd
    const halberdGroup = new THREE.Group();
    halberdGroup.position.set(0, -0.5, 0.2);

    const halberdShaftGeo = new THREE.CylinderGeometry(0.03, 0.035, 2.5, 10);
    const halberdShaft = new THREE.Mesh(halberdShaftGeo, darkMetal);
    halberdShaft.position.set(0, 0.6, 0);
    halberdGroup.add(halberdShaft);

    // Crescent Runic Blade
    const bladeGeo = new THREE.ConeGeometry(0.25, 0.85, 4);
    const blade = new THREE.Mesh(bladeGeo, cyanGlow);
    blade.position.set(0.2, 1.85, 0);
    blade.rotation.z = -0.3;
    halberdGroup.add(blade);

    rightArm.add(halberdGroup);
    group.add(rightArm);

    // Ambient Core Light
    const light = new THREE.PointLight(0x00e5ff, 2.5, 9);
    light.position.set(0, 1.75, 0.35);
    group.add(light);

    group.userData = { core, ring1, ring2, rightArm, weapon: halberdGroup };
    return group;
  }

  /**
   * Realistic Void Shade with flowing tendrils and twin astral scythes
   */
  static createVoidShadeMesh() {
    const group = new THREE.Group();
    group.name = 'RealisticVoidShade';

    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x0a0515,
      roughness: 0.3,
      metalness: 0.7,
      transparent: true,
      opacity: 0.9
    });

    const voidGlow = new THREE.MeshBasicMaterial({ color: 0xd946ef });

    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.65, 2.1, 16);
    const body = new THREE.Mesh(bodyGeo, shadeMat);
    body.position.y = 1.2;
    group.add(body);

    const hoodGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const hood = new THREE.Mesh(hoodGeo, shadeMat);
    hood.position.y = 2.15;
    group.add(hood);

    // Glowing Ethereal Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, voidGlow);
    eyeL.position.set(-0.12, 2.18, 0.34);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, voidGlow);
    eyeR.position.set(0.12, 2.18, 0.34);
    group.add(eyeR);

    // Twin Astral Void Sickles
    const bladeGeo = new THREE.TorusGeometry(0.4, 0.025, 6, 16, Math.PI * 0.8);
    const bladeL = new THREE.Mesh(bladeGeo, voidGlow);
    bladeL.position.set(-0.65, 1.3, 0.3);
    bladeL.rotation.y = Math.PI / 4;
    group.add(bladeL);

    const bladeR = new THREE.Mesh(bladeGeo, voidGlow);
    bladeR.position.set(0.65, 1.3, 0.3);
    bladeR.rotation.y = -Math.PI / 4;
    group.add(bladeR);

    const voidLight = new THREE.PointLight(0xd946ef, 1.8, 6);
    voidLight.position.y = 1.6;
    group.add(voidLight);

    group.userData = { body, hood, bladeL, bladeR, voidLight };
    return group;
  }

  /**
   * Realistic Archon Valerius (Final Boss) with Royal Mantle, Astrolabe Rings & Dual Boss Weapons
   */
  static createBossMesh() {
    const glb = assetLoader.getModel('/models/archon_valerius.glb');
    if (glb) {
      const group = new THREE.Group();
      group.name = 'RealisticArchonValerius_GLTF';
      glb.scale.set(1.4, 1.4, 1.4);
      group.add(glb);

      // Gilded concentric chronometer rings
      const brassPBR = TextureGenerator.createGildedBrassPBR();
      const ring1Geo = new THREE.TorusGeometry(1.0, 0.05, 12, 32);
      const ring1 = new THREE.Mesh(ring1Geo, brassPBR.material);
      ring1.position.y = 2.0;
      ring1.rotation.x = Math.PI / 3;
      group.add(ring1);

      const ring2Geo = new THREE.TorusGeometry(1.3, 0.04, 12, 32);
      const ring2 = new THREE.Mesh(ring2Geo, brassPBR.material);
      ring2.position.y = 2.0;
      ring2.rotation.y = Math.PI / 4;
      group.add(ring2);

      const shieldGeo = new THREE.IcosahedronGeometry(2.4, 2);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: 0.35,
        wireframe: true
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.y = 2.0;
      group.add(shield);

      const bossLight = new THREE.PointLight(0xffea00, 3.5, 16);
      bossLight.position.y = 2.8;
      group.add(bossLight);

      group.userData = { isGltf: true, ring1, ring2, shield, bossLight };
      return group;
    }

    const group = new THREE.Group();
    group.name = 'RealisticArchonValerius';

    const royalCloth = TextureGenerator.createClothWeavePBR('#3b0764').material;
    const brassPBR = TextureGenerator.createGildedBrassPBR();
    const goldMat = brassPBR.material;

    // Heavy Flowing Robes
    const robeGeo = new THREE.CylinderGeometry(0.55, 1.2, 2.6, 24);
    const robe = new THREE.Mesh(robeGeo, royalCloth);
    robe.position.y = 1.6;
    robe.castShadow = true;
    group.add(robe);

    // Archon Gilded Shoulder Mantle & Pauldrons
    const mantleGeo = new THREE.TorusGeometry(0.68, 0.08, 10, 24);
    const mantle = new THREE.Mesh(mantleGeo, goldMat);
    mantle.position.set(0, 2.7, 0);
    mantle.rotation.x = Math.PI / 2;
    group.add(mantle);

    // Ornate Celestial Horned Mask
    const helmGeo = new THREE.SphereGeometry(0.45, 20, 20);
    const helm = new THREE.Mesh(helmGeo, goldMat);
    helm.position.y = 3.0;
    group.add(helm);

    const hornGeo = new THREE.ConeGeometry(0.12, 1.1, 12);
    const hornL = new THREE.Mesh(hornGeo, goldMat);
    hornL.position.set(-0.38, 3.65, -0.1);
    hornL.rotation.z = -0.35;
    group.add(hornL);

    const hornR = new THREE.Mesh(hornGeo, goldMat);
    hornR.position.set(0.38, 3.65, -0.1);
    hornR.rotation.z = 0.35;
    group.add(hornR);

    // Dual Rotating Chronometer Rings
    const ring1Geo = new THREE.TorusGeometry(0.75, 0.045, 12, 32);
    const ring1 = new THREE.Mesh(ring1Geo, goldMat);
    ring1.position.set(1.1, 2.4, 0.4);
    group.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(0.52, 0.035, 12, 32);
    const ring2 = new THREE.Mesh(ring2Geo, goldMat);
    ring2.position.set(1.1, 2.4, 0.4);
    group.add(ring2);

    // Floating Hourglass of Eternity
    const hourglassGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 12);
    const hourglassMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xd500f9,
      emissiveIntensity: 1.2,
      roughness: 0.1
    });
    const hourglass = new THREE.Mesh(hourglassGeo, hourglassMat);
    hourglass.position.set(-1.1, 2.4, 0.4);
    group.add(hourglass);

    // Temporal Shield
    const shieldGeo = new THREE.SphereGeometry(2.8, 28, 28);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0xbf5af2,
      emissive: 0xbf5af2,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.45,
      wireframe: true
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.y = 1.8;
    group.add(shield);

    const bossLight = new THREE.PointLight(0xffea00, 3.0, 14);
    bossLight.position.y = 2.8;
    group.add(bossLight);

    group.userData = { robe, ring1, ring2, hourglass, shield, bossLight };
    return group;
  }

  /**
   * Scribe's Grand Lectern with Open Leather-Bound Tome
   */
  static createLecternMesh() {
    const woodPBR = TextureGenerator.createWoodGrainPBR();
    const group = new THREE.Group();
    group.name = 'GrandLectern';

    // Carved Wood Pillar Stand
    const standGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.4, 16);
    const stand = new THREE.Mesh(standGeo, woodPBR.material);
    stand.position.y = 0.7;
    stand.castShadow = true;
    group.add(stand);

    // Slanted Desk Board
    const deskGeo = new THREE.BoxGeometry(1.2, 0.1, 0.9);
    const desk = new THREE.Mesh(deskGeo, woodPBR.material);
    desk.position.set(0, 1.45, 0);
    desk.rotation.x = Math.PI / 6;
    desk.castShadow = true;
    group.add(desk);

    // Open Ancient Tome
    const tomeGeo = new THREE.BoxGeometry(0.9, 0.08, 0.65);
    const tomeMat = new THREE.MeshStandardMaterial({ color: 0xf4ecd8, roughness: 0.9 });
    const tome = new THREE.Mesh(tomeGeo, tomeMat);
    tome.position.set(0, 1.52, 0);
    tome.rotation.x = Math.PI / 6;
    group.add(tome);

    // Glowing Golden Inscription Light
    const light = new THREE.PointLight(0xffd700, 1.5, 5);
    light.position.set(0, 1.8, 0.2);
    group.add(light);

    return group;
  }

  /**
   * Floor 1 Light Prism Pedestal
   */
  static createPrismPedestalMesh(prismId = 1) {
    const stonePBR = TextureGenerator.createStoneBrickPBR();
    const group = new THREE.Group();
    group.name = `RealisticPrism_${prismId}`;

    const baseGeo = new THREE.CylinderGeometry(0.85, 1.05, 1.4, 16);
    const base = new THREE.Mesh(baseGeo, stonePBR.material);
    base.position.y = 0.7;
    base.castShadow = true;
    group.add(base);

    const headGroup = new THREE.Group();
    headGroup.position.y = 1.6;

    const crystalGeo = new THREE.OctahedronGeometry(0.45, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b4d8,
      emissiveIntensity: 1.0,
      roughness: 0.1,
      metalness: 0.3
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    headGroup.add(crystal);

    // Directional Beam
    const beamGeo = new THREE.CylinderGeometry(0.06, 0.06, 12, 12);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 0, 6);
    beam.rotation.x = Math.PI / 2;
    headGroup.add(beam);

    group.add(headGroup);
    group.userData = { headGroup, beam, prismId };
    return group;
  }

  /**
   * Floor 2 Elemental Crucible
   */
  static createCrucibleMesh(element = 'fire', color = 0xff4400) {
    const group = new THREE.Group();
    group.name = `RealisticCrucible_${element}`;

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x22252c,
      roughness: 0.5,
      metalness: 0.8
    });

    const potGeo = new THREE.CylinderGeometry(1.2, 0.85, 1.3, 20);
    const pot = new THREE.Mesh(potGeo, ironMat);
    pot.position.y = 0.65;
    pot.castShadow = true;
    group.add(pot);

    const fluidGeo = new THREE.CircleGeometry(1.0, 20);
    const fluidMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const fluid = new THREE.Mesh(fluidGeo, fluidMat);
    fluid.position.y = 1.25;
    fluid.rotation.x = -Math.PI / 2;
    group.add(fluid);

    const light = new THREE.PointLight(color, 2.2, 8);
    light.position.y = 1.5;
    group.add(light);

    group.userData = { fluid, light, element };
    return group;
  }

  /**
   * Floor 3 Celestial Keystone
   */
  static createKeystoneMesh(id = 'north') {
    const group = new THREE.Group();
    group.name = `RealisticKeystone_${id}`;

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.9
    });

    const pylonGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.8, 8);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.5,
      roughness: 0.2
    });
    const pylon = new THREE.Mesh(pylonGeo, pylonMat);
    pylon.position.y = 2.2;
    pylon.castShadow = true;
    group.add(pylon);

    const baseGeo = new THREE.CylinderGeometry(0.95, 1.25, 0.6, 16);
    const base = new THREE.Mesh(baseGeo, goldMat);
    base.position.y = 0.3;
    group.add(base);

    const beamGeo = new THREE.CylinderGeometry(0.18, 0.18, 16, 12);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xd946ef,
      transparent: true,
      opacity: 0.35
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 8;
    group.add(beam);

    group.userData = { pylon, beam, id, active: false };
    return group;
  }

  /**
   * Grand Scribe Alistair — 3D Ethereal Quest Giver (Floor 1)
   */
  static createScribeGhostMesh() {
    const glb = assetLoader.getModel('/models/elf_mage.glb');
    if (glb) {
      const group = new THREE.Group();
      group.name = 'GrandScribeAlistair_GLTF';
      glb.scale.set(1.1, 1.1, 1.1);
      glb.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.85;
          child.material.emissive = new THREE.Color(0x0088cc);
          child.material.emissiveIntensity = 0.6;
        }
      });
      group.add(glb);

      const auraLight = new THREE.PointLight(0x00b4d8, 2.0, 8);
      auraLight.position.set(0, 1.6, 0);
      group.add(auraLight);

      group.userData = { isGltf: true, auraLight };
      return group;
    }

    const group = new THREE.Group();
    group.name = 'GrandScribeAlistair';

    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x80deea,
      emissive: 0x00bcd4,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.78,
      roughness: 0.3
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      emissive: 0xffb300,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85,
      metalness: 0.8
    });

    // Robe
    const robeGeo = new THREE.CylinderGeometry(0.35, 0.65, 1.6, 20, 2);
    const robe = new THREE.Mesh(robeGeo, ghostMat);
    robe.position.y = 1.0;
    group.add(robe);

    // Torso
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.6, 16);
    const torso = new THREE.Mesh(torsoGeo, ghostMat);
    torso.position.y = 1.7;
    group.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const head = new THREE.Mesh(headGeo, ghostMat);
    head.position.y = 2.15;
    group.add(head);

    // Sage Hat
    const hatBrim = new THREE.CylinderGeometry(0.48, 0.48, 0.05, 16);
    const brim = new THREE.Mesh(hatBrim, goldMat);
    brim.position.y = 2.26;
    group.add(brim);

    const hatCone = new THREE.ConeGeometry(0.32, 0.75, 16);
    const cone = new THREE.Mesh(hatCone, goldMat);
    cone.position.set(0, 2.65, -0.08);
    cone.rotation.x = -0.2;
    group.add(cone);

    // Hovering Arcane Tome
    const bookGeo = new THREE.BoxGeometry(0.35, 0.06, 0.45);
    const bookMat = new THREE.MeshStandardMaterial({
      color: 0x4a148c,
      emissive: 0x7b1fa2,
      emissiveIntensity: 0.5
    });
    const book = new THREE.Mesh(bookGeo, bookMat);
    book.position.set(0.45, 1.5, 0.35);
    book.rotation.set(0.3, 0.4, 0.1);
    group.add(book);

    // Ethereal Aura Light
    const aura = new THREE.PointLight(0x00e5ff, 2.0, 6);
    aura.position.y = 1.8;
    group.add(aura);

    group.userData = { book, aura, isGhost: true };
    return group;
  }

  /**
   * Alchemist Ignatius — 3D Forge Master Quest Giver (Floor 2)
   */
  static createAlchemistMesh() {
    const glb = assetLoader.getModel('/models/blacksmith.glb');
    if (glb) {
      const group = new THREE.Group();
      group.name = 'AlchemistIgnatius_GLTF';
      glb.scale.set(1.1, 1.1, 1.1);
      group.add(glb);

      const forgeLight = new THREE.PointLight(0xff6d00, 2.2, 6);
      forgeLight.position.set(-0.4, 1.1, 0.35);
      group.add(forgeLight);

      group.userData = { isGltf: true, forgeLight };
      return group;
    }

    const group = new THREE.Group();
    group.name = 'AlchemistIgnatius';

    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.8 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.4, metalness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.3, metalness: 0.9 });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff6d00,
      emissive: 0xff3d00,
      emissiveIntensity: 0.8
    });

    // Tunic & Apron
    const bodyGeo = new THREE.CylinderGeometry(0.45, 0.55, 1.4, 16);
    const body = new THREE.Mesh(bodyGeo, leatherMat);
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    // Heavy Iron Shoulder Plates
    const plateGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const leftPlate = new THREE.Mesh(plateGeo, ironMat);
    leftPlate.position.set(-0.55, 1.75, 0);
    group.add(leftPlate);
    const rightPlate = new THREE.Mesh(plateGeo, ironMat);
    rightPlate.position.set(0.55, 1.75, 0);
    group.add(rightPlate);

    // Head with Brass Goggles
    const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.7 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.95;
    group.add(head);

    // Goggles
    const goggleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12);
    const leftGoggle = new THREE.Mesh(goggleGeo, goldMat);
    leftGoggle.position.set(-0.1, 1.98, 0.22);
    leftGoggle.rotation.x = Math.PI / 2;
    group.add(leftGoggle);
    const rightGoggle = new THREE.Mesh(goggleGeo, goldMat);
    rightGoggle.position.set(0.1, 1.98, 0.22);
    rightGoggle.rotation.x = Math.PI / 2;
    group.add(rightGoggle);

    // Forge Hammer
    const hammerShaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8);
    const shaft = new THREE.Mesh(hammerShaftGeo, leatherMat);
    shaft.position.set(0.55, 1.1, 0.25);
    shaft.rotation.z = -0.2;
    group.add(shaft);

    const hammerHeadGeo = new THREE.BoxGeometry(0.2, 0.16, 0.35);
    const hammerHead = new THREE.Mesh(hammerHeadGeo, ironMat);
    hammerHead.position.set(0.62, 1.5, 0.25);
    group.add(hammerHead);

    // Glowing Ember Flask
    const flaskGeo = new THREE.SphereGeometry(0.14, 12, 12);
    const flask = new THREE.Mesh(flaskGeo, flameMat);
    flask.position.set(-0.4, 0.95, 0.35);
    group.add(flask);

    const forgeLight = new THREE.PointLight(0xff6d00, 1.8, 5);
    forgeLight.position.set(-0.4, 1.1, 0.35);
    group.add(forgeLight);

    group.userData = { forgeLight, hammerHead };
    return group;
  }

  /**
   * Builds Malakor the Escaped Convict 3D Model
   * Features broken iron manacles with dangling chains, tattered robes, contraband crates & shadow lantern
   */
  static createConvictMesh() {
    const glb = assetLoader.getModel('/models/malakor.glb');
    if (glb) {
      const group = new THREE.Group();
      group.name = 'MalakorTheConvict_GLTF';
      glb.scale.set(1.1, 1.1, 1.1);
      group.add(glb);

      // Warm contraband shadow lantern with dynamic flickering PointLight
      const lanternLight = new THREE.PointLight(0xffaa22, 2.4, 8);
      lanternLight.position.set(0.65, 1.1, 0.45);
      group.add(lanternLight);

      group.userData = { isGltf: true, lanternLight };
      return group;
    }

    const group = new THREE.Group();
    group.name = 'MalakorTheConvict';

    const tatteredCloth = TextureGenerator.createClothWeavePBR('#4a3b32').material;
    const skinMat = TextureGenerator.createSkinPBR().material;
    const rustedIron = new THREE.MeshStandardMaterial({
      color: 0x3e3e3e,
      roughness: 0.7,
      metalness: 0.8
    });
    const woodMat = TextureGenerator.createWoodGrainPBR().material;

    // Slouched Tattered Robes (Lower)
    const robeGeo = new THREE.CylinderGeometry(0.35, 0.65, 1.1, 16, 2);
    const robe = new THREE.Mesh(robeGeo, tatteredCloth);
    robe.position.y = 0.55;
    robe.castShadow = true;
    group.add(robe);

    // Torso (Lean, slightly hunched forward)
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.75, 14);
    const torso = new THREE.Mesh(torsoGeo, tatteredCloth);
    torso.position.set(0, 1.25, 0.08);
    torso.rotation.x = 0.12; // Slouched
    torso.castShadow = true;
    group.add(torso);

    // Hood / Cowl
    const hoodGeo = new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.75);
    const hood = new THREE.Mesh(hoodGeo, tatteredCloth);
    hood.position.set(0, 1.75, 0.16);
    hood.rotation.x = 0.2;
    group.add(hood);

    // Face shadow & glowing wary rogue eyes
    const faceGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.position.set(0, 1.68, 0.15);
    group.add(face);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffb300 });
    const eyeGeo = new THREE.SphereGeometry(0.025, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.06, 1.71, 0.3);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.06, 1.71, 0.3);
    group.add(rightEye);

    // Left Arm (Shoulder, Forearm, Hand & Broken Shackle)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.35, 1.45, 0.1);

    const upperArmGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.42, 8);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, tatteredCloth);
    leftUpperArm.position.set(-0.12, -0.18, 0.05);
    leftUpperArm.rotation.z = 0.35;
    leftUpperArm.rotation.x = 0.25;
    leftArmGroup.add(leftUpperArm);

    const forearmGeo = new THREE.CylinderGeometry(0.072, 0.065, 0.38, 8);
    const leftForearm = new THREE.Mesh(forearmGeo, skinMat);
    leftForearm.position.set(-0.2, -0.42, 0.18);
    leftForearm.rotation.x = -0.55;
    leftForearm.rotation.z = 0.2;
    leftArmGroup.add(leftForearm);

    // Left Hand resting on crate
    const handGeo = new THREE.BoxGeometry(0.08, 0.045, 0.09);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.25, -0.58, 0.32);
    leftHand.rotation.x = -0.4;
    leftArmGroup.add(leftHand);

    // Left Wrist Manacle & Dangling Chains
    const cuffGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.12, 12);
    const leftCuff = new THREE.Mesh(cuffGeo, rustedIron);
    leftCuff.position.set(-0.22, -0.48, 0.24);
    leftCuff.rotation.x = -0.55;
    leftArmGroup.add(leftCuff);

    for (let i = 0; i < 4; i++) {
      const linkGeo = new THREE.TorusGeometry(0.042, 0.014, 6, 10);
      const link = new THREE.Mesh(linkGeo, rustedIron);
      link.position.set(-0.22, -0.56 - i * 0.07, 0.24 + i * 0.01);
      link.rotation.y = (i % 2) * Math.PI / 2;
      leftArmGroup.add(link);
    }
    group.add(leftArmGroup);

    // Right Arm (Gesturing towards contraband wares)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.35, 1.45, 0.1);

    const rightUpperArm = new THREE.Mesh(upperArmGeo, tatteredCloth);
    rightUpperArm.position.set(0.12, -0.18, 0.08);
    rightUpperArm.rotation.z = -0.35;
    rightUpperArm.rotation.x = 0.2;
    rightArmGroup.add(rightUpperArm);

    const rightForearm = new THREE.Mesh(forearmGeo, skinMat);
    rightForearm.position.set(0.18, -0.42, 0.22);
    rightForearm.rotation.x = -0.65;
    rightForearm.rotation.z = -0.15;
    rightArmGroup.add(rightForearm);

    // Right Hand with articulated fingers
    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.22, -0.56, 0.36);
    rightHand.rotation.x = -0.3;
    rightArmGroup.add(rightHand);

    // Right Wrist Manacle & Dangling Chains
    const rightCuff = new THREE.Mesh(cuffGeo, rustedIron);
    rightCuff.position.set(0.2, -0.48, 0.28);
    rightCuff.rotation.x = -0.65;
    rightArmGroup.add(rightCuff);

    for (let i = 0; i < 5; i++) {
      const linkGeo = new THREE.TorusGeometry(0.042, 0.014, 6, 10);
      const link = new THREE.Mesh(linkGeo, rustedIron);
      link.position.set(0.2, -0.56 - i * 0.07, 0.28);
      link.rotation.y = (i % 2) * Math.PI / 2;
      rightArmGroup.add(link);
    }
    group.add(rightArmGroup);

    // Contraband Wooden Crates
    const crateGeo = new THREE.BoxGeometry(0.65, 0.55, 0.65);
    const crate1 = new THREE.Mesh(crateGeo, woodMat);
    crate1.position.set(-0.85, 0.28, 0.1);
    crate1.rotation.y = 0.25;
    crate1.castShadow = true;
    group.add(crate1);

    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.48), woodMat);
    crate2.position.set(-0.8, 0.76, 0.1);
    crate2.rotation.y = -0.18;
    group.add(crate2);

    // Contraband Display Wares on Crate
    // 1. Smuggled Glowing Potion Vial
    const vialGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.16, 8);
    const vialMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b4d8,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    const vial = new THREE.Mesh(vialGeo, vialMat);
    vial.position.set(-0.75, 1.05, 0.12);
    group.add(vial);

    // 2. Rolled Forbidden Parchment Scroll
    const scrollGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.24, 8);
    const scrollMat = TextureGenerator.createParchmentPBR().material;
    const scroll = new THREE.Mesh(scrollGeo, scrollMat);
    scroll.position.set(-0.88, 0.99, 0.18);
    scroll.rotation.z = Math.PI / 2;
    scroll.rotation.y = 0.4;
    group.add(scroll);

    // Stolen Arcane Shadow Lantern
    const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.25, 8), woodMat);
    lanternPost.position.set(0.75, 0.62, 0.15);
    group.add(lanternPost);

    const lanternFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.26, 6), rustedIron);
    lanternFrame.position.set(0.75, 1.2, 0.15);
    group.add(lanternFrame);

    const lanternCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    );
    lanternCore.position.set(0.75, 1.2, 0.15);
    group.add(lanternCore);

    const lanternLight = new THREE.PointLight(0xff9900, 2.2, 8);
    lanternLight.position.set(0.75, 1.25, 0.15);
    group.add(lanternLight);

    group.userData = { lanternLight, leftArmGroup, rightArmGroup };
    return group;
  }

  /**
   * Builds an Ornate Gothic Treasure Chest with hinged lid, iron straps & brass lock
   */
  static createTreasureChestMesh(isOpened = false) {
    const chestGroup = new THREE.Group();
    chestGroup.name = 'OrnateTreasureChest';

    const chestPBR = TextureGenerator.createOrnateChestPBR();
    const brassPBR = TextureGenerator.createGildedBrassPBR();

    // Chest Body Base
    const baseGeo = new THREE.BoxGeometry(1.0, 0.55, 0.65);
    const baseMesh = new THREE.Mesh(baseGeo, chestPBR.material);
    baseMesh.position.y = 0.275;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    chestGroup.add(baseMesh);

    // Hinged Arched Lid
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.55, -0.325); // Hinge line along back

    const lidGeo = new THREE.CylinderGeometry(0.325, 0.325, 1.0, 16, 1, false, 0, Math.PI);
    const lidMesh = new THREE.Mesh(lidGeo, chestPBR.material);
    lidMesh.rotation.z = Math.PI / 2;
    lidMesh.position.set(0, 0, 0.325);
    lidMesh.castShadow = true;
    lidGroup.add(lidMesh);

    // Gilded Padlock
    const lockGeo = new THREE.BoxGeometry(0.12, 0.16, 0.05);
    const lockMesh = new THREE.Mesh(lockGeo, brassPBR.material);
    lockMesh.position.set(0, -0.05, 0.66);
    lidGroup.add(lockMesh);

    if (isOpened) {
      lidGroup.rotation.x = -Math.PI / 2.3;
      // Internal golden treasure glow
      const chestLight = new THREE.PointLight(0xffd700, 2.8, 6);
      chestLight.position.set(0, 0.45, 0);
      chestGroup.add(chestLight);
    }

    chestGroup.add(lidGroup);
    chestGroup.userData = { lidGroup, isOpened };
    return chestGroup;
  }

  /**
   * Builds a high-definition 3D gold coin mesh with PBR metallic texture
   */
  static createGoldCoinMesh() {
    const coinPBR = TextureGenerator.createGoldCoinPBR();
    const geo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
    const coin = new THREE.Mesh(geo, coinPBR.material);
    coin.castShadow = true;
    return coin;
  }

  /**
   * Builds item-specific 3D world loot meshes (Staff, Shield, Tome, Crown, Cuirass, Potion)
   */
  static createLootDropMesh(item, rarityColor = 0xffd700) {
    const group = new THREE.Group();
    const brassPBR = TextureGenerator.createGildedBrassPBR();
    const glowMat = new THREE.MeshStandardMaterial({
      color: rarityColor,
      emissive: rarityColor,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.8
    });

    if (item.type === 'mainHand') {
      // 3D Arcane Staff
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.2, 8), brassPBR.material);
      group.add(shaft);
      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glowMat);
      head.position.y = 0.65;
      group.add(head);
    } else if (item.type === 'offHand') {
      // 3D Ancient Spellbook / Shield
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.12), glowMat);
      group.add(book);
    } else if (item.type === 'head') {
      // 3D Gilded Spiked Crown
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.2, 8), glowMat);
      group.add(crown);
    } else if (item.type === 'chest') {
      // 3D Archon Mantle / Cuirass
      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), glowMat);
      group.add(chest);
    } else if (item.type === 'consumable') {
      // 3D Potion Flask
      const flask = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), glowMat);
      group.add(flask);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), brassPBR.material);
      neck.position.y = 0.2;
      group.add(neck);
    } else {
      // Relic / Ring / Amulet
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 20), glowMat);
      group.add(ring);
    }

    // Outer rotating celestial halo
    const haloGeo = new THREE.TorusGeometry(0.48, 0.02, 8, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: rarityColor, wireframe: true, transparent: true, opacity: 0.75 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    group.add(halo);

    group.userData = { halo };
    return group;
  }
}

