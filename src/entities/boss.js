import * as THREE from 'three';
import { ModelFactory } from '../graphics/modelFactory.js';

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

    this.position = new THREE.Vector3(data.x || 0, data.y || 0, data.z || -15);
    this.targetPos = this.position.clone();

    // Create 3D Mesh
    this.mesh = ModelFactory.createBossMesh();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);

    this.updateHUD();
  }

  sync(data) {
    this.health = data.health;
    this.phase = data.phase || 1;
    this.invulnerable = data.invulnerable;
    this.isAlive = data.isAlive;
    this.targetPos.set(data.x, data.y || 0, data.z);

    // Update temporal shield visibility
    const shield = this.mesh.userData.shield;
    if (shield) {
      shield.visible = this.invulnerable;
    }

    this.updateHUD();
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

    const ratio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    if (fill) fill.style.width = `${ratio * 100}%`;
    if (phaseBadge) phaseBadge.textContent = `PHASE ${this.phase}`;
    if (shieldBadge) {
      shieldBadge.style.display = this.invulnerable ? 'block' : 'none';
    }
  }

  update(deltaTime, animController) {
    if (!this.isAlive) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    this.position.lerp(this.targetPos, 8 * deltaTime);
    this.mesh.position.copy(this.position);

    if (animController) {
      animController.animateBoss(this.mesh, this.phase, deltaTime);
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) bossHud.classList.add('hidden');
  }
}
