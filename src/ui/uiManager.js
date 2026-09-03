import { CLASS_SPELLS } from '../systems/spells.js';
import { TALENT_TREES } from '../systems/talents.js';
import { soundEngine } from '../engine/audio.js';
import { voiceEngine } from '../engine/voiceNarration.js';
import { CUSTOM_ICONS, getCustomIcon } from './customIcons.js';

/**
 * UI Manager — Central controller for all HUD panels, modals, and settings.
 * Handles: HP (bottom-left), MP (bottom-right), XP bar, Spell Hotbar,
 * Quest Tracker, Party HUD, Boss bar, Chat, Escape Menu, Settings,
 * Death/Respawn, Level-Up, Kill Feed, Loading Screen, and all modals.
 */
export class UIManager {
  constructor(network) {
    this.network = network;
    this.selectedClass = 'pyromancer';
    this.localPlayer = null;
    this.quizTimerInterval = null;
    this.killFeedTimeout = null;
    this.isEscapeOpen = false;
    this.isSettingsOpen = false;
    this.deathTimerInterval = null;

    // Settings (persisted in localStorage)
    this.settings = this.loadSettings();

    this.initElements();
    this.setupEventListeners();
    this.applySettings();
  }

  loadSettings() {
    const defaults = {
      masterVol: 70, sfxVol: 80, musicVol: 35, voiceVol: 90,
      micMode: 'open_mic', micThreshold: 14,
      sensitivity: 100, fov: 75,
      graphicsQuality: 'balanced',
      fpsLimit: 'unlimited', // '60', '120', '144', '240', 'unlimited'
      showFps: false, showDmgNumbers: true
    };
    try {
      const saved = JSON.parse(localStorage.getItem('spire_settings'));
      return saved ? { ...defaults, ...saved } : defaults;
    } catch {
      return defaults;
    }
  }

  saveSettings() {
    localStorage.setItem('spire_settings', JSON.stringify(this.settings));
  }

  applySettings() {
    soundEngine.setMasterVolume(this.settings.masterVol / 100);
    soundEngine.setSfxVolume(this.settings.sfxVol / 100);
    soundEngine.setMusicVolume(this.settings.musicVol / 100);
    soundEngine.setVoiceVolume(this.settings.voiceVol / 100);
    // FPS counter
    const fps = document.getElementById('fps-counter');
    if (fps) fps.classList.toggle('hidden', !this.settings.showFps);
  }

  initElements() {
    // Loading Screen
    this.loadingScreen = document.getElementById('loading-screen');
    this.loadingBarFill = document.getElementById('loading-bar-fill');
    this.loadingPercentText = document.getElementById('loading-percent-text');
    this.loadingStatusText = document.getElementById('loading-status-text');
    this.loadingTip = document.getElementById('loading-tip');
    this.initLoadingEmbersCanvas();

    // Voice Chat HUD
    this.voiceHudIndicator = document.getElementById('voice-hud-indicator');
    this.voiceStatusText = document.getElementById('voice-status-text');

    this.crosshair = document.getElementById('crosshair');
    this.hitmarker = document.getElementById('hitmarker');
    this.clickHint = document.getElementById('click-to-play-hint');
    this.lootNotification = document.getElementById('loot-notification');
    this.lootName = document.getElementById('loot-name');

    // Kill Feed
    this.killFeed = document.getElementById('kill-feed');

    // Lobby
    this.lobbyScreen = document.getElementById('lobby-screen');
    this.roomLobbyPanel = document.getElementById('room-lobby-panel');
    this.playerNameInput = document.getElementById('player-name-input');
    this.hostCodeInput = document.getElementById('host-code-input');
    this.joinCodeInput = document.getElementById('join-code-input');
    this.btnHostGame = document.getElementById('btn-host-game');
    this.btnJoinGame = document.getElementById('btn-join-game');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.btnQuickAscend = document.getElementById('btn-quick-ascend');
    this.displayRoomCode = document.getElementById('display-room-code');
    this.btnCopyCode = document.getElementById('btn-copy-code');
    this.lobbyPlayerList = document.getElementById('lobby-player-list');
    this.partyCount = document.getElementById('party-count');
    this.hostStartHint = document.getElementById('host-start-hint');
    this.webrtcPeerId = document.getElementById('webrtc-peer-id');

    // HUD & Screen FX
    this.hud = document.getElementById('hud');
    this.bloodVignette = document.getElementById('blood-vignette');
    this.hudAvatar = document.getElementById('hud-avatar');
    this.hudPlayerName = document.getElementById('hud-player-name');
    this.hudLevelBadge = document.getElementById('hud-level-badge');
    this.hudClassTitle = document.getElementById('hud-class-title');
    this.hudHealthFill = document.getElementById('hud-health-fill');
    this.hudHealthText = document.getElementById('hud-health-text');
    this.hudManaFill = document.getElementById('hud-mana-fill');
    this.hudManaText = document.getElementById('hud-mana-text');
    this.partyHudList = document.getElementById('party-hud-list');
    this.interactionPrompt = document.getElementById('interaction-prompt');
    this.interactLabel = document.getElementById('interact-label');
    this.buffBar = document.getElementById('buff-bar');

    // XP Bar
    this.xpBarFill = document.getElementById('xp-bar-fill');
    this.xpBarText = document.getElementById('xp-bar-text');

    // Quest Tracker
    this.questActTitle = document.getElementById('quest-act-title');
    this.questStepTitle = document.getElementById('quest-step-title');
    this.questStepDesc = document.getElementById('quest-step-desc');
    this.questStepProgress = document.getElementById('quest-step-progress');
    this.questDistanceTag = document.getElementById('quest-distance-tag');

    // Hotbar
    this.cdBasic = document.getElementById('cd-basic');
    this.cdSkill1 = document.getElementById('cd-skill1');
    this.cdSkill2 = document.getElementById('cd-skill2');
    this.cdUlt = document.getElementById('cd-ult');
    this.cdDash = document.getElementById('cd-dash');
    this.iconBasic = document.getElementById('icon-basic');
    this.iconSkill1 = document.getElementById('icon-skill1');
    this.iconSkill2 = document.getElementById('icon-skill2');
    this.iconUlt = document.getElementById('icon-ult');
    this.costSkill1 = document.getElementById('cost-skill1');
    this.costSkill2 = document.getElementById('cost-skill2');
    this.costUlt = document.getElementById('cost-ult');

    // Story banner
    this.storyBanner = document.getElementById('story-banner');
    this.storyText = document.getElementById('story-text');

    // Lectern modal
    this.lecternModal = document.getElementById('lectern-modal');
    this.btnCloseLectern = document.getElementById('btn-close-lectern');
    this.btnLecternContinue = document.getElementById('btn-lectern-continue');

    // Talents modal
    this.talentModal = document.getElementById('talent-modal');
    this.btnToggleTalents = document.getElementById('btn-toggle-talents');
    this.btnCloseTalents = document.getElementById('btn-close-talents');
    this.talentPointsBadge = document.getElementById('talent-points-badge');
    this.talentPointsCount = document.getElementById('talent-points-count');
    this.talentNodesContainer = document.getElementById('talent-nodes-container');

    // Quiz modal
    this.quizModal = document.getElementById('quiz-modal');
    this.quizTitle = document.getElementById('quiz-title');
    this.quizRiddleText = document.getElementById('quiz-riddle-text');
    this.quizTimer = document.getElementById('quiz-timer');
    this.quizOptions = document.getElementById('quiz-options');
    this.quizVotesList = document.getElementById('quiz-votes-list');
    this.quizResultNotice = document.getElementById('quiz-result-notice');
    this.quizResultText = document.getElementById('quiz-result-text');
    this.quizLoreText = document.getElementById('quiz-lore-text');

    // Victory
    this.victoryModal = document.getElementById('victory-modal');
    this.victoryStatsList = document.getElementById('victory-stats-list');
    this.btnPlayAgain = document.getElementById('btn-play-again');

    // Chat & Spatial Proximity
    this.chatChannel = 'proximity';
    this.chatChannelBadge = document.getElementById('chat-channel-badge');
    this.chatForm = document.getElementById('chat-form');
    this.chatInput = document.getElementById('chat-input');
    this.chatMessages = document.getElementById('chat-messages');

    // Audio
    this.btnToggleAudio = document.getElementById('btn-toggle-audio');
    this.audioIcon = document.getElementById('audio-icon');

    // Escape Menu
    this.escapeMenu = document.getElementById('escape-menu');
    this.btnResume = document.getElementById('btn-resume');
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.btnQuitLobby = document.getElementById('btn-quit-lobby');

    // Settings Modal
    this.settingsModal = document.getElementById('settings-modal');
    this.btnCloseSettings = document.getElementById('btn-close-settings');

    // Death / Wipe
    this.deathOverlay = document.getElementById('death-overlay');
    this.deathTimer = document.getElementById('death-timer');
    this.wipeOverlay = document.getElementById('wipe-overlay');
    this.btnRetryFloor = document.getElementById('btn-retry-floor');
    this.btnWipeLobby = document.getElementById('btn-wipe-lobby');

    // Level Up
    this.levelUpOverlay = document.getElementById('level-up-overlay');
    this.levelUpDetail = document.getElementById('level-up-detail');

    // Controls Modal
    this.controlsModal = document.getElementById('controls-modal');
    this.btnCloseControls = document.getElementById('btn-close-controls');
    this.btnDoneControls = document.getElementById('btn-done-controls');
    this.btnHudControls = document.getElementById('btn-hud-controls');

    // Active Spell Timer Banner
    this.activeSpellTimer = document.getElementById('active-spell-timer');
    this.activeSpellIcon = document.getElementById('active-spell-icon');
    this.activeSpellName = document.getElementById('active-spell-name');
    this.activeSpellSeconds = document.getElementById('active-spell-seconds');
    this.activeSpellFill = document.getElementById('active-spell-fill');

    // FPS
    this.fpsCounter = document.getElementById('fps-counter');
  }

