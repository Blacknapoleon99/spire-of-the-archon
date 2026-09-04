import * as THREE from 'three';
import { assetLoader } from './assetLoader.js';

/**
 * AnimationPackManager
 * Loads and registers professional rigged animation clips from basis sample packs
 * (KayKit Free Animation Library) and provides a Natural Language Text-to-Animation
 * prompt resolver.
 */
export class AnimationPackManager {
  constructor() {
    this.clips = new Map();
    this.isLoaded = false;
    this._loadPromise = null;

    // Natural language keyword intent mappings for text-to-animation prompt resolution
    this.intentKeywords = [
      {
        promptKeywords: ['cast', 'spell', 'shoot magic', 'magic', 'fireball', 'arcane', 'shoot'],
        clipNames: ['Ranged_Magic_Spellcasting', 'Ranged_Magic_Shoot', 'Ranged_1H_Shoot', 'Attack']
      },
      {
        promptKeywords: ['summon', 'raise', 'conjure', 'channel'],
        clipNames: ['Ranged_Magic_Summon', 'Ranged_Magic_Raise', 'Ranged_Magic_Spellcasting_Long']
      },
      {
        promptKeywords: ['slam', 'smash', 'ground slam', 'hammer', 'crush', 'heavy attack'],
        clipNames: ['Melee_2H_Slam', 'Melee_Unarmed_Smash', 'Melee_2H_Attack_Chop', 'Attack']
      },
      {
        promptKeywords: ['spin', 'whirlwind', 'cyclone', 'spin attack', '360'],
        clipNames: ['Melee_2H_Attack_Spin', 'Melee_2H_Attack_Spinning']
      },
      {
        promptKeywords: ['slash', 'chop', 'swing', 'strike', 'sword', 'melee', 'attack'],
        clipNames: ['Melee_1H_Attack_Chop', 'Melee_1H_Attack_Slice_Horizontal', 'Melee_1H_Attack_Slice_Diagonal', 'Attack']
      },
      {
        promptKeywords: ['punch', 'fist', 'brawl'],
        clipNames: ['Melee_Unarmed_Attack_Punch_A', 'Melee_Unarmed_Punch']
      },
      {
        promptKeywords: ['kick', 'sweep'],
        clipNames: ['Melee_Unarmed_Attack_Kick', 'Melee_Unarmed_Kick']
      },
      {
        promptKeywords: ['block', 'parry', 'shield', 'defend'],
        clipNames: ['Melee_Block', 'Melee_Blocking', 'Melee_Block_Attack']
      },
      {
        promptKeywords: ['walk', 'march', 'move', 'forward', 'step'],
        clipNames: ['Walking_A', 'Walking_B', 'Walking_C', 'Walk']
      },
      {
        promptKeywords: ['run', 'sprint', 'dash', 'chase', 'charge'],
        clipNames: ['Running_A', 'Running_B', 'Walk']
      },
      {
        promptKeywords: ['jump', 'leap', 'hop'],
        clipNames: ['Jump_Full_Short', 'Jump_Start', 'Jump_Full_Long']
      },
      {
        promptKeywords: ['idle', 'breathe', 'wait', 'stand', 'rest'],
        clipNames: ['Idle_A', 'Idle_B', 'Melee_2H_Idle', 'Idle']
      },
      {
        promptKeywords: ['die', 'death', 'defeat', 'collapse', 'fall', 'knockout'],
        clipNames: ['Death_A', 'Death_B', 'Death']
      },
      {
        promptKeywords: ['hit', 'hurt', 'damage', 'recoil', 'flinch'],
        clipNames: ['Hit_A', 'Hit_B']
      },
      {
        promptKeywords: ['taunt', 'cheer', 'roar', 'shout', 'celebrate'],
        clipNames: ['Skeletons_Taunt', 'Skeletons_Taunt_Longer', 'Interact']
      },
      {
        promptKeywords: ['interact', 'talk', 'speak', 'wave', 'greet'],
        clipNames: ['Interact', 'PickUp', 'Use_Item']
      },
      {
        promptKeywords: ['awaken', 'rise', 'resurrect', 'spawn'],
        clipNames: ['Skeletons_Awaken_Floor', 'Skeletons_Awaken_Standing', 'Spawn_Ground']
      },
      {
        promptKeywords: ['demon angel idle', 'angel idle', 'winged idle', 'queen idle', 'hover idle', 'float'],
        clipNames: ['DemonAngelIdle_60f_60', 'Idle_A', 'Idle']
      },
      {
        promptKeywords: ['angel walk', 'winged walk', 'glide', 'float walk', 'queen walk', 'catwalk'],
        clipNames: ['AngelWalk90_90f_90', 'AzerothNaturalWalk_90f_90', 'QUEEN_Catwalk_Loop', 'Walk']
      },
      {
        promptKeywords: ['queen cast', 'angel cast', 'seraph cast', 'wing cast', 'spellcast'],
        clipNames: ['QUEEN_SpellCast', 'Ranged_Magic_Spellcasting']
      },
      {
        promptKeywords: ['winged dash', 'sprint', 'wing burst', 'sellsword run', 'dash'],
        clipNames: ['sellsword_run_90f_90', 'Running_A', 'Walk']
      }
    ];
  }

