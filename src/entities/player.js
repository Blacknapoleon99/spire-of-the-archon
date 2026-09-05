import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { ModelFactory } from '../graphics/modelFactory.js';
import { assetLoader } from '../graphics/assetLoader.js';
import { disposeObjectGeometries, disposeSprite } from '../graphics/resourceUtils.js';

const PLAYER_MODEL_URLS = Object.freeze({
  pyromancer: ['/models/player_pyromancer.glb', '/models/sorcerer.glb'],
  cryomancer: ['/models/player_cryomancer.glb', '/models/knight.glb'],
  luminary: ['/models/player_luminary.glb', '/models/druid.glb'],
  chronomancer: ['/models/player_chronomancer.glb', '/models/elf_mage.glb']
});

const HERO_ASSET_MANIFEST = typeof fetch === 'function'
  ? fetch('/models/hero-assets.json', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : {})
      .catch(() => ({}))
  : Promise.resolve({});

export class PlayerEntity {
  constructor(scene, data, isLocal = false) {
    this.scene = scene;
    this.id = data.id;
    this.peerId = data.peerId || null;
    this.name = data.name;
    this.wizardClass = data.wizardClass || 'pyromancer';
    this.color = data.color || 0x332244;
    this.isLocal = isLocal;
    this.serverConnected = data.connected !== false;
    this.destroyed = false;

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

    // Keep the procedural wizard as an immediate fallback while the local
    // rigged character is resolved. The GLBs are preloaded during the boot
    // screen, so this normally upgrades before the first frame of the ascent.
    this.mesh = ModelFactory.createWizardMesh(this.wizardClass, data.color);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotationY;
    this.mesh.visible = !this.isLocal;
    this.scene.add(this.mesh);

    // Name billboard & overhead team health bar above head
    this.nameplate = this.createNameplate();
    this.mesh.add(this.nameplate);

    this.hasRiggedModel = false;
    this.modelRoot = null;
    this.visualVisible = !this.isLocal && this.serverConnected && this.isAlive;
    this.loadRiggedModel();
  }

  getVisualRoot() {
    return this.hasRiggedModel && this.modelRoot ? this.modelRoot : this.mesh;
  }

  /**
   * Keep the fallback mesh and the authored GLB on the same visibility state.
   *
   * Remote state updates used to toggle only `mesh.visible`. Once the authored
   * GLB finished loading it lived in `modelRoot`, so a later snapshot, death,
   * reconnect, or host migration could hide the fallback while leaving the
   * actual remote avatar permanently invisible. All network/lifecycle paths
   * now go through this one gate.
   */
  setVisualVisibility(visible) {
    this.visualVisible = Boolean(visible) && !this.isLocal && this.serverConnected && this.isAlive && !this.destroyed;
    if (this.mesh) this.mesh.visible = this.visualVisible && !this.hasRiggedModel;
    if (this.modelRoot) this.modelRoot.visible = this.visualVisible;
    return this.visualVisible;
  }

