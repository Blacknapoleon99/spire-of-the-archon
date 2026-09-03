import { soundEngine } from '../engine/audio.js';

/**
 * Interactive Magic Book UI with "Reverse Time" Scribble Reconstruction Effect.
 * 4 Complete Folios covering Combat, Spire Lore & Quests, Systems & Progression, and Chronomancy.
 */
export const MAGIC_BOOKS = {
  book_combat: {
    title: "THE GRIMOIRE OF COMBATIVE ARTS",
    crest: "⚔️",
    auraColor: "#ff5722",
    summary: "Ancient teachings on channeling spellfire, dodging cataclysms, and directional aiming.",
    sections: [
      {
        heading: "I. Core Movement & Directional Spellcasting",
        content: `
          <p>• <strong>WASD Movement</strong>: Traverse the stone chambers with fluid cadence. Keep moving during battle to evade enemy projectile trajectories.</p>
          <p>• <strong>First-Person Aiming</strong>: Your spellbolts discharge along your crosshair with pin-point precision. Target the central core of hostile automatons for maximum impact.</p>
          <p>• <strong>Primary Wand Cast [LMB]</strong>: Discharges a continuous arcane bolt at zero mana cost. Use this to sustain DPS while your heavy abilities are charging.</p>
        `
      },
      {
        heading: "II. Class Ability Arsenal",
        content: `
          <p>• <strong>Signature Skill [Q]</strong>: High-damage direct strike (e.g. <em>Fireball</em> / <em>Ice Lance</em> / <em>Radiant Heal</em> / <em>Temporal Rewind</em>). Cast on cooldown!</p>
          <p>• <strong>Tactical Skill [E]</strong>: Contextual spell or wave (e.g. <em>Flame Wave</em> / <em>Glacial Bulwark</em> / <em>Cleansing Wave</em> / <em>Time Dilation</em>). If near an interactable, [E] interacts; otherwise it unleashes your spell!</p>
          <p>• <strong>Ultimate Cataclysm [R]</strong>: Area-of-Effect devastation (e.g. <em>Infernal Fire Tornado</em> / <em>Glacial Blizzard</em> / <em>Divine Sanctuary</em> / <em>Temporal Stasis</em>). Requires 55-65 MP.</p>
          <p>• <strong>Blink Dash [SHIFT]</strong>: Instant dimensional teleportation with full invulnerability frames. Essential for slipping through Golem shockwaves and Sentinel laser beams!</p>
          <p>• <strong>Jump [SPACE]</strong>: Leap over enemy ground slams, shockwaves, and environmental obstacles.</p>
        `
      },
      {
        heading: "III. Mana & Survival Wisdom",
        content: `
          <p>• <strong>Mana Regeneration</strong>: Your arcane pool restores continuously over time. Equip Intellect gear in your inventory to accelerate regeneration.</p>
          <p>• <strong>Health Flask Orbs</strong>: The crimson alchemical sphere in your bottom-left HUD reflects your life essence. Low health pulses a blood-vignette warning.</p>
          <p>• <strong>Elemental Synergies</strong>: Combining Frost (freezing foes) followed by Fire triggers a devastating <em>Shatter Burst</em> dealing 1.5x damage!</p>
        `
      }
    ]
  },
  book_spire: {
    title: "CHRONICLE OF THE SPIRE & THE ESCAPE",
    crest: "📜",
    auraColor: "#ffd700",
    summary: "Historical records of Archon Valerius's temporal prison and the three trials of ascension.",
    sections: [
      {
        heading: "I. The Curse of the Fractured Continuum",
        content: `
          <p>Centuries ago, Archmage Valerius discovered the Chrono-Astrolabe at the Spire pinnacle. In his obsession with immortality, he shattered the temporal fabric, trapping every apprentice and soul inside an eternal 3-tier loop.</p>
          <p>Only by ascending through the three trials can you overload his anchors and shatter the curse.</p>
        `
      },
      {
        heading: "II. The Three Trials of Ascension",
        content: `
          <p>• <strong>Floor 1 — The Forbidden Archives</strong>: Solve the Riddle Monolith of Aethelgard. Rotate the three Celestial Light Prisms to concentrate the sunbeams onto the northern barrier gate.</p>
          <p>• <strong>Floor 2 — The Colossal Molten Chasm (130m Wide!)</strong>: A gigantic subterranean magma abyss. Traverse arched obsidian bridges, activate the Fire, Frost, and Light Crucibles in harmonic order, and breach the Great Gatehouse.</p>
          <p>• <strong>Floor 3 — The Astral Observatory</strong>: Face the fractured Archon Valerius under the cosmic star vault. Destroy his 4 Astral Keystones to bring down his invulnerable temporal barrier!</p>
        `
      },
      {
        heading: "III. Malakor the Smuggler",
        content: `
          <p>Keep an eye out for Malakor the Shackle-Breaker in the shadowy alcoves. He trades contraband potions, epic rings, and armor pieces for gold plucked from fallen sentinels.</p>
        `
      }
    ]
  },
  book_systems: {
    title: "CODEX OF ARCANE SYSTEMS & PROGRESSION",
    crest: "🔮",
    auraColor: "#4caf50",
    summary: "Complete hotkey matrix, party coordination, equipment slots, and talent specialization guide.",
    sections: [
      {
        heading: "I. Sacred Hotkey Compendium",
        content: `
          <table class="book-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>System</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><kbd>I</kbd> or <kbd>C</kbd></td><td><strong>Inventory</strong></td><td>Equip weapons, robes, helmets, and rings to boost stats.</td></tr>
              <tr><td><kbd>K</kbd></td><td><strong>Grimoire</strong></td><td>View equipped spells and master advanced class abilities.</td></tr>
              <tr><td><kbd>T</kbd></td><td><strong>Talents</strong></td><td>Spend talent points on class passives and specializations.</td></tr>
              <tr><td><kbd>J</kbd></td><td><strong>Quest Journal</strong></td><td>Track Main Quests, Side Quests, and earn XP rewards.</td></tr>
              <tr><td><kbd>H</kbd></td><td><strong>Controls HUD</strong></td><td>Toggle the on-screen quick reference key overlay.</td></tr>
              <tr><td><kbd>ESC</kbd></td><td><strong>Settings</strong></td><td>Adjust master/SFX/music volume and mouse sensitivity.</td></tr>
            </tbody>
          </table>
        `
      },
      {
        heading: "II. Character Attributes & Gear",
        content: `
          <p>• <strong>Spell Power</strong>: Increases damage of all projectile and AOE spells.</p>
          <p>• <strong>Haste</strong>: Reduces ability cooldowns, allowing faster spell rotations.</p>
          <p>• <strong>Resilience</strong>: Provides armor mitigation against physical slams and laser beams.</p>
        `
      },
      {
        heading: "III. Covenant Multiplayer Co-Op",
        content: `
          <p>• <strong>Join with Friends</strong>: Share your Room Code or direct LAN IP (e.g. <code>http://192.168.0.127:3000</code>). All players join the same world instance with full 3D avatars.</p>
          <p>• <strong>Holy Trinity Synergy</strong>: Cryomancers tank hits, Luminaries heal damage, Pyromancers blast waves, and Chronomancers manipulate time!</p>
        `
      }
    ]
  },
  book_chrono: {
    title: "MANUAL OF CHRONOMANCY & REVERSE TIME",
    crest: "⏳",
    auraColor: "#ba68c8",
    summary: "Forbidden temporal incantations to manipulate the flow of time, undo damage, and reconstitute lost history.",
    sections: [
      {
        heading: "I. The Spell: Reverse Time",
        content: `
          <p>Chronomancy is the fifth school of wizardry within Aethelgard. By focusing temporal resonance through your wand or ancient parchment, you can invert entropy.</p>
          <p>• <strong>Erased Inks</strong>: When ancient tomes decay into temporal static, casting <em>Reverse Time</em> draws the dispersed carbon particles back into legible calligraphy.</p>
          <p>• <strong>Rewind Wound Healing</strong>: Chronomancers can instantly refund recent damage by reversing their biological thread by 4 seconds.</p>
        `
      },
      {
        heading: "II. Temporal Stasis & Dilation",
        content: `
          <p>• <strong>Time Dilation [E]</strong>: Creates a localized chrono-bubble where enemy movement and laser projectiles slow down by 60%.</p>
          <p>• <strong>Temporal Stasis [R]</strong>: Freezes all hostile entities within a 7-meter radius in absolute suspended animation for 5 seconds.</p>
        `
      },
      {
        heading: "III. The Resurrection Paradox",
        content: `
          <p>When a wizard falls in the Spire, their soul does not depart to the ether; it remains moored to the Awakening Vault. After 10 seconds of temporal convergence, the temporal continuum snaps backward, reconstituting the wizard at the Awakening Slab with full health and mana.</p>
        `
      }
    ]
  }
};

