import { RARITY_CONFIG } from '../systems/itemDatabase.js';
import { soundEngine } from '../engine/audio.js';
import { CUSTOM_ICONS, getCustomIcon } from './customIcons.js';

/**
 * Inventory & Character Paperdoll UI Manager with custom SVG equipment icons
 */
export class InventoryUI {
  constructor(inventorySystem) {
    this.inventory = inventorySystem;
    this.isOpen = false;

    this.modal = document.getElementById('inventory-modal');
    this.btnClose = document.getElementById('btn-close-inventory');
    this.paperdollContainer = document.getElementById('equipment-paperdoll');
    this.statsListContainer = document.getElementById('character-stats-list');
    this.bagGridContainer = document.getElementById('bag-grid');
    this.itemTooltip = document.getElementById('item-tooltip');

    this.setupListeners();
  }

  setupListeners() {
    this.btnClose.addEventListener('click', () => this.toggle(false));

    window.addEventListener('keydown', (e) => {
      if ((e.code === 'KeyI' || e.code === 'KeyC') && document.activeElement.tagName !== 'INPUT') {
        this.toggle();
      }
    });
  }

  toggle(force = null) {
    this.isOpen = force !== null ? force : !this.isOpen;
    if (this.isOpen) {
      this.modal.classList.remove('hidden');
      this.render();
      soundEngine.playMenuOpen();
    } else {
      this.modal.classList.add('hidden');
      this.hideTooltip();
      soundEngine.playMenuClose();
    }
  }

  render() {
    this.renderEquipment();
    this.renderStats();
    this.renderBag();
  }

  renderEquipment() {
    this.paperdollContainer.innerHTML = '';
    const slots = [
      { key: 'helm', label: 'HELM', iconKey: 'head' },
      { key: 'amulet', label: 'AMULET', iconKey: 'amulet' },
      { key: 'chest', label: 'CHEST', iconKey: 'chest' },
      { key: 'mainHand', label: 'MAIN HAND', iconKey: 'mainHand' },
      { key: 'offHand', label: 'OFF HAND', iconKey: 'offHand' },
      { key: 'hands', label: 'HANDS', iconKey: 'hands' },
      { key: 'boots', label: 'BOOTS', iconKey: 'boots' },
      { key: 'ring', label: 'RING', iconKey: 'ring' }
    ];

    slots.forEach(s => {
      const item = this.inventory.equipment[s.key];
      const slotEl = document.createElement('div');
      slotEl.className = 'equip-slot';

      if (item) {
        const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
        slotEl.style.borderColor = rarity.border;
        slotEl.style.boxShadow = `0 0 10px ${rarity.border}44`;
        const iconSvg = CUSTOM_ICONS[item.id] || CUSTOM_ICONS[s.iconKey] || getCustomIcon(s.iconKey);
        slotEl.innerHTML = `
          <div class="slot-tag">${s.label}</div>
          <div class="item-icon" style="width:44px;height:44px;">${iconSvg}</div>
          <div class="item-name-tag" style="color: ${rarity.color};">${item.name}</div>
        `;
        slotEl.addEventListener('mouseenter', (e) => this.showTooltip(item, e));
        slotEl.addEventListener('mouseleave', () => this.hideTooltip());
        slotEl.addEventListener('click', () => {
          if (this.inventory.unequipItem(s.key)) {
            soundEngine.playWandCast();
            this.render();
          }
        });
      } else {
        const iconSvg = CUSTOM_ICONS[s.iconKey] || getCustomIcon(s.iconKey);
        slotEl.innerHTML = `
          <div class="slot-tag">${s.label}</div>
          <div class="item-icon empty-icon" style="width:40px;height:40px;opacity:0.35;">${iconSvg}</div>
        `;
      }

      this.paperdollContainer.appendChild(slotEl);
    });
  }

