import * as THREE from 'three';
import { TextureGenerator } from './textureGenerator.js';
import { ModelFactory } from './modelFactory.js';
import { createAnimatedLavaMaterial } from './shaders/lavaShader.js';
import { createAstralNebulaMaterial } from './shaders/astralNebulaShader.js';
import { assetLoader } from './assetLoader.js';

/**
 * High-Detail Gothic Fantasy 3D Environment Architecture.
 * Features sculpted Gothic ribbed pillars, vaulted cathedral arches,
 * detailed 3D multi-tiered bookshelves with individual modeled books & potions,
 * wrought-iron wall sconces with layered 3D flickering flame meshes,
 * sculpted stone altars and obelisks, blacksmith anvils, ceiling chains,
 * recessed stained-glass windows, animated GLSL lava/nebula shaders,
 * volumetric god-rays, ground mist, and destructible physics props.
 */
export class TowerEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.currentFloor = 1;
    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'TowerEnvironment';
    this.scene.add(this.roomGroup);

    this.colliders = [];
    this.interactables = [];
    this.animatedProps = [];
    this.destructibles = [];
    this.debris = [];
    this.exitPortal = null;
    this.lavaUniforms = null;
    this.nebulaUniforms = null;
  }

  clear() {
    while (this.roomGroup.children.length > 0) {
      const obj = this.roomGroup.children[0];
      this.roomGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    // Clean up active debris
    this.debris.forEach(d => {
      this.scene.remove(d.mesh);
      if (d.mesh.geometry) d.mesh.geometry.dispose();
      if (d.mesh.material) d.mesh.material.dispose();
    });

    this.colliders = [];
    this.interactables = [];
    this.animatedProps = [];
    this.destructibles = [];
    this.debris = [];
    this.exitPortal = null;
    this.lavaUniforms = null;
    this.nebulaUniforms = null;
  }

  buildFloor(floorNumber) {
    this.clear();
    this.currentFloor = floorNumber;

    if (floorNumber === 1) {
      this.buildFloor1Archives();
    } else if (floorNumber === 2) {
      this.buildFloor2Forge();
    } else if (floorNumber === 3) {
      this.buildFloor3Observatory();
    }

    // Freeze transformation matrices on all static architecture to save CPU cycles
    this.freezeStaticMatrices();
  }

  /**
   * Freezes transformation matrices on all static architectural meshes,
   * eliminating redundant CPU matrix calculations every frame!
   */
  freezeStaticMatrices(group = this.roomGroup) {
    group.traverse(obj => {
      if (obj.isMesh && !obj.userData?.isDynamic && !obj.name?.includes('Anim')) {
        obj.updateMatrix();
        obj.matrixAutoUpdate = false;
      }
    });
  }

  // =========================================================================
  // FLOOR 1: THE FORBIDDEN ARCHIVES
  // =========================================================================
  buildFloor1Archives() {
    const stonePBR = TextureGenerator.createStoneBrickPBR();
    const marblePBR = TextureGenerator.createMarbleTilePBR();
    const parchmentPBR = TextureGenerator.createParchmentPBR();

    // Ornate Marble Floor
    const floorGeo = new THREE.CylinderGeometry(22, 22, 1, 32);
    const floor = new THREE.Mesh(floorGeo, marblePBR.material);
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Outer Gothic Weathered Stone Walls (with open archway doorway leading into Awakening Vault)
    const wallGeo = new THREE.CylinderGeometry(22.5, 22.5, 12, 32, 1, true, -Math.PI / 2 + 0.18, Math.PI * 2 - 0.36);
    const wall = new THREE.Mesh(wallGeo, stonePBR.material);
    wall.position.y = 6;
    this.roomGroup.add(wall);

    // Awakening Vault (Starting Chamber with Keybindings Wall & Magic Books)
    this.buildAwakeningVault(stonePBR, marblePBR);

    // Scribe's Grand Lectern (Quest Step 1.1)
    const lectern = ModelFactory.createLecternMesh();
    lectern.position.set(0, 0, 0);
    this.roomGroup.add(lectern);
    this.interactables.push({
      type: 'quest_lectern',
      id: 'lectern_archives',
      x: 0,
      z: 0,
      radius: 3.2,
      prompt: "Read Ancient Scribe's Lectern [E]"
    });

    // Grand Scribe Alistair (Voiced 3D Quest Giver)
    const scribeGhost = ModelFactory.createScribeGhostMesh();
    scribeGhost.position.set(0, 0, 1.5);
    scribeGhost.rotation.y = Math.PI;
    this.roomGroup.add(scribeGhost);
    this.animatedProps.push({ type: 'ghost_npc', mesh: scribeGhost, initialY: 0 });
    this.interactables.push({
      type: 'npc_scribe',
      id: 'npc_scribe_alistair',
      x: 0,
      z: 1.5,
      radius: 3.2,
      prompt: 'Speak with Grand Scribe Alistair [E]'
    });

    // Malakor the Escaped Convict - Contraband Smuggler
    const malakorMesh = ModelFactory.createConvictMesh();
    malakorMesh.position.set(-13.5, 0, -10.5);
    malakorMesh.rotation.y = 0.6;
    this.roomGroup.add(malakorMesh);
    this.colliders.push({ type: 'cylinder', x: -13.5, z: -10.5, radius: 1.2 });
    this.interactables.push({
      type: 'npc_shopkeeper',
      id: 'npc_malakor',
      mesh: malakorMesh,
      x: -13.5,
      z: -10.5,
      radius: 3.5,
      prompt: 'Speak with Malakor the Escaped Convict [E]'
    });
    this.animatedProps.push({ type: 'convict_npc', mesh: malakorMesh });

    // Riddle Monolith (Quest Step 1.2)
    const monolith = this.createRiddleMonolith();
    monolith.position.set(0, 0, -4);
    this.roomGroup.add(monolith);
    this.interactables.push({
      type: 'quiz_monolith',
      id: 'f1_riddle_1',
      x: 0,
      z: -4,
      radius: 3.5,
      prompt: 'Decipher Riddle Monolith [E]'
    });

    // High-Detail Recessed Bookshelves & Wrought-Iron Torches
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      // Skip near north portal
      if (Math.abs(angle - Math.PI / 2) < 0.35 || Math.abs(angle + Math.PI / 2) < 0.35) continue;

      const shelf = this.createBookshelf();
      shelf.position.set(Math.cos(angle) * 19.8, 0, Math.sin(angle) * 19.8);
      shelf.rotation.y = -angle + Math.PI / 2;
      this.roomGroup.add(shelf);

      const includeLight = (i % 3 === 0);
      const torch = this.createTorch(includeLight);
      torch.position.set(Math.cos(angle) * 21.2, 4.2, Math.sin(angle) * 21.2);
      torch.rotation.y = -angle - Math.PI / 2;
      this.roomGroup.add(torch);
      this.animatedProps.push({
        type: 'torch',
        light: torch.userData.light,
        flame: torch.userData.flame
      });
    }

    // 6 Gothic Recessed Stained Glass Windows
    for (let w = 0; w < 6; w++) {
      const angle = (w / 6) * Math.PI * 2;
      const win = this.createGothicWindow((w * 60) % 360);
      win.position.set(Math.cos(angle) * 22.2, 5.5, Math.sin(angle) * 22.2);
      win.rotation.y = -angle - Math.PI / 2;
      this.roomGroup.add(win);
    }

    // 4 Massive Gothic Clustered Columns with Vaulted Ceiling Ribs
    const pillarPositions = [
      { x: -9, z: -9 },
      { x: 9, z: -9 },
      { x: -9, z: 9 },
      { x: 9, z: 9 }
    ];
    pillarPositions.forEach(pos => {
      const pillar = this.createPillar();
      pillar.position.set(pos.x, 0, pos.z);
      this.roomGroup.add(pillar);
      this.colliders.push({ type: 'cylinder', x: pos.x, z: pos.z, radius: 1.4 });
    });

    // 3 Light Prisms (Quest Step 1.3)
    const prismConfigs = [
      { id: 1, x: -7, z: -5 },
      { id: 2, x: 7, z: -5 },
      { id: 3, x: 0, z: -11 }
    ];
    prismConfigs.forEach(cfg => {
      const prismMesh = ModelFactory.createPrismPedestalMesh(cfg.id);
      prismMesh.position.set(cfg.x, 0, cfg.z);
      this.roomGroup.add(prismMesh);

      this.colliders.push({ type: 'cylinder', x: cfg.x, z: cfg.z, radius: 1.2 });
      this.interactables.push({
        type: 'prism',
        id: cfg.id,
        mesh: prismMesh,
        x: cfg.x,
        z: cfg.z,
        radius: 2.8,
        prompt: `Rotate Light Prism #${cfg.id} [E]`
      });
    });

    // Scattered 3D Parchment Scrolls & Books on the floor
    for (let i = 0; i < 18; i++) {
      const scrollGroup = new THREE.Group();
      const scrollGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 12);
      const scroll = new THREE.Mesh(scrollGeo, parchmentPBR.material);
      scroll.rotation.z = Math.PI / 2;
      scrollGroup.add(scroll);

      // Ribbon wrap
      const ribbonGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.12, 12);
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x800020 });
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbon.rotation.z = Math.PI / 2;
      scrollGroup.add(ribbon);

      scrollGroup.position.set((Math.random() - 0.5) * 24, 0.08, (Math.random() - 0.5) * 24);
      scrollGroup.rotation.y = Math.random() * Math.PI * 2;
      this.roomGroup.add(scrollGroup);
    }

    // 2 Grand Gilded Brass Chandeliers hanging from cathedral vaulted ceiling
    [
      { x: 0, y: 8.2, z: -6 },
      { x: 0, y: 8.2, z: 6 }
    ].forEach(cPos => {
      const chandelier = this.createGothicChandelier('brass');
      chandelier.position.set(cPos.x, cPos.y, cPos.z);
      this.roomGroup.add(chandelier);
      this.animatedProps.push({
        type: 'chandelier',
        group: chandelier,
        light: chandelier.userData.light,
        flames: chandelier.userData.flames
      });
    });

    // 4 Floating Grimoires orbiting key ritual centers
    [
      { x: -3.5, y: 1.8, z: -2, col: 0x8b0000, speed: 1.2 },
      { x: 3.5, y: 2.1, z: -2, col: 0x1b365d, speed: 0.9 },
      { x: -2.8, y: 1.9, z: 3.5, col: 0x4a235a, speed: 1.4 },
      { x: 2.8, y: 2.2, z: 3.5, col: 0x1e4620, speed: 1.1 }
    ].forEach(gCfg => {
      const grimoire = this.createFloatingGrimoire(gCfg.col);
      grimoire.position.set(gCfg.x, gCfg.y, gCfg.z);
      this.roomGroup.add(grimoire);
      this.animatedProps.push({
        type: 'floating_tome',
        mesh: grimoire,
        initialY: gCfg.y,
        speed: gCfg.speed
      });
    });

    // Volumetric Celestial God-Rays streaming from ceiling oculus
    this.createVolumetricGodRays(0x8fa8d6, 14, 1.2, 7.5);

    // Ground Mist Layer
    this.createGroundMistLayer(0x0a1024, 21.0);

    // Destructible Alchemical Urns & Wooden Crates
    this.createDestructibleUrn(-6, 6);
    this.createDestructibleUrn(6, -6);
    this.createDestructibleUrn(-10, 2);
    this.createDestructibleUrn(10, -2);
    this.createDestructibleCrate(-5, -8);
    this.createDestructibleCrate(5, 8);

    // Grand Gothic Cathedral Gateway (Quest Step 1.4)
    this.exitDoor = this.createExitDoor();
    this.exitDoor.position.set(0, 0, -21.5);
    this.roomGroup.add(this.exitDoor);

    this.exitPortal = {
      x: 0,
      z: -21.5,
      radius: 4.0,
      isUnlocked: false
    };
  }

  /**
   * Builds the safe Awakening Vault (Starting Room) with carved keybindings wall & interactive magic books.
   */
  /**
   * Builds the safe Awakening Vault (Starting Room) with carved keybindings wall,
   * 4 interactive magic books on pedestals, awakening stone cot, and Arcane Vault Runegate.
   */
  buildAwakeningVault(stonePBR, marblePBR) {
    const runicPBR = TextureGenerator.createRunicWallTexturePBR();
    const prisonFloorPBR = TextureGenerator.createPrisonFloorPBR();
    const vaultGroup = new THREE.Group();
    vaultGroup.name = 'AwakeningVault';

    // 1. Vault Floor extending South (z = 18 to 36, width 16m: x = -8 to +8)
    const floorGeo = new THREE.BoxGeometry(16, 1, 18);
    const floor = new THREE.Mesh(floorGeo, prisonFloorPBR.material);
    floor.position.set(0, -0.5, 27);
    floor.receiveShadow = true;
    vaultGroup.add(floor);

    // 2. Vault Ceiling
    const ceilingGeo = new THREE.BoxGeometry(16.5, 1, 18.5);
    const ceiling = new THREE.Mesh(ceilingGeo, stonePBR.material);
    ceiling.position.set(0, 8.5, 27);
    vaultGroup.add(ceiling);

    // 3. South Prison Wall (Back Wall where Keybindings are inscribed)
    const southWallGeo = new THREE.BoxGeometry(16, 8, 1.2);
    const southWall = new THREE.Mesh(southWallGeo, stonePBR.material);
    southWall.position.set(0, 4, 36);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    vaultGroup.add(southWall);

    // 4. Large Runic Relief Tablet on the South Wall (Keybindings Inscription)
    const runicTabletGeo = new THREE.PlaneGeometry(15.0, 6.8);
    const runicTablet = new THREE.Mesh(runicTabletGeo, runicPBR.material);
    runicTablet.position.set(0, 4, 35.35);
    runicTablet.rotation.y = Math.PI; // Face North into the room towards the player
    vaultGroup.add(runicTablet);

    // 5. West Prison Wall
    const westWallGeo = new THREE.BoxGeometry(1.2, 8, 18);
    const westWall = new THREE.Mesh(westWallGeo, stonePBR.material);
    westWall.position.set(-8, 4, 27);
    vaultGroup.add(westWall);

    // 6. East Prison Wall
    const eastWallGeo = new THREE.BoxGeometry(1.2, 8, 18);
    const eastWall = new THREE.Mesh(eastWallGeo, stonePBR.material);
    eastWall.position.set(8, 4, 27);
    vaultGroup.add(eastWall);

    // 7. North Archway Doorway leading into the Archives (z = 18)
    const archLeftGeo = new THREE.BoxGeometry(5.2, 8, 1.2);
    const archLeft = new THREE.Mesh(archLeftGeo, stonePBR.material);
    archLeft.position.set(-5.4, 4, 18);
    vaultGroup.add(archLeft);

    const archRightGeo = new THREE.BoxGeometry(5.2, 8, 1.2);
    const archRight = new THREE.Mesh(archRightGeo, stonePBR.material);
    archRight.position.set(5.4, 4, 18);
    vaultGroup.add(archRight);

    const archLintelGeo = new THREE.BoxGeometry(5.6, 2.5, 1.2);
    const archLintel = new THREE.Mesh(archLintelGeo, stonePBR.material);
    archLintel.position.set(0, 6.75, 18);
    vaultGroup.add(archLintel);

    // Archway threshold torches
    this.createVaultTorch(-2.6, 3.2, 18.6, 0xffb74d, vaultGroup, true);
    this.createVaultTorch(2.6, 3.2, 18.6, 0xffb74d, vaultGroup, false);

    // Torches illuminating the Runic Tablet on the South Wall
    this.createVaultTorch(-6.2, 3.8, 35.2, 0xff9800, vaultGroup, true);
    this.createVaultTorch(6.2, 3.8, 35.2, 0xff9800, vaultGroup, false);

    // 8. Awakening Stone Cot with Broken Ethereal Shackles (Where the wizard awoke)
    const cotGroup = new THREE.Group();
    cotGroup.position.set(0, 0, 32.2);

    const slabGeo = new THREE.BoxGeometry(2.4, 0.45, 1.5);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x2c2925, roughness: 0.85 });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.y = 0.225;
    slab.castShadow = true;
    cotGroup.add(slab);

    // Straw mat
    const strawGeo = new THREE.BoxGeometry(2.2, 0.08, 1.3);
    const strawMat = new THREE.MeshStandardMaterial({ color: 0x5c4d32, roughness: 0.95 });
    const straw = new THREE.Mesh(strawGeo, strawMat);
    straw.position.y = 0.48;
    cotGroup.add(straw);

    // Broken glowing ethereal mana shackles
    const shackleMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.6,
      roughness: 0.2
    });
    [-0.6, 0.6].forEach(sx => {
      const shackleGeo = new THREE.TorusGeometry(0.12, 0.03, 8, 16, Math.PI * 1.5);
      const shackle = new THREE.Mesh(shackleGeo, shackleMat);
      shackle.position.set(sx, 0.58, 0.2);
      shackle.rotation.x = Math.PI / 2;
      cotGroup.add(shackle);

      // Short chain link
      const linkGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6);
      const linkMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
      const link = new THREE.Mesh(linkGeo, linkMat);
      link.position.set(sx, 0.54, 0.35);
      link.rotation.x = Math.PI / 3;
      cotGroup.add(link);
    });

    vaultGroup.add(cotGroup);

    // 9. Arcane Vault Runegate at the North Archway (z = 18.0)
    const gateGroup = new THREE.Group();
    gateGroup.name = 'ArcaneVaultRunegate';
    gateGroup.position.set(0, 0, 18.0);

    const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.5, 8);
    const barMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0091ea,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.85
    });

    const gateBars = [];
    for (let bx = -2.2; bx <= 2.2; bx += 0.55) {
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(bx, 2.75, 0);
      gateGroup.add(bar);
      gateBars.push(bar);
    }

    // Central Floating Runic Gate Lock Sigil
    const lockGeo = new THREE.TorusGeometry(0.65, 0.08, 8, 24);
    const lockMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffa000,
      emissiveIntensity: 2.0
    });
    const lockSigil = new THREE.Mesh(lockGeo, lockMat);
    lockSigil.position.set(0, 2.8, 0);
    gateGroup.add(lockSigil);

    const lockCoreGeo = new THREE.OctahedronGeometry(0.25, 0);
    const lockCore = new THREE.Mesh(lockCoreGeo, lockMat);
    lockCore.position.set(0, 2.8, 0);
    gateGroup.add(lockCore);

    vaultGroup.add(gateGroup);

    this.vaultGate = {
      group: gateGroup,
      bars: gateBars,
      lock: lockSigil,
      core: lockCore,
      isOpen: false
    };

    // Gate physical collider (prevents passing until opened)
    const gateCollider = { type: 'cylinder', x: 0, z: 18.0, radius: 2.5, isGate: true };
    this.colliders.push(gateCollider);
    this.vaultGateCollider = gateCollider;

    // Gate interaction trigger
    this.interactables.push({
      type: 'vault_gate',
      id: 'vault_runegate',
      x: 0,
      z: 18.8,
      radius: 3.5,
      prompt: 'Open Vault Runegate to Archives [E]'
    });

    // Animate the gate lock rotation in updateProps
    this.animatedProps.push({
      type: 'vault_gate_lock',
      lock: lockSigil,
      core: lockCore
    });

    // 10. FOUR MAGIC BOOKS ON ORNATE ILLUMINATED PEDESTALS
    // Book 1: Combat (Left Rear, x = -4.8, z = 27.0)
    this.createMagicBookStation(
      'book_combat',
      'The Grimoire of Combative Arts',
      'Read Grimoire of Combat [E]',
      -4.8,
      27.0,
      0xff5722, // Fiery Flame Orb
      vaultGroup
    );

    // Book 2: Chronicle of the Spire & Quests (Left Front, x = -2.0, z = 23.8)
    this.createMagicBookStation(
      'book_spire',
      'Chronicle of the Spire & The Great Escape',
      'Read Chronicle of the Spire [E]',
      -2.0,
      23.8,
      0xffd700, // Golden Celestial Orb
      vaultGroup
    );

    // Book 3: Systems & Progression (Right Front, x = 2.0, z = 23.8)
    this.createMagicBookStation(
      'book_systems',
      'Codex of Arcane Systems & Progression',
      'Read Codex of Arcane Systems [E]',
      2.0,
      23.8,
      0x4caf50, // Emerald Systems Orb
      vaultGroup
    );

    // Book 4: Chronomancy & Temporal Spells (Right Rear, x = 4.8, z = 27.0)
    this.createMagicBookStation(
      'book_chrono',
      'Manual of Chronomancy & Reverse Time',
      'Read Manual of Chronomancy [E]',
      4.8,
      27.0,
      0xba68c8, // Violet Chrono Orb
      vaultGroup
    );

    // 11. Fluted Gothic Stone Pillars with Carved Gargoyle/Runic Relief
    const pillarPBR = TextureGenerator.createGothicPillarPBR();
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.58, 8.5, 16);
    [
      { x: -7.2, z: 22.0 },
      { x: -7.2, z: 30.5 },
      { x: 7.2, z: 22.0 },
      { x: 7.2, z: 30.5 }
    ].forEach(pos => {
      const pillar = new THREE.Mesh(pillarGeo, pillarPBR.material);
      pillar.position.set(pos.x, 4.25, pos.z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      vaultGroup.add(pillar);
    });

    // 12. Ornate Gothic Treasure Chest (Starting Convict Stash)
    const chest = ModelFactory.createTreasureChestMesh(false);
    chest.position.set(-5.8, 0, 33.2);
    chest.rotation.y = 0.45;
    vaultGroup.add(chest);
    this.vaultChestMesh = chest;

    this.interactables.push({
      type: 'vault_chest',
      id: 'vault_chest',
      x: -5.8,
      z: 33.2,
      radius: 2.6,
      prompt: 'Open Stash Chest [E]'
    });

    // 13. Glowing Arcane Crystals growing along walls
    const cyanCrystalPBR = TextureGenerator.createArcaneCrystalPBR('#00e5ff');
    const goldCrystalPBR = TextureGenerator.createArcaneCrystalPBR('#ffd700');
    [
      { x: 6.2, z: 33.5, scale: 0.9, pbr: cyanCrystalPBR },
      { x: 6.6, z: 34.0, scale: 1.3, pbr: cyanCrystalPBR },
      { x: -6.4, z: 20.2, scale: 1.0, pbr: goldCrystalPBR }
    ].forEach(c => {
      const cGeo = new THREE.ConeGeometry(0.18 * c.scale, 0.85 * c.scale, 5);
      const cMesh = new THREE.Mesh(cGeo, c.pbr.material);
      cMesh.position.set(c.x, (0.85 * c.scale) / 2, c.z);
      cMesh.rotation.z = (Math.random() - 0.5) * 0.3;
      cMesh.rotation.x = (Math.random() - 0.5) * 0.3;
      vaultGroup.add(cMesh);
    });

    this.roomGroup.add(vaultGroup);
  }

  createMagicBookStation(bookId, title, prompt, x, z, auraColor, parentGroup) {
    const woodPBR = TextureGenerator.createWoodGrainPBR();
    const station = new THREE.Group();
    station.position.set(x, 0, z);

    // Sculpted Stone / Wood Octagonal Pedestal
    const standGeo = new THREE.CylinderGeometry(0.38, 0.58, 1.3, 8);
    const stand = new THREE.Mesh(standGeo, woodPBR.material);
    stand.position.y = 0.65;
    stand.castShadow = true;
    stand.receiveShadow = true;
    station.add(stand);

    // Gilded Pedestal Trim Ring
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.8,
      roughness: 0.25,
      emissive: new THREE.Color(auraColor),
      emissiveIntensity: 0.25
    });
    const trimGeo = new THREE.TorusGeometry(0.44, 0.04, 8, 16);
    const trim = new THREE.Mesh(trimGeo, ringMat);
    trim.position.y = 1.3;
    trim.rotation.x = Math.PI / 2;
    station.add(trim);

    // Angled Book Rest Plaque
    const deskGeo = new THREE.BoxGeometry(1.25, 0.08, 0.95);
    const desk = new THREE.Mesh(deskGeo, woodPBR.material);
    desk.position.set(0, 1.38, 0);
    desk.rotation.x = Math.PI / 6;
    desk.castShadow = true;
    station.add(desk);

    // Open Ancient Tome Mesh with Leather Cover & Foil
    const tomeGroup = new THREE.Group();
    tomeGroup.position.set(0, 1.45, 0);
    tomeGroup.rotation.x = Math.PI / 6;

    // Leather cover base
    const coverGeo = new THREE.BoxGeometry(1.04, 0.04, 0.74);
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x2b1810, roughness: 0.7 });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    tomeGroup.add(cover);

    // Open Parchment Leaves
    const pageGeo = new THREE.BoxGeometry(0.96, 0.06, 0.68);
    const pageMat = new THREE.MeshStandardMaterial({
      color: 0xfdf6e2,
      roughness: 0.9,
      emissive: new THREE.Color(auraColor),
      emissiveIntensity: 0.12
    });
    const pages = new THREE.Mesh(pageGeo, pageMat);
    pages.position.y = 0.04;
    tomeGroup.add(pages);

    station.add(tomeGroup);

    // Floating Magical Aura Core & PointLight
    const orbGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({
      color: auraColor,
      emissive: auraColor,
      emissiveIntensity: 2.0,
      roughness: 0.1
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(0, 1.88, 0);
    station.add(orb);

    // Floating Rotating Arcane Glyph Ring
    const haloGeo = new THREE.TorusGeometry(0.42, 0.02, 8, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: auraColor, wireframe: true, transparent: true, opacity: 0.75 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0, 1.88, 0);
    halo.rotation.x = Math.PI / 2;
    station.add(halo);

    const light = new THREE.PointLight(auraColor, 2.4, 7);
    light.position.set(0, 1.88, 0);
    station.add(light);

    // Store animated orb & halo for gentle floating and rotation
    this.animatedProps.push({
      type: 'book_orb',
      mesh: orb,
      ring: halo,
      initialY: 1.88,
      speed: 2.2,
      light
    });

    parentGroup.add(station);

    // Register interactable trigger
    this.interactables.push({
      type: 'magic_book',
      bookId,
      id: `station_${bookId}`,
      x,
      z,
      radius: 2.8,
      prompt
    });
  }

  /**
   * Opens the Arcane Vault Runegate with audio and particle dissolve
   */
  openVaultGate(particleSystem = null) {
    if (!this.vaultGate || this.vaultGate.isOpen) return false;
    this.vaultGate.isOpen = true;

    // Remove gate collider
    if (this.vaultGateCollider) {
      const idx = this.colliders.indexOf(this.vaultGateCollider);
      if (idx !== -1) this.colliders.splice(idx, 1);
    }

    // Animate / hide gate bars
    if (this.vaultGate.bars) {
      this.vaultGate.bars.forEach(bar => {
        bar.visible = false;
      });
    }
    if (this.vaultGate.lock) this.vaultGate.lock.visible = false;
    if (this.vaultGate.core) this.vaultGate.core.visible = false;

    // Spawn particle dissolve
    if (particleSystem) {
      particleSystem.spawnGateDissolve(new THREE.Vector3(0, 1.8, 18.0));
    }
    return true;
  }

  /**
   * Opens the starting room treasure chest with golden light burst and sound
   */
  openVaultChest(particleSystem = null) {
    if (!this.vaultChestMesh || this.vaultChestMesh.userData.isOpened) return false;
    this.vaultChestMesh.userData.isOpened = true;

    const lid = this.vaultChestMesh.userData.lidGroup;
    if (lid) {
      lid.rotation.x = -Math.PI / 2.3;
    }
    const chestLight = new THREE.PointLight(0xffd700, 3.2, 7);
    chestLight.position.set(0, 0.45, 0);
    this.vaultChestMesh.add(chestLight);

    if (particleSystem) {
      particleSystem.spawnImpactShockwave(this.vaultChestMesh.position, 0xffd700, 3.5, 0.7);
      particleSystem.spawnBurst(this.vaultChestMesh.position, 'light', 16);
    }
    return true;
  }

  createVaultTorch(x, y, z, colorHex, parentGroup, includeLight = false) {
    const bracketGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
    const bracket = new THREE.Mesh(bracketGeo, metalMat);
    bracket.position.set(x, y, z);
    parentGroup.add(bracket);

    const headGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 1.8
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(x, y + 0.2, z);
    parentGroup.add(head);

    if (includeLight) {
      const light = new THREE.PointLight(colorHex, 1.4, 8);
      light.position.set(x, y + 0.25, z);
      parentGroup.add(light);

      this.animatedProps.push({
        type: 'torch',
        light,
        baseIntensity: 1.4
      });
    }
  }

  // =========================================================================
  // FLOOR 2: THE ALCHEMICAL FORGE
  // =========================================================================
  buildFloor2Forge() {
    const basaltPBR = TextureGenerator.createLavaBasaltPBR();
    const obsidianPBR = TextureGenerator.createObsidianRockPBR();
    const stonePBR = TextureGenerator.createStoneBrickPBR();

    // High-Fidelity Animated Lava GLSL Shader
    const lavaShaderData = createAnimatedLavaMaterial();
    this.lavaUniforms = lavaShaderData.uniforms;
    const lavaMat = lavaShaderData.material;

    // Colossal Cavern Floor (65m radius = 130m wide, 13x area of Floor 1!)
    const floorGeo = new THREE.CylinderGeometry(65, 65, 1.5, 48);
    const floor = new THREE.Mesh(floorGeo, basaltPBR.material);
    floor.position.y = -0.75;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Towering Volcanic Cavern Walls (26m height)
    const wallGeo = new THREE.CylinderGeometry(66, 66, 26, 48, 1, true);
    const wall = new THREE.Mesh(wallGeo, stonePBR.material);
    wall.position.y = 13;
    this.roomGroup.add(wall);

    // Massive Central Boiling Lava Lake (30m radius)
    const lakeGeo = new THREE.CylinderGeometry(30, 30, 0.4, 36);
    const lake = new THREE.Mesh(lakeGeo, lavaMat);
    lake.position.y = 0.05;
    this.roomGroup.add(lake);

    const lakeLight = new THREE.PointLight(0xff4400, 3.5, 35);
    lakeLight.position.set(0, 3, 0);
    this.roomGroup.add(lakeLight);

    // Arched Obsidian Rock Bridges spanning over the lava abyss
    const northBridgeGeo = new THREE.BoxGeometry(7, 1.4, 38);
    const northBridge = new THREE.Mesh(northBridgeGeo, obsidianPBR.material);
    northBridge.position.set(0, 0.6, -30);
    northBridge.receiveShadow = true;
    northBridge.castShadow = true;
    this.roomGroup.add(northBridge);

    const southBridgeGeo = new THREE.BoxGeometry(7, 1.4, 34);
    const southBridge = new THREE.Mesh(southBridgeGeo, obsidianPBR.material);
    southBridge.position.set(0, 0.6, 24);
    southBridge.receiveShadow = true;
    southBridge.castShadow = true;
    this.roomGroup.add(southBridge);

    const crossBridgeGeo = new THREE.BoxGeometry(46, 1.4, 7);
    const crossBridge = new THREE.Mesh(crossBridgeGeo, obsidianPBR.material);
    crossBridge.position.set(0, 0.6, -4);
    crossBridge.receiveShadow = true;
    crossBridge.castShadow = true;
    this.roomGroup.add(crossBridge);

    // Central Crucible Platform (18m radius elevated stone disc)
    const centerPlatformGeo = new THREE.CylinderGeometry(18, 18, 1.2, 32);
    const centerPlatform = new THREE.Mesh(centerPlatformGeo, obsidianPBR.material);
    centerPlatform.position.set(0, 0.5, -4);
    centerPlatform.receiveShadow = true;
    this.roomGroup.add(centerPlatform);

    // 3 Elemental Crucibles on Central Island
    const crucibles = [
      { element: 'fire', color: 0xff3b30, x: -12, z: -4, index: 0 },
      { element: 'frost', color: 0x00e5ff, x: 0, z: -14, index: 1 },
      { element: 'storm', color: 0xffd60a, x: 12, z: -4, index: 2 }
    ];

    crucibles.forEach(c => {
      const mesh = ModelFactory.createCrucibleMesh(c.element, c.color);
      mesh.position.set(c.x, 1.1, c.z);
      this.roomGroup.add(mesh);

      this.colliders.push({ type: 'cylinder', x: c.x, z: c.z, radius: 1.8 });
      this.interactables.push({
        type: 'crucible',
        element: c.element,
        index: c.index,
        mesh,
        x: c.x,
        z: c.z,
        radius: 3.8,
        prompt: `Channel ${c.element.toUpperCase()} spell into Crucible [Q/E/R]`
      });
    });

    // 3D GLTF Guard Towers stationed around the perimeter
    const tower1 = assetLoader.getModel('/models/guard_tower.glb');
    if (tower1) {
      tower1.scale.set(1.5, 1.5, 1.5);
      tower1.position.set(-46, 0, -18);
      this.roomGroup.add(tower1);
      this.colliders.push({ type: 'cylinder', x: -46, z: -18, radius: 4.5 });
    }

    const tower2 = assetLoader.getModel('/models/guard_tower.glb');
    if (tower2) {
      tower2.scale.set(1.5, 1.5, 1.5);
      tower2.position.set(46, 0, -18);
      this.roomGroup.add(tower2);
      this.colliders.push({ type: 'cylinder', x: 46, z: -18, radius: 4.5 });
    }

    const tower3 = assetLoader.getModel('/models/guard_tower.glb');
    if (tower3) {
      tower3.scale.set(1.5, 1.5, 1.5);
      tower3.position.set(0, 0, 52);
      this.roomGroup.add(tower3);
      this.colliders.push({ type: 'cylinder', x: 0, z: 52, radius: 4.5 });
    }

    // 3D GLTF Fortified Gatehouse framing the exit
    const gatehouse = assetLoader.getModel('/models/gatehouse.glb');
    if (gatehouse) {
      gatehouse.scale.set(1.6, 1.6, 1.6);
      gatehouse.position.set(0, 0, -54);
      this.roomGroup.add(gatehouse);
    }

    // High Alchemist Ignatius & Great Workshop
    const blacksmithBuilding = assetLoader.getModel('/models/blacksmith.glb');
    if (blacksmithBuilding) {
      blacksmithBuilding.scale.set(1.3, 1.3, 1.3);
      blacksmithBuilding.position.set(-26, 0, 32);
      this.roomGroup.add(blacksmithBuilding);
    }

    const alchemist = ModelFactory.createAlchemistMesh();
    alchemist.position.set(-18, 0, 28);
    alchemist.rotation.y = Math.PI / 4;
    this.roomGroup.add(alchemist);
    this.animatedProps.push({ type: 'alchemist_npc', mesh: alchemist });
    this.interactables.push({
      type: 'npc_alchemist',
      id: 'npc_alchemist_ignatius',
      x: -18,
      z: 28,
      radius: 4.0,
      prompt: 'Consult Alchemist Ignatius [E]'
    });

    // Anvils & Furnaces
    const anvil1 = this.createAnvil();
    anvil1.position.set(-20, 0, 26);
    this.roomGroup.add(anvil1);
    this.colliders.push({ type: 'cylinder', x: -20, z: 26, radius: 1.5 });

    const furnace1 = this.createForgeFurnace();
    furnace1.position.set(-30, 0, 24);
    furnace1.rotation.y = Math.PI / 2;
    this.roomGroup.add(furnace1);
    this.animatedProps.push({
      type: 'furnace',
      light: furnace1.userData.light,
      flame: furnace1.userData.flame
    });

    // 3D Props (crates, barrels, tool racks)
    [-24, 24].forEach(xOff => {
      const propMesh = assetLoader.getModel('/models/props.glb');
      if (propMesh) {
        propMesh.scale.set(1.2, 1.2, 1.2);
        propMesh.position.set(xOff, 0, 22);
        this.roomGroup.add(propMesh);
      }
    });

    // Bubbling Alchemical Cauldrons
    const cauldron1 = this.createBubblingCauldron(0x00e5ff);
    cauldron1.position.set(-14, 0, 20);
    this.roomGroup.add(cauldron1);
    this.animatedProps.push({ type: 'cauldron', mesh: cauldron1 });

    const cauldron2 = this.createBubblingCauldron(0xa855f7);
    cauldron2.position.set(14, 0, 20);
    this.roomGroup.add(cauldron2);
    this.animatedProps.push({ type: 'cauldron', mesh: cauldron2 });

    // Volumetric Smoldering Forge God-Rays & Heat Mist scaled to 60m radius
    this.createVolumetricGodRays(0xff5722, 24, 1.8, 16.0);
    this.createGroundMistLayer(0x280b03, 62.0);

    // Destructible Urns & Crates across outposts
    [-18, 18, -32, 32].forEach(x => {
      this.createDestructibleUrn(x, 15);
      this.createDestructibleCrate(x, -25);
    });

    // Steam vents
    this.interactables.push({ type: 'steam_vent', x: -20, z: -15, radius: 3 });
    this.interactables.push({ type: 'steam_vent', x: 20, z: -15, radius: 3 });
    this.interactables.push({ type: 'steam_vent', x: 0, z: 35, radius: 3 });

    // Alchemical Formula Monolith (Quest Step 2.1)
    const monolith = this.createRiddleMonolith();
    monolith.position.set(0, 0, 18);
    this.roomGroup.add(monolith);
    this.interactables.push({
      type: 'quiz_monolith',
      id: 'f2_alchemy_1',
      x: 0,
      z: 18,
      radius: 4.0,
      prompt: 'Decipher Crucible Harmonic Matrix [E]'
    });

    // Exit Door placed in the North Gatehouse
    this.exitDoor = this.createExitDoor();
    this.exitDoor.position.set(0, 0, -58.5);
    this.roomGroup.add(this.exitDoor);

    this.exitPortal = {
      x: 0,
      z: -58.5,
      radius: 6.0,
      isUnlocked: false
    };
  }

  // =========================================================================
  // FLOOR 3: THE ASTRAL OBSERVATORY & BOSS ARENA
  // =========================================================================
  buildFloor3Observatory() {
    const marblePBR = TextureGenerator.createMarbleTilePBR();
    const stonePBR = TextureGenerator.createStoneBrickPBR();
    const runicPBR = TextureGenerator.createRunicDecalPBR(0x00e5ff);

    // High-Fidelity Animated Astral Nebula Shader
    const astralShaderData = createAstralNebulaMaterial();
    this.nebulaUniforms = astralShaderData.uniforms;
    const cosmosMat = astralShaderData.material;

    const floorGeo = new THREE.CylinderGeometry(26, 26, 1.2, 32);
    const floor = new THREE.Mesh(floorGeo, marblePBR.material);
    floor.position.y = -0.6;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Volumetric Celestial Starlight Shafts & Cosmic Stardust Mist
    this.createVolumetricGodRays(0xc084fc, 14, 1.5, 9.0);
    this.createGroundMistLayer(0x1a0d38, 25.0);

    // Destructible Celestial Urns & Crates
    this.createDestructibleUrn(-8, 8);
    this.createDestructibleUrn(8, -8);
    this.createDestructibleUrn(-8, -8);
    this.createDestructibleUrn(8, 8);
    this.createDestructibleCrate(-12, 6);
    this.createDestructibleCrate(12, 6);

    // Central Cosmic Stargate Inlay
    const cosmicInlayGeo = new THREE.CircleGeometry(10.5, 32);
    const cosmicInlay = new THREE.Mesh(cosmicInlayGeo, cosmosMat);
    cosmicInlay.rotation.x = -Math.PI / 2;
    cosmicInlay.position.y = 0.02;
    this.roomGroup.add(cosmicInlay);

    // Rotating Runic Summoning Circle Decal
    const runicDecalGeo = new THREE.PlaneGeometry(16, 16);
    const runicDecal = new THREE.Mesh(runicDecalGeo, runicPBR.material);
    runicDecal.rotation.x = -Math.PI / 2;
    runicDecal.position.y = 0.03;
    this.roomGroup.add(runicDecal);
    this.animatedProps.push({ type: 'runic_circle', mesh: runicDecal });

    // Astral Wall Perimeter with Gothic Stained Glass
    const wallGeo = new THREE.CylinderGeometry(26.5, 26.5, 12, 32, 1, true);
    const wall = new THREE.Mesh(wallGeo, stonePBR.material);
    wall.position.y = 6;
    this.roomGroup.add(wall);

    // 8 Gothic Stained Glass Windows (Deep Astral Cyan & Purple)
    for (let w = 0; w < 8; w++) {
      const angle = (w / 8) * Math.PI * 2;
      const win = this.createGothicWindow(280 + ((w * 20) % 60));
      win.position.set(Math.cos(angle) * 26.2, 5.5, Math.sin(angle) * 26.2);
      win.rotation.y = -angle - Math.PI / 2;
      this.roomGroup.add(win);
    }

    // 4 Astral Keystones (Quest Step 3.1)
    const keystones = [
      { id: 'north', x: 0, z: -17 },
      { id: 'south', x: 0, z: 17 },
      { id: 'east', x: 17, z: 0 },
      { id: 'west', x: -17, z: 0 }
    ];

    keystones.forEach(k => {
      const mesh = ModelFactory.createKeystoneMesh(k.id);
      mesh.position.set(k.x, 0, k.z);
      this.roomGroup.add(mesh);

      this.colliders.push({ type: 'cylinder', x: k.x, z: k.z, radius: 1.2 });
      this.interactables.push({
        type: 'keystone',
        id: k.id,
        mesh,
        x: k.x,
        z: k.z,
        radius: 3.5,
        prompt: `Disrupt ${k.id.toUpperCase()} Keystone [E]`
      });
    });

    // Multi-Layered Celestial Astrolabe Orrery (Central Rotator with Gilded Brass)
    const orreryGroup = new THREE.Group();
    const brassPBR = TextureGenerator.createGildedBrassPBR();

    const ring1Geo = new THREE.TorusGeometry(3.5, 0.12, 16, 64);
    const ring1 = new THREE.Mesh(ring1Geo, brassPBR.material);
    orreryGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(5.0, 0.12, 16, 64);
    const ring2 = new THREE.Mesh(ring2Geo, brassPBR.material);
    ring2.rotation.x = Math.PI / 2;
    orreryGroup.add(ring2);

    const ring3Geo = new THREE.TorusGeometry(6.5, 0.1, 16, 64);
    const ring3 = new THREE.Mesh(ring3Geo, brassPBR.material);
    ring3.rotation.y = Math.PI / 3;
    orreryGroup.add(ring3);

    // Orbiting Glowing Celestial Spheres
    const planetGeo = new THREE.SphereGeometry(0.65, 20, 20);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0088cc,
      emissiveIntensity: 1.5,
      roughness: 0.1
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planet.position.set(3.5, 0, 0);
    ring1.add(planet);

    // Orbiting Star Diamond Shards
    for (let s = 0; s < 6; s++) {
      const shardGeo = new THREE.OctahedronGeometry(0.22, 0);
      const shardMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 1.4,
        roughness: 0.1
      });
      const shard = new THREE.Mesh(shardGeo, shardMat);
      const theta = (s / 6) * Math.PI * 2;
      shard.position.set(Math.cos(theta) * 5.0, Math.sin(theta) * 0.4, Math.sin(theta) * 5.0);
      ring2.add(shard);
    }

    orreryGroup.position.set(0, 6.5, 0);
    this.roomGroup.add(orreryGroup);
    this.animatedProps.push({ type: 'orrery', group: orreryGroup, r1: ring1, r2: ring2, r3: ring3 });

    // 4 Grand Gilded Chandeliers surrounding the Astral Arena
    const chandelierAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    chandelierAngles.forEach(ang => {
      const chandelier = this.createGothicChandelier('brass');
      chandelier.position.set(Math.cos(ang) * 15, 8.5, Math.sin(ang) * 15);
      this.roomGroup.add(chandelier);
      this.animatedProps.push({
        type: 'chandelier',
        group: chandelier,
        light: chandelier.userData.light,
        flames: chandelier.userData.flames
      });
    });

    // Dimensional Rift (Temporal tear behind boss)
    const riftGroup = new THREE.Group();
    const riftGeo = new THREE.PlaneGeometry(3.5, 10);
    const riftMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const rift = new THREE.Mesh(riftGeo, riftMat);
    riftGroup.add(rift);

    const riftLight = new THREE.PointLight(0xa855f7, 3.0, 16);
    riftLight.position.set(0, 0, 1.5);
    riftGroup.add(riftLight);

    riftGroup.position.set(0, 5, -25);
    this.roomGroup.add(riftGroup);
    this.animatedProps.push({ type: 'rift', mesh: rift, light: riftLight });

    // Wall Torches
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const torch = this.createTorch();
      torch.position.set(Math.cos(angle) * 25.5, 4.2, Math.sin(angle) * 25.5);
      torch.rotation.y = -angle - Math.PI / 2;
      this.roomGroup.add(torch);
      this.animatedProps.push({
        type: 'torch',
        light: torch.userData.light,
        flame: torch.userData.flame
      });
    }

    // Paradox Monolith
    const monolith = this.createRiddleMonolith();
    monolith.position.set(0, 0, 8);
    this.roomGroup.add(monolith);
    this.interactables.push({
      type: 'quiz_monolith',
      id: 'f3_astral_1',
      x: 0,
      z: 8,
      radius: 3.5,
      prompt: "Decipher Archon's Paradox [E]"
    });
  }

  // =========================================================================
  // HIGH-POLY PROCEDURAL 3D ARCHITECTURAL MESHES
  // =========================================================================

  /**
   * Gothic Ribbed Master Column with Fluted Colonnettes & Vaulted Ceiling Arches
   */
  createPillar() {
    const stonePBR = TextureGenerator.createStoneBrickPBR();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 });

    const group = new THREE.Group();
    group.name = 'GothicPillarMaster';

    // 1. Octagonal Stepped Plinth Base
    const plinthGeo = new THREE.CylinderGeometry(1.6, 1.9, 0.8, 8);
    const plinth = new THREE.Mesh(plinthGeo, stonePBR.material);
    plinth.position.y = 0.4;
    plinth.castShadow = true;
    group.add(plinth);

    // 2. Molded Torus Base Ring
    const baseTorusGeo = new THREE.TorusGeometry(1.3, 0.18, 16, 24);
    const baseTorus = new THREE.Mesh(baseTorusGeo, stonePBR.material);
    baseTorus.rotation.x = Math.PI / 2;
    baseTorus.position.y = 0.85;
    group.add(baseTorus);

    // 3. Fluted High-Segment Central Shaft
    const shaftGeo = new THREE.CylinderGeometry(1.0, 1.05, 8.2, 24);
    const shaft = new THREE.Mesh(shaftGeo, stonePBR.material);
    shaft.position.y = 4.95;
    shaft.castShadow = true;
    group.add(shaft);

    // 4. Clustered Colonnettes (4 slender columns flanking the shaft)
    const colOffsets = [
      { x: 0.95, z: 0 },
      { x: -0.95, z: 0 },
      { x: 0, z: 0.95 },
      { x: 0, z: -0.95 }
    ];
    colOffsets.forEach(pos => {
      const colGeo = new THREE.CylinderGeometry(0.24, 0.24, 8.2, 12);
      const col = new THREE.Mesh(colGeo, stonePBR.material);
      col.position.set(pos.x, 4.95, pos.z);
      group.add(col);

      // Gold decorative rings at midpoint
      const ringGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12);
      const ring = new THREE.Mesh(ringGeo, goldMat);
      ring.position.set(pos.x, 5.0, pos.z);
      group.add(ring);
    });

    // 5. Ornate Gothic Carved Capital
    const capitalGeo = new THREE.CylinderGeometry(2.0, 1.1, 1.2, 8);
    const capital = new THREE.Mesh(capitalGeo, stonePBR.material);
    capital.position.y = 9.4;
    group.add(capital);

    // 6. Overhead Vaulted Ribs extending outward to frame cathedral arches
    const ribDirections = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    ribDirections.forEach(angle => {
      const ribGeo = new THREE.TorusGeometry(6.5, 0.3, 12, 24, Math.PI * 0.42);
      const rib = new THREE.Mesh(ribGeo, stonePBR.material);
      rib.position.set(0, 9.4, 0);
      rib.rotation.y = angle;
      rib.rotation.z = Math.PI * 0.55;
      group.add(rib);
    });

    return group;
  }

  /**
   * Realistic Recessed Gothic Bookshelf with 40+ 3D Modeled Books, Potions & Scrolls
   */
  createBookshelf() {
    const woodPBR = TextureGenerator.createWoodGrainPBR();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 });

    const group = new THREE.Group();
    group.name = 'DetailedBookshelf';

    // 1. Outer Molded Wood Frame
    const frameW = 4.6;
    const frameH = 7.0;
    const frameD = 1.6;

    // Backing panel
    const backGeo = new THREE.BoxGeometry(frameW, frameH, 0.15);
    const back = new THREE.Mesh(backGeo, woodPBR.material);
    back.position.set(0, frameH / 2, -frameD / 2 + 0.1);
    group.add(back);

    // Side jambs with fluted pilasters
    const jambGeo = new THREE.BoxGeometry(0.35, frameH, frameD);
    const leftJamb = new THREE.Mesh(jambGeo, woodPBR.material);
    leftJamb.position.set(-frameW / 2 + 0.17, frameH / 2, 0);
    group.add(leftJamb);

    const rightJamb = new THREE.Mesh(jambGeo, woodPBR.material);
    rightJamb.position.set(frameW / 2 - 0.17, frameH / 2, 0);
    group.add(rightJamb);

    // Top Carved Pediment & Crown
    const crownGeo = new THREE.BoxGeometry(frameW + 0.4, 0.45, frameD + 0.2);
    const crown = new THREE.Mesh(crownGeo, woodPBR.material);
    crown.position.set(0, frameH + 0.2, 0);
    group.add(crown);

    // 4 Horizontal Wooden Shelves
    const numShelves = 4;
    const shelfSpacing = frameH / (numShelves + 1);
    const bookColors = [0x8b0000, 0x1b365d, 0x1e4620, 0x4a235a, 0x6e2c00, 0x2c3e50, 0xd4ac0d];

    for (let s = 1; s <= numShelves; s++) {
      const shelfY = s * shelfSpacing;
      const shelfGeo = new THREE.BoxGeometry(frameW - 0.7, 0.16, frameD - 0.2);
      const shelf = new THREE.Mesh(shelfGeo, woodPBR.material);
      shelf.position.set(0, shelfY, 0);
      group.add(shelf);

      // Populate shelf with individual 3D books!
      let currentX = -frameW / 2 + 0.6;
      while (currentX < frameW / 2 - 0.8) {
        const bookW = 0.08 + Math.random() * 0.12; // thickness
        const bookH = 0.6 + Math.random() * 0.45; // height
        const bookD = 0.65 + Math.random() * 0.2; // depth
        const color = bookColors[Math.floor(Math.random() * bookColors.length)];

        const bookMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
        const bookGeo = new THREE.BoxGeometry(bookW, bookH, bookD);
        const book = new THREE.Mesh(bookGeo, bookMat);

        // Natural tilt
        const tilt = (Math.random() - 0.5) * 0.18;
        book.position.set(currentX + bookW / 2, shelfY + bookH / 2 + 0.08, (Math.random() - 0.5) * 0.08);
        book.rotation.z = tilt;
        group.add(book);

        currentX += bookW + 0.04;
      }

      // Add Glowing Arcane Potion Flasks on Shelf 2
      if (s === 2) {
        const potionColors = [0x00e5ff, 0xbf5af2];
        potionColors.forEach((pCol, pIdx) => {
          const flaskGeo = new THREE.SphereGeometry(0.18, 12, 12);
          const flaskMat = new THREE.MeshStandardMaterial({
            color: pCol,
            emissive: pCol,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.85
          });
          const flask = new THREE.Mesh(flaskGeo, flaskMat);
          flask.position.set(-1.2 + pIdx * 2.4, shelfY + 0.22, 0.2);
          group.add(flask);

          const flaskLight = new THREE.PointLight(pCol, 1.2, 3);
          flaskLight.position.set(-1.2 + pIdx * 2.4, shelfY + 0.35, 0.3);
          group.add(flaskLight);
        });
      }
    }

    return group;
  }

  /**
   * 3D Wrought-Iron Dragon Wall Sconce with Layered Animated 3D Flame Mesh
   */
  createTorch(includeLight = true) {
    const group = new THREE.Group();
    group.name = 'WroughtIronTorchSconce';

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, metalness: 0.9, roughness: 0.35 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xbfa15f, metalness: 0.8, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.7 });

    // 1. Backing Wall Plate
    const plateGeo = new THREE.BoxGeometry(0.24, 0.8, 0.08);
    const plate = new THREE.Mesh(plateGeo, ironMat);
    group.add(plate);

    // 2. Curved 3D Iron Arm extending out
    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8);
    const arm = new THREE.Mesh(armGeo, ironMat);
    arm.position.set(0, 0.15, 0.25);
    arm.rotation.x = Math.PI / 4;
    group.add(arm);

    // 3. Sconce Basket Cup with Crown Teeth
    const cupGeo = new THREE.CylinderGeometry(0.22, 0.12, 0.25, 12);
    const cup = new THREE.Mesh(cupGeo, ironMat);
    cup.position.set(0, 0.35, 0.45);
    group.add(cup);

    // Brass accent ring
    const ringGeo = new THREE.TorusGeometry(0.23, 0.03, 8, 16);
    const ring = new THREE.Mesh(ringGeo, brassMat);
    ring.position.set(0, 0.46, 0.45);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Wooden Torch Handle
    const handleGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.7, 8);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.position.set(0, 0.25, 0.45);
    group.add(handle);

    // 4. Layered 3D Animated Flame
    const flameGroup = new THREE.Group();
    flameGroup.position.set(0, 0.55, 0.45);

    // Inner bright yellow flame core
    const innerGeo = new THREE.ConeGeometry(0.12, 0.45, 8);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
    const innerFlame = new THREE.Mesh(innerGeo, innerMat);
    innerFlame.position.y = 0.22;
    flameGroup.add(innerFlame);

    // Outer translucent orange-red flame
    const outerGeo = new THREE.ConeGeometry(0.22, 0.65, 8);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff3d00,
      transparent: true,
      opacity: 0.68
    });
    const outerFlame = new THREE.Mesh(outerGeo, outerMat);
    outerFlame.position.y = 0.28;
    flameGroup.add(outerFlame);

    group.add(flameGroup);

    // 5. Dynamic Warm PointLight (only created when requested to avoid light-overdraw lag)
    let light = null;
    if (includeLight) {
      light = new THREE.PointLight(0xff9800, 1.8, 12);
      light.position.set(0, 0.8, 0.55);
      group.add(light);
    }

    group.userData = { light, flame: flameGroup };
    return group;
  }

  /**
   * Sculpted 3D Ancient Riddle Obelisk with Revolving Astrolabe Ring & Floating Crystal
   */
  createRiddleMonolith() {
    const stonePBR = TextureGenerator.createStoneBrickPBR();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });

    const group = new THREE.Group();
    group.name = 'SculptedRiddleMonolith';

    // 1. 3-Tier Stepped Octagonal Dais Base
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.35, 8), stonePBR.material);
    base1.position.y = 0.18;
    group.add(base1);

    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.35, 8), stonePBR.material);
    base2.position.y = 0.53;
    group.add(base2);

    // 2. Chiseled Tapering 4-Sided Obelisk Pillar
    const obeliskGeo = new THREE.CylinderGeometry(0.65, 1.1, 3.2, 4);
    const obelisk = new THREE.Mesh(obeliskGeo, stonePBR.material);
    obelisk.position.y = 2.15;
    obelisk.rotation.y = Math.PI / 4;
    group.add(obelisk);

    // 3. Floating Revolving Astrolabe Gyro Ring
    const gyroGeo = new THREE.TorusGeometry(1.35, 0.08, 16, 32);
    const gyroRing = new THREE.Mesh(gyroGeo, goldMat);
    gyroRing.position.y = 2.4;
    gyroRing.rotation.x = Math.PI / 2.5;
    group.add(gyroRing);

    // 4. Hovering Glowing Runic Crystal Octahedron
    const crystalGeo = new THREE.OctahedronGeometry(0.38, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffb300,
      emissiveIntensity: 1.2,
      roughness: 0.1
    });
    const apexCrystal = new THREE.Mesh(crystalGeo, crystalMat);
    apexCrystal.position.y = 4.1;
    group.add(apexCrystal);

    const runeLight = new THREE.PointLight(0xffd700, 2.4, 8);
    runeLight.position.y = 4.2;
    group.add(runeLight);

    // 4 Corner Miniature Stone Braziers with magical flame
    const brazierPositions = [
      { x: 1.4, z: 1.4 },
      { x: -1.4, z: 1.4 },
      { x: 1.4, z: -1.4 },
      { x: -1.4, z: -1.4 }
    ];
    brazierPositions.forEach(bPos => {
      const bCup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.4, 8), stonePBR.material);
      bCup.position.set(bPos.x, 0.85, bPos.z);
      group.add(bCup);

      const bFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.3, 8),
        new THREE.MeshBasicMaterial({ color: 0xffa000 })
      );
      bFlame.position.set(bPos.x, 1.15, bPos.z);
      group.add(bFlame);
    });

    group.userData = { gyroRing, apexCrystal };
    this.animatedProps.push({ type: 'monolith_anim', ring: gyroRing, crystal: apexCrystal });
    return group;
  }

  /**
   * Grand Gothic Cathedral Gateway with Receding Archivolt Arches & Astral Vortex
   */
  createExitDoor() {
    const stonePBR = TextureGenerator.createStoneBrickPBR();
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, metalness: 0.9, roughness: 0.4 });

    const group = new THREE.Group();
    group.name = 'GrandGothicGateway';

    // 1. Massive Flanking Stone Pilasters
    const pLeft = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8.5, 1.8), stonePBR.material);
    pLeft.position.set(-3.2, 4.25, 0);
    group.add(pLeft);

    const pRight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8.5, 1.8), stonePBR.material);
    pRight.position.set(3.2, 4.25, 0);
    group.add(pRight);

    // 2. Triple Receding Molded Stone Archivolts (Gothic Pointed Arch)
    [3.2, 2.7, 2.2].forEach((radius, idx) => {
      const archGeo = new THREE.TorusGeometry(radius, 0.28, 16, 32, Math.PI);
      const arch = new THREE.Mesh(archGeo, stonePBR.material);
      arch.position.set(0, 5.0, (idx - 1) * 0.35);
      group.add(arch);
    });

    // 3. Wrought-Iron Portcullis Bars with Pikes
    const portcullisGroup = new THREE.Group();
    for (let bar = -2.0; bar <= 2.0; bar += 0.5) {
      const vBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5.5, 8), ironMat);
      vBar.position.set(bar, 2.75, 0);
      portcullisGroup.add(vBar);

      // Bottom pike
      const pike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 8), ironMat);
      pike.position.set(bar, 0.12, 0);
      pike.rotation.x = Math.PI;
      portcullisGroup.add(pike);
    }
    // Horizontal cross-tie bars
    [1.5, 3.2, 4.8].forEach(hY => {
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.2, 8), ironMat);
      hBar.position.set(0, hY, 0);
      hBar.rotation.z = Math.PI / 2;
      portcullisGroup.add(hBar);
    });
    group.add(portcullisGroup);

    // 4. Swirling 3D Astral Portal Vortex
    const vortexGroup = new THREE.Group();
    const vDiscGeo = new THREE.CircleGeometry(2.4, 32);
    const vDiscMat = new THREE.MeshBasicMaterial({
      color: 0x9333ea,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const vDisc = new THREE.Mesh(vDiscGeo, vDiscMat);
    vDisc.position.set(0, 3.2, 0.05);
    vortexGroup.add(vDisc);

    const portalGlow = new THREE.PointLight(0xa855f7, 2.5, 10);
    portalGlow.position.set(0, 3.2, 1.2);
    vortexGroup.add(portalGlow);

    group.add(vortexGroup);

    group.userData = { portcullis: portcullisGroup, vortex: vDisc, isUnlocked: false };
    return group;
  }

  /**
   * Sculpted Blacksmith Anvil on Carved Timber Log Base
   */
  createAnvil() {
    const ironMat = TextureGenerator.createRustedIronPBR().material;
    const woodPBR = TextureGenerator.createWoodGrainPBR();

    const group = new THREE.Group();
    group.name = 'RealisticBlacksmithAnvil';

    // 1. Chunky Tree-Stump Oak Base with Rusted Iron Strapping Bands
    const stumpGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.85, 16);
    const stump = new THREE.Mesh(stumpGeo, woodPBR.material);
    stump.position.y = 0.42;
    stump.castShadow = true;
    group.add(stump);

    const bandGeo = new THREE.TorusGeometry(1.05, 0.05, 8, 20);
    const band = new THREE.Mesh(bandGeo, ironMat);
    band.position.y = 0.55;
    band.rotation.x = Math.PI / 2;
    group.add(band);

    // 2. Anvil Main Body & Waist
    const bodyGeo = new THREE.BoxGeometry(1.4, 0.6, 0.7);
    const body = new THREE.Mesh(bodyGeo, ironMat);
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);

    // 3. Conical Horn (Bickern)
    const hornGeo = new THREE.ConeGeometry(0.28, 0.9, 16);
    const horn = new THREE.Mesh(hornGeo, ironMat);
    horn.position.set(1.0, 1.15, 0);
    horn.rotation.z = -Math.PI / 2;
    group.add(horn);

    // 4. Heel & Stepped Hardy Hole Face
    const heelGeo = new THREE.BoxGeometry(0.5, 0.25, 0.55);
    const heel = new THREE.Mesh(heelGeo, ironMat);
    heel.position.set(-0.85, 1.15, 0);
    group.add(heel);

    return group;
  }

  /**
   * 3D Interlocking Heavy Forged Iron Ceiling Chain
   */
  createHangingChain(numLinks = 8) {
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x222629, metalness: 0.85, roughness: 0.35 });
    const chainGroup = new THREE.Group();
    chainGroup.name = 'HangingIronChain';

    const linkH = 0.32;
    for (let i = 0; i < numLinks; i++) {
      const linkGeo = new THREE.TorusGeometry(0.18, 0.05, 8, 16);
      const link = new THREE.Mesh(linkGeo, ironMat);
      link.position.y = -i * linkH;
      // Alternate perpendicular links for interlocking chain
      if (i % 2 === 1) link.rotation.y = Math.PI / 2;
      chainGroup.add(link);
    }
    return chainGroup;
  }

  /**
   * Recessed Gothic Stained Glass Window with Lead Tracery & Jeweled Backlight
   */
  createGothicWindow(hue = 210) {
    const stonePBR = TextureGenerator.createStoneBrickPBR();
    const glassPBR = TextureGenerator.createStainedGlassPBR(hue);
    const leadMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });

    const group = new THREE.Group();
    group.name = `GothicWindow_${hue}`;

    // Stone Frame
    const frameGeo = new THREE.BoxGeometry(3.0, 6.0, 0.8);
    const frame = new THREE.Mesh(frameGeo, stonePBR.material);
    group.add(frame);

    // Stained Glass Panel
    const glassGeo = new THREE.PlaneGeometry(2.2, 4.8);
    const glass = new THREE.Mesh(glassGeo, glassPBR.material);
    glass.position.z = 0.1;
    group.add(glass);

    // Pointed Gothic Tracery Arch on top
    const archGeo = new THREE.TorusGeometry(1.1, 0.1, 12, 24, Math.PI);
    const arch = new THREE.Mesh(archGeo, leadMat);
    arch.position.set(0, 1.4, 0.12);
    group.add(arch);

    // Colored Backlight casting into the cathedral room
    const winLight = new THREE.PointLight(glassPBR.material.color, 1.8, 12);
    winLight.position.set(0, 0, 1.2);
    group.add(winLight);

    return group;
  }

  /**
   * Grand Gothic 8-Arm Chandelier with Hanging Chains and Flickering Candles
   */
  createGothicChandelier(metal = 'brass') {
    const group = new THREE.Group();
    group.name = `GothicChandelier_${metal}`;

    const metalMat =
      metal === 'brass'
        ? TextureGenerator.createGildedBrassPBR().material
        : new THREE.MeshStandardMaterial({ color: 0x1f2421, metalness: 0.9, roughness: 0.35 });

    const waxMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.5 });

    // 1. Suspension Chains from Ceiling (y=3.5 down to 0)
    for (let c = 0; c < 3; c++) {
      const cAng = (c / 3) * Math.PI * 2;
      const chainGeo = new THREE.CylinderGeometry(0.02, 0.02, 3.5, 6);
      const chain = new THREE.Mesh(chainGeo, metalMat);
      chain.position.set(Math.cos(cAng) * 0.9, 1.75, Math.sin(cAng) * 0.9);
      chain.rotation.z = Math.sin(cAng) * 0.25;
      chain.rotation.x = Math.cos(cAng) * 0.25;
      group.add(chain);
    }

    // 2. Central Torus Crown Wheel
    const wheelGeo = new THREE.TorusGeometry(1.8, 0.08, 12, 32);
    const wheel = new THREE.Mesh(wheelGeo, metalMat);
    wheel.rotation.x = Math.PI / 2;
    group.add(wheel);

    // Inner spoke hub
    const hubGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12);
    const hub = new THREE.Mesh(hubGeo, metalMat);
    group.add(hub);

    // 6 S-Curved Brass Spokes
    for (let s = 0; s < 6; s++) {
      const sAng = (s / 6) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(1.8, 0.04, 0.06);
      const spoke = new THREE.Mesh(spokeGeo, metalMat);
      spoke.position.set(Math.cos(sAng) * 0.9, 0, Math.sin(sAng) * 0.9);
      spoke.rotation.y = -sAng;
      group.add(spoke);
    }

    // 3. 8 Candle Cups with Wax Candles & Flickering Flames
    const flames = [];
    const numCandles = 8;
    for (let i = 0; i < numCandles; i++) {
      const cAng = (i / numCandles) * Math.PI * 2;
      const cX = Math.cos(cAng) * 1.8;
      const cZ = Math.sin(cAng) * 1.8;

      // Candle Cup Dish
      const dishGeo = new THREE.CylinderGeometry(0.18, 0.08, 0.12, 10);
      const dish = new THREE.Mesh(dishGeo, metalMat);
      dish.position.set(cX, 0.06, cZ);
      group.add(dish);

      // Wax Candle Pillar
      const waxGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8);
      const wax = new THREE.Mesh(waxGeo, waxMat);
      wax.position.set(cX, 0.3, cZ);
      group.add(wax);

      // 3D Flame Cone
      const flameGeo = new THREE.ConeGeometry(0.08, 0.25, 6);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa000 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(cX, 0.62, cZ);
      group.add(flame);
      flames.push(flame);
    }

    // 4. Central Warm Amber Chandelier Point Light
    const light = new THREE.PointLight(0xffaa44, 2.6, 18);
    light.position.set(0, 0.8, 0);
    group.add(light);

    group.userData = { light, flames };
    return group;
  }

  /**
   * Floating Open Ancient Grimoire with Glowing Runic Embers
   */
  createFloatingGrimoire(coverColor = 0x8b0000) {
    const group = new THREE.Group();
    group.name = 'FloatingAncientGrimoire';

    const parchmentPBR = TextureGenerator.createParchmentPBR();
    const coverMat = new THREE.MeshStandardMaterial({ color: coverColor, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 });

    // 1. Open Leather Book Covers (Angled V-shape)
    const leftCoverGeo = new THREE.BoxGeometry(0.5, 0.03, 0.7);
    const leftCover = new THREE.Mesh(leftCoverGeo, coverMat);
    leftCover.position.set(-0.24, 0, 0);
    leftCover.rotation.z = 0.25;
    group.add(leftCover);

    const rightCover = leftCover.clone();
    rightCover.position.set(0.24, 0, 0);
    rightCover.rotation.z = -0.25;
    group.add(rightCover);

    // 2. Curved Parchment Pages
    const leftPagesGeo = new THREE.BoxGeometry(0.46, 0.06, 0.66);
    const leftPages = new THREE.Mesh(leftPagesGeo, parchmentPBR.material);
    leftPages.position.set(-0.23, 0.03, 0);
    leftPages.rotation.z = 0.22;
    group.add(leftPages);

    const rightPages = leftPages.clone();
    rightPages.position.set(0.23, 0.03, 0);
    rightPages.rotation.z = -0.22;
    group.add(rightPages);

    // 3. Hovering Runic Astrolabe Ring Above Pages
    const runeRingGeo = new THREE.TorusGeometry(0.35, 0.015, 8, 20);
    const runeRing = new THREE.Mesh(runeRingGeo, goldMat);
    runeRing.rotation.x = Math.PI / 2;
    runeRing.position.y = 0.22;
    group.add(runeRing);

    // Glowing Arcane Point Light
    const tomeLight = new THREE.PointLight(coverColor, 1.4, 5);
    tomeLight.position.y = 0.3;
    group.add(tomeLight);

    group.userData = { runeRing, tomeLight };
    return group;
  }

  /**
   * Heavy Blacksmith Stone & Iron Forge Furnace with Roaring Hearth
   */
  createForgeFurnace() {
    const stonePBR = TextureGenerator.createStoneBrickPBR();
    const ironMat = TextureGenerator.createRustedIronPBR().material;
    const lavaPBR = TextureGenerator.createLavaTexturePBR();

    const group = new THREE.Group();
    group.name = 'BlacksmithForgeFurnace';

    // 1. Stone Hearth Base
    const baseGeo = new THREE.BoxGeometry(4.2, 1.2, 3.2);
    const base = new THREE.Mesh(baseGeo, stonePBR.material);
    base.position.y = 0.6;
    base.castShadow = true;
    group.add(base);

    // 2. Arched Stone Firebox Canopy
    const canopyGeo = new THREE.BoxGeometry(4.2, 4.0, 3.2);
    const canopy = new THREE.Mesh(canopyGeo, stonePBR.material);
    canopy.position.y = 3.6;
    canopy.castShadow = true;
    group.add(canopy);

    // 3. Molten Lava Fire Bed in Arched Hearth
    const bedGeo = new THREE.BoxGeometry(2.8, 0.3, 2.2);
    const bed = new THREE.Mesh(bedGeo, lavaPBR.material);
    bed.position.set(0, 1.3, 0.3);
    group.add(bed);

    // 4. Heavy Forged Iron Grate Bars
    for (let b = -1.2; b <= 1.2; b += 0.4) {
      const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8);
      const bar = new THREE.Mesh(barGeo, ironMat);
      bar.position.set(b, 2.2, 1.4);
      group.add(bar);
    }

    // 5. Chimney Flute extending to ceiling
    const chimneyGeo = new THREE.CylinderGeometry(0.9, 1.2, 5.0, 12);
    const chimney = new THREE.Mesh(chimneyGeo, stonePBR.material);
    chimney.position.set(0, 7.8, 0);
    group.add(chimney);

    // 6. Roaring Fire Mesh & Dynamic Flame Light
    const flameGeo = new THREE.ConeGeometry(0.7, 1.6, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 2.1, 0.3);
    group.add(flame);

    const light = new THREE.PointLight(0xff5722, 3.2, 14);
    light.position.set(0, 2.2, 1.0);
    group.add(light);

    group.userData = { light, flame };
    return group;
  }

  /**
   * Sculpted 3-Legged Cast Iron Bubbling Alchemical Cauldron
   */
  createBubblingCauldron(potionColor = 0x00e5ff) {
    const group = new THREE.Group();
    group.name = `BubblingCauldron_${potionColor.toString(16)}`;

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, metalness: 0.9, roughness: 0.4 });
    const potionMat = new THREE.MeshStandardMaterial({
      color: potionColor,
      emissive: potionColor,
      emissiveIntensity: 1.6,
      roughness: 0.1,
      metalness: 0.1
    });

    // 1. Cauldron Bowl Pot
    const potGeo = new THREE.SphereGeometry(0.9, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.75);
    const pot = new THREE.Mesh(potGeo, ironMat);
    pot.position.y = 1.0;
    pot.rotation.x = Math.PI;
    group.add(pot);

    // Cauldron Rim Torus
    const rimGeo = new THREE.TorusGeometry(0.75, 0.08, 12, 24);
    const rim = new THREE.Mesh(rimGeo, ironMat);
    rim.position.y = 1.0;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    // 3 Iron Legs
    for (let l = 0; l < 3; l++) {
      const lAng = (l / 3) * Math.PI * 2;
      const legGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.9, 8);
      const leg = new THREE.Mesh(legGeo, ironMat);
      leg.position.set(Math.cos(lAng) * 0.55, 0.45, Math.sin(lAng) * 0.55);
      leg.rotation.z = Math.sin(lAng) * 0.25;
      leg.rotation.x = Math.cos(lAng) * 0.25;
      group.add(leg);
    }

    // 2. Glowing Liquid Surface Disc
    const liquidGeo = new THREE.CircleGeometry(0.7, 20);
    const liquid = new THREE.Mesh(liquidGeo, potionMat);
    liquid.rotation.x = -Math.PI / 2;
    liquid.position.y = 0.92;
    group.add(liquid);

    // 3. Bubbles floating on surface
    const bubbles = [];
    for (let b = 0; b < 5; b++) {
      const bGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 8, 8);
      const bubble = new THREE.Mesh(bGeo, potionMat);
      bubble.position.set((Math.random() - 0.5) * 0.8, 0.96, (Math.random() - 0.5) * 0.8);
      group.add(bubble);
      bubbles.push(bubble);
    }

    // Potion glow light
    const light = new THREE.PointLight(potionColor, 2.0, 8);
    light.position.set(0, 1.4, 0);
    group.add(light);

    group.userData = { liquid, bubbles, light };
    return group;
  }

  createVolumetricGodRays(color = 0xb0c4de, height = 15, radiusTop = 1.2, radiusBottom = 8.0) {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 24, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, height / 2 + 1.0, 0);
    this.roomGroup.add(mesh);
    this.animatedProps.push({
      type: 'god_rays',
      mesh,
      baseOpacity: 0.12
    });
    return mesh;
  }

  createGroundMistLayer(color = 0x0a1024, radius = 22.0) {
    const geo = new THREE.CircleGeometry(radius, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.12;
    this.roomGroup.add(mesh);
    this.animatedProps.push({
      type: 'ground_mist',
      mesh,
      baseOpacity: 0.28
    });
    return mesh;
  }

  createDestructibleUrn(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.65,
      metalness: 0.1
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.85
    });

    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.35, 1.1, 16);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    const neckGeo = new THREE.CylinderGeometry(0.28, 0.42, 0.35, 16);
    const neck = new THREE.Mesh(neckGeo, goldMat);
    neck.position.y = 1.2;
    group.add(neck);

    const rimGeo = new THREE.TorusGeometry(0.3, 0.05, 8, 16);
    const rim = new THREE.Mesh(rimGeo, goldMat);
    rim.position.y = 1.35;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    const runeGlow = new THREE.PointLight(0xffa500, 0.6, 3.5);
    runeGlow.position.y = 0.6;
    group.add(runeGlow);

    this.roomGroup.add(group);

    const propData = {
      type: 'destructible_urn',
      group,
      x,
      z,
      radius: 0.85,
      health: 1,
      isDestroyed: false
    };

    this.destructibles.push(propData);
    this.colliders.push({ type: 'cylinder', x, z, radius: 0.6 });
    return group;
  }

  createDestructibleCrate(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.8,
      metalness: 0.05
    });

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x3a3d40,
      roughness: 0.4,
      metalness: 0.8
    });

    const crateGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const crate = new THREE.Mesh(crateGeo, woodMat);
    crate.position.y = 0.55;
    crate.castShadow = true;
    group.add(crate);

    const bandGeo = new THREE.BoxGeometry(1.12, 0.14, 1.12);
    const band = new THREE.Mesh(bandGeo, ironMat);
    band.position.y = 0.55;
    group.add(band);

    this.roomGroup.add(group);

    const propData = {
      type: 'destructible_crate',
      group,
      x,
      z,
      radius: 0.95,
      health: 1,
      isDestroyed: false
    };

    this.destructibles.push(propData);
    this.colliders.push({ type: 'cylinder', x, z, radius: 0.7 });
    return group;
  }

  shatterProp(prop, impactPos = null, impactElement = 'fire') {
    if (prop.isDestroyed) return;
    prop.isDestroyed = true;

    this.roomGroup.remove(prop.group);
    this.colliders = this.colliders.filter(c => !(Math.abs(c.x - prop.x) < 0.1 && Math.abs(c.z - prop.z) < 0.1));

    const count = 10;
    const debrisColor = prop.type === 'destructible_urn' ? 0x8b5a2b : 0x5c4033;
    const mat = new THREE.MeshStandardMaterial({
      color: debrisColor,
      roughness: 0.7
    });

    for (let i = 0; i < count; i++) {
      const size = 0.1 + Math.random() * 0.14;
      const geo = new THREE.DodecahedronGeometry(size, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        prop.x + (Math.random() - 0.5) * 0.5,
        0.3 + Math.random() * 0.5,
        prop.z + (Math.random() - 0.5) * 0.5
      );
      mesh.castShadow = true;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const force = 2.5 + Math.random() * 4.5;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * force,
        3.0 + Math.random() * 3.5,
        Math.sin(angle) * force
      );

      this.debris.push({
        mesh,
        velocity,
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12
        ),
        life: 3.5,
        maxLife: 3.5
      });
    }
  }

  /**
   * Update Animated Props, Shaders, and Physics Debris Per Frame
   */
  updateProps(deltaTime) {
    const time = Date.now() * 0.001;

    // Update Custom GLSL Shader Uniforms
    if (this.lavaUniforms) {
      this.lavaUniforms.uTime.value = time;
    }
    if (this.nebulaUniforms) {
      this.nebulaUniforms.uTime.value = time;
    }

    // Update Physics Debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= deltaTime;

      // Apply gravity
      d.velocity.y -= 9.8 * deltaTime;
      d.mesh.position.addScaledVector(d.velocity, deltaTime);

      // Floor bounce & friction
      if (d.mesh.position.y < 0.08) {
        d.mesh.position.y = 0.08;
        d.velocity.y = -d.velocity.y * 0.35;
        d.velocity.x *= 0.8;
        d.velocity.z *= 0.8;
      }

      // Angular rotation
      d.mesh.rotation.x += d.rotVelocity.x * deltaTime;
      d.mesh.rotation.y += d.rotVelocity.y * deltaTime;
      d.mesh.rotation.z += d.rotVelocity.z * deltaTime;

      // Fadeout scale
      if (d.life < 1.0) {
        const s = Math.max(0.01, d.life);
        d.mesh.scale.set(s, s, s);
      }

      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        if (d.mesh.geometry) d.mesh.geometry.dispose();
        if (d.mesh.material) d.mesh.material.dispose();
        this.debris.splice(i, 1);
      }
    }

    this.animatedProps.forEach(prop => {
      if (prop.type === 'torch') {
        const flicker = 0.6 + 0.6 * Math.sin(time * 12 + Math.random() * 2);
        prop.light.intensity = flicker;
        if (prop.flame) {
          const s = 0.9 + 0.2 * Math.sin(time * 16);
          prop.flame.scale.set(s, 0.85 + 0.3 * Math.cos(time * 14), s);
        }
      } else if (prop.type === 'chandelier') {
        const flicker = 2.0 + 0.6 * Math.sin(time * 8 + Math.cos(time * 14));
        if (prop.light) prop.light.intensity = flicker;
        if (prop.flames) {
          prop.flames.forEach((fl, idx) => {
            const s = 0.85 + 0.25 * Math.sin(time * 14 + idx * 1.5);
            fl.scale.set(s, s * 1.1, s);
          });
        }
      } else if (prop.type === 'floating_tome') {
        prop.mesh.position.y = (prop.initialY || 2.0) + Math.sin(time * 2.5 * (prop.speed || 1.0)) * 0.15;
        prop.mesh.rotation.y += deltaTime * 0.6 * (prop.speed || 1.0);
        if (prop.mesh.userData?.runeRing) {
          prop.mesh.userData.runeRing.rotation.z += deltaTime * 2.4;
        }
      } else if (prop.type === 'furnace') {
        if (prop.light) {
          prop.light.intensity = 2.6 + 0.8 * Math.sin(time * 10 + Math.random() * 1.5);
        }
        if (prop.flame) {
          const s = 0.9 + 0.25 * Math.sin(time * 12);
          prop.flame.scale.set(s, 0.8 + 0.3 * Math.cos(time * 9), s);
        }
      } else if (prop.type === 'cauldron') {
        if (prop.mesh?.userData?.bubbles) {
          prop.mesh.userData.bubbles.forEach((b, i) => {
            b.position.y = 0.94 + Math.sin(time * 4 + i * 2) * 0.05;
            const bScale = 0.8 + 0.4 * Math.sin(time * 3 + i);
            b.scale.set(bScale, bScale, bScale);
          });
        }
      } else if (prop.type === 'runic_circle') {
        prop.mesh.rotation.z += deltaTime * 0.15;
      } else if (prop.type === 'orrery') {
        prop.r1.rotation.y += deltaTime * 0.5;
        prop.r1.rotation.x += deltaTime * 0.2;
        prop.r2.rotation.y -= deltaTime * 0.4;
        prop.r2.rotation.z += deltaTime * 0.3;
        if (prop.r3) prop.r3.rotation.x += deltaTime * 0.35;
      } else if (prop.type === 'rift') {
        prop.mesh.material.opacity = 0.6 + 0.4 * Math.sin(time * 3);
        if (prop.light) prop.light.intensity = 2.0 + 1.2 * Math.sin(time * 4);
      } else if (prop.type === 'book_orb') {
        prop.mesh.position.y = (prop.initialY || 1.88) + Math.sin(time * (prop.speed || 2.2)) * 0.08;
        prop.mesh.rotation.y += deltaTime * 1.5;
        if (prop.ring) {
          prop.ring.position.y = prop.mesh.position.y;
          prop.ring.rotation.z += deltaTime * 1.8;
        }
        if (prop.light) {
          prop.light.intensity = 1.8 + 0.5 * Math.sin(time * 3);
        }
      } else if (prop.type === 'vault_gate_lock') {
        if (prop.lock && prop.lock.visible) {
          prop.lock.rotation.z += deltaTime * 0.8;
        }
        if (prop.core && prop.core.visible) {
          prop.core.rotation.y += deltaTime * 1.2;
          prop.core.rotation.x += deltaTime * 0.6;
        }
      } else if (prop.type === 'god_rays') {
        prop.mesh.material.opacity = prop.baseOpacity + 0.04 * Math.sin(time * 1.8);
      } else if (prop.type === 'ground_mist') {
        prop.mesh.material.opacity = prop.baseOpacity + 0.06 * Math.sin(time * 1.4);
        prop.mesh.rotation.z += deltaTime * 0.02;
      } else if (prop.type === 'ghost_npc') {
        prop.mesh.position.y = (prop.initialY || 0) + Math.sin(time * 2.2) * 0.12;
        if (prop.mesh.userData.book) {
          prop.mesh.userData.book.rotation.y += deltaTime * 0.8;
          prop.mesh.userData.book.position.y = 1.5 + Math.sin(time * 3.0) * 0.08;
        }
      } else if (prop.type === 'alchemist_npc') {
        if (prop.mesh.userData.forgeLight) {
          prop.mesh.userData.forgeLight.intensity = 1.4 + 0.6 * Math.sin(time * 4);
        }
      } else if (prop.type === 'convict_npc') {
        if (prop.mesh?.userData?.lanternLight) {
          prop.mesh.userData.lanternLight.intensity = 1.8 + 0.6 * Math.sin(time * 6 + Math.cos(time * 11) * 0.5);
        }
      } else if (prop.type === 'monolith_anim') {
        prop.ring.rotation.z += deltaTime * 0.6;
        prop.crystal.rotation.y += deltaTime * 0.9;
        prop.crystal.position.y = 4.1 + Math.sin(time * 2.5) * 0.1;
      }
    });
  }
}

