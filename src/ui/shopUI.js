import { soundEngine } from '../engine/audio.js';
import { voiceEngine } from '../engine/voiceNarration.js';
import { MALAKOR_LORE_DIALOGUES, storyLoreManager, LEGENDARY_REWARD_ITEM } from '../systems/storyLore.js';
import { CUSTOM_ICONS, getCustomIcon } from './customIcons.js';

export const CONTRABAND_ITEMS = [
  {
    id: 'elixir_restoration',
    name: 'Greater Elixir of Restoration',
    type: 'consumable',
    rarity: 'rare',
    icon: '🧪',
    price: 35,
    desc: 'Brewed from smuggled distilled moonwell sap. Instantly restores 120 Health and 100 Mana.',
    effect: (player) => {
      player.hp = Math.min(player.maxHp, player.hp + 120);
      player.mana = Math.min(player.maxMana, player.mana + 100);
      return 'Restored 120 HP & 100 MP!';
    }
  },
  {
    id: 'scroll_temporal_refresh',
    name: 'Scroll of Temporal Distortion',
    type: 'consumable',
    rarity: 'epic',
    icon: '📜',
    price: 50,
    desc: 'A forbidden parchment torn from Valerius’s private notes. Instantly resets all spell cooldowns.',
    effect: (player, game) => {
      if (game?.cooldowns) {
        game.cooldowns.cooldowns.clear();
      }
      return 'All spell cooldowns reset!';
    }
  },
  {
    id: 'convict_shackle_charm',
    name: "Convict's Shackle Charm",
    type: 'ring',
    rarity: 'epic',
    icon: '⛓️',
    price: 120,
    desc: 'Severed iron links imbued with defiant willpower. Increases Movement Speed and gives +10 Haste.',
    stats: { haste: 10, intellect: 8 }
  },
  {
    id: 'volatile_crucible_core',
    name: 'Volatile Crucible Core',
    type: 'offHand',
    rarity: 'rare',
    icon: '🔮',
    price: 95,
    desc: 'A glowing cinder smuggled out of the Floor 2 crucibles. Radiates searing arcane warmth.',
    stats: { arcana: 18, vigor: 10 }
  },
  {
    id: 'archon_stolen_cipher',
    name: "Archon's Stolen Cipher",
    type: 'consumable',
    rarity: 'legendary',
    icon: '🗝️',
    price: 150,
    desc: 'A forbidden key cipher containing esoteric secrets of the temporal lattice. Grants +2 Free Talent Points.',
    effect: (player) => {
      player.talentPoints = (player.talentPoints || 0) + 2;
      return '+2 Free Talent Points acquired!';
    }
  },
  {
    id: 'shadowstep_boots',
    name: 'Shadowstep Stalker Boots',
    type: 'chest',
    rarity: 'rare',
    icon: '👢',
    price: 80,
    desc: 'Silent felt-lined boots worn by dungeon escapees to slip past automated sentinels.',
    stats: { resilience: 15, haste: 12 }
  }
];

export class ShopUI {
  constructor(gameApp) {
    this.game = gameApp;
    this.isOpen = false;
    this.activeTab = 'wares'; // 'wares' | 'lore'
    this.createDOM();
  }

