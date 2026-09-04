import * as THREE from 'three';
import { ModelFactory } from '../graphics/modelFactory.js';
import { createDissolveMaterial } from '../graphics/shaders/dissolveMaterial.js';
import { CharacterAnimator } from '../graphics/characterAnimator.js';

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

    // Procedural Fallback Mesh & Rigged 3D GLB Configuration
    if (this.type === 'sentry') {
      this.mesh = ModelFactory.createSentinelMesh();
      this.glbUrl = '/models/enemy_sentinel.glb';
      this.glbScale = 1.1;
    } else if (this.type === 'golem') {
      this.mesh = ModelFactory.createGolemMesh();
      this.glbUrl = '/models/enemy_golem.glb';
      this.glbScale = 1.35;
    } else if (this.type === 'shade') {
      this.mesh = ModelFactory.createVoidShadeMesh();
      this.glbUrl = '/models/enemy_knight.glb';
      this.glbScale = 1.15;
    } else if (this.type === 'boss') {
      if (data.bossType === 'ignis' || data.id?.includes('ignis')) {
        this.mesh = ModelFactory.createIgnisColossusMesh();
        this.glbUrl = '/models/boss_ignis.glb';
        this.glbScale = 1.6;
      } else if (data.bossType === 'xyris' || data.id?.includes('xyris')) {
        this.mesh = ModelFactory.createXyrisVoidSovereignMesh();
        this.glbUrl = '/models/boss_xyris.glb';
        this.glbScale = 1.7;
      } else {
        this.mesh = ModelFactory.createBossMesh();
        this.glbUrl = '/models/boss_valerius.glb';
        this.glbScale = 1.5;
      }
    } else if (this.type === 'direwolf' || this.type === 'wolf') {
      this.mesh = ModelFactory.createSentinelMesh();
      this.glbUrl = '/models/enemy_direwolf.glb';
      this.glbScale = 0.012;
    } else {
      this.mesh = ModelFactory.createSentinelMesh();
      this.glbUrl = '/models/enemy_sentinel.glb';
      this.glbScale = 1.1;
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
        this.hasRiggedModel = true;
        this.mesh.visible = false;
        anim.setPosition(this.position.x, this.position.y, this.position.z);
        this.scene.add(anim.group);
        if (this.hpSprite) anim.group.add(this.hpSprite);
      });
    });

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
      if (this.mesh) this.mesh.visible = false;
      if (this.animator && this.animator.group) this.animator.group.visible = false;
      return;
    }

    this.position.lerp(this.targetPos, 12 * deltaTime);

    // Face movement direction if moving (zero-allocation)
    const dx = this.targetPos.x - this.position.x;
    const dz = this.targetPos.z - this.position.z;
    const isMoving = (dx * dx + dz * dz) > 0.01;

    if (this.hasRiggedModel && this.animator) {
      this.mesh.visible = false;
      this.animator.group.visible = true;
      this.animator.setPosition(this.position.x, this.position.y, this.position.z);

      if (isMoving) {
        const targetAngle = Math.atan2(dx, dz);
        this.animator.group.rotation.y = THREE.MathUtils.lerp(this.animator.group.rotation.y, targetAngle, Math.min(1.0, 12 * deltaTime));
        if (this.state === 'attack') {
          this.animator.playAttack('Attack', 0.2);
        } else {
          this.animator.playWalk(0.25);
        }
      } else {
        if (this.state === 'attack') {
          this.animator.playAttack('Attack', 0.2);
        } else {
          this.animator.playIdle(0.3);
        }
      }

      this.animator.update(deltaTime);
    } else {
      this.mesh.visible = true;
      this.mesh.position.copy(this.position);

      if (isMoving) {
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
  }

  destroyWithDissolve() {
    if (this.hpSprite) {
      if (this.mesh) this.mesh.remove(this.hpSprite);
      if (this.animator?.group) this.animator.group.remove(this.hpSprite);
    }

    if (this.hasRiggedModel && this.animator) {
      this.animator.play('Death', 0.2, false, () => {
        if (this.animator) this.animator.dispose();
      });
      setTimeout(() => {
        if (this.animator) this.animator.dispose();
      }, 1500);
      if (this.mesh) this.scene.remove(this.mesh);
      return;
    }

    if (!this.mesh) return;

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
    if (this.animator) {
      this.animator.dispose();
    }
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }
  }
}
