import * as THREE from 'three';

/**
 * Procedural Skeletal and Mesh Animation System
 */
export class AnimationController {
  constructor() {
    this.time = 0;
  }

  update(deltaTime) {
    this.time += deltaTime;
  }

  /**
   * Animates a wizard character based on velocity and state
   */
  animateWizard(wizardGroup, isMoving, isCasting, deltaTime) {
    if (!wizardGroup || !wizardGroup.userData) return;
    const { armGroup, staffGroup, crystal, robe } = wizardGroup.userData;

    if (isMoving) {
      // Walk cycle bobbing and sway
      const walkSpeed = 12;
      const bob = Math.sin(this.time * walkSpeed) * 0.08;
      wizardGroup.position.y = bob;

      // Body tilt in movement
      wizardGroup.rotation.z = Math.sin(this.time * walkSpeed) * 0.05;

      // Staff arm swing
      if (armGroup) {
        armGroup.rotation.x = (Math.PI / 4) + Math.sin(this.time * walkSpeed) * 0.25;
      }
    } else {
      // Idle breathing
      const idleSpeed = 3;
      const breath = Math.sin(this.time * idleSpeed) * 0.03;
      wizardGroup.position.y = breath;
      wizardGroup.rotation.z = 0;

      if (armGroup && !isCasting) {
        armGroup.rotation.x = (Math.PI / 4) + Math.sin(this.time * idleSpeed) * 0.05;
      }
    }

    // Spellcast recoil & raise staff
    if (isCasting && armGroup) {
      armGroup.rotation.x = -Math.PI / 3; // Raise staff high
      if (crystal) {
        crystal.rotation.y += deltaTime * 15;
      }
    } else if (crystal) {
      crystal.rotation.y += deltaTime * 2;
    }
  }

  /**
   * Animates Arcane Sentinel rings, core, and Glaive swings
   */
  animateSentinel(sentinelGroup, deltaTime) {
    if (!sentinelGroup || !sentinelGroup.userData) return;
    const { core, ring1, ring2, rightArm, weapon } = sentinelGroup.userData;

    // Levitation Bobbing
    sentinelGroup.position.y = Math.sin(this.time * 2.8) * 0.18;

    // Ring spins
    if (ring1) {
      ring1.rotation.x += deltaTime * 1.6;
      ring1.rotation.y += deltaTime * 0.9;
    }
    if (ring2) {
      ring2.rotation.y += deltaTime * 1.3;
      ring2.rotation.z += deltaTime * 1.1;
    }
    if (core) {
      core.rotation.y += deltaTime * 2.2;
    }

    // Halberd Ready & Attack Swing
    if (rightArm) {
      const swing = Math.sin(this.time * 3.5);
      rightArm.rotation.x = 0.2 + swing * 0.35;
      rightArm.rotation.z = Math.cos(this.time * 3.5) * 0.15;
    }
  }

  /**
   * Animates Spire Golem with Chained Warhammer slams
   */
  animateGolem(golemGroup, state, deltaTime) {
    if (!golemGroup || !golemGroup.userData) return;
    const { torso, leftFist, rightArm, weapon } = golemGroup.userData;

    if (state === 'walk') {
      // Heavy thumping walk with hammer swing
      const waddle = Math.sin(this.time * 4.5) * 0.12;
      golemGroup.rotation.z = waddle;
      if (leftFist) {
        leftFist.position.y = 1.35 + Math.sin(this.time * 4.5) * 0.35;
      }
      if (rightArm) {
        rightArm.rotation.x = Math.sin(this.time * 4.5) * 0.4;
      }
    } else if (state === 'attack') {
      // Violent Overhead Warhammer Ground Slam
      if (rightArm) {
        const slamCycle = Math.sin(this.time * 9);
        rightArm.rotation.x = -Math.PI / 2 + slamCycle * 0.8;
      }
      if (leftFist) {
        leftFist.position.y = 1.6 + Math.sin(this.time * 9) * 0.4;
      }
    } else {
      // Idle heavy volcanic breathing
      golemGroup.rotation.z = 0;
      if (torso) torso.scale.setScalar(1 + Math.sin(this.time * 2.2) * 0.025);
      if (rightArm) rightArm.rotation.x = Math.sin(this.time * 2.2) * 0.08;
    }
  }

  /**
   * Animates Void Shade
   */
  animateVoidShade(shadeGroup, deltaTime) {
    if (!shadeGroup || !shadeGroup.userData) return;
    const { bladeL, bladeR } = shadeGroup.userData;

    // Floating drift
    shadeGroup.position.y = Math.sin(this.time * 3.5) * 0.12;

    if (bladeL && bladeR) {
      bladeL.rotation.z = Math.sin(this.time * 5) * 0.2;
      bladeR.rotation.z = -Math.sin(this.time * 5) * 0.2;
    }
  }

  /**
   * Animates Archon Valerius Boss
   */
  animateBoss(bossGroup, phase, deltaTime) {
    if (!bossGroup || !bossGroup.userData) return;
    const { ring1, ring2, hourglass, shield, staffGroup } = bossGroup.userData;

    // Dynamic Multi-Phase Levitation Height
    const baseY = phase === 3 ? 1.6 : (phase === 2 ? 1.0 : 0.5);
    const bobAmplitude = phase === 3 ? 0.35 : 0.2;
    const bobFreq = phase === 3 ? 3.5 : 2.0;
    bossGroup.position.y = baseY + Math.sin(this.time * bobFreq) * bobAmplitude;

    // Chronometer rings spin speed multiplies with phase intensity
    const spinMult = phase === 3 ? 8.0 : (phase === 2 ? 4.5 : 2.0);
    if (ring1) ring1.rotation.z += deltaTime * spinMult;
    if (ring2) ring2.rotation.x -= deltaTime * spinMult * 0.75;
    if (hourglass) {
      hourglass.rotation.y += deltaTime * spinMult;
      hourglass.rotation.z = Math.sin(this.time * 3) * 0.25;
    }

    // Staff casting animation
    if (staffGroup) {
      const staffSwing = Math.sin(this.time * (phase === 3 ? 6.0 : 3.0)) * 0.2;
      staffGroup.rotation.x = -0.2 + staffSwing;
      staffGroup.rotation.z = Math.cos(this.time * 2.5) * 0.15;
    }

    // Temporal Shield pulse & prismatic resonance
    if (shield && shield.visible) {
      shield.rotation.y += deltaTime * (phase === 3 ? 2.5 : 0.8);
      const pulseRate = phase === 3 ? 8.0 : 4.0;
      const pulseAmp = phase === 3 ? 0.12 : 0.05;
      const pulse = 1 + Math.sin(this.time * pulseRate) * pulseAmp;
      shield.scale.set(pulse, pulse, pulse);
    }
  }
}