  createDOM() {
    this.modal = document.createElement('div');
    this.modal.id = 'shop-modal';
    this.modal.className = 'modal hidden';
    this.modal.innerHTML = `
      <div class="shop-backdrop"></div>
      <div class="shop-container">
        <div class="shop-header">
          <div class="shop-title-area">
            <span class="shop-avatar">⛓️</span>
            <div>
              <h2 class="shop-title">MALAKOR'S SHADOW DEN</h2>
              <span class="shop-subtitle">Contraband Smuggler • The Shackle-Breaker</span>
            </div>
          </div>
          <div class="shop-header-right">
            <div class="shop-gold-badge">
              <span class="gold-icon">🪙</span>
              <span id="shop-player-gold">100</span> Gold
            </div>
            <button id="btn-close-shop" class="close-btn">&times;</button>
          </div>
        </div>

        <div class="shop-nav-tabs">
          <button id="shop-tab-wares" class="shop-tab-btn active">⛓️ Contraband Wares</button>
          <button id="shop-tab-lore" class="shop-tab-btn">📜 Forbidden Lore & Quests</button>
        </div>

        <div class="shop-lore-banner">
          <p id="shop-dialogue-text">"Looking for wares the Archon's sentinels haven't seized? Keep your blade sheathed and your ears open."</p>
        </div>

        <!-- TAB 1: CONTRABAND ITEMS -->
        <div id="shop-tab-content-wares">
          <div class="shop-items-grid" id="shop-items-grid"></div>
        </div>

        <!-- TAB 2: FORBIDDEN LORE & PROGRESSIVE QUEST -->
        <div id="shop-tab-content-lore" class="hidden">
          <div class="shop-quest-card" id="shop-quest-card">
            <!-- Rendered dynamically -->
          </div>
          <h4 style="color: #c4a962; margin: 15px 0 8px; font-family: 'Cinzel', serif;">Speak with Malakor</h4>
          <div class="shop-lore-dialogues-list" id="shop-lore-dialogues-list"></div>
        </div>

        <div class="shop-footer">
          <span class="shop-hint">Tip: Crucible Cores can be collected by triggering the crucibles on Floor 2.</span>
          <button id="btn-shop-done" class="btn-primary">Leave Shadow Stall [Esc]</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    document.getElementById('btn-close-shop')?.addEventListener('click', () => this.toggle(false));
    document.getElementById('btn-shop-done')?.addEventListener('click', () => this.toggle(false));

    // Tab switching
    const tabWares = document.getElementById('shop-tab-wares');
    const tabLore = document.getElementById('shop-tab-lore');
    const contentWares = document.getElementById('shop-tab-content-wares');
    const contentLore = document.getElementById('shop-tab-content-lore');

    tabWares?.addEventListener('click', () => {
      this.activeTab = 'wares';
      tabWares.classList.add('active');
      tabLore?.classList.remove('active');
      contentWares?.classList.remove('hidden');
      contentLore?.classList.add('hidden');
      soundEngine.playMenuOpen();
      this.render();
    });

    tabLore?.addEventListener('click', () => {
      this.activeTab = 'lore';
      tabLore.classList.add('active');
      tabWares?.classList.remove('active');
      contentLore?.classList.remove('hidden');
      contentWares?.classList.add('hidden');
      soundEngine.playMenuOpen();
      this.renderLoreAndQuest();
    });
  }

  toggle(force = null) {
    const shouldOpen = force !== null ? force : !this.isOpen;
    this.isOpen = shouldOpen;

    if (shouldOpen) {
      this.modal.classList.remove('hidden');
      soundEngine.playMenuOpen();
      voiceEngine.speak('malakor_greeting');
      if (document.exitPointerLock) document.exitPointerLock();
      this.render();
      if (this.activeTab === 'lore') this.renderLoreAndQuest();
    } else {
      this.modal.classList.add('hidden');
      soundEngine.playMenuClose();
      if (this.game?.isGameActive && document.body.requestPointerLock) {
        document.body.requestPointerLock();
      }
    }
  }

  render() {
    const player = this.game?.localPlayer;
    const playerGold = player?.gold ?? 100;

    const goldEl = document.getElementById('shop-player-gold');
    if (goldEl) goldEl.textContent = playerGold;

    const grid = document.getElementById('shop-items-grid');
    if (!grid) return;
    grid.innerHTML = '';

    CONTRABAND_ITEMS.forEach(item => {
      const card = document.createElement('div');
      card.className = `shop-item-card rarity-${item.rarity}`;
      const canAfford = playerGold >= item.price;

      const itemIcon = CUSTOM_ICONS[item.id] || CUSTOM_ICONS[item.type] || getCustomIcon(item.type);
      const goldIcon = getCustomIcon('gold_coin');

      card.innerHTML = `
        <div class="shop-item-top">
          <span class="shop-item-icon" style="display:inline-block;width:38px;height:38px;">${itemIcon}</span>
          <div class="shop-item-name-block">
            <h4 class="shop-item-name">${item.name}</h4>
            <span class="shop-item-type">${item.type.toUpperCase()} • ${item.rarity.toUpperCase()}</span>
          </div>
        </div>
        <p class="shop-item-desc">${item.desc}</p>
        <div class="shop-item-bottom">
          <div class="shop-price-tag" style="display:flex;align-items:center;gap:6px;">
            <span class="gold-icon" style="display:inline-block;width:20px;height:20px;">${goldIcon}</span> ${item.price} Gold
          </div>
          <button class="shop-buy-btn ${canAfford ? '' : 'disabled'}" data-item-id="${item.id}">
            ${canAfford ? 'Purchase' : 'Need Gold'}
          </button>
        </div>
      `;

      const buyBtn = card.querySelector('.shop-buy-btn');
      if (buyBtn && canAfford) {
        buyBtn.addEventListener('click', () => this.buyItem(item));
      }

      grid.appendChild(card);
    });
  }

  renderLoreAndQuest() {
    const questCard = document.getElementById('shop-quest-card');
    const dialoguesList = document.getElementById('shop-lore-dialogues-list');
    const q = storyLoreManager.questState;

    if (questCard) {
      if (!q.accepted) {
        questCard.innerHTML = `
          <div class="quest-card-header">
            <span class="quest-badge">STORY QUEST AVAILABLE</span>
            <h3 class="quest-card-title">The Shackle-Breaker's Retribution</h3>
          </div>
          <p class="quest-card-desc">
            Archon Valerius has locked the souls of former archmages inside the Floor 2 crucibles.
            Retrieve <strong>3 Volatile Crucible Cores</strong> from the Alchemical Forge.
            Malakor will purge the temporal siphons and forge a <strong>Legendary Chrono-Breaker's Band</strong>!
          </p>
          <div class="quest-rewards-preview">
            <span>🎁 Rewards: <strong>Legendary Ring</strong> • 🪙 200 Gold • ⭐ 150 XP</span>
          </div>
          <button id="btn-accept-malakor-quest" class="btn-quest-action">⚡ Accept Quest: The Shackle-Breaker's Retribution</button>
        `;
        questCard.querySelector('#btn-accept-malakor-quest')?.addEventListener('click', () => {
          storyLoreManager.acceptQuest();
          this.game.ui?.showStoryMessage('[Quest Accepted] The Shackle-Breaker’s Retribution');
          this.renderLoreAndQuest();
        });
      } else if (!q.completed) {
        const canTurnIn = storyLoreManager.canClaimReward();
        questCard.innerHTML = `
          <div class="quest-card-header">
            <span class="quest-badge in-progress">${canTurnIn ? 'READY TO COMPLETE' : 'IN PROGRESS'}</span>
            <h3 class="quest-card-title">The Shackle-Breaker's Retribution</h3>
          </div>
          <p class="quest-card-desc">
            Retrieve <strong>3 Volatile Crucible Cores</strong> from the crucibles on Floor 2.
          </p>
          <div class="quest-progress-bar-container">
            <div class="quest-progress-label">Crucible Cores: <strong>${q.coresCollected} / ${q.requiredCores}</strong></div>
            <div class="quest-progress-track">
              <div class="quest-progress-fill" style="width: ${(q.coresCollected / q.requiredCores) * 100}%"></div>
            </div>
          </div>
          ${canTurnIn ? `
            <button id="btn-claim-malakor-reward" class="btn-quest-action claim">
              🎁 Forge Legendary Ring & Claim Reward!
            </button>
          ` : `
            <div class="quest-waiting-notice">Ascend to Floor 2 and charge the 3 alchemical crucibles to extract the cores.</div>
          `}
        `;

        if (canTurnIn) {
          questCard.querySelector('#btn-claim-malakor-reward')?.addEventListener('click', () => {
            const success = storyLoreManager.claimReward(this.game);
            if (success) {
              this.game.ui?.showStoryMessage('✨ [LEGENDARY ITEM FORGED] Chrono-Breaker’s Band acquired!');
              this.renderLoreAndQuest();
            }
          });
        }
      } else {
        questCard.innerHTML = `
          <div class="quest-card-header">
            <span class="quest-badge completed">COMPLETED</span>
            <h3 class="quest-card-title">The Shackle-Breaker's Retribution</h3>
          </div>
          <p class="quest-card-desc" style="color: #4caf50;">
            ✅ Completed! You liberated the archmage souls and received the <strong>Chrono-Breaker's Band</strong>.
          </p>
        `;
      }
    }

    if (dialoguesList) {
      dialoguesList.innerHTML = '';
      MALAKOR_LORE_DIALOGUES.forEach(d => {
        const btn = document.createElement('button');
        btn.className = 'shop-lore-dialogue-btn';
        btn.innerHTML = `<span>🗣️</span> ${d.title}`;
        btn.addEventListener('click', () => {
          voiceEngine.speak(d.voiceKey, null, null, true);
          const diag = document.getElementById('shop-dialogue-text');
          if (diag) {
            diag.textContent = `"${d.text}"`;
            diag.style.color = '#ffd54f';
          }
        });
        dialoguesList.appendChild(btn);
      });
    }
  }

  buyItem(item) {
    const player = this.game?.localPlayer;
    if (!player) return;
    if ((player.gold ?? 100) < item.price) return;

    player.gold = (player.gold ?? 100) - item.price;
    soundEngine.playLootPickup();
    voiceEngine.speak('malakor_purchase');

    if (item.effect) {
      const msg = item.effect(player, this.game);
      this.game.ui?.showStoryMessage(`[Contraband] ${msg}`);
    } else {
      this.game.inventory?.addItem({
        id: item.id,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        icon: item.icon,
        desc: item.desc,
        stats: item.stats || {}
      });
      this.game.ui?.showLootNotification(item);
    }

    this.render();
  }
}