  setupEventListeners() {
    // Class picker
    const classCards = document.querySelectorAll('.class-card');
    classCards.forEach(card => {
      card.addEventListener('click', () => {
        classCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedClass = card.getAttribute('data-class');
      });
    });

    // Lobby actions
    this.btnHostGame?.addEventListener('click', () => {
      const name = this.playerNameInput?.value.trim() || 'Archmage Host';
      const code = this.hostCodeInput?.value.trim();
      this.network.createRoom(name, this.selectedClass, code);
      soundEngine.playWandCast();
    });

    this.btnJoinGame?.addEventListener('click', () => {
      const name = this.playerNameInput?.value.trim() || 'Apprentice';
      const code = this.joinCodeInput?.value.trim();
      if (!code) { alert('Please enter an online room code.'); return; }
      this.network.joinRoom(name, this.selectedClass, code);
      soundEngine.playWandCast();
    });

    const handleAscendStart = () => {
      soundEngine.playFireball();
      if (this.btnStartGame) this.btnStartGame.textContent = 'ASCENDING... 🔮';
      if (this.btnQuickAscend) this.btnQuickAscend.textContent = 'ASCENDING... 🔮';

      // If already connected in a created/joined room, begin ascent immediately
      if (this.network.roomId) {
        this.network.startGame();
      } else {
        // Auto-host room instantly so player can enter immediately
        const name = this.playerNameInput?.value.trim() || 'Archmage Ignis';
        const code = this.hostCodeInput?.value.trim() || ('SPIRE-' + Math.floor(Math.random() * 8999 + 1000));
        this.network.createRoom(name, this.selectedClass, code);

        const onRoomStarted = () => {
          this.network.startGame();
        };
        this.network.on('room_created', onRoomStarted);
        setTimeout(() => {
          this.network.startGame();
        }, 300);
      }
    };

    this.btnStartGame?.addEventListener('click', handleAscendStart);
    this.btnQuickAscend?.addEventListener('click', handleAscendStart);

    this.btnCopyCode?.addEventListener('click', () => {
      const code = this.displayRoomCode?.textContent;
      if (code) navigator.clipboard.writeText(code);
      if (this.btnCopyCode) {
        this.btnCopyCode.textContent = 'Copied!';
        setTimeout(() => { this.btnCopyCode.textContent = 'Copy'; }, 1500);
      }
    });

    // Modal toggles
    this.btnToggleTalents?.addEventListener('click', () => this.toggleTalentModal());
    this.btnCloseTalents?.addEventListener('click', () => this.toggleTalentModal(false));
    this.btnCloseLectern?.addEventListener('click', () => this.toggleLecternModal(false));
    this.btnLecternContinue?.addEventListener('click', () => this.toggleLecternModal(false));

    // Quest Journal button
    const btnJournal = document.getElementById('btn-toggle-journal');
    if (btnJournal) {
      btnJournal.addEventListener('click', () => {
        if (this._questJournalToggle) this._questJournalToggle();
      });
    }

    // Escape Menu
    this.btnResume?.addEventListener('click', () => this.toggleEscapeMenu(false));
    this.btnOpenSettings?.addEventListener('click', () => {
      this.toggleEscapeMenu(false);
      this.toggleSettings(true);
    });
    this.btnQuitLobby?.addEventListener('click', () => window.location.reload());

    // Settings
    this.btnCloseSettings?.addEventListener('click', () => this.toggleSettings(false));
    this.setupSettingsSliders();

    // Death / Wipe
    this.btnRetryFloor?.addEventListener('click', () => {
      this.wipeOverlay?.classList.add('hidden');
      this.network.retryFloor?.();
    });
    this.btnWipeLobby?.addEventListener('click', () => window.location.reload());

    // Controls Modal
    this.btnCloseControls?.addEventListener('click', () => this.toggleControls(false));
    this.btnDoneControls?.addEventListener('click', () => this.toggleControls(false));
    this.btnHudControls?.addEventListener('click', () => this.toggleControls());

    // Global keyboard
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT') {
        if (e.code === 'Escape') document.activeElement.blur();
        return;
      }