export class MagicBookUI {
  constructor() {
    this.modal = document.getElementById('magic-book-modal');
    this.titleEl = document.getElementById('book-modal-title');
    this.crestEl = document.getElementById('book-crest-icon');
    this.decayBanner = document.getElementById('book-decay-banner');
    this.contentEl = document.getElementById('book-parchment-content');
    this.btnReverseTime = document.getElementById('btn-reverse-time');
    this.btnClose = document.getElementById('btn-close-magic-book');
    this.btnFinish = document.getElementById('btn-finish-book');
    this.pageNumberEl = document.getElementById('book-page-num');

    this.currentBookId = null;
    this.restoredBooks = new Set();
    this.isScribbling = false;
    this.animationTimeouts = [];

    this.setupListeners();
  }

  setupListeners() {
    this.btnClose?.addEventListener('click', () => this.close());
    this.btnFinish?.addEventListener('click', () => this.close());
    this.btnReverseTime?.addEventListener('click', () => this.castReverseTime());

    window.addEventListener('keydown', (e) => {
      if (!this.modal || this.modal.classList.contains('hidden')) return;
      if (e.code === 'Escape') {
        this.close();
      } else if (e.code === 'Space' && !this.isScribbling && !this.restoredBooks.has(this.currentBookId)) {
        e.preventDefault();
        this.castReverseTime();
      }
    });
  }

