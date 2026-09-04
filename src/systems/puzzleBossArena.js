import * as THREE from 'three';
import { soundEngine } from '../engine/audio.js';
import { onlineNetwork } from '../state/webrtcNetwork.js';

/**
 * PuzzleBossArena
 * Manages the "Tri-Elemental Leyline Matrix" simultaneous boss puzzle:
 * - 3 Elemental Convergence Pedestals (Pyretic, Cryo, Chrono)
 * - Central Archon Core Matrix
 * - Mirror rotation and laser beam alignment
 * - 15-Second Post-Kill Core Meltdown Emergency Fail-Safe
 */
export class PuzzleBossArena {
  constructor(scene, particles, engineScene) {
    this.scene = scene;
    this.particles = particles;
    this.engineScene = engineScene;

    this.coreMatrixPos = new THREE.Vector3(0, 1.2, 0);

    this.pedestals = {
      pyretic: {
        name: 'Crucible of Embers',
        element: 'fire',
        pos: new THREE.Vector3(0, 0, 22),
        color: 0xff4400,
        emissiveColor: 0xff2200,
        isCharged: false,
        angle: 0,
        isAligned: false,
        beamMesh: null,
        targetAngle: Math.PI
      },
      cryo: {
        name: 'Glacial Obelisk',
        element: 'frost',
        pos: new THREE.Vector3(-18, 0, -10),
        color: 0x00e5ff,
        emissiveColor: 0x0088cc,
        isCharged: false,
        angle: 0,
        isAligned: false,
        beamMesh: null,
        targetAngle: 1.064
      },
      chrono: {
        name: 'Chrono Monolith',
        element: 'chrono',
        pos: new THREE.Vector3(18, 0, -10),
        color: 0xbf5af2,
        emissiveColor: 0x9333ea,
        isCharged: false,
        angle: 0,
        isAligned: false,
        beamMesh: null,
        targetAngle: -1.064
      }
    };

    // Calculate exact target angle for each pedestal pointing straight at central core
    for (const ped of Object.values(this.pedestals)) {
      ped.targetAngle = Math.atan2(this.coreMatrixPos.x - ped.pos.x, this.coreMatrixPos.z - ped.pos.z);
    }

    this.alignedCount = 0;
    this.totalBeams = 3;

    // Meltdown State
    this.isMeltdownActive = false;
    this.meltdownTimer = 15.00;
    this.isContained = false;
    this.onMeltdownSuccess = null;
    this.onMeltdownFail = null;
    this.onMeltdownTick = null;

    this.initArenaMeshes();
  }

  initArenaMeshes() {
    this.group = new THREE.Group();

    // 1. Central Archon Core Matrix
    const coreGroup = new THREE.Group();
    coreGroup.position.copy(this.coreMatrixPos);

    // Inner Core Sphere
    const sphereGeo = new THREE.SphereGeometry(1.2, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 3.5,
      roughness: 0.1,
      metalness: 0.9
    });
    this.coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
    coreGroup.add(this.coreSphere);