  async loadRiggedModel() {
    let urls = PLAYER_MODEL_URLS[this.wizardClass] || PLAYER_MODEL_URLS.pyromancer;
    try {
      const manifest = await HERO_ASSET_MANIFEST;
      const generatedPlayers = Array.isArray(manifest.players) ? manifest.players : [];
      const fallbackUrls = PLAYER_MODEL_URLS[this.wizardClass] || PLAYER_MODEL_URLS.pyromancer;
      urls = generatedPlayers.includes(this.wizardClass) ? fallbackUrls : fallbackUrls.slice(1);
      let source = null;
      let loadedUrl = urls[urls.length - 1];
      for (const url of urls) {
        try {
          source = await assetLoader.loadGLTF(url);
          loadedUrl = url;
          break;
        } catch {
          // Optional hero GLBs can be generated locally after the browser
          // build is deployed. Keep the shipped class fallback available.
        }
      }
      if (!source) throw new Error(`No avatar candidate loaded: ${urls.join(', ')}`);
      if (this.destroyed) return;
      const model = SkeletonUtils.clone(source);
      model.name = `PlayerRig_${this.wizardClass}`;
      model.userData.assetUrl = loadedUrl;
      model.scale.setScalar(1.0);
      // The Blender recipes author the face toward Blender -Y, which becomes
      // runtime -Z after glTF's Z-up to Y-up conversion. The older fallback
      // models use the opposite convention, so retain their historical half-
      // turn without rotating the new authored heroes onto their backs.
      const visualYawOffset = loadedUrl.includes('/models/player_') ? 0 : Math.PI;
      model.rotation.y = visualYawOffset;
      model.userData.visualYawOffset = visualYawOffset;
      // These generated humanoids are authored around their hip (roughly
      // -1..+1m Y), while world actors stand on y=0. Lift the mesh so the
      // feet sit on the floor instead of being clipped through it.
      model.position.set(this.position.x, this.position.y + 1.0, this.position.z);
      model.traverse(child => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = true;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => {
          if (!material) return;
          material.envMapIntensity = Math.max(1, Number(material.envMapIntensity) || 0);
          if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
          if (material.color) material.color.lerp(new THREE.Color(0xffffff), material.map ? 0.08 : 0.22);
          if (material.emissive) {
            material.emissive.lerp(new THREE.Color(this.color), 0.12);
            // Blender-authored glow maps are intentionally bright for the
            // isolated asset preview. Clamp them in the shared scene so bloom
            // preserves robe/skin/metal detail instead of washing the whole
            // remote wizard into one red/blue silhouette.
            material.emissiveIntensity = Math.min(2.6, Math.max(0.08, Number(material.emissiveIntensity) || 0.08));
          }
          material.needsUpdate = true;
        });
      });