  open(bookId) {
    const book = MAGIC_BOOKS[bookId];
    if (!book) return;

    // Release mouse pointer lock cleanly so player can click book buttons
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }

    this.currentBookId = bookId;
    if (this.titleEl) this.titleEl.textContent = book.title;
    if (this.crestEl) this.crestEl.textContent = book.crest;
    if (this.pageNumberEl) {
      const folioNames = {
        book_combat: 'Awakening Vault Archive • Folio I: Combat Art',
        book_spire: 'Awakening Vault Archive • Folio II: Spire Chronicles',
        book_systems: 'Awakening Vault Archive • Folio III: Arcane Systems',
        book_chrono: 'Awakening Vault Archive • Folio IV: Chronomancy'
      };
      this.pageNumberEl.textContent = folioNames[bookId] || 'Awakening Vault Archive';
    }

    this.modal?.classList.remove('hidden');
    soundEngine.playMenuOpen();

    if (this.restoredBooks.has(bookId)) {
      // Already reconstructed in this session
      if (this.decayBanner) this.decayBanner.style.display = 'none';
      if (this.contentEl) {
        this.contentEl.style.display = 'block';
        this.contentEl.style.opacity = '1';
        this.renderFullContent(book);
      }
    } else {
      // Weathered & eroded state waiting for Reverse Time
      if (this.decayBanner) {
        this.decayBanner.style.display = 'flex';
        this.decayBanner.style.opacity = '1';
      }
      if (this.btnReverseTime) {
        this.btnReverseTime.textContent = '✨ CAST SPELL: REVERSE TIME [SPACE]';
        this.btnReverseTime.disabled = false;
      }
      if (this.contentEl) {
        this.contentEl.style.opacity = '0.6';
        this.contentEl.innerHTML = `
          <div class="eroded-preview">
            <div class="eroded-sigil">⏳ ᛟ ᚱ ᛞ ᛖ ᚱ</div>
            <p class="eroded-line">ᛗᚨᚷᛁᚲ ᛟᚠ ᛏᚺᛖ ᚨᚱᚲᚺᛟᚾ... [TEMPORAL ENTROPY VOID] ... ᛏᛁᛗᛖ ᛚᛟᛟᛈ</p>
            <p class="eroded-line">ᛋᛈᛖᛚᛚᚠᛁᚱᛖ ᚱᛖᛋᛟᚾᚨᚾᚲᛖ... [INK DISPERSED ACROSS CENTURIES] ... ᛋᛈᛁᚱᛖ</p>
            <p class="eroded-line">ᚲᚺᚱᛟᚾᛟᛗᚨᚾᚲᛖ... [TOUCH THE PARCHMENT AND INVOKE REVERSE TIME] ...</p>
            <div class="eroded-hint">✨ Cast [Reverse Time] to reconstitute the lost chrono-ink with smooth cursive scribble.</div>
          </div>
        `;
      }
    }
  }

  close() {
    this.clearAnimationTimers();
    this.isScribbling = false;
    this.modal?.classList.add('hidden');
    soundEngine.playMenuClose();
  }

  clearAnimationTimers() {
    this.animationTimeouts.forEach(t => clearTimeout(t));
    this.animationTimeouts = [];
  }

  /**
   * Casts the "Reverse Time" spell on the book:
   * Triggers temporal ripple, chrono chime, and smooth animated cursive ink reveal!
   */
  castReverseTime() {
    if (this.isScribbling || !this.currentBookId) return;
    const book = MAGIC_BOOKS[this.currentBookId];
    if (!book) return;

    this.isScribbling = true;
    this.clearAnimationTimers();

    // 1. Play temporal rewind sound
    soundEngine.playReverseTimeSpell();

    // 2. Visual time-reversal ripple on modal
    this.modal?.classList.add('time-reversing');
    const t1 = setTimeout(() => this.modal?.classList.remove('time-reversing'), 1400);
    this.animationTimeouts.push(t1);

    if (this.btnReverseTime) {
      this.btnReverseTime.textContent = '⏳ INVERTING ENTROPY... RECONSTITUTING INK';
      this.btnReverseTime.disabled = true;
    }

    // 3. Hide decay banner smoothly
    if (this.decayBanner) {
      this.decayBanner.style.opacity = '0';
      const t2 = setTimeout(() => {
        if (this.decayBanner) this.decayBanner.style.display = 'none';
      }, 450);
      this.animationTimeouts.push(t2);
    }

    // 4. Build complete structured DOM containers for each section
    if (!this.contentEl) return;
    this.contentEl.innerHTML = '';
    this.contentEl.style.display = 'block';
    this.contentEl.style.opacity = '1';

    // Header container
    const headerDiv = document.createElement('div');
    headerDiv.className = 'restored-book-header scribble-fade-target';
    headerDiv.style.opacity = '0';
    headerDiv.style.transform = 'translateY(8px)';
    headerDiv.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    headerDiv.innerHTML = `
      <div class="restored-status">⏳ CHRONO-REVERSION SUCCESSFUL • RESTORED BY APPRENTICE</div>
      <p class="restored-summary"><em>${book.summary}</em></p>
    `;
    this.contentEl.appendChild(headerDiv);

    // Quill pen cursor indicator
    const quillIndicator = document.createElement('div');
    quillIndicator.className = 'scribble-pen-cursor';
    quillIndicator.innerHTML = '🖋️ <span class="scribble-spark">✨</span>';
    this.contentEl.appendChild(quillIndicator);

    // Section elements
    const sectionElements = [];
    book.sections.forEach((sec) => {
      const secDiv = document.createElement('div');
      secDiv.className = 'book-section scribble-fade-target';
      secDiv.style.opacity = '0';
      secDiv.style.transform = 'translateY(12px)';
      secDiv.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      secDiv.innerHTML = `
        <h3 class="book-section-title">${sec.heading}</h3>
        <div class="book-section-body">${sec.content}</div>
      `;
      this.contentEl.appendChild(secDiv);
      sectionElements.push(secDiv);
    });

    // 5. Sequential Animated Scribble Reveal
    // Step 1: Reveal Header
    const tHeader = setTimeout(() => {
      headerDiv.style.opacity = '1';
      headerDiv.style.transform = 'translateY(0)';
      soundEngine.playQuillScribble();
    }, 300);
    this.animationTimeouts.push(tHeader);

    // Steps 2+: Reveal each section with quill scribbles
    sectionElements.forEach((secEl, i) => {
      const delay = 750 + i * 650;
      const tSec = setTimeout(() => {
        secEl.style.opacity = '1';
        secEl.style.transform = 'translateY(0)';
        soundEngine.playQuillScribble();

        // Move quill indicator near current section
        if (quillIndicator) {
          quillIndicator.style.top = `${secEl.offsetTop + 10}px`;
        }
      }, delay);
      this.animationTimeouts.push(tSec);
    });

    // Final Completion Step
    const totalTime = 750 + sectionElements.length * 650 + 400;
    const tFinish = setTimeout(() => {
      this.isScribbling = false;
      this.restoredBooks.add(this.currentBookId);
      if (quillIndicator && quillIndicator.parentNode) {
        quillIndicator.parentNode.removeChild(quillIndicator);
      }
      soundEngine.playQuestComplete();
    }, totalTime);
    this.animationTimeouts.push(tFinish);
  }

  renderFullContent(book) {
    if (!this.contentEl) return;
    let html = `
      <div class="restored-book-header">
        <div class="restored-status">⏳ CHRONO-REVERSION ARCHIVED • FOLIO INTACT</div>
        <p class="restored-summary"><em>${book.summary}</em></p>
      </div>
    `;
    book.sections.forEach(sec => {
      html += `
        <div class="book-section">
          <h3 class="book-section-title">${sec.heading}</h3>
          <div class="book-section-body">${sec.content}</div>
        </div>
      `;
    });
    this.contentEl.innerHTML = html;
  }
}
