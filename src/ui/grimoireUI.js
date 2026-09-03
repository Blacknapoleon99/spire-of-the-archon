import { CLASS_SPELLS } from '../systems/spells.js';
import { soundEngine } from '../engine/audio.js';
import { CUSTOM_ICONS, getCustomIcon } from './customIcons.js';

/**
 * Spell Grimoire UI Manager (Hotkey: K)
 * Shows equipped abilities and unlockable class spells with custom vector icons.
 */
export class GrimoireUI {
  constructor() {
    this.isOpen = false;
    this.modal = document.getElementById('grimoire-modal');
    this.btnClose = document.getElementById('btn-close-grimoire');
    this.spellsListContainer = document.getElementById('grimoire-spells-list');
    this.skillPointsText = document.getElementById('grimoire-skill-points');

    this.unlockedSpells = new Set();
    this.skillPoints = 2; // Starting points to unlock advanced spells

    this.setupListeners();
  }

  setupListeners() {
    this.btnClose?.addEventListener('click', () => this.toggle(false));
    // Note: Global keydown for 'KeyK' is centralized in main.js to prevent double-toggle bugs.
  }

  toggle(force = null) {
    this.isOpen = force !== null ? force : !this.isOpen;
    if (this.isOpen) {
      this.modal?.classList.remove('hidden');
      soundEngine.playMenuOpen();
    } else {
      this.modal?.classList.add('hidden');
      soundEngine.playMenuClose();
    }
  }

  render(wizardClass = 'pyromancer') {
    const config = CLASS_SPELLS[wizardClass] || CLASS_SPELLS.pyromancer;
    if (this.skillPointsText) this.skillPointsText.textContent = this.skillPoints;
    if (!this.spellsListContainer) return;
    this.spellsListContainer.innerHTML = '';

    // Render Base Kit with Custom Vector SVG Icons
    const baseKit = [config.basic, config.skill1, config.skill2, config.ult];
    baseKit.forEach(s => {
      const card = document.createElement('div');
      card.className = 'grimoire-spell-card active';
      const iconSvg = CUSTOM_ICONS[s.id] || getCustomIcon(s.id);
      card.innerHTML = `
        <div class="spell-grimoire-icon" style="width:46px;height:46px;">${iconSvg}</div>
        <div class="spell-info">
          <h4>${s.name} <small style="color: var(--arcane-cyan);">[${s.key}]</small></h4>
          <p>${s.damage ? `Damage: ${s.damage}` : ''} ${s.heal ? `Heal: ${s.heal}` : ''} | Mana: ${s.mana || 'None'} | CD: ${s.cd}s</p>
        </div>
        <span class="unlocked-badge">EQUIPPED</span>
      `;
      this.spellsListContainer.appendChild(card);
    });

    // Render Unlockable Mastery Spells
    (config.unlockables || []).forEach(s => {
      const isUnlocked = this.unlockedSpells.has(s.id);
      const card = document.createElement('div');
      card.className = `grimoire-spell-card ${isUnlocked ? 'active' : 'locked'}`;
      const iconSvg = CUSTOM_ICONS[s.id] || getCustomIcon(s.id);

      card.innerHTML = `
        <div class="spell-grimoire-icon" style="width:46px;height:46px;">${iconSvg}</div>
        <div class="spell-info">
          <h4>${s.name}</h4>
          <p>${s.desc}</p>
        </div>
        ${isUnlocked
          ? '<span class="unlocked-badge">MASTERED</span>'
          : `<button class="unlock-spell-btn" ${this.skillPoints < s.cost ? 'disabled' : ''}>Learn (${s.cost} SP)</button>`
        }
      `;

      if (!isUnlocked) {
        const btn = card.querySelector('.unlock-spell-btn');
        btn?.addEventListener('click', () => {
          if (this.skillPoints >= s.cost) {
            this.skillPoints -= s.cost;
            this.unlockedSpells.add(s.id);
            soundEngine.playLevelUp();
            this.render(wizardClass);
          }
        });
      }

      this.spellsListContainer.appendChild(card);
    });
  }
}
