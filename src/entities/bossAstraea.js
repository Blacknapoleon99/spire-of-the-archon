import * as THREE from 'three';
import { CharacterAnimator } from '../graphics/characterAnimator.js';
import { ModelFactory } from '../graphics/modelFactory.js';

/**
 * BossAstraeaEntity
 * "Astraea, the Demon-Angel Sovereign"
 * Rigged with dual wings (feathered angel wing + bat demon wing) and burning fire halo.
 * Driven by Kimodo.cpp locomotion and embedded spellcasting animations.
 */
export class BossAstraeaEntity {
  constructor(scene, data = {}) {
    this.scene = scene;
    this.id = data.id || 'boss_astraea';
    this.name = 'Astraea, Demon-Angel Sovereign';
    this.bossType = 'astraea';

    this.health = data.health || 42000;
    this.maxHealth = data.maxHealth || 42000;
    this.phase = data.phase || 1;
    this.isAlive = true;
    this.isStaggered = false;
    this.staggerTimer = 0;

    // Prismatic Shield: 75% base damage reduction, stripped by 25% per aligned puzzle beam
    this.shieldReduction = 0.75;
    this.invulnerable = false;
    this.alignedBeams = 0;

    this.position = new THREE.Vector3(data.x || 0, data.y || 0, data.z || 0);
    this.targetPos = this.position.clone();
    this.baseY = 0;
    this.hoverHeight = 1.2;

    // Fallback Procedural Mesh
    this.fallbackMesh = ModelFactory.createXyrisVoidSovereignMesh();
    this.fallbackMesh.position.copy(this.position);
    this.scene.add(this.fallbackMesh);

    // Rigged 3D Character Model
    this.glbUrl = '/models/boss_astraea.glb';
    this.glbScale = 1.35;
    this.hasRiggedModel = false;

    this.animator = new CharacterAnimator(this.scene, this.glbUrl, {
      scale: this.glbScale,
      yOffset: this.hoverHeight,
      shadow: true
    });

    this.animator.init().then(() => {
      this.animator.onReady((anim) => {
        this.hasRiggedModel = true;
        this.fallbackMesh.visible = false;
        anim.setPosition(this.position.x, this.position.y + this.hoverHeight, this.position.z);
        this.scene.add(anim.group);

        // Try playing Kimodo idle or embedded catwalk/spellcast
        anim.play('DemonAngelIdle_60f_60', 0.2);
      });
    });

    // Dual Wing Trail Particle Emitter
    this.initWingParticles();

    this.updateHUD();
  }

  initWingParticles() {
    this.particleCount = 36;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const isHoly = i % 2 === 0;
      positions[i * 3] = (Math.random() - 0.5) * 4.0;
      positions[i * 3 + 1] = Math.random() * 2.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.0;

      if (isHoly) {
        // Celestial Holy Light (Golden White)
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.7;
      } else {
        // Abyssal Brimstone (Dark Crimson Flame)
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.2;
        colors[i * 3 + 2] = 0.05;
      }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.wingParticles = new THREE.Points(geom, mat);
    this.scene.add(this.wingParticles);
  }

