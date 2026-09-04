import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { assetLoader } from './assetLoader.js';
import { animationPackManager } from './animationPack.js';

/**
 * CharacterAnimator
 * Wraps Three.js AnimationMixer to manage rigged GLB character animations.
 * Supports smooth crossfading between named NLA animation strips and
 * text-to-animation natural language prompts via basis sample animation packs.
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
          if (child.material) {
            child.material.needsUpdate = true;
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

      // Register all embedded animation clips
      if (gltf.animations && gltf.animations.length > 0) {
        gltf.animations.forEach((clip) => {
          const action = this.mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          this.actions[clip.name] = action;
        });
      }

      this.loaded = true;
      this._readyCallbacks.forEach(cb => cb(this));

      // Auto-play Idle if available
      if (this.actions['Idle'] || this.actions['Idle_A'] || this.actions['Walk']) {
        const defaultAnim = this.actions['Idle'] ? 'Idle' : (this.actions['Idle_A'] ? 'Idle_A' : 'Walk');
        this.play(defaultAnim, 0);
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
   * Can resolve from embedded animations or basis sample animation packs.
   */
  play(name, fadeIn = 0.3, loop = true, onFinish = null) {
    if (!this.loaded || !this.mixer) return;

    let action = this.actions[name];
    if (!action) {
      // Check animation pack for matching clip
      const externalClip = animationPackManager.getClip(name);
      if (externalClip) {
        action = this.mixer.clipAction(externalClip);
        this.actions[name] = action;
      }
    }

    if (!action) {
      // Fallback check case-insensitively
      const lower = name.toLowerCase();
      for (const k of Object.keys(this.actions)) {
        if (k.toLowerCase() === lower) {
          action = this.actions[k];
          break;
        }
      }
    }

    if (!action) {
      // Fallback check substring match in existing actions (e.g. 'walk' in 'preset:quadruped:walk')
      const lower = name.toLowerCase();
      for (const k of Object.keys(this.actions)) {
        if (k.toLowerCase().includes(lower)) {
          action = this.actions[k];
          break;
        }
      }
    }

    if (!action) {
      // Try natural language prompt resolution from animation pack
      const resolvedClip = animationPackManager.resolvePromptToClip(name);
      if (resolvedClip) {
        let act = this.actions[resolvedClip.name];
        if (!act) {
          act = this.mixer.clipAction(resolvedClip);
          this.actions[resolvedClip.name] = act;
        }
        action = act;
      }
    }

    if (!action && (name === 'Idle' || name === 'Walk')) {
      // Fallback to any available action so entity is never statically frozen
      const availableKeys = Object.keys(this.actions);
      if (availableKeys.length > 0) {
        action = this.actions[availableKeys[0]];
      }
    }

    if (!action) {
      console.warn(`[CharacterAnimator] Animation "${name}" not found. Available:`, Object.keys(this.actions));
      return;
    }

    if (this.currentAction === action) return;

    if (this.currentAction) {
      this.currentAction.fadeOut(fadeIn);
    }

    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.fadeIn(fadeIn);
    action.play();
    this.currentAction = action;

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
   * Play an animation based on a natural language text prompt!
   * Example: animator.playPrompt("cast huge fireball") or animator.playPrompt("spin attack")
   */
  playPrompt(promptText, fadeIn = 0.25, loop = true, onFinish = null) {
    if (!promptText || !this.mixer) return;
    const clip = animationPackManager.resolvePromptToClip(promptText);
    if (clip) {
      let action = this.actions[clip.name];
      if (!action) {
        action = this.mixer.clipAction(clip);
        this.actions[clip.name] = action;
      }
      this.play(clip.name, fadeIn, loop, onFinish);
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

  setRotation(angle) {
    this.group.rotation.y = angle;
  }

  setRotationY(angle) {
    this.group.rotation.y = angle;
  }

  lookAt(x, y, z) {
    this.group.lookAt(x, y, z);
  }

  playIdle(fadeIn = 0.3) {
    this.play('Idle', fadeIn, true);
  }

  playWalk(fadeIn = 0.25) {
    this.play('Walk', fadeIn, true);
  }

  playAttack(attackName = 'Attack', fadeIn = 0.2) {
    this.playOnce(attackName, 'Idle', fadeIn);
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
