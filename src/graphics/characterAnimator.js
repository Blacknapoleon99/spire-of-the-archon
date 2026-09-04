import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { assetLoader } from './assetLoader.js';

/**
 * CharacterAnimator
 * Wraps Three.js AnimationMixer to manage rigged GLB character animations.
 * Supports smooth crossfading between named NLA animation strips.
 * 
 * Usage:
 *   const anim = new CharacterAnimator(scene, '/models/boss_ignis.glb');
 *   await anim.init();
 *   scene.add(anim.group);
 *   anim.play('Idle');
 *   // In update loop:
 *   anim.update(deltaTime);
 */
export class CharacterAnimator {
  constructor(scene, glbUrl, options = {}) {
    this.scene = scene;
    this.glbUrl = glbUrl;
    this.options = {
      scale: options.scale || 1.0,
      yOffset: options.yOffset || 0,
      shadow: options.shadow !== false,
    };

    this.group = new THREE.Group();
    this.mixer = null;
    this.actions = {};
    this.currentAction = null;
    this.loaded = false;
    this._readyCallbacks = [];
  }

  async init() {
    try {
      const gltf = await assetLoader.loadGLTFRaw(this.glbUrl);
      const model = SkeletonUtils.clone(gltf.scene);

      // Setup model
      model.scale.setScalar(this.options.scale);
      model.position.y = this.options.yOffset;

      model.traverse((child) => {
        if (child.isMesh) {
          if (this.options.shadow) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          // Ensure PBR materials render correctly
          if (child.material) {
            child.material.needsUpdate = true;
            // Enable emissive on emission-mapped materials
            if (child.material.emissive) {
              child.material.emissiveIntensity = child.material.emissiveIntensity || 1.0;
            }
          }
        }
      });

      this.group.add(model);
      this.modelRoot = model;

      // Setup AnimationMixer
      this.mixer = new THREE.AnimationMixer(model);

      // Register all animation clips
      if (gltf.animations && gltf.animations.length > 0) {
        gltf.animations.forEach((clip) => {
          const action = this.mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          this.actions[clip.name] = action;
        });
      } else {
        console.warn(`[CharacterAnimator] No animations found in ${this.glbUrl}`);
      }

      this.loaded = true;
      this._readyCallbacks.forEach(cb => cb(this));

      // Auto-play Idle if it exists
      if (this.actions['Idle']) {
        this.play('Idle', 0);
      }

    } catch (err) {
      console.warn(`[CharacterAnimator] Failed to load ${this.glbUrl}:`, err);
    }
  }

  onReady(callback) {
    if (this.loaded) callback(this);
    else this._readyCallbacks.push(callback);
  }

  /**
   * Play a named animation with optional crossfade duration.
   * @param {string} name - Animation clip name (e.g. 'Idle', 'Stomp_Attack')
   * @param {number} fadeIn - Crossfade duration in seconds (default 0.3)
   * @param {boolean} loop - Whether to loop (default true)
   * @param {Function} onFinish - Optional callback when non-looping animation finishes
   */
  play(name, fadeIn = 0.3, loop = true, onFinish = null) {
    if (!this.loaded || !this.mixer) return;
    const action = this.actions[name];
    if (!action) {
      console.warn(`[CharacterAnimator] Animation "${name}" not found. Available:`, Object.keys(this.actions));
      return;
    }

    if (this.currentAction === action) return;

    // Crossfade from current
    if (this.currentAction) {
      this.currentAction.fadeOut(fadeIn);
    }

    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.fadeIn(fadeIn);
    action.play();
    this.currentAction = action;

    // Fire callback when done (for once-off animations)
    if (onFinish && !loop) {
      const listener = (e) => {
        if (e.action === action) {
          this.mixer.removeEventListener('finished', listener);
          onFinish();
        }
      };
      this.mixer.addEventListener('finished', listener);
    }
  }

  /**
   * Play a one-shot animation then return to previous.
   * @param {string} name - Animation to play once
   * @param {string} returnTo - Animation to return to after (default 'Idle')
   * @param {number} fadeIn - Fade in duration
   */
  playOnce(name, returnTo = 'Idle', fadeIn = 0.2) {
    this.play(name, fadeIn, false, () => {
      this.play(returnTo, 0.3, true);
    });
  }

  /**
   * Trigger boss attack animation by spell type.
   * @param {string} spellType - 'stomp'|'slam'|'roar'|'void_surge'|'wing_assault'|'singularity'|'slash'|'wave'|'paradox'
   */
  triggerAttack(spellType) {
    const attackMap = {
      // Ignis
      stomp: 'Stomp_Attack',
      slam: 'Magma_Slam',
      roar: 'Molten_Roar',
      // Xyris
      void_surge: 'Void_Surge',
      wing_assault: 'Wing_Assault',
      singularity: 'Singularity_Collapse',
      // Valerius
      slash: 'Time_Slash',
      wave: 'Chrono_Wave',
      paradox: 'Paradox_Burst',
      // NPC
      talk: 'Talk',
      gesture: 'Gesture',
    };
    const animName = attackMap[spellType];
    if (animName) {
      this.playOnce(animName, 'Idle', 0.2);
    }
  }

  triggerDeath() {
    this.play('Death', 0.3, false, () => {
      // After death, hide the character
      this.group.visible = false;
    });
  }

  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  lookAt(x, y, z) {
    this.group.lookAt(x, y, z);
  }

  dispose() {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
    this.scene.remove(this.group);
  }
}

/**
 * CharacterAnimatorPool
 * Manages all CharacterAnimators in the scene — updates them each frame.
 */
export class CharacterAnimatorPool {
  constructor() {
    this.animators = [];
  }

  add(animator) {
    this.animators.push(animator);
    return animator;
  }

  remove(animator) {
    const idx = this.animators.indexOf(animator);
    if (idx !== -1) {
      animator.dispose();
      this.animators.splice(idx, 1);
    }
  }

  update(deltaTime) {
    for (const anim of this.animators) {
      anim.update(deltaTime);
    }
  }

  clear() {
    for (const anim of this.animators) {
      anim.dispose();
    }
    this.animators = [];
  }
}

export const characterAnimatorPool = new CharacterAnimatorPool();