      this.modelRoot = model;
      this.hasRiggedModel = true;
      this.setVisualVisibility(this.visualVisible);
      // Move UI attachments to the rigged root so they track the real
      // character instead of the hidden procedural fallback.
      this.mesh.remove(this.nameplate);
      this.nameplate.position.y = 1.95;
      model.add(this.nameplate);
      if (this.speakingBadge) {
        this.mesh.remove(this.speakingBadge);
        this.speakingBadge.position.y = 2.4;
        model.add(this.speakingBadge);
      }
      if (this.speechBubble) {
        this.mesh.remove(this.speechBubble);
        this.speechBubble.position.y = 2.65;
        model.add(this.speechBubble);
      }
      this.scene.add(model);
    } catch (error) {
      // The procedural PBR wizard remains a valid fallback when a local GLB
      // is absent or generated on a different installation.
      console.warn(`[PlayerEntity] Rigged avatar unavailable (${urls.join(', ')}); using procedural fallback.`, error?.message || error);
    }
  }

  createNameplate() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    this.nameplateCanvas = canvas;
    this.nameplateCtx = canvas.getContext('2d');
    this.nameplateTexture = new THREE.CanvasTexture(canvas);

    this.renderNameplate();

    const mat = new THREE.SpriteMaterial({ map: this.nameplateTexture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.y = 2.95;
    sprite.scale.set(2.8, 0.7, 1);
    return sprite;
  }

  renderNameplate() {
    if (!this.nameplateCtx) return;
    const ctx = this.nameplateCtx;
    const w = 512, h = 128;
    ctx.clearRect(0, 0, w, h);

    const classColors = {
      pyromancer: '#ff5722',
      cryomancer: '#00e5ff',
      luminary: '#ffd700',
      chronomancer: '#d500f9'
    };
    const classCol = classColors[this.wizardClass] || '#ffd700';
    const className = this.wizardClass.toUpperCase();

    // Dark pill background with subtle glow border
    ctx.fillStyle = 'rgba(12, 10, 18, 0.78)';
    ctx.strokeStyle = classCol;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(40, 10, 432, 108, 16);
    ctx.fill();
    ctx.stroke();

    // Class Tag & Player Name
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillStyle = classCol;
    ctx.textAlign = 'center';
    ctx.fillText(`[${className}]`, 256, 38);

    ctx.font = 'bold 30px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.name, 256, 72);

    // Overhead Team Health Bar
    const barWidth = 320;
    const barHeight = 10;
    const barX = (w - barWidth) / 2;
    const barY = 88;

    // Bar background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Current Health fill
    const pct = Math.max(0, Math.min(1, (this.health || 1) / (this.maxHealth || 1)));
    ctx.fillStyle = pct > 0.5 ? '#00e676' : (pct > 0.25 ? '#ffab00' : '#ff1744');
    ctx.fillRect(barX, barY, barWidth * pct, barHeight);

    if (this.nameplateTexture) {
      this.nameplateTexture.needsUpdate = true;
    }
  }

  syncHealth(health, maxHealth) {
    this.health = health;
    if (maxHealth) this.maxHealth = maxHealth;
    this.renderNameplate();
  }

  setSpeaking(isSpeaking) {
    if (this._isSpeaking === isSpeaking) return;
    this._isSpeaking = isSpeaking;
    if (isSpeaking) {
      if (!this.speakingBadge) {
        this.speakingBadge = this.createSpeakingBadge();
        this.getVisualRoot().add(this.speakingBadge);
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
      this.speechBubble.parent?.remove(this.speechBubble);
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
    this.getVisualRoot().add(sprite);

    if (this.speechBubbleTimeout) clearTimeout(this.speechBubbleTimeout);
    this.speechBubbleTimeout = setTimeout(() => {
      if (this.speechBubble) {
        this.speechBubble.parent?.remove(this.speechBubble);
        if (this.speechBubble.material.map) this.speechBubble.material.map.dispose();
        this.speechBubble.material.dispose();
        this.speechBubble = null;
      }
    }, 5000);
  }

  update(deltaTime, animController) {
    if (!this.isAlive) {
      this.setVisualVisibility(false);
      return;
    }

    if (!this.isLocal) {
      // Smooth interpolation for remote wizards
      const dist = this.position.distanceTo(this.targetPos);
      this.isMoving = dist > 0.1;
      this.position.lerp(this.targetPos, 14 * deltaTime);
      if (!this.hasRiggedModel) {
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.rotationY, Math.min(1.0, 14 * deltaTime));
      }
    } else {
      if (!this.hasRiggedModel) {
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotationY;
      }
    }

    if (this.hasRiggedModel && this.modelRoot) {
      this.setVisualVisibility(this.visualVisible);
      this.modelRoot.position.set(this.position.x, this.position.y + 1.0, this.position.z);
      const yawOffset = Number(this.modelRoot.userData.visualYawOffset) || 0;
      const currentYaw = this.modelRoot.rotation.y - yawOffset;
      this.modelRoot.rotation.y = yawOffset + THREE.MathUtils.lerp(currentYaw, this.rotationY, Math.min(1.0, 14 * deltaTime));
      // Small procedural breathing keeps static generated GLBs alive without
      // invoking incompatible embedded animation tracks on older exports.
      const bob = Math.sin(performance.now() * 0.003 + this.id.length) * (this.isMoving ? 0.035 : 0.018);
      this.modelRoot.position.y += bob;
      if (this.isCasting) this.modelRoot.rotation.x = THREE.MathUtils.lerp(this.modelRoot.rotation.x, -0.08, Math.min(1, deltaTime * 14));
      else this.modelRoot.rotation.x = THREE.MathUtils.lerp(this.modelRoot.rotation.x, 0, Math.min(1, deltaTime * 8));
    } else this.setVisualVisibility(this.visualVisible);

    if (this.castTimer > 0) {
      this.castTimer -= deltaTime;
      if (this.castTimer <= 0) this.isCasting = false;
    }

    // Run procedural animation
    if (animController && !this.hasRiggedModel) {
      animController.animateWizard(this.mesh, this.isMoving, this.isCasting, deltaTime);
    }
  }

  triggerCastAnimation() {
    this.isCasting = true;
    this.castTimer = 0.35;
  }

  resurrect(pos = null) {
    this.isAlive = true;
    this.serverConnected = true;
    this.health = this.maxHealth;
    this.mana = this.maxMana;
    if (pos) {
      this.position.copy(pos);
      this.targetPos.copy(pos);
    }
    if (this.mesh) {
      this.mesh.position.copy(this.position);
    }
    if (this.modelRoot) {
      this.modelRoot.position.set(this.position.x, this.position.y + 1.0, this.position.z);
    }
    this.setVisualVisibility(true);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.speechBubbleTimeout) clearTimeout(this.speechBubbleTimeout);
    if (this.modelRoot) this.scene.remove(this.modelRoot);
    disposeSprite(this.nameplate);
    disposeSprite(this.speakingBadge);
    disposeSprite(this.speechBubble);
    disposeObjectGeometries(this.mesh);
    this.scene.remove(this.mesh);
  }
}