      switch (e.code) {
        case 'Escape':
          // Close any open modal first, then toggle escape menu
          if (this.controlsModal && !this.controlsModal.classList.contains('hidden')) { this.toggleControls(false); return; }
          if (this.isSettingsOpen) { this.toggleSettings(false); return; }
          if (this.talentModal && !this.talentModal.classList.contains('hidden')) { this.toggleTalentModal(false); return; }
          if (this.lecternModal && !this.lecternModal.classList.contains('hidden')) { this.toggleLecternModal(false); return; }
          this.toggleEscapeMenu();
          break;
        case 'KeyH':
        case 'F1':
          this.toggleControls();
          break;
        case 'KeyT':
          this.toggleTalentModal();
          break;
        case 'Enter':
          if (document.activeElement === this.chatInput) {
            this.chatInput.blur();
          } else {
            this.chatInput.focus();
          }
          break;
      }
    });

    // Audio toggle
    this.btnToggleAudio?.addEventListener('click', () => {
      const isMuted = soundEngine.toggleMute();
      if (this.audioIcon) this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
    });

    // Chat submit (via form or Enter key on input)
    const handleChatSubmit = () => {
      const msg = this.chatInput?.value.trim();
      if (msg) {
        const coords = this.getChatCoordinates ? this.getChatCoordinates() : null;
        this.network.sendChat(msg, coords, this.chatChannel);
        if (this.chatInput) this.chatInput.value = '';
      }
      this.chatInput?.blur();
    };

    this.chatChannelBadge?.addEventListener('click', () => this.toggleChatChannel());

    this.chatForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleChatSubmit();
    });

    this.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleChatSubmit();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.toggleChatChannel();
      }
    });

    // Victory
    this.btnPlayAgain?.addEventListener('click', () => window.location.reload());
  }

  toggleChatChannel() {
    this.chatChannel = this.chatChannel === 'proximity' ? 'party' : 'proximity';
    if (this.chatChannelBadge) {
      this.chatChannelBadge.textContent = this.chatChannel.toUpperCase();
      this.chatChannelBadge.style.color = this.chatChannel === 'proximity' ? '#ba68c8' : '#ffd700';
      this.chatChannelBadge.style.borderColor = this.chatChannel === 'proximity' ? 'rgba(186, 104, 200, 0.45)' : 'rgba(255, 215, 0, 0.5)';
      this.chatChannelBadge.style.background = this.chatChannel === 'proximity' ? 'rgba(186, 104, 200, 0.18)' : 'rgba(255, 215, 0, 0.18)';
    }
    soundEngine.playWandCast();
  }

  setupSettingsSliders() {
    const bindSlider = (id, labelId, key, format) => {
      const slider = document.getElementById(id);
      const label = document.getElementById(labelId);
      if (!slider || !label) return;
      slider.value = this.settings[key];
      label.textContent = format(this.settings[key]);
      slider.addEventListener('input', () => {
        this.settings[key] = parseInt(slider.value);
        label.textContent = format(this.settings[key]);
        this.saveSettings();
        this.applySettings();
      });
    };

    bindSlider('setting-master-vol', 'label-master-vol', 'masterVol', v => `${v}%`);
    bindSlider('setting-sfx-vol', 'label-sfx-vol', 'sfxVol', v => `${v}%`);
    bindSlider('setting-music-vol', 'label-music-vol', 'musicVol', v => `${v}%`);
    bindSlider('setting-voice-vol', 'label-voice-vol', 'voiceVol', v => `${v}%`);
    bindSlider('setting-mic-threshold', 'label-mic-threshold', 'micThreshold', v => `${v}`);
    bindSlider('setting-sensitivity', 'label-sensitivity', 'sensitivity', v => (v / 100).toFixed(1));
    bindSlider('setting-fov', 'label-fov', 'fov', v => `${v}°`);

    // Mic Mode Selector Pills
    const btnMicOpen = document.getElementById('btn-mic-mode-open');
    const btnMicPush = document.getElementById('btn-mic-mode-push');
    if (btnMicOpen && btnMicPush) {
      const applyMicPills = (mode) => {
        this.settings.micMode = mode;
        if (mode === 'open_mic') {
          btnMicOpen.classList.add('active');
          btnMicPush.classList.remove('active');
        } else {
          btnMicOpen.classList.remove('active');
          btnMicPush.classList.add('active');
        }
        this.saveSettings();
        if (this._onMicModeChange) this._onMicModeChange(mode);
      };

      btnMicOpen.addEventListener('click', () => applyMicPills('open_mic'));
      btnMicPush.addEventListener('click', () => applyMicPills('push_to_talk'));

      if (this.settings.micMode === 'push_to_talk') {
        btnMicOpen.classList.remove('active');
        btnMicPush.classList.add('active');
      }
    }

    // Graphics Quality Selector (Performance / Balanced / Ultra)
    const btnGfxPerf = document.getElementById('btn-gfx-perf');
    const btnGfxBal = document.getElementById('btn-gfx-balanced');
    const btnGfxUltra = document.getElementById('btn-gfx-ultra');

    if (btnGfxPerf && btnGfxBal && btnGfxUltra) {
      const applyGfxPills = (quality) => {
        this.settings.graphicsQuality = quality;
        btnGfxPerf.classList.toggle('active', quality === 'performance');
        btnGfxBal.classList.toggle('active', quality === 'balanced');
        btnGfxUltra.classList.toggle('active', quality === 'ultra');
        this.saveSettings();
        if (this._onGraphicsQualityChange) this._onGraphicsQualityChange(quality);
      };

      btnGfxPerf.addEventListener('click', () => applyGfxPills('performance'));
      btnGfxBal.addEventListener('click', () => applyGfxPills('balanced'));
      btnGfxUltra.addEventListener('click', () => applyGfxPills('ultra'));

      const currentQ = this.settings.graphicsQuality || 'balanced';
      applyGfxPills(currentQ);
    }

    // Frame Rate Limit Selector (60, 120, 144, 240, Unlimited)
    const fpsLimitPills = document.querySelectorAll('#group-fps-limit .setting-pill');
    if (fpsLimitPills && fpsLimitPills.length > 0) {
      const applyFpsLimit = (limit) => {
        this.settings.fpsLimit = String(limit);
        fpsLimitPills.forEach(p => {
          p.classList.toggle('active', p.dataset.fps === String(limit));
        });
        this.saveSettings();
        if (this._onFpsLimitChange) this._onFpsLimitChange(limit);
      };

      fpsLimitPills.forEach(pill => {
        pill.addEventListener('click', () => {
          applyFpsLimit(pill.dataset.fps);
        });
      });

      const currentFpsLimit = this.settings.fpsLimit || 'unlimited';
      applyFpsLimit(currentFpsLimit);
    }

    // Toggles
    const fpsToggle = document.getElementById('setting-show-fps');
    if (fpsToggle) {
      fpsToggle.checked = this.settings.showFps;
      fpsToggle.addEventListener('change', () => {
        this.settings.showFps = fpsToggle.checked;
        this.saveSettings();
        this.applySettings();
      });
    }

    const dmgToggle = document.getElementById('setting-show-dmg-numbers');
    if (dmgToggle) {
      dmgToggle.checked = this.settings.showDmgNumbers;
      dmgToggle.addEventListener('change', () => {
        this.settings.showDmgNumbers = dmgToggle.checked;
        this.saveSettings();
      });
    }

    // ElevenLabs API Key
    const keyInput = document.getElementById('setting-elevenlabs-key');
    const saveKeyBtn = document.getElementById('btn-save-voice-key');
    if (keyInput && saveKeyBtn) {
      keyInput.value = voiceEngine.apiKey || '';
      saveKeyBtn.addEventListener('click', () => {
        voiceEngine.setApiKey(keyInput.value);
        saveKeyBtn.textContent = 'Saved!';
        soundEngine.playLootPickup();
        setTimeout(() => { saveKeyBtn.textContent = 'Save'; }, 1500);
      });
    }
  }

  /** Register an external toggle callback (e.g., for QuestJournalUI) */
  registerQuestJournalToggle(fn) { this._questJournalToggle = fn; }

  /** Register Graphics Quality change listener */
  onGraphicsQualityChange(callback) { this._onGraphicsQualityChange = callback; }

  /** Register FPS Limit change listener */
  onFpsLimitChange(callback) { this._onFpsLimitChange = callback; }

  /** Loading Screen Control */
  updateLoadingProgress(pct, statusText, loreTip = null) {
    const clamped = Math.min(100, Math.max(0, pct));
    if (this.loadingBarFill) this.loadingBarFill.style.width = `${clamped}%`;
    if (this.loadingPercentText) this.loadingPercentText.textContent = `${Math.round(clamped)}%`;
    if (this.loadingStatusText && statusText) this.loadingStatusText.textContent = statusText.toUpperCase();
    if (loreTip && this.loadingTip) this.loadingTip.textContent = loreTip;
  }

  showEnterSpireButton(onEnter) {
    const btn = document.getElementById('btn-enter-spire');
    if (!btn) {
      if (onEnter) onEnter();
      return;
    }
    btn.classList.remove('hidden');

    const handleEnter = (e) => {
      if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'Enter') return;
      window.removeEventListener('keydown', handleEnter);
      btn.removeEventListener('click', handleEnter);
      btn.classList.add('hidden');
      if (onEnter) onEnter();
    };

    btn.addEventListener('click', handleEnter);
    window.addEventListener('keydown', handleEnter);
  }

  hideLoadingScreen() {
    if (this.loadingScreen) {
      this.loadingScreen.style.transition = 'opacity 0.8s ease-out';
      this.loadingScreen.style.opacity = '0';
      setTimeout(() => {
        this.loadingScreen.classList.add('hidden');
        this.loadingScreen.style.opacity = '';
      }, 800);
    }
    if (this._embersAnimationId) {
      cancelAnimationFrame(this._embersAnimationId);
      this._embersAnimationId = null;
    }
  }

  initLoadingEmbersCanvas() {
    const canvas = document.getElementById('loading-embers-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Multi-layer 3D Depth Particle System (Far stars, Mid embers, Close blazing sparks)
    const particles = [];
    const colors = ['#ffd700', '#ff9100', '#00e5ff', '#bf5af2', '#ffffff'];

    for (let i = 0; i < 90; i++) {
      const depth = Math.random(); // 0 = far, 1 = near
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        depth,
        radius: depth > 0.7 ? Math.random() * 3.0 + 1.8 : depth > 0.35 ? Math.random() * 1.8 + 0.9 : Math.random() * 1.0 + 0.4,
        vy: -(depth * 1.8 + 0.3),
        vx: (Math.random() - 0.5) * (depth * 0.8 + 0.2),
        wobbleSpeed: Math.random() * 0.03 + 0.01,
        wobbleAmp: Math.random() * 25 + 5,
        baseAlpha: depth > 0.7 ? 0.9 : depth > 0.35 ? 0.65 : 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulseOffset: Math.random() * Math.PI * 2
      });
    }

    let time = 0;
    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(time * p.wobbleSpeed * 60 + p.pulseOffset) * 0.4;

        if (p.y < -20) {
          p.y = canvas.height + 20;
          p.x = Math.random() * canvas.width;
        }

        const alphaPulse = Math.sin(time * 3 + p.pulseOffset) * 0.25;
        const currentAlpha = Math.max(0.1, Math.min(1.0, p.baseAlpha + alphaPulse));

        ctx.save();
        ctx.globalAlpha = currentAlpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.depth > 0.6 ? 16 : 6;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Extra motion flare for close blazing sparks
        if (p.depth > 0.75) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 5);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.radius * 0.6;
          ctx.stroke();
        }
        ctx.restore();
      }

      this._embersAnimationId = requestAnimationFrame(animate);
    };
    animate();
  }

  /** Proximity Voice Chat HUD Controls */
  registerVoiceToggle(fn) {
    this._onVoiceToggle = fn;
    this.voiceHudIndicator?.addEventListener('click', () => {
      if (this._onVoiceToggle) this._onVoiceToggle();
    });
  }

  registerMicModeChange(fn) {
    this._onMicModeChange = fn;
  }

  registerMicThresholdChange(fn) {
    this._onMicThresholdChange = fn;
  }

  updateVoiceStatus(isHardwareMuted, mode = 'open_mic', isSpeaking = false) {
    if (!this.voiceHudIndicator || !this.voiceStatusText) return;
    if (isHardwareMuted) {
      this.voiceHudIndicator.className = 'voice-hud-badge muted';
      this.voiceStatusText.textContent = 'PROXIMITY MIC: MUTED [V]';
    } else if (mode === 'open_mic') {
      if (isSpeaking) {
        this.voiceHudIndicator.className = 'voice-hud-badge speaking';
        this.voiceStatusText.textContent = '🎙️ TRANSMITTING (OPEN MIC)';
      } else {
        this.voiceHudIndicator.className = 'voice-hud-badge';
        this.voiceStatusText.textContent = '🎙️ OPEN MIC [V: Mute]';
      }
    } else {
      if (isSpeaking) {
        this.voiceHudIndicator.className = 'voice-hud-badge speaking';
        this.voiceStatusText.textContent = '🎙️ TALKING [V]';
      } else {
        this.voiceHudIndicator.className = 'voice-hud-badge';
        this.voiceStatusText.textContent = '🎙️ TOGGLE [V]';
      }
    }
  }

  /** Register callback to re-engage pointer lock upon closing any menu */
  registerPointerLockResume(fn) { this._resumePointerLock = fn; }

  // ─────────── Escape & Settings ───────────

  toggleEscapeMenu(force = null) {
    const shouldOpen = force !== null ? force : !this.isEscapeOpen;
    this.isEscapeOpen = shouldOpen;
    if (shouldOpen) {
      this.escapeMenu?.classList.remove('hidden');
      soundEngine.playMenuOpen();
      if (document.exitPointerLock) document.exitPointerLock();
    } else {
      this.escapeMenu?.classList.add('hidden');
      soundEngine.playMenuClose();
      if (this._resumePointerLock) this._resumePointerLock();
    }
  }

  toggleSettings(force = null) {
    const shouldOpen = force !== null ? force : !this.isSettingsOpen;
    this.isSettingsOpen = shouldOpen;
    if (shouldOpen) {
      this.settingsModal?.classList.remove('hidden');
      soundEngine.playMenuOpen();
      if (document.exitPointerLock) document.exitPointerLock();
    } else {
      this.settingsModal?.classList.add('hidden');
      soundEngine.playMenuClose();
      if (this._resumePointerLock) this._resumePointerLock();
    }
  }

  toggleControls(force = null) {
    const shouldOpen = force !== null ? force : (this.controlsModal?.classList.contains('hidden') ?? true);
    if (shouldOpen) {
      this.controlsModal?.classList.remove('hidden');
      soundEngine.playMenuOpen();
      if (document.exitPointerLock) document.exitPointerLock();
    } else {
      this.controlsModal?.classList.add('hidden');
      soundEngine.playMenuClose();
      if (this._resumePointerLock) this._resumePointerLock();
    }
  }

  showActiveSpellTimer(name, icon, duration) {
    if (!this.activeSpellTimer) return;
    this.activeSpellTimer.classList.remove('hidden');
    if (this.activeSpellIcon) this.activeSpellIcon.textContent = icon;
    if (this.activeSpellName) this.activeSpellName.textContent = `${name}:`;
    if (this.activeSpellSeconds) this.activeSpellSeconds.textContent = `${duration.toFixed(1)}s`;
    if (this.activeSpellFill) this.activeSpellFill.style.width = '100%';
  }

  updateActiveSpellTimer(remaining, total) {
    if (!this.activeSpellTimer) return;
    if (remaining <= 0) {
      this.activeSpellTimer.classList.add('hidden');
      return;
    }
    if (this.activeSpellSeconds) this.activeSpellSeconds.textContent = `${remaining.toFixed(1)}s`;
    if (this.activeSpellFill) {
      const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
      this.activeSpellFill.style.width = `${pct}%`;
    }
  }

  getSensitivity() { return this.settings.sensitivity / 100; }
  getFOV() { return this.settings.fov; }
  shouldShowDmgNumbers() { return this.settings.showDmgNumbers; }

  // ─────────── Online / Lobby ───────────

  setOnlinePeerId(peerId) {
    if (this.webrtcPeerId) this.webrtcPeerId.textContent = peerId;
  }

  showRoomWaiting(roomId, isHost, players) {
    this.roomLobbyPanel.classList.remove('hidden');
    this.displayRoomCode.textContent = roomId;
    if (isHost) {
      this.btnStartGame.classList.remove('disabled');
      this.hostStartHint.style.display = 'none';
    } else {
      this.btnStartGame.classList.add('disabled');
      this.hostStartHint.style.display = 'block';
    }
    this.updateLobbyPlayerList(players);
  }

  updateLobbyPlayerList(players) {
    if (!this.lobbyPlayerList) return;
    this.lobbyPlayerList.innerHTML = '';
    this.partyCount.textContent = players.length;

    players.forEach(p => {
      const item = document.createElement('div');
      item.className = 'lobby-player-item';
      const avatar = CLASS_SPELLS[p.wizardClass]?.avatar || '🪄';
      const role = CLASS_SPELLS[p.wizardClass]?.role || 'DPS';
      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.4rem;">${avatar}</span>
          <strong>${p.name}</strong>
        </div>
        <span style="color:var(--arcane-cyan);text-transform:uppercase;font-size:0.8rem;font-weight:700;">
          ${p.wizardClass} (${role})
        </span>
      `;
      this.lobbyPlayerList.appendChild(item);
    });
  }

  // ─────────── Game Start ───────────

  startGameHUD(localPlayer) {
    this.localPlayer = localPlayer;
    this.lobbyScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.crosshair.classList.remove('hidden');
    this.clickHint.classList.remove('hidden');

    const classConfig = CLASS_SPELLS[localPlayer.wizardClass] || CLASS_SPELLS.pyromancer;
    this.hudAvatar.textContent = classConfig.avatar;
    this.hudPlayerName.textContent = localPlayer.name;
    this.hudClassTitle.textContent = `${classConfig.title} (${classConfig.role})`;

    // Custom Glowing Vector SVG Icons
    if (this.iconBasic) this.iconBasic.innerHTML = CUSTOM_ICONS[classConfig.basic.id] || CUSTOM_ICONS.basic_wand;
    if (this.iconSkill1) this.iconSkill1.innerHTML = CUSTOM_ICONS[classConfig.skill1.id] || CUSTOM_ICONS.fireball;
    if (this.costSkill1) this.costSkill1.textContent = `${classConfig.skill1.mana} MP`;
    if (this.iconSkill2) this.iconSkill2.innerHTML = CUSTOM_ICONS[classConfig.skill2.id] || CUSTOM_ICONS.flame_wave;
    if (this.costSkill2) this.costSkill2.textContent = `${classConfig.skill2.mana} MP`;
    if (this.iconUlt) this.iconUlt.innerHTML = CUSTOM_ICONS[classConfig.ult.id] || CUSTOM_ICONS.fire_tornado;
    if (this.costUlt) this.costUlt.textContent = `${classConfig.ult.mana} MP`;

    const iconDash = document.getElementById('icon-dash');
    if (iconDash) iconDash.innerHTML = CUSTOM_ICONS.blink_dash;

    // Custom Utility HUD Button Icons
    const btnInv = document.getElementById('btn-toggle-inventory');
    if (btnInv) btnInv.innerHTML = CUSTOM_ICONS.inventory;
    const btnGrim = document.getElementById('btn-toggle-grimoire');
    if (btnGrim) btnGrim.innerHTML = CUSTOM_ICONS.grimoire;
    const btnJourn = document.getElementById('btn-toggle-journal');
    if (btnJourn) btnJourn.innerHTML = CUSTOM_ICONS.journal;
    const btnTal = document.getElementById('btn-toggle-talents');
    if (btnTal) {
      const badge = document.getElementById('talent-points-badge');
      btnTal.innerHTML = CUSTOM_ICONS.talents;
      if (badge) btnTal.appendChild(badge);
    }

    this.renderTalents(localPlayer.wizardClass);
    soundEngine.startMusic('dungeon');
  }

  // ─────────── HUD Updates ───────────

  updatePlayerHUD(player) {
    if (!player) return;
    this.localPlayer = player;

    const hpRatio = Math.max(0, Math.min(1, player.health / player.maxHealth));
    if (this.hudHealthFill) this.hudHealthFill.style.height = `${hpRatio * 100}%`;
    if (this.hudHealthText) this.hudHealthText.textContent = `${Math.round(player.health)} / ${player.maxHealth}`;

    const mpRatio = Math.max(0, Math.min(1, player.mana / player.maxMana));
    if (this.hudManaFill) this.hudManaFill.style.height = `${mpRatio * 100}%`;
    if (this.hudManaText) this.hudManaText.textContent = `${Math.round(player.mana)} / ${player.maxMana}`;

    // Low health blood vignette screen effect
    if (this.bloodVignette) {
      if (hpRatio <= 0.35 && player.isAlive) {
        this.bloodVignette.classList.remove('hidden');
        this.bloodVignette.style.opacity = `${(1 - hpRatio / 0.35) * 0.75 + 0.25}`;
      } else {
        this.bloodVignette.classList.add('hidden');
      }
    }

    if (player.talentPoints > 0) {
      this.talentPointsBadge.classList.remove('hidden');
      this.talentPointsBadge.textContent = player.talentPoints;
    } else {
      this.talentPointsBadge.classList.add('hidden');
    }
    this.talentPointsCount.textContent = player.talentPoints || 0;
  }

  updateLevelBadge(level) {
    if (this.hudLevelBadge) this.hudLevelBadge.textContent = `Lv ${level}`;
  }

  updateXPBar(xp, xpToNext, level) {
    const ratio = xpToNext > 0 ? Math.min(1, xp / xpToNext) : 0;
    if (this.xpBarFill) this.xpBarFill.style.width = `${ratio * 100}%`;
    if (this.xpBarText) this.xpBarText.textContent = `${xp} / ${xpToNext} XP`;
    this.updateLevelBadge(level);
  }

  // ─────────── Kill Feed ───────────

  addKillFeedEntry(text) {
    if (!this.killFeed) return;
    const entry = document.createElement('div');
    entry.className = 'kill-feed-entry';
    entry.textContent = text;
    this.killFeed.appendChild(entry);

    // Auto-remove after 6 seconds
    setTimeout(() => {
      entry.style.opacity = '0';
      entry.style.transition = 'opacity 0.5s ease';
      setTimeout(() => entry.remove(), 500);
    }, 6000);

    // Cap to 8 entries
    while (this.killFeed.childNodes.length > 8) {
      this.killFeed.removeChild(this.killFeed.firstChild);
    }
  }

  // ─────────── Level Up Celebration ───────────

  showLevelUp(newLevel) {
    soundEngine.playLevelUp();
    if (this.levelUpOverlay && this.levelUpDetail) {
      this.levelUpDetail.textContent = `Level ${newLevel} Reached!`;
      this.levelUpOverlay.classList.remove('hidden');
      setTimeout(() => this.levelUpOverlay.classList.add('hidden'), 2800);
    }
    this.updateLevelBadge(newLevel);
  }

  // ─────────── Death / Respawn ───────────

  showDeathScreen(respawnSeconds = 10, onInstantRespawn = null) {
    if (!this.deathOverlay) return;
    this.deathOverlay.classList.remove('hidden');
    if (document.exitPointerLock) document.exitPointerLock();
    soundEngine.playDeathSting();

    if (this.deathTimer) {
      this.deathTimer.textContent = `Temporal Reconstitution in ${respawnSeconds}s...`;
    }

    const btn = document.getElementById('btn-instant-respawn');
    if (btn) {
      btn.onclick = () => {
        if (onInstantRespawn) onInstantRespawn();
      };
    }
  }

  updateDeathCountdown(seconds) {
    if (this.deathTimer && this.deathOverlay && !this.deathOverlay.classList.contains('hidden')) {
      this.deathTimer.textContent = `Temporal Reconstitution in ${seconds}s...`;
    }
  }

  hideDeathScreen() {
    this.isPartyWiped = false;
    if (this.deathTimerInterval) clearInterval(this.deathTimerInterval);
    this.deathOverlay?.classList.add('hidden');
  }

  showPartyWipe() {
    if (this.isPartyWiped || (this.wipeOverlay && !this.wipeOverlay.classList.contains('hidden'))) return;
    this.isPartyWiped = true;
    this.wipeOverlay?.classList.remove('hidden');
    soundEngine.playDeathSting();
  }

  // ─────────── Buff/Debuff ───────────

  updateBuffBar(buffs = []) {
    if (!this.buffBar) return;
    this.buffBar.innerHTML = '';
    buffs.forEach(buff => {
      const icon = document.createElement('div');
      icon.className = 'buff-icon';
      icon.textContent = buff.icon;
      icon.title = buff.name;
      if (buff.duration) {
        const timer = document.createElement('span');
        timer.className = 'buff-timer';
        timer.textContent = `${Math.ceil(buff.duration)}s`;
        icon.appendChild(timer);
      }
      this.buffBar.appendChild(icon);
    });
  }

  // ─────────── FPS Counter ───────────

  updateFPS(fps) {
    if (this.fpsCounter && this.settings.showFps) {
      this.fpsCounter.textContent = `${Math.round(fps)} FPS`;
    }
  }

  // ─────────── Quest Tracker ───────────

  updateQuestTracker(questInfo, distance) {
    if (!questInfo) return;
    this.questActTitle.textContent = questInfo.actTitle;
    this.questStepTitle.textContent = questInfo.stepTitle;
    this.questStepDesc.textContent = questInfo.stepDesc;
    this.questStepProgress.textContent = `Step ${questInfo.stepNumber} of ${questInfo.totalSteps}`;
    this.questDistanceTag.textContent = `Waypoint: ${distance}m`;
  }

  // ─────────── Party HUD ───────────

  updatePartyHUD(players, localPlayerId) {
    if (!this.partyHudList) return;
    this.partyHudList.innerHTML = '';

    players.forEach(p => {
      if (p.id === localPlayerId) return;
      const card = document.createElement('div');
      card.className = 'party-member-card';
      const avatar = CLASS_SPELLS[p.wizardClass]?.avatar || '🪄';
      const role = CLASS_SPELLS[p.wizardClass]?.role || 'DPS';
      const hpRatio = Math.max(0, Math.min(1, p.health / p.maxHealth));

      card.innerHTML = `
        <div class="party-avatar">${avatar}</div>
        <div class="party-info">
          <div class="party-name">${p.name} <small style="color:var(--arcane-cyan);">[${role}]</small></div>
          <div class="party-hp-track">
            <div class="party-hp-fill" style="width:${hpRatio * 100}%;"></div>
          </div>
        </div>
      `;
      this.partyHudList.appendChild(card);
    });
  }

  // ─────────── Combat ───────────

  triggerHitmarker(isCrit = false) {
    if (!this.hitmarker) return;
    this.hitmarker.classList.remove('hidden');
    if (isCrit) {
      this.hitmarker.style.filter = 'drop-shadow(0 0 10px #ffd700)';
      this.hitmarker.style.transform = 'translate(-50%, -50%) scale(1.4)';
    } else {
      this.hitmarker.style.filter = 'drop-shadow(0 0 6px #ff3b30)';
      this.hitmarker.style.transform = 'translate(-50%, -50%) scale(1.0)';
    }
    soundEngine.playHitmarker(isCrit);
    clearTimeout(this._hitmarkerTimer);
    this._hitmarkerTimer = setTimeout(() => {
      this.hitmarker.classList.add('hidden');
      this.hitmarker.style.transform = 'translate(-50%, -50%) scale(1.0)';
    }, 130);
  }

  showLootNotification(item) {
    this.lootName.textContent = item.name;
    this.lootNotification.classList.remove('hidden');
    soundEngine.playLootPickup();
    setTimeout(() => this.lootNotification.classList.add('hidden'), 3000);
  }

  updateCooldowns(cdManager) {
    const config = CLASS_SPELLS[this.selectedClass] || CLASS_SPELLS.pyromancer;
    this.setCooldownOverlay(this.cdBasic, cdManager.getProgress('basic', config.basic.cd));
    this.setCooldownOverlay(this.cdSkill1, cdManager.getProgress('skill1', config.skill1.cd));
    this.setCooldownOverlay(this.cdSkill2, cdManager.getProgress('skill2', config.skill2.cd));
    this.setCooldownOverlay(this.cdUlt, cdManager.getProgress('ult', config.ult.cd));
    this.setCooldownOverlay(this.cdDash, cdManager.getProgress('dash', 3.0));
  }

  setCooldownOverlay(el, ratio) {
    if (!el) return;
    el.style.height = ratio > 0 ? `${ratio * 100}%` : '0%';
  }

  // ─────────── Interaction / Story ───────────

  showInteractionPrompt(show, text = '') {
    if (show) {
      this.interactionPrompt.classList.remove('hidden');
      this.interactLabel.textContent = text;
    } else {
      this.interactionPrompt.classList.add('hidden');
    }
  }

  showStoryMessage(text) {
    this.storyBanner.classList.remove('hidden');
    this.storyText.textContent = text;
    soundEngine.playPuzzleSolve();
    setTimeout(() => this.storyBanner.classList.add('hidden'), 6000);
  }

  appendChatMessage(sender, msgClass, message, distText = '', channel = 'proximity') {
    const p = document.createElement('div');
    p.className = 'chat-msg';
    const color = msgClass === 'pyromancer' ? '#ff3b30' : msgClass === 'cryomancer' ? '#00e5ff' : msgClass === 'luminary' ? '#ffc107' : '#bf5af2';
    const channelTag = channel === 'proximity'
      ? `<span class="chat-channel" style="color:#ba68c8;font-size:0.75rem;margin-right:4px;">[Prox${distText}]</span>`
      : `<span class="chat-channel" style="color:#ffd700;font-size:0.75rem;margin-right:4px;">[Party]</span>`;

    p.innerHTML = `${channelTag}<span class="chat-sender" style="color:${color};font-weight:700;">[${sender}]:</span> <span class="chat-body" style="color:#ffffff;">${message}</span>`;
    this.chatMessages.appendChild(p);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  // ─────────── Modals ───────────

  toggleLecternModal(forceState = null) {
    const shouldOpen = forceState !== null ? forceState : this.lecternModal.classList.contains('hidden');
    if (shouldOpen) {
      this.lecternModal.classList.remove('hidden');
      soundEngine.playPuzzleSolve();
    } else {
      this.lecternModal.classList.add('hidden');
    }
  }

  toggleTalentModal(forceState = null) {
    const shouldOpen = forceState !== null ? forceState : this.talentModal.classList.contains('hidden');
    if (shouldOpen) {
      this.talentModal.classList.remove('hidden');
      soundEngine.playMenuOpen();
    } else {
      this.talentModal.classList.add('hidden');
      soundEngine.playMenuClose();
    }
  }

  renderTalents(wizardClass = 'pyromancer') {
    const tree = TALENT_TREES[wizardClass] || TALENT_TREES.pyromancer;
    if (this.talentClassTitle) {
      this.talentClassTitle.innerHTML = `${tree.crest} ${tree.className} Specialization Tree`;
      this.talentClassTitle.style.color = tree.themeColor;
    }
    if (this.talentPointsCount) {
      this.talentPointsCount.textContent = this.localPlayer?.talentPoints ?? 0;
    }
    if (!this.talentNodesContainer) return;
    this.talentNodesContainer.innerHTML = '';

    const branchesWrapper = document.createElement('div');
    branchesWrapper.className = 'talent-branches-wrapper';

    tree.branches.forEach(branch => {
      const branchCol = document.createElement('div');
      branchCol.className = 'talent-branch-column';
      branchCol.innerHTML = `
        <div class="branch-header" style="border-left: 4px solid ${tree.themeColor};">
          <h3>${branch.name}</h3>
          <p>${branch.desc}</p>
        </div>
        <div class="branch-nodes-list"></div>
      `;

      const nodesList = branchCol.querySelector('.branch-nodes-list');

      branch.talents.forEach((talent, idx) => {
        const isUnlocked = !!this.localPlayer?.talents?.[talent.key];
        const reqMet = !talent.requires || !!this.localPlayer?.talents?.[talent.requires];
        const canUnlock = !isUnlocked && reqMet && (this.localPlayer?.talentPoints || 0) > 0;

        const nodeEl = document.createElement('div');
        nodeEl.className = `talent-node-card ${isUnlocked ? 'unlocked' : ''} ${!reqMet ? 'prereq-locked' : ''}`;
        const iconSvg = CUSTOM_ICONS[talent.icon] || CUSTOM_ICONS[talent.key] || getCustomIcon('talents');

        nodeEl.innerHTML = `
          <div class="node-header">
            <div class="node-icon-frame" style="border-color:${isUnlocked ? tree.themeColor : '#555'};">${iconSvg}</div>
            <div class="node-meta">
              <span class="node-tier-tag">TIER ${talent.tier} ${talent.tier === 3 ? '★ CAPSTONE' : ''}</span>
              <h4 style="color:${isUnlocked ? '#ffffff' : '#e0e0e0'};">${talent.title}</h4>
            </div>
          </div>
          <p class="node-desc">${talent.desc}</p>
          ${!reqMet ? `<div class="node-req-notice">🔒 Requires Tier ${talent.tier - 1}</div>` : ''}
          <div class="node-action">
            <button class="node-unlock-btn" id="btn-node-${talent.key}" ${!canUnlock ? 'disabled' : ''}>
              ${isUnlocked ? '✓ ACQUIRED' : (reqMet ? 'Learn Talent (1 PT)' : 'LOCKED')}
            </button>
          </div>
        `;

        if (canUnlock) {
          const btn = nodeEl.querySelector(`#btn-node-${talent.key}`);
          btn.addEventListener('click', () => {
            this.network.upgradeTalent(talent.key);
            soundEngine.playLevelUp();
          });
        }

        nodesList.appendChild(nodeEl);
      });

      branchesWrapper.appendChild(branchCol);
    });

    this.talentNodesContainer.appendChild(branchesWrapper);
  }

  // ─────────── Quiz ───────────

  showQuizModal(quiz, timeLimit = 25) {
    this.quizModal.classList.remove('hidden');
    this.quizResultNotice.classList.add('hidden');
    this.quizTitle.textContent = quiz.title;
    this.quizRiddleText.textContent = `"${quiz.riddle}"`;
    this.quizOptions.innerHTML = '';
    this.quizVotesList.textContent = 'No votes cast yet.';

    let remainingTime = timeLimit;
    this.quizTimer.textContent = `Time Remaining: ${remainingTime}s`;

    if (this.quizTimerInterval) clearInterval(this.quizTimerInterval);
    this.quizTimerInterval = setInterval(() => {
      remainingTime--;
      if (remainingTime <= 0) {
        clearInterval(this.quizTimerInterval);
        this.quizTimer.textContent = 'Evaluating Covenant Decision...';
      } else {
        this.quizTimer.textContent = `Time Remaining: ${remainingTime}s`;
      }
    }, 1000);

    quiz.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.network.voteQuiz(idx);
        soundEngine.playWandCast();
      });
      this.quizOptions.appendChild(btn);
    });
  }

  updateQuizVotes(votes) {
    if (!this.quizVotesList) return;
    this.quizVotesList.innerHTML = '';
    votes.forEach(v => {
      const tag = document.createElement('span');
      tag.style.marginRight = '12px';
      tag.textContent = `${v.playerName} voted [Option ${v.optionIndex + 1}]`;
      this.quizVotesList.appendChild(tag);
    });
  }

  showQuizResult(isCorrect, correctIndex, reward) {
    if (this.quizTimerInterval) clearInterval(this.quizTimerInterval);
    this.quizResultNotice.classList.remove('hidden');

    if (isCorrect) {
      soundEngine.playPuzzleSolve();
      this.quizResultNotice.className = 'quiz-result correct';
      this.quizResultText.textContent = `Wisdom Prevails! (+${reward?.talentPoints || 1} Talent Point)`;
    } else {
      soundEngine.playPuzzleFail();
      this.quizResultNotice.className = 'quiz-result incorrect';
      this.quizResultText.textContent = `The Spire repels your answer! The correct choice was Option ${correctIndex + 1}.`;
    }

    setTimeout(() => this.quizModal.classList.add('hidden'), 4500);
  }

  // ─────────── Victory ───────────

  showVictoryModal(stats, onAscendNgPlus) {
    soundEngine.stopMusic();
    soundEngine.playQuestComplete();
    this.victoryModal.classList.remove('hidden');
    this.victoryStatsList.innerHTML = '';

    stats.forEach(st => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.padding = '6px 12px';
      row.style.background = 'rgba(255,255,255,0.05)';
      row.style.borderRadius = '6px';
      row.innerHTML = `
        <strong>${st.name} (${st.class.toUpperCase()})</strong>
        <span style="color:var(--gold);font-weight:700;">Score: ${st.score}</span>
      `;
      this.victoryStatsList.appendChild(row);
    });

    const btnNgPlus = document.getElementById('btn-ascend-ng-plus');
    if (btnNgPlus) {
      btnNgPlus.onclick = () => {
        this.victoryModal.classList.add('hidden');
        if (onAscendNgPlus) onAscendNgPlus();
      };
    }
  }
}
