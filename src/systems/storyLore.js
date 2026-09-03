import { soundEngine } from '../engine/audio.js';
import { voiceEngine } from '../engine/voiceNarration.js';
import { achievementSystem } from './achievementSystem.js';

export const MALAKOR_LORE_DIALOGUES = [
  {
    id: 'souls',
    title: "How does the Archon siphon souls?",
    voiceKey: 'malakor_lore_souls',
    speaker: "Malakor the Shackle-Breaker",
    text: "The Archon doesn't just execute prisoners, wizard. He built the Aetheric Siphon beneath the floor. It drains their memories, their magical affinity, and their life force, distilling them into pure chronomantic fuel."
  },
  {
    id: 'orrery',
    title: "What powers the Temporal Orrery?",
    voiceKey: 'malakor_lore_orrery',
    speaker: "Malakor the Shackle-Breaker",
    text: "Look up at the ceiling ribs! Those brass conduits channel the harvested soul essence directly to the Floor 3 Orrery, giving Valerius the power to rewind every second of his mistakes."
  },
  {
    id: 'crucibles',
    title: "Tell me about the Floor 2 Crucibles.",
    voiceKey: 'malakor_lore_crucibles',
    speaker: "Malakor the Shackle-Breaker",
    text: "In the Floor 2 crucibles, they smelted what was left of the archmages into Volatile Crucible Cores. If you bring me three of those cores, I will forge a legendary band to pierce the Archon's shield."
  },
  {
    id: 'escape',
    title: "How did you break your shackles?",
    voiceKey: 'malakor_lore_escape',
    speaker: "Malakor the Shackle-Breaker",
    text: "I used a rusted iron pin to pick the warden's seal on my cell while the sentinels were recalibrating during a temporal reset. Slipped past the shadow vents and made camp in this alcove."
  },
  {
    id: 'valerius',
    title: "Who was Valerius before he went mad?",
    voiceKey: 'malakor_lore_valerius',
    speaker: "Malakor the Shackle-Breaker",
    text: "Valerius wasn't always a monster. He tried to save his daughter from an incurable magical plague. When mortal medicine failed, he sought to freeze time itself... and drove himself mad in the process."
  }
];

export const LEGENDARY_REWARD_ITEM = {
  id: 'chrono_breakers_band',
  name: "Chrono-Breaker's Band",
  type: 'ring',
  rarity: 'legendary',
  icon: '💍',
  desc: "Forged from purified Crucible Cores and severed penitentiary manacles. Shatters temporal dampening fields.",
  stats: {
    arcana: 25,
    haste: 15,
    cdr: 0.15,
    vigor: 12
  }
};

export class StoryLoreManager {
  constructor() {
    this.questState = {
      accepted: false,
      completed: false,
      coresCollected: 0,
      requiredCores: 3
    };

    try {
      const saved = localStorage.getItem('spire_malakor_quest');
      if (saved) {
        this.questState = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    try {
      localStorage.setItem('spire_malakor_quest', JSON.stringify(this.questState));
    } catch (e) {}
  }

  acceptQuest() {
    if (this.questState.accepted) return;
    this.questState.accepted = true;
    this.save();
    soundEngine.playQuestComplete();
    return true;
  }

  addCrucibleCore() {
    if (!this.questState.accepted || this.questState.completed) return false;
    this.questState.coresCollected = Math.min(this.questState.requiredCores, this.questState.coresCollected + 1);
    this.save();
    soundEngine.playLootPickup();
    return {
      current: this.questState.coresCollected,
      required: this.questState.requiredCores,
      readyToTurnIn: this.questState.coresCollected >= this.questState.requiredCores
    };
  }

  canClaimReward() {
    return this.questState.accepted && !this.questState.completed && this.questState.coresCollected >= this.questState.requiredCores;
  }

  claimReward(gameApp) {
    if (!this.canClaimReward()) return false;
    this.questState.completed = true;
    this.save();

    if (gameApp?.inventory) {
      gameApp.inventory.addItem({ ...LEGENDARY_REWARD_ITEM });
      gameApp.inventory.gold = (gameApp.inventory.gold || 0) + 200;
    }
    if (gameApp?.progression) {
      gameApp.progression.addXP(150);
    }

    achievementSystem.unlock('shackle_breaker_retribution');
    soundEngine.playLevelUp();
    return true;
  }
}

export const storyLoreManager = new StoryLoreManager();