  renderStats() {
    const derived = this.inventory.getDerivedStats();
    const a = derived.attributes;

    const iconSpan = (key) => `<span style="display:inline-block;width:18px;height:18px;vertical-align:middle;margin-right:6px;">${getCustomIcon(key)}</span>`;

    this.statsListContainer.innerHTML = `
      <div class="stat-row">
        <span>${iconSpan('stat_vigor')}Vitality</span>
        <strong>${a.vitality} <small>(+${a.vitality * 8} HP)</small></strong>
      </div>
      <div class="stat-row">
        <span>${iconSpan('stat_arcana')}Arcana</span>
        <strong>${a.arcana} <small>(+${Math.round((derived.spellPowerMultiplier - 1) * 100)}% Dmg)</small></strong>
      </div>
      <div class="stat-row">
        <span>${iconSpan('stat_intellect')}Focus</span>
        <strong>${a.focus} <small>(+${a.focus * 5} MP, ${Math.round(derived.healingMultiplier * 100 - 100)}% Heal)</small></strong>
      </div>
      <div class="stat-row">
        <span>${iconSpan('stat_haste')}Haste</span>
        <strong>${a.haste} <small>(+${Math.round(derived.cdr * 100)}% CDR, ${derived.moveSpeed.toFixed(1)} Spd)</small></strong>
      </div>
      <div class="stat-row">
        <span>${iconSpan('stat_mastery')}Mastery</span>
        <strong>${a.mastery} <small>(Class Synergy)</small></strong>
      </div>
    `;
  }

  renderBag() {
    this.bagGridContainer.innerHTML = '';

    for (let i = 0; i < this.inventory.bag.length; i++) {
      const item = this.inventory.bag[i];
      const slotEl = document.createElement('div');
      slotEl.className = 'bag-slot';

      if (item) {
        const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
        const itemSvg = CUSTOM_ICONS[item.id] || CUSTOM_ICONS[item.type] || getCustomIcon(item.type);
        slotEl.innerHTML = `<div class="bag-item-icon" style="width:36px;height:36px;">${itemSvg}</div>`;

        slotEl.addEventListener('mouseenter', (e) => this.showTooltip(item, e));
        slotEl.addEventListener('mouseleave', () => this.hideTooltip());
        slotEl.addEventListener('click', () => {
          if (this.inventory.equipItem(i)) {
            soundEngine.playWandCast();
            this.render();
          }
        });
      }

      this.bagGridContainer.appendChild(slotEl);
    }
  }

  showTooltip(item, e) {
    const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

    let statsHtml = '';
    if (item.stats) {
      statsHtml = Object.entries(item.stats)
        .map(([k, v]) => `<div style="color: #4caf50;">+${v} ${k.toUpperCase()}</div>`)
        .join('');
    } else if (item.effect) {
      if (item.effect.healHP) statsHtml += `<div style="color: #4caf50;">Restores ${item.effect.healHP} Health</div>`;
      if (item.effect.restoreMP) statsHtml += `<div style="color: #2196f3;">Restores ${item.effect.restoreMP} Mana</div>`;
    }

    this.itemTooltip.innerHTML = `
      <div style="font-weight: 700; font-size: 1rem; color: ${rarity.color};">${item.name}</div>
      <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">${rarity.name} ${item.type}</div>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;" />
      <div style="font-size: 0.8rem; margin-bottom: 6px;">${statsHtml}</div>
      <div style="font-size: 0.75rem; color: #e0e0e0; font-style: italic;">${item.desc}</div>
      <div style="font-size: 0.65rem; color: var(--gold); margin-top: 6px;">Click to ${item.type === 'consumable' ? 'Use' : 'Equip'}</div>
    `;

    this.itemTooltip.style.left = `${Math.min(window.innerWidth - 240, e.clientX + 16)}px`;
    this.itemTooltip.style.top = `${Math.min(window.innerHeight - 200, e.clientY + 16)}px`;
    this.itemTooltip.classList.remove('hidden');
  }

  hideTooltip() {
    this.itemTooltip.classList.add('hidden');
  }
}
