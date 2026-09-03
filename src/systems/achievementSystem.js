import { soundEngine } from '../engine/audio.js';

/**
 * Achievement System — Tracks in-game milestones and awards toast notifications.
 * Persists unlocked achievements in localStorage.
 */

export const ACHIEVEMENTS = [
  {
    id: 'first_step',
    title: 'First Step into the Spire',
    desc: 'Enter the Archon’s tower and begin your journey.',
    icon: '🏰',
  },
  {
    id: 'pyro_master',
    title: 'Pyrotechnician',
    desc: 'Deal massive burst fire damage with flame spells.',
    icon: '🔥',
  },
  {
    id: 'frost_master',
    title: 'Sub-Zero Control',
    desc: 'Freeze enemies solid using Cryomancer ice magic.',
    icon: '❄️',
  },
  {
    id: 'divine_touch',
    title: 'Hand of Grace',
    desc: 'Heal yourself or allies using Luminary magic.',
    icon: '✨',
  },
  {
    id: 'chrono_shift',
    title: 'Time Bender',
    desc: 'Distort space and time using Chronomancer spells.',
    icon: '⏳',
  },
  {
    id: 'scholar',
    title: 'Scholar of Aethelgard',
    desc: 'Correctly solve an ancient riddle at the Riddle Monolith.',
    icon: '📜',
  },
  {
    id: 'treasure_hunter',
    title: 'Arcane Plunderer',
    desc: 'Discover and collect 3 pieces of magical equipment.',
    icon: '💎',
  },
  {
    id: 'crucible_breaker',
    title: 'Master of Elements',
    desc: 'Ignite all three alchemical crucibles on Floor 2.',
    icon: '⚗️',
  },
  {
    id: 'archon_slayer',
    title: 'Bane of Valerius',
    desc: 'Defeat Archon Valerius and escape the Spire.',
    icon: '👑',
  },
  {
    id: 'fashion_forward',
    title: 'Legendary Sorcerer',
    desc: 'Equip an Epic or Legendary item in any equipment slot.',
    icon: '🌟',
  }
];

export class AchievementSystem {
  constructor() {
    this.unlocked = new Set(this.loadUnlocked());
    this.container = null;
    this.createToastUI();
  }

  loadUnlocked() {
    try {
      const data = JSON.parse(localStorage.getItem('spire_achievements'));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  saveUnlocked() {
    localStorage.setItem('spire_achievements', JSON.stringify(Array.from(this.unlocked)));
  }

  createToastUI() {
    this.container = document.createElement('div');
    this.container.id = 'achievement-toast-container';
    this.container.className = 'achievement-toast-container';
    document.body.appendChild(this.container);
  }

  unlock(id) {
    if (this.unlocked.has(id)) return;

    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;

    this.unlocked.add(id);
    this.saveUnlocked();

    soundEngine.playQuestComplete();
    this.showToast(ach);
  }

  showToast(ach) {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="achievement-toast-icon">${ach.icon}</div>
      <div class="achievement-toast-body">
        <div class="achievement-toast-header">ACHIEVEMENT UNLOCKED</div>
        <div class="achievement-toast-title">${ach.title}</div>
        <div class="achievement-toast-desc">${ach.desc}</div>
      </div>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      toast.style.transition = 'all 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 5000);
  }

  isUnlocked(id) {
    return this.unlocked.has(id);
  }
}

export const achievementSystem = new AchievementSystem();
