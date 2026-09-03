import * as THREE from 'three';
import { ModelFactory } from '../graphics/modelFactory.js';
import { createDissolveMaterial } from '../graphics/shaders/dissolveMaterial.js';

export class EnemyEntity {
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.type = data.type;
    this.name = data.name || 'Spire Minion';
    this.health = data.health;
    this.maxHealth = data.maxHealth || data.health;
    this.isAlive = data.isAlive;
    this.state = data.state || 'idle';

    this.position = new THREE.Vector3(data.x, data.y || 0, data.z);
    this.targetPos = this.position.clone();

    // Create 3D Mesh
    if (this.type === 'sentry') {
      this.mesh = ModelFactory.createSentinelMesh();
    } else if (this.type === 'golem') {
      this.mesh = ModelFactory.createGolemMesh();
    } else if (this.type === 'shade') {
      this.mesh = ModelFactory.createVoidShadeMesh();
    } else if (this.type === 'boss') {
      if (data.bossType === 'ignis' || data.id?.includes('ignis')) {
        this.mesh = ModelFactory.createIgnisColossusMesh();
      } else if (data.bossType === 'xyris' || data.id?.includes('xyris')) {
        this.mesh = ModelFactory.createXyrisVoidSovereignMesh();
      } else {
        this.mesh = ModelFactory.createBossMesh();
      }
    } else {
      this.mesh = ModelFactory.createSentinelMesh();
    }

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);

    // Floating HP Bar Canvas
    this.hpSprite = this.createHpBarSprite();
    this.mesh.add(this.hpSprite);
    this.updateHpBar();
  }

  createHpBarSprite() {
    this.hpCanvas = document.createElement('canvas');
    this.hpCanvas.width = 128;
    this.hpCanvas.height = 32;
    this.hpCtx = this.hpCanvas.getContext('2d');

    this.hpTexture = new THREE.CanvasTexture(this.hpCanvas);
    const spriteMat = new THREE.SpriteMaterial({ map: this.hpTexture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.y = this.type === 'golem' ? 3.4 : 2.5;
    sprite.scale.set(2.0, 0.5, 1);
    return sprite;
  }

  updateHpBar() {
    if (!this.hpCtx) return;
    this.hpCtx.clearRect(0, 0, 128, 32);

    // Background track
    this.hpCtx.fillStyle = 'rgba(0,0,0,0.7)';
    this.hpCtx.fillRect(4, 8, 120, 16);

    // Health Fill
    const ratio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    this.hpCtx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
    this.hpCtx.fillRect(6, 10, 116 * ratio, 12);

    // Border
    this.hpCtx.strokeStyle = '#ffffff';
    this.hpCtx.lineWidth = 1.5;
    this.hpCtx.strokeRect(4, 8, 120, 16);

    this.hpTexture.needsUpdate = true;
  }

  sync(data) {
    this.health = data.health;
    this.targetPos.set(data.x, data.y || 0, data.z);
    this.state = data.state;
    this.isAlive = data.isAlive;
    this.updateHpBar();
  }

  update(deltaTime, animController) {
    if (!this.isAlive) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    this.position.lerp(this.targetPos, 12 * deltaTime);
    this.mesh.position.copy(this.position);

    // Face movement direction if moving (zero-allocation)
    const dx = this.targetPos.x - this.position.x;
    const dz = this.targetPos.z - this.position.z;
    if (dx * dx + dz * dz > 0.01) {
      const targetAngle = Math.atan2(dx, dz);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, Math.min(1.0, 12 * deltaTime));
    }

    if (animController) {
      if (this.type === 'sentry') {
        animController.animateSentinel(this.mesh, deltaTime);
      } else if (this.type === 'golem') {
        animController.animateGolem(this.mesh, this.state, deltaTime);
      } else if (this.type === 'shade') {
        animController.animateVoidShade(this.mesh, deltaTime);
      }
    }
  }

  destroyWithDissolve() {
    if (!this.mesh) return;

    if (this.hpSprite) {
      this.mesh.remove(this.hpSprite);
    }

    const edgeColor = this.type === 'golem' ? 0xff5722 : (this.type === 'shade' ? 0xbf5af2 : 0x00e5ff);
    const dissolveMat = createDissolveMaterial({
      edgeColor: edgeColor,
      baseColor: 0x1a1a24
    });

    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = dissolveMat;
      }
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.06;
      dissolveMat.uniforms.uProgress.value = progress;
      if (this.mesh) {
        this.mesh.position.y += 0.015;
      }
      if (progress >= 1.0) {
        clearInterval(interval);
        this.scene.remove(this.mesh);
      }
    }, 35);
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}