    // Concentric Gyro Rings
    const ringGeo1 = new THREE.TorusGeometry(2.0, 0.08, 12, 48);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00aacc,
      emissiveIntensity: 2.8
    });
    this.coreRing1 = new THREE.Mesh(ringGeo1, ringMat1);
    coreGroup.add(this.coreRing1);

    const ringGeo2 = new THREE.TorusGeometry(2.6, 0.08, 12, 48);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xbf5af2,
      emissive: 0x9333ea,
      emissiveIntensity: 2.8
    });
    this.coreRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    coreGroup.add(this.coreRing2);

    // Core Matrix Base Pillar
    const baseGeo = new THREE.CylinderGeometry(2.8, 3.4, 1.2, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a24,
      roughness: 0.7,
      metalness: 0.4
    });
    const basePillar = new THREE.Mesh(baseGeo, baseMat);
    basePillar.position.y = -0.6;
    coreGroup.add(basePillar);

    this.group.add(coreGroup);
    this.coreGroup = coreGroup;

    // 2. The 3 Elemental Convergence Pedestals
    for (const [key, ped] of Object.entries(this.pedestals)) {
      const pGroup = new THREE.Group();
      pGroup.position.copy(ped.pos);

      // Stone Pedestal Base
      const pedGeo = new THREE.CylinderGeometry(1.4, 1.8, 2.2, 8);
      const pedMat = new THREE.MeshStandardMaterial({
        color: 0x22222a,
        roughness: 0.6,
        metalness: 0.3
      });
      const pedestalMesh = new THREE.Mesh(pedGeo, pedMat);
      pedestalMesh.position.y = 1.1;
      pGroup.add(pedestalMesh);

      // Elemental Glyphic Crystal
      const crysGeo = new THREE.OctahedronGeometry(0.8);
      const crysMat = new THREE.MeshStandardMaterial({
        color: ped.color,
        emissive: ped.emissiveColor,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.8
      });
      const crystal = new THREE.Mesh(crysGeo, crysMat);
      crystal.position.y = 2.8;
      pGroup.add(crystal);
      ped.crystalMesh = crystal;

      // Rotating Mirror Prism Mount
      const mirrorGroup = new THREE.Group();
      mirrorGroup.position.y = 2.8;

      const mirrorGeo = new THREE.BoxGeometry(0.2, 1.2, 1.4);
      const mirrorMat = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        emissive: 0x333333,
        roughness: 0.1,
        metalness: 0.95
      });
      const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
      mirrorGroup.add(mirror);

      pGroup.add(mirrorGroup);
      ped.mirrorGroup = mirrorGroup;

      this.group.add(pGroup);
      ped.group = pGroup;
    }

    this.scene.add(this.group);
  }

  /**
   * Check if a spell projectile hits an elemental pedestal
   */
  checkProjectileHit(projectile) {
    for (const [key, ped] of Object.entries(this.pedestals)) {
      if (ped.isCharged) continue;

      const hDist = Math.hypot(projectile.mesh.position.x - ped.pos.x, projectile.mesh.position.z - ped.pos.z);
      const yDist = Math.abs(projectile.mesh.position.y - 2.4);

      if (hDist < 2.8 && yDist < 2.8) {
        // Element matching check
        const match = (ped.element === 'fire' && projectile.element === 'fire') ||
                      (ped.element === 'frost' && projectile.element === 'frost') ||
                      (ped.element === 'chrono' && (projectile.element === 'chrono' || projectile.element === 'arcane' || projectile.element === 'light'));

        if (match) {
          this.chargePedestal(key);
          onlineNetwork.chargeLeyline(key);
          return true;
        } else {
          // Fizzle spark
          this.particles.spawnFloatingText(new THREE.Vector3(ped.pos.x, 3.2, ped.pos.z), `Requires ${ped.element.toUpperCase()}!`, '#ff3b30');
          soundEngine.playDamage();
          return true;
        }
      }
    }
    return false;
  }

  chargePedestal(key) {
    const ped = this.pedestals[key];
    if (!ped || ped.isCharged) return;

    ped.isCharged = true;
    ped.crystalMesh.material.emissiveIntensity = 5.0;

    this.particles.spawnSparkBurst(new THREE.Vector3(ped.pos.x, 2.8, ped.pos.z), ped.color, 32);
    this.particles.spawnFloatingText(new THREE.Vector3(ped.pos.x, 3.8, ped.pos.z), `+ ${ped.name} Charged!`, '#ffd700');
    soundEngine.playPuzzleSolve();

    // Create initial laser beam
    this.createBeam(ped, key);
  }

  createBeam(ped, key = null, { checkAlignment = true } = {}) {
    if (ped.beamMesh) return;

    const beamLen = ped.pos.distanceTo(this.coreMatrixPos);
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, beamLen, 12);
    const beamMat = new THREE.MeshStandardMaterial({
      color: ped.color,
      emissive: ped.emissiveColor,
      emissiveIntensity: 4.5,
      transparent: true,
      opacity: 0.85
    });

    const beam = new THREE.Mesh(beamGeo, beamMat);
    // Point along Z by default
    beam.rotation.x = Math.PI / 2;
    beam.position.z = beamLen * 0.5;

    ped.mirrorGroup.add(beam);
    ped.beamMesh = beam;

    // Check if initial angle is already aligned. Server reconciliation skips
    // this client-side action so a stale prediction cannot emit a duplicate
    // alignment request.
    if (checkAlignment) this.checkAlignment(ped, key);
  }

  /**
   * Apply the authoritative Floor 10 pedestal state.  Projectile and mirror
   * interactions can be predicted locally for responsiveness, but the relay
   * is the source of truth after reconnects or rejected actions.
   */
  syncServerState(state = {}) {
    const incoming = state?.pedestals && typeof state.pedestals === 'object'
      ? state.pedestals
      : {};
    for (const [key, ped] of Object.entries(incoming)) {
      const local = this.pedestals[key];
      if (!local || !ped) continue;
      const charged = Boolean(ped.isCharged);
      const aligned = Boolean(ped.isAligned);
      const wasAligned = local.isAligned;
      if (!charged && local.isCharged) {
        if (local.beamMesh) {
          local.mirrorGroup.remove(local.beamMesh);
          local.beamMesh.geometry?.dispose?.();
          local.beamMesh.material?.dispose?.();
          local.beamMesh = null;
        }
        local.crystalMesh.material.emissiveIntensity = 1.5;
        local.angle = 0;
        local.mirrorGroup.rotation.y = 0;
      }
      local.isCharged = charged;
      local.isAligned = aligned;
      if (charged && !aligned && wasAligned) {
        local.angle = 0;
        local.mirrorGroup.rotation.y = 0;
      }
      if (charged) {
        local.crystalMesh.material.emissiveIntensity = 5.0;
        if (!local.beamMesh) this.createBeam(local, key, { checkAlignment: false });
      }
      if (aligned) {
        local.angle = local.targetAngle;
        local.mirrorGroup.rotation.y = local.targetAngle;
      }
    }
    if (Number.isFinite(Number(state.alignedCount))) {
      this.alignedCount = Math.max(0, Math.min(this.totalBeams, Number(state.alignedCount)));
    }
    if (state.meltdownActive !== undefined) {
      this.isMeltdownActive = Boolean(state.meltdownActive);
      if (this.isMeltdownActive && Number.isFinite(Number(state.meltdownTimer))) {
        this.meltdownTimer = Math.max(0, Number(state.meltdownTimer));
      }
    }
    if (state.unlocked !== undefined) this.isContained = Boolean(state.unlocked);
  }

  /**
   * Called when player presses [F] near a pedestal
   */
  interactPedestal(playerPos) {
    for (const [key, ped] of Object.entries(this.pedestals)) {
      const dist = Math.hypot(playerPos.x - ped.pos.x, playerPos.z - ped.pos.z);
      if (dist < 3.2) {
        if (!ped.isCharged) {
          this.particles.spawnFloatingText(ped.pos, `Requires ${ped.element.toUpperCase()} Spell!`, '#ff9800');
          return { handled: true, message: `Ignite the ${ped.name} with ${ped.element.toUpperCase()}!` };
        }

        if (ped.isAligned) {
          return { handled: true, message: `${ped.name} already locked into Core Matrix!` };
        }

        // Rotate mirror by 45 degrees
        ped.angle += Math.PI / 4;
        if (ped.angle > Math.PI * 2) ped.angle -= Math.PI * 2;
        ped.mirrorGroup.rotation.y = ped.angle;

        soundEngine.playFootstep('metal');
        this.checkAlignment(ped, key);
        return { handled: true, message: `Rotated ${ped.name} mirror.` };
      }
    }
    return { handled: false };
  }

  checkAlignment(ped, key = null) {
    if (ped.isAligned) return;

    // Normalize angles
    const currentRot = ped.angle;
    const diff = Math.abs(Math.atan2(Math.sin(currentRot - ped.targetAngle), Math.cos(currentRot - ped.targetAngle)));

    if (diff < 0.42) { // Snapped into alignment!
      ped.isAligned = true;
      ped.angle = ped.targetAngle;
      ped.mirrorGroup.rotation.y = ped.targetAngle;

      this.alignedCount++;
      soundEngine.playPuzzleSolve();

      this.particles.spawnSparkBurst(this.coreMatrixPos, ped.color, 48);
      this.engineScene.addScreenShake(0.2, 0.3);
      this.particles.spawnFloatingText(this.coreMatrixPos, `⚡ Beam Aligned! (${this.alignedCount}/3)`, '#00e5ff');

      const pedestalKey = key || Object.keys(this.pedestals).find(k => this.pedestals[k] === ped);
      if (pedestalKey) {
        onlineNetwork.alignLeyline(pedestalKey);
      }

      // Check if meltdown was active and is now saved
      if (this.isMeltdownActive && this.alignedCount === this.totalBeams) {
        this.containMeltdown();
      }

      if (this.onBeamAligned) {
        this.onBeamAligned(this.alignedCount, this.totalBeams);
      }
    }
  }

  getNearbyInteractable(playerPos) {
    for (const [key, ped] of Object.entries(this.pedestals)) {
      const dist = Math.hypot(playerPos.x - ped.pos.x, playerPos.z - ped.pos.z);
      if (dist < 3.2) {
        if (!ped.isCharged) {
          return { prompt: `Cast ${ped.element.toUpperCase()} on ${ped.name}` };
        } else if (!ped.isAligned) {
          return { prompt: `Rotate Mirror [F] (${ped.name})` };
        } else {
          return { prompt: `${ped.name} [LOCKED 🔒]` };
        }
      }
    }
    return null;
  }

  // =========================================================================
  // 15-SECOND POST-KILL CORE MELTDOWN EMERGENCY FAIL-SAFE
  // =========================================================================
  startMeltdown(onTick, onSuccess, onFail) {
    if (this.alignedCount >= this.totalBeams) {
      // Puzzle was already solved during the fight! Safe victory!
      if (onSuccess) onSuccess();
      return;
    }

    this.isMeltdownActive = true;
    this.meltdownTimer = 15.00;
    this.onMeltdownTick = onTick;
    this.onMeltdownSuccess = onSuccess;
    this.onMeltdownFail = onFail;

    this.engineScene.addScreenShake(0.4, 1.2);
    soundEngine.playDamage();
  }

  containMeltdown() {
    if (this.isContained) return;
    this.isMeltdownActive = false;
    this.isContained = true;

    // Prismatic Containment Shield Sphere
    const shieldGeo = new THREE.SphereGeometry(3.5, 32, 32);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00ffff,
      emissiveIntensity: 3.5,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.9
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    this.coreGroup.add(shield);

    this.particles.spawnSoulDissolution(this.coreMatrixPos, 0xffd700, 64);
    soundEngine.playPuzzleSolve();

    if (this.onMeltdownSuccess) {
      this.onMeltdownSuccess();
    }
  }

  update(deltaTime) {
    // Gyro ring rotations in central core
    if (this.coreRing1) this.coreRing1.rotation.x += deltaTime * 1.5;
    if (this.coreRing2) this.coreRing2.rotation.y += deltaTime * 1.8;

    // Floating crystal bobs on pedestals
    for (const ped of Object.values(this.pedestals)) {
      if (ped.crystalMesh) {
        ped.crystalMesh.rotation.y += deltaTime * 1.2;
        ped.crystalMesh.position.y = 2.8 + Math.sin(performance.now() * 0.003) * 0.15;
      }
    }

    // Meltdown Emergency Countdown
    if (this.isMeltdownActive && !this.isContained) {
      this.meltdownTimer -= deltaTime;

      // Screen tremor and falling dust
      if (Math.random() < 0.25) {
        this.engineScene.addScreenShake(0.12, 0.15);
      }

      if (this.onMeltdownTick) {
        this.onMeltdownTick(Math.max(0, this.meltdownTimer));
      }

      if (this.meltdownTimer <= 0) {
        this.isMeltdownActive = false;
        // Catastrophic room explosion
        this.particles.spawnSoulDissolution(this.coreMatrixPos, 0xff2200, 120);
        this.engineScene.addScreenShake(0.8, 1.5);
        soundEngine.playDamage();

        if (this.onMeltdownFail) {
          this.onMeltdownFail();
        }
      }
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse((object) => {
      object.geometry?.dispose?.();
      const material = object.material;
      if (Array.isArray(material)) material.forEach(item => item?.dispose?.());
      else material?.dispose?.();
    });
  }
}