  /**
   * Loads all basic animation pack GLBs into memory
   */
  async loadPack() {
    if (this.isLoaded) return;
    if (this._loadPromise) return this._loadPromise;

    const packUrls = [
      '/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb',
      '/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb',
      '/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_CombatMelee.glb',
      '/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_CombatRanged.glb',
      '/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_Special.glb',
      '/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Large/Rig_Large_CombatMelee.glb',
      '/animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Large/Rig_Large_General.glb',
      '/animations/kimodo/DemonAngelIdle_60f_60.glb',
      '/animations/kimodo/AngelWalk90_90f_90.glb',
      '/animations/kimodo/AzerothNaturalWalk_90f_90.glb',
      '/animations/kimodo/sellsword_run_90f_90.glb',
      '/animations/kimodo/sellsword_jump_60f_60.glb'
    ];

    this._loadPromise = Promise.allSettled(
      packUrls.map(url => assetLoader.loadGLTFRaw(url))
    ).then((results) => {
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value?.animations) {
          for (const clip of res.value.animations) {
            this.clips.set(clip.name, clip);
          }
        }
      }
      this.isLoaded = true;
      console.log(`🎬 [AnimationPackManager] Loaded ${this.clips.size} professional sample animations into memory!`);
    });

    return this._loadPromise;
  }

  /**
   * Get an animation clip by exact name
   */
  getClip(clipName) {
    return this.clips.get(clipName) || null;
  }

  /**
   * Natural Language Text-to-Animation Prompt Resolver.
   * Matches any natural language string prompt to the best available animation clip.
   * 
   * Example:
   *   resolvePromptToClip("casting arcane fire blast") -> "Ranged_Magic_Spellcasting"
   *   resolvePromptToClip("giant overhead hammer smash") -> "Melee_2H_Slam"
   *   resolvePromptToClip("dying in agony") -> "Death_A"
   * 
   * @param {string} promptText - User or AI text prompt describing the motion
   * @returns {THREE.AnimationClip|null}
   */
  resolvePromptToClip(promptText) {
    if (!promptText) return null;
    const lower = promptText.toLowerCase().trim();

    // Check exact name match first
    for (const [name, clip] of this.clips) {
      if (name.toLowerCase() === lower) return clip;
    }

    // Score against intent keywords
    let bestScore = 0;
    let bestClipName = null;

    for (const intent of this.intentKeywords) {
      let score = 0;
      for (const kw of intent.promptKeywords) {
        if (lower.includes(kw)) {
          score += kw.length; // weight longer specific keywords higher
        }
      }

      if (score > bestScore) {
        bestScore = score;
        // Pick first available clip in this intent that exists in our loaded library
        for (const cname of intent.clipNames) {
          if (this.clips.has(cname)) {
            bestClipName = cname;
            break;
          }
        }
      }
    }

    if (bestClipName && this.clips.has(bestClipName)) {
      return this.clips.get(bestClipName);
    }

    // Fallback to Idle or Walk if no specific intent matched
    return this.clips.get('Idle_A') || this.clips.get('Idle') || null;
  }
}

export const animationPackManager = new AnimationPackManager();