  updateWingParticles(deltaTime) {
    if (!this.wingParticles || !this.isAlive) return;

    const positions = this.wingParticles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleCount; i++) {
      const isHoly = i % 2 === 0;
      const wingOffsetX = isHoly ? -1.8 : 1.8;

      positions[i * 3 + 1] -= deltaTime * 1.2;
      if (positions[i * 3 + 1] < 0.1) {
        positions[i * 3] = this.position.x + wingOffsetX + (Math.random() - 0.5) * 0.8;
        positions[i * 3 + 1] = this.position.y + 1.8 + Math.random() * 0.8;
        positions[i * 3 + 2] = this.position.z + (Math.random() - 0.5) * 0.8;
      }
    }
    this.wingParticles.geometry.attributes.position.needsUpdate = true;
  }

  sync(data) {
    this.health = data.health;
    this.phase = data.phase || 1;
    this.isAlive = data.isAlive;
    this.targetPos.set(data.x, data.y || 0, data.z);

    if (data.alignedBeams !== undefined) {
      this.alignedBeams = data.alignedBeams;
      this.shieldReduction = Math.max(0, 0.75 - this.alignedBeams * 0.25);
    }

    this.updateHUD();
  }

  setAlignedBeams(count) {
    this.alignedBeams = count;
    this.shieldReduction = Math.max(0, 0.75 - count * 0.25);
    this.updateHUD();
  }

  triggerStagger(duration = 6.0) {
    this.isStaggered = true;
    this.staggerTimer = duration;
    if (this.hasRiggedModel && this.animator) {
      this.animator.play('QUEEN_SpellCast', 0.2, false);
    }
  }

  triggerAttack(ability) {
    if (!this.hasRiggedModel || !this.animator) return;

    if (ability === 'seraph_caldera' || ability === 'queen_cast') {
      this.animator.playOnce('QUEEN_SpellCast', 'DemonAngelIdle_60f_60', 0.2);
    } else if (ability === 'wing_dash' || ability === 'dash') {
      this.animator.playOnce('sellsword_run_90f_90', 'DemonAngelIdle_60f_60', 0.15);
    } else if (ability === 'dance_buff') {
      this.animator.playOnce('QUEEN_Dance', 'DemonAngelIdle_60f_60', 0.25);
    } else {
      this.animator.playOnce('QUEEN_SpellCast', 'DemonAngelIdle_60f_60', 0.2);
    }
  }

  triggerDeath() {
    this.isAlive = false;
    if (this.hasRiggedModel && this.animator) {
      this.animator.play('QUEEN_Catwalk_End', 0.3, false);
    }
    if (this.wingParticles) {
      this.wingParticles.visible = false;
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
    const bossNameEl = document.getElementById('boss-name-label');

    if (bossNameEl) bossNameEl.textContent = this.name.toUpperCase();
    const ratio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    if (fill) fill.style.width = `${ratio * 100}%`;

    if (phaseBadge) {
      phaseBadge.textContent = this.isStaggered ? 'STAGGERED (+150% DMG)' : `PHASE ${this.phase}`;
      phaseBadge.style.background = this.isStaggered ? '#ff3b30' : (this.phase === 3 ? '#ff2200' : '#bf5af2');
    }

    if (shieldBadge) {
      if (this.shieldReduction > 0) {
        shieldBadge.style.display = 'block';
        shieldBadge.textContent = `PRISMATIC WARD (${Math.round(this.shieldReduction * 100)}% REDUCTION)`;
      } else {
        shieldBadge.style.display = 'none';
      }
    }
  }

  update(deltaTime) {
    if (!this.isAlive) {
      if (this.fallbackMesh) this.fallbackMesh.visible = false;
      if (this.animator) this.animator.group.visible = false;
      return;
    }

    if (this.isStaggered) {
      this.staggerTimer -= deltaTime;
      if (this.staggerTimer <= 0) {
        this.isStaggered = false;
        this.updateHUD();
      }
    }

    // Phase locomotion dynamics
    const currentHover = (this.phase >= 2) ? 2.5 : this.hoverHeight;
    const hoverBob = Math.sin(performance.now() * 0.003) * 0.25;

    this.position.lerp(this.targetPos, 8 * deltaTime);

    if (this.hasRiggedModel && this.animator) {
      this.animator.setPosition(this.position.x, this.position.y + currentHover + hoverBob, this.position.z);

      const moveDir = this.targetPos.clone().sub(this.position);
      if (moveDir.lengthSq() > 0.04) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        this.animator.group.rotation.y = THREE.MathUtils.lerp(this.animator.group.rotation.y, targetAngle, 8 * deltaTime);
        if (!this.isStaggered) {
          this.animator.play('AngelWalk90_90f_90', 0.25);
        }
      } else {
        if (!this.isStaggered) {
          this.animator.play('DemonAngelIdle_60f_60', 0.3);
        }
      }

      this.animator.update(deltaTime);
    } else {
      this.fallbackMesh.visible = true;
      this.fallbackMesh.position.set(this.position.x, this.position.y + currentHover + hoverBob, this.position.z);
      this.fallbackMesh.rotation.y += deltaTime * 0.8;
    }

    this.updateWingParticles(deltaTime);
  }

  destroy() {
    if (this.animator) {
      this.animator.dispose();
    }
    if (this.fallbackMesh) {
      this.scene.remove(this.fallbackMesh);
    }
    if (this.wingParticles) {
      this.scene.remove(this.wingParticles);
      this.wingParticles.geometry?.dispose();
      this.wingParticles.material?.dispose();
    }
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) bossHud.classList.add('hidden');
  }
}
