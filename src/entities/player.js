import * as THREE from 'three';
import { ModelFactory } from '../graphics/modelFactory.js';

export class PlayerEntity {
  constructor(scene, data, isLocal = false) {
    this.scene = scene;
    this.id = data.id;
    this.name = data.name;
    this.wizardClass = data.wizardClass || 'pyromancer';
    this.isLocal = isLocal;

    this.health = data.health || 180;
    this.maxHealth = data.maxHealth || 180;
    this.mana = data.mana || 140;
    this.maxMana = data.maxMana || 140;
    this.speed = data.speed || 6.5;
    this.talentPoints = data.talentPoints || 1;
    this.talents = data.talents || { t1: false, t2: false, t3: false };
    this.isAlive = data.isAlive !== undefined ? data.isAlive : true;
    this.score = data.score || 0;
    this.gold = data.gold !== undefined ? data.gold : 100;

    // Movement & state
    const startX = data.x !== undefined && data.x !== null ? data.x : 0;
    const startZ = data.z !== undefined && data.z !== null ? data.z : 31;
    this.position = new THREE.Vector3(startX, data.y || 0, startZ);
    this.targetPos = this.position.clone();
    this.rotationY = data.rotY !== undefined ? data.rotY : 0;
    this.isMoving = false;
    this.isCasting = false;
    this.castTimer = 0;

    // Build 3D Mesh
    this.mesh = ModelFactory.createWizardMesh(this.wizardClass, data.color);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotationY;
    this.mesh.visible = !this.isLocal;
    this.scene.add(this.mesh);

    // Asynchronously upgrade to high-poly GLTF character model once preloader finishes
    let modelUrl = '/models/sorcerer.glb';
    if (this.wizardClass === 'luminary') modelUrl = '/models/druid.glb';
    else if (this.wizardClass === 'cryomancer') modelUrl = '/models/knight.glb';
    else if (this.wizardClass === 'chronomancer') modelUrl = '/models/sorcerer.glb';

    import('../graphics/assetLoader.js').then(({ assetLoader }) => {
      assetLoader.loadGLTF(modelUrl).then(gltfMesh => {
        if (!this.mesh || this.mesh.userData?.isGltf) return;
        this.scene.remove(this.mesh);
        const group = new THREE.Group();
        group.name = `RealisticWizard_${this.wizardClass}_GLTF`;
        gltfMesh.scale.set(1.0, 1.0, 1.0);
        group.add(gltfMesh);

        const staffLight = new THREE.PointLight(
          this.wizardClass === 'luminary' ? 0xffd700 : (this.wizardClass === 'cryomancer' ? 0x00e5ff : 0xff5722),
          1.8,
          6
        );
        staffLight.position.set(0.4, 1.4, 0.2);
        group.add(staffLight);
        group.userData = { isGltf: true, staffLight };

        group.position.copy(this.position);
        group.rotation.y = this.rotationY;
        group.visible = !this.isLocal;
        if (this.nameplate) group.add(this.nameplate);
        this.mesh = group;
        this.scene.add(this.mesh);
      }).catch(() => {});
    });

    // Name billboard above head
    this.nameplate = this.createNameplate();
    this.mesh.add(this.nameplate);
  }

  createNameplate() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillStyle = this.isLocal ? '#ffd700' : '#00e5ff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.fillText(this.name, 128, 42);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.y = 2.9;
    sprite.scale.set(2.0, 0.5, 1);
    return sprite;
  }

  setSpeaking(isSpeaking) {
    if (this._isSpeaking === isSpeaking) return;
    this._isSpeaking = isSpeaking;
    if (isSpeaking) {
      if (!this.speakingBadge) {
        this.speakingBadge = this.createSpeakingBadge();
        this.mesh.add(this.speakingBadge);
      }
      this.speakingBadge.visible = true;
    } else if (this.speakingBadge) {
      this.speakingBadge.visible = false;
    }
  }

  createSpeakingBadge() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#00e676';
    ctx.shadowColor = '#00e676';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎙️', 32, 34);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(0, 3.4, 0);
    sprite.scale.set(0.6, 0.6, 1);
    return sprite;
  }

  showSpeechBubble(message) {
    if (this.speechBubble) {
      this.mesh.remove(this.speechBubble);
      if (this.speechBubble.material.map) this.speechBubble.material.map.dispose();
      this.speechBubble.material.dispose();
      this.speechBubble = null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Speech bubble background pill
    ctx.fillStyle = 'rgba(15, 10, 22, 0.9)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(16, 12, 480, 84, 18);
    ctx.fill();
    ctx.stroke();

    // Tail pointing down towards head
    ctx.beginPath();
    ctx.moveTo(246, 96);
    ctx.lineTo(256, 114);
    ctx.lineTo(266, 96);
    ctx.fillStyle = 'rgba(15, 10, 22, 0.9)';
    ctx.fill();

    // Message text
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    const cleanMsg = message.length > 36 ? message.substring(0, 33) + '...' : message;
    ctx.fillText(`💬 "${cleanMsg}"`, 256, 60);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.y = 3.65;
    sprite.scale.set(3.4, 0.85, 1);

    this.speechBubble = sprite;
    this.mesh.add(sprite);

    if (this.speechBubbleTimeout) clearTimeout(this.speechBubbleTimeout);
    this.speechBubbleTimeout = setTimeout(() => {
      if (this.speechBubble) {
        this.mesh.remove(this.speechBubble);
        if (this.speechBubble.material.map) this.speechBubble.material.map.dispose();
        this.speechBubble.material.dispose();
        this.speechBubble = null;
      }
    }, 5000);
  }

  update(deltaTime, animController) {
    if (!this.isAlive) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = !this.isLocal;

    if (!this.isLocal) {
      // Smooth interpolation for remote wizards
      const dist = this.position.distanceTo(this.targetPos);
      this.isMoving = dist > 0.1;
      this.position.lerp(this.targetPos, 14 * deltaTime);
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.rotationY, Math.min(1.0, 14 * deltaTime));
    } else {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.rotationY;
    }

    if (this.castTimer > 0) {
      this.castTimer -= deltaTime;
      if (this.castTimer <= 0) this.isCasting = false;
    }

    // Run procedural animation
    if (animController) {
      animController.animateWizard(this.mesh, this.isMoving, this.isCasting, deltaTime);
    }
  }

  triggerCastAnimation() {
    this.isCasting = true;
    this.castTimer = 0.35;
  }

  resurrect(pos = null) {
    this.isAlive = true;
    this.health = this.maxHealth;
    this.mana = this.maxMana;
    if (pos) {
      this.position.copy(pos);
      this.targetPos.copy(pos);
    }
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.visible = !this.isLocal;
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}
