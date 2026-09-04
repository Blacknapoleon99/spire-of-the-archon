import * as THREE from 'three';
import { ModelFactory } from '../graphics/modelFactory.js';
import { CharacterAnimator } from '../graphics/characterAnimator.js';
import { disposeObjectGeometries } from '../graphics/resourceUtils.js';

export class BossEntity {
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.name = data.name || 'Archon Valerius, The Fractured Chronomancer';
    this.health = data.health || 800;
    this.maxHealth = data.maxHealth || 800;
    this.phase = data.phase || 1;
    this.invulnerable = data.invulnerable !== undefined ? data.invulnerable : true;
    this.isAlive = data.isAlive;
    this.destroyed = false;

    this.position = new THREE.Vector3(data.x || 0, data.y || 0, data.z || -15);
    this.targetPos = this.position.clone();

    // Determine Boss Type and Rigged GLB Configuration
    if (data.bossType === 'ignis' || data.id?.includes('ignis')) {
      this.bossType = 'ignis';
      this.glbUrl = '/models/boss_ignis.glb';
      this.glbScale = 1.6;
      this.mesh = ModelFactory.createIgnisColossusMesh();
    } else if (data.bossType === 'xyris' || data.id?.includes('xyris')) {
      this.bossType = 'xyris';
      this.glbUrl = '/models/boss_xyris.glb';
      this.glbScale = 1.7;
      this.mesh = ModelFactory.createXyrisVoidSovereignMesh();
    } else {
      this.bossType = 'valerius';
      this.glbUrl = '/models/boss_valerius.glb';
      this.glbScale = 1.5;
      this.mesh = ModelFactory.createBossMesh();
    }

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);

    // Rigged 3D Character with Baked Animations
    this.hasRiggedModel = false;
    this.animator = new CharacterAnimator(this.scene, this.glbUrl, {
      scale: this.glbScale,
      yOffset: 0
    });

    this.animator.init().then(() => {
      this.animator.onReady((anim) => {
        if (this.destroyed) {
          anim.dispose();
          return;
        }
        this.hasRiggedModel = true;
        this.mesh.visible = false;
        anim.setPosition(this.position.x, this.position.y, this.position.z);
        this.scene.add(anim.group);

        // Attach invulnerability shield to rigged model
        if (this.mesh.userData.shield) {
          anim.group.add(this.mesh.userData.shield);
        }
      });
    });

    this.updateHUD();
  }

  sync(data) {
    this.health = data.health;
    this.phase = data.phase || 1;
    this.invulnerable = data.invulnerable;
    this.isAlive = data.isAlive;
    this.targetPos.set(data.x, data.y || 0, data.z);

    // Update temporal / invulnerability shield visibility
    const shield = this.mesh.userData.shield;
    if (shield) {
      shield.visible = this.invulnerable;
    }

    this.updateHUD();
  }

  /**
   * Trigger boss attack animation by ability name
   */
  triggerAttack(ability) {
    if (!this.hasRiggedModel || !this.animator) return;
    const abilityMap = {
      magma_slam: 'slam',
      magma_surge: 'roar',
      stomp: 'stomp',
      void_cataclysm: 'singularity',
      void_missiles: 'void_surge',
      wing_strike: 'wing_assault',
      arcane_barrage: 'slash',
      chrono_vortex: 'wave',
      astral_nova: 'paradox'
    };
    const actionKey = abilityMap[ability] || ability;
    this.animator.triggerAttack(actionKey);
  }

  triggerDeath() {
    if (this.hasRiggedModel && this.animator) {
      this.animator.triggerDeath();
    }
  }

  updateHUD() {
    const bossHud = document.getElementById('boss-hud-bar');
    if (!bossHud) return;

    if (!this.isAlive) {
      bossHud.classList.add('hidden');
      return;
    }

    bossHud.classList.remove('hidden');

    const fill = document.getElementById('boss-health-fill');
    const phaseBadge = document.getElementById('boss-phase');
    const shieldBadge = document.getElementById('boss-shield-badge');
    const bossNameEl = document.getElementById('boss-name');

    if (bossNameEl) bossNameEl.textContent = this.name.toUpperCase();
    const ratio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    if (fill) fill.style.width = `${ratio * 100}%`;
    if (phaseBadge) phaseBadge.textContent = `PHASE ${this.phase}`;
    if (shieldBadge) {
      shieldBadge.style.display = this.invulnerable ? 'block' : 'none';
    }
  }

  update(deltaTime, animController) {
    if (!this.isAlive) {
      if (this.mesh) this.mesh.visible = false;
      if (this.animator) this.animator.group.visible = false;
      return;
    }

    this.position.lerp(this.targetPos, 8 * deltaTime);

    if (this.hasRiggedModel && this.animator) {
      this.animator.setPosition(this.position.x, this.position.y, this.position.z);

      // Turn towards movement direction or local player
      const moveDir = this.targetPos.clone().sub(this.position);
      if (moveDir.lengthSq() > 0.04) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        this.animator.group.rotation.y = targetAngle;
      }

      this.animator.update(deltaTime);
    } else {
      this.mesh.visible = true;
      this.mesh.position.copy(this.position);
      if (animController) {
        animController.animateBoss(this.mesh, this.phase, deltaTime);
      }
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.animator) {
      this.animator.dispose();
    }
    disposeObjectGeometries(this.mesh);
    this.scene.remove(this.mesh);
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) bossHud.classList.add('hidden');
  }
}
