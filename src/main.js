import * as THREE from 'three';
import { EngineScene } from './engine/scene.js';
import { PhysicsController } from './engine/physics.js';
import { TowerEnvironment } from './graphics/towerEnvironment.js';
import { AnimationController } from './graphics/animations.js';
import { ParticleSystem } from './graphics/particleSystem.js';
import { SpellVfxDirector } from './graphics/spellVfxDirector.js';
import { FPViewmodel } from './graphics/fpViewmodel.js';
import { AmbientParticles } from './graphics/ambientParticles.js';
import { soundEngine } from './engine/audio.js';
import { onlineNetwork } from './state/webrtcNetwork.js';
import { UIManager } from './ui/uiManager.js';
import { QuestManager } from './systems/questSystem.js';
import { InventorySystem } from './systems/inventorySystem.js';
import { InventoryUI } from './ui/inventoryUI.js';
import { GrimoireUI } from './ui/grimoireUI.js';
import { QuestJournalUI } from './ui/questJournalUI.js';
import { MinimapRenderer } from './ui/minimapRenderer.js';
import { ShopUI } from './ui/shopUI.js';
import { MagicBookUI } from './ui/magicBookUI.js';
import { ChunkLoader } from './engine/chunkLoader.js';
import { CLASS_SPELLS, CooldownManager } from './systems/spells.js';
import { ProgressionSystem, XP_SOURCES } from './systems/progressionSystem.js';
import { rollLoot } from './systems/lootTables.js';
import { TutorialSystem } from './systems/tutorialSystem.js';
import { PlayerEntity } from './entities/player.js';
import { EnemyEntity } from './entities/enemy.js';
import { BossEntity } from './entities/boss.js';
import { BossAstraeaEntity } from './entities/bossAstraea.js';
import { PuzzleBossArena } from './systems/puzzleBossArena.js';
import { voiceEngine } from './engine/voiceNarration.js';
import { achievementSystem } from './systems/achievementSystem.js';
import { storyLoreManager } from './systems/storyLore.js';
import { assetLoader } from './graphics/assetLoader.js';
import { ModelFactory } from './graphics/modelFactory.js';
import { VoiceChatSystem } from './systems/voiceChatSystem.js';
import { GroundSpellManager } from './graphics/groundSpells.js';
import { animationPackManager } from './graphics/animationPack.js';
import { accountClient } from './state/accountClient.js';

/** Loading screen lore tips */
const LOADING_TIPS = [
  'The Archon was once the greatest chronomancer of the Aethelgard Academy...',
  'The three prisms of Floor 1 must align with the northern gate seal.',
  'Luminary healers can resurrect fallen allies with Divine Sanctuary.',
  'Frost Nova can freeze entire groups — perfect for crowd control.',
  'Haste reduces spell cooldowns. Invest in Haste to chain-cast faster.',
  'Press J to open your Quest Journal and track all objectives.',
  'Co-op quizzes award Talent Points when answered correctly.',
  'Legendary items glow with a golden pillar of light when dropped.',
  'Proximity voice chat lets you talk with nearby wizards — press [V] to toggle mute.',
  'Inspect ancient lecterns to uncover forbidden Archon spell formulae.'
];

class GameApp {
  constructor() {
    this.engineScene = new EngineScene('game-container');
    this.physics = new PhysicsController(this.engineScene.camera, this.engineScene.renderer.domElement);
    this.tower = new TowerEnvironment(this.engineScene.scene);
    this.animations = new AnimationController();
    this.particles = new ParticleSystem(this.engineScene.scene);
    this.spellVfx = new SpellVfxDirector(this.engineScene.scene, this.particles, this.engineScene);
    this.groundSpells = new GroundSpellManager(this.engineScene.scene);
    this.cooldowns = new CooldownManager();
    this.questManager = new QuestManager(this.engineScene.scene);
    this.ui = new UIManager(onlineNetwork);
    this.ui.getChatCoordinates = () => (this.localPlayer ? { x: this.localPlayer.position.x, y: this.localPlayer.position.y, z: this.localPlayer.position.z } : null);
    this.progression = new ProgressionSystem();
    this.tutorial = new TutorialSystem();

    // Studio 3D Spatial Proximity Voice Chat (Open Mic + Push to Talk)
    this.voiceChat = new VoiceChatSystem(onlineNetwork, this.engineScene.scene, this.engineScene.camera);
    this.voiceChat.setVoiceMode(this.ui.settings.micMode || 'open_mic');
    this.voiceChat.setNoiseGateThreshold(this.ui.settings.micThreshold || 14);

    this.voiceChat.onPeerSpeakingChange = (peerId, isSpeaking) => {
      const player = this.players.get(peerId) || Array.from(this.players.values()).find(candidate => candidate.peerId === peerId);
      if (player) player.setSpeaking(isSpeaking);
    };

    this.voiceChat.onLocalSpeakingChange = (isSpeaking) => {
      this.ui.updateVoiceStatus(this.voiceChat.isHardwareMuted, this.voiceChat.voiceMode, isSpeaking);
      if (this.localPlayer) this.localPlayer.setSpeaking(isSpeaking);
    };

    this.voiceChat.onLocalMuteChange = (isMuted, mode, isSpeaking) => {
      this.ui.updateVoiceStatus(isMuted, mode, isSpeaking);
      if (this.localPlayer && isMuted) this.localPlayer.setSpeaking(false);
    };

    this.ui.registerVoiceToggle(() => {
      const isMuted = this.voiceChat.toggleMute();
      this.ui.updateVoiceStatus(isMuted, this.voiceChat.voiceMode, this.voiceChat.isLocalSpeaking);
    });

    this.ui.registerMicModeChange((mode) => {
      this.voiceChat.setVoiceMode(mode);
      this.ui.updateVoiceStatus(this.voiceChat.isHardwareMuted, mode, this.voiceChat.isLocalSpeaking);
    });

    this.ui.registerMicThresholdChange((threshold) => {
      this.voiceChat.setNoiseGateThreshold(threshold);
    });

    // RPG Inventory & Grimoire
    this.inventory = new InventorySystem(this.engineScene.scene);
    this.inventoryUI = new InventoryUI(this.inventory);
    this.grimoireUI = new GrimoireUI();
    this.questJournalUI = new QuestJournalUI(this.questManager);
    this.shopUI = new ShopUI(this);
    this.magicBookUI = new MagicBookUI();

    // Asynchronous background chunk-loader for lazy-loading Floor 2 & 3
    this.chunkLoader = new ChunkLoader(this.engineScene.renderer, this.engineScene.scene);

    // Pre-cache in-memory spell voices for zero-latency instant combat casting
    this.initSpellAudioPool();

    // Re-engage pointer lock when closing modals
    this.ui.registerPointerLockResume(() => {
      if (this.isGameActive && !this.isDead) {
        this.physics.domElement?.requestPointerLock?.();
      }
    });

    // Minimap
    this.minimap = new MinimapRenderer();

    // Ambient atmosphere
    this.ambientParticles = new AmbientParticles(this.engineScene.scene);

    // Pre-allocated frustum culling objects to eliminate per-frame GC allocations
    this._cullingFrustum = new THREE.Frustum();
    this._cullingMatrix = new THREE.Matrix4();

    this.fpViewmodel = null;

    // Entities
    this.localPlayer = null;
    this.players = new Map();
    this.enemies = new Map();
    this.boss = null;
    this.currentFloor = 1;
    this.isGameActive = false;
    this.basicAttackCount = 0;
    this.gameTime = 0;

    // Death / Respawn
    this.isDead = false;
    this.respawnTimer = 0;
    this.footstepTimer = 0;
    this.lootCount = 0;

    // Jumping Physics
    this.isGrounded = true;
    this.playerVelocityY = 0;

    // Timing
    this.lastTime = performance.now();
    this.lastNetworkSend = 0;
    this.fpsFrameCount = 0;
    this.fpsLastCalc = performance.now();
    this.currentFps = 60;
    this.targetFps = 0; // 0 = unlimited, or 60, 120, 144, 240
    this.lastRenderTime = performance.now();
    this.saveRevision = 0;
    this.saveQueue = Promise.resolve();
    this.lastSavedFloor = 0;

    this.initNetworkListeners();
    this.initCombatInputs();
    this.setupUIButtons();

    // Fast core boot: only the active floor and first-person kit block entry.
    // Later floors stream through the chunk loader so mid-range machines do not
    // pay for every GLB, shader and floor while sitting at the title screen.
    const TOTAL_LOAD_TIME = 1800;
    const loadStartTime = performance.now();

    // Staged progression milestones across the short core boot
    const STAGES = [
      { atPct: 0, text: 'Awakening Ancient Leylines & Vault Geometry...', tip: 'The Archon once held domain over past, present, and eternity...' },
      { atPct: 30, text: 'Binding the first-floor geometry & spell kit...', tip: 'The next floor streams while you play.' },
      { atPct: 65, text: 'Warming the leyline shader core...', tip: 'Choose Performance in Settings for integrated graphics.' },
      { atPct: 90, text: 'Opening the covenant relay...', tip: 'Voice chat starts only after you grant microphone access.' },
      { atPct: 98, text: 'Harmonizing Astral Frequencies... The Spire Awaits.', tip: 'Ascension is imminent. Prepare your Grimoire.' }
    ];

    let isPreloadFinished = false;
    let isLoadComplete = false;

    // Safety fallback timeout ensuring loading screen unlocks even on slow networks
    setTimeout(() => {
      if (!isPreloadFinished) {
        isPreloadFinished = true;
        console.log('[Loading] Preload safety timeout reached; proceeding.');
      }
    }, 8000);

    // Initialize WebRTC STUN network in background
    onlineNetwork.init((peerId) => {
      this.ui.setOnlinePeerId(peerId);
    });

    // Build initial Floor 1 and Awakening Vault
    this.tower.buildFloor(1);
    this.ambientParticles.setFloor(1);
    this.engineScene.setFloorLighting(1);

    // Core-only preloading. Floor 2 and later are requested on demand.
    Promise.allSettled([
      assetLoader.preloadFloor1(),
      assetLoader.loadGLTFRaw('/models/fp_viewmodel_wand.glb').catch(() => {}),
      animationPackManager.loadPack(),
      this.spellVfx.preloadHeroAssets().then(() => this.spellVfx.warmup(this.engineScene.renderer, this.engineScene.camera)),
      Promise.resolve()
    ]).then(() => {
      isPreloadFinished = true;
      try { this.engineScene.warmupShaders(); } catch (e) {}
      console.log('[SpireGame] Core assets ready; remaining floors stream on demand.');
    }).catch(err => {
      console.warn('[Preload] Non-critical warning:', err);
      isPreloadFinished = true;
    });

    const updateLoading = () => {
      if (isLoadComplete) return;
      const elapsed = performance.now() - loadStartTime;
      const timeProgress = (elapsed / TOTAL_LOAD_TIME) * 100;
      // Cap at 99% until all asynchronous preloading tasks are 100% resolved
      const progress = isPreloadFinished ? Math.min(100, timeProgress) : Math.min(99, timeProgress);

      // Find active stage text
      let currentStage = STAGES[0];
      for (const s of STAGES) {
        if (progress >= s.atPct) currentStage = s;
      }

      const statusText = (!isPreloadFinished && progress >= 99)
        ? 'Finalizing the core spell and shader kit...'
        : currentStage.text;

      this.ui.updateLoadingProgress(progress, statusText, currentStage.tip);

      // Present entry as soon as the core is ready; no arbitrary wait for every floor.
      if (progress >= 100 && isPreloadFinished) {
        isLoadComplete = true;
        this.ui.updateLoadingProgress(100, 'ASCENSION READY. THE SPIRE AWAITS.', 'Click or Press Space to enter the Vault.');
        
        // Present glowing "ENTER THE SPIRE [SPACE]" button (Zero background loading during gameplay)
        this.ui.showEnterSpireButton(() => {
          this.ui.hideLoadingScreen();
          soundEngine.startMusic('archives');
        });
        return;
      }

      requestAnimationFrame(updateLoading);
    };

    requestAnimationFrame(updateLoading);

    // Register Quest Journal toggle
    this.ui.registerQuestJournalToggle(() => this.questJournalUI.toggle());

    // Start 60fps render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  clearEncounterEntities() {
    // Discard transient combat visuals when a room/floor is reset so pooled
    // projectiles, fields, text and lights cannot survive into the next arena.
    this.spellVfx?.clear();
    for (const entity of this.enemies.values()) entity.destroy?.();
    this.enemies.clear();
    if (this.boss) {
      this.boss.destroy?.();
      this.boss = null;
    }
  }

  applyPuzzleSnapshot(puzzles = {}) {
    const prismState = puzzles?.floor1?.prisms;
    if (Array.isArray(prismState)) {
      for (const prism of prismState) {
        const item = this.tower.interactables.find(interactable => interactable.type === 'prism' && Number(interactable.id) === Number(prism.id));
        const headGroup = item?.mesh?.userData?.headGroup;
        if (!headGroup) continue;
        headGroup.rotation.y = THREE.MathUtils.degToRad(Number(prism.angle) || 0);
        item.isAligned = Boolean(prism.isAligned);
      }
    }

    const floorPuzzle = puzzles?.[`floor${this.currentFloor}`];
    if (Array.isArray(floorPuzzle?.crucibles)) {
      for (const [index, crucible] of floorPuzzle.crucibles.entries()) {
        const item = this.tower.interactables.find(interactable => interactable.type === 'crucible' && Number(interactable.index) === index);
        const fluid = item?.mesh?.userData?.fluid;
        const light = item?.mesh?.userData?.light;
        if (fluid?.material) fluid.material.emissiveIntensity = crucible.charged ? 3.8 : 0.9;
        if (light) light.intensity = crucible.charged ? 4.5 : 2.2;
        if (item) item.isCharged = Boolean(crucible.charged);
      }
    }

    if (Array.isArray(floorPuzzle?.keystones)) {
      for (const keystone of floorPuzzle.keystones) {
        const item = this.tower.interactables.find(interactable => interactable.type === 'keystone' && (interactable.id === keystone.id || interactable.direction === keystone.id));
        const beam = item?.mesh?.userData?.beam;
        if (beam?.material) beam.material.opacity = keystone.active ? 0.95 : 0.35;
        if (item) item.isActive = Boolean(keystone.active);
      }
    }

    // Reconnects can arrive after a non-boss puzzle was solved. Reflect the
    // server gate state immediately so the prompt and portal visuals agree
    // before the next movement snapshot arrives.
    if (this.tower.exitPortal && [1, 2, 3].includes(this.currentFloor) && floorPuzzle) {
      this.tower.exitPortal.isUnlocked = Boolean(floorPuzzle.unlocked || floorPuzzle.keystones?.every(keystone => keystone.active));
    }

    if (this.currentFloor === 10 && this.puzzleArena && puzzles?.floor10) {
      this.puzzleArena.syncServerState(puzzles.floor10);
    }
  }

  async saveCampaignCheckpoint() {
    if (!accountClient.session?.user || !this.localPlayer) return;
    const payload = {
      floor: this.currentFloor,
      level: this.progression.level,
      xp: this.progression.xp,
      attributes: this.inventory.baseAttributes,
      equipment: this.inventory.equipment,
      bag: this.inventory.bag,
      settings: this.ui.settings,
      clearedCheckpoints: [Math.max(0, this.currentFloor - 1)],
      wizardClass: this.localPlayer.wizardClass,
      talents: this.localPlayer.talents,
      talentPoints: this.localPlayer.talentPoints,
      objective: this.questManager.getServerObjective?.() || null,
      ascensionTier: onlineNetwork.ascensionTier || 0
    };
    this.saveQueue = this.saveQueue.catch(() => {}).then(async () => {
      try {
        const saved = await accountClient.saveCampaign(payload, this.saveRevision);
        this.saveRevision = saved.revision;
        this.lastSavedFloor = this.currentFloor;
        this.ui.setAccountStatus(`Campaign checkpoint saved at Floor ${this.currentFloor}.`);
      } catch (error) {
        this.ui.setAccountStatus(`Checkpoint pending: ${error.message}`, true);
      }
    });
    return this.saveQueue;
  }

  setupUIButtons() {
    // Wire Graphics Quality settings to EngineScene
    this.ui.onGraphicsQualityChange((quality) => {
      this.engineScene.setGraphicsQuality(quality);
      this.spellVfx?.setQualityProfile(quality);
    });
    this.engineScene.setGraphicsQuality(this.ui.settings.graphicsQuality || 'balanced');
    this.spellVfx.setQualityProfile(this.ui.settings.graphicsQuality || 'balanced');
    this.spellVfx.setReducedMotion(Boolean(this.ui.settings.reducedVfx));
    this.ui.onReducedVfxChange?.((enabled) => this.spellVfx.setReducedMotion(enabled));

    // Wire Frame Rate Limit settings (60, 120, 144, 240, Unlimited)
    this.setFpsLimit(this.ui.settings.fpsLimit || 'unlimited');
    this.ui.onFpsLimitChange((limit) => {
      this.setFpsLimit(limit);
    });

    const btnInv = document.getElementById('btn-toggle-inventory');
    if (btnInv) btnInv.addEventListener('click', () => this.inventoryUI.toggle());

    const btnGrim = document.getElementById('btn-toggle-grimoire');
    if (btnGrim) btnGrim.addEventListener('click', () => {
      const cls = this.localPlayer ? this.localPlayer.wizardClass : 'pyromancer';
      this.grimoireUI.render(cls);
      this.grimoireUI.toggle();
    });

    // Keyboard shortcuts for modals & Voice Chat Mute
    window.addEventListener('keydown', (e) => {
      if (!this.isGameActive || document.activeElement.tagName === 'INPUT') return;

      if (e.code === 'KeyI' || e.code === 'KeyC') {
        this.inventoryUI.toggle();
      } else if (e.code === 'KeyK') {
        const cls = this.localPlayer ? this.localPlayer.wizardClass : 'pyromancer';
        this.grimoireUI.render(cls);
        this.grimoireUI.toggle();
      } else if (e.code === 'KeyJ') {
        this.questJournalUI.toggle();
      } else if (e.code === 'KeyV') {
        const isMuted = this.voiceChat.toggleMute();
        this.ui.updateVoiceStatus(isMuted, this.voiceChat.voiceMode, this.voiceChat.isLocalSpeaking);
      }
    });
  }

  initNetworkListeners() {
    onlineNetwork.on('network_status', (data) => {
      if (data?.state === 'reconnecting') {
        this.ui.setAccountStatus('Covenant relay reconnecting; your wizard is held for 30 seconds.', true);
      } else if (data?.state === 'connected' && !accountClient.session?.user) {
        this.ui.setAccountStatus('Covenant relay connected.');
      }
    });
    onlineNetwork.on('network_error', (data) => {
      this.ui.setAccountStatus(data?.message || 'The covenant relay is unavailable.', true);
    });
    onlineNetwork.on('error_message', (data) => {
      this.ui.showStoryMessage(data?.message || 'The relay rejected that action.');
    });

    onlineNetwork.on('peer_connected', (peerId) => {
      this.voiceChat.callPeer(peerId);
    });

    onlineNetwork.on('room_created', (data) => {
      this.ui.showRoomWaiting(data.roomId, true, [data.player]);
    });

    onlineNetwork.on('room_joined', (data) => {
      this.ui.showRoomWaiting(data.roomId, false, data.players);
    });

    onlineNetwork.on('player_joined', (data) => {
      const playersList = Array.isArray(data?.players) && data.players.length
        ? data.players
        : Array.from(this.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          wizardClass: p.wizardClass
        }));
      if (!playersList.some(player => player.id === data?.player?.id)) playersList.push(data.player);
      this.ui.updateLobbyPlayerList(playersList);

      // Spawn remote wizard character immediately if joined during active ascent
      if (this.isGameActive && data.player && data.player.id !== onlineNetwork.localPlayerId) {
        if (!this.players.has(data.player.id)) {
          const newPlayer = new PlayerEntity(this.engineScene.scene, data.player, false);
          this.players.set(data.player.id, newPlayer);
          this.ui.addKillFeedEntry(`🧙 ${newPlayer.name} ([${newPlayer.wizardClass}]) has entered the Spire!`);
        }
      }
    });

    onlineNetwork.on('player_left', (data) => {
      this.voiceChat.unregisterRemoteStream(data.socketId);
      const entity = this.players.get(data.socketId);
      if (entity) {
        entity.destroy();
        this.players.delete(data.socketId);
        this.ui.addKillFeedEntry(`${entity.name} has disconnected.`);
      }
    });

    onlineNetwork.on('player_disconnected', (data) => {
      const entity = this.players.get(data.socketId);
      if (entity) {
        entity.isAlive = false;
        entity.mesh.visible = false;
        this.ui.addKillFeedEntry(`${entity.name} lost the leyline connection; holding their place.`);
      }
    });

    onlineNetwork.on('player_reconnected', (data) => {
      const oldEntity = this.players.get(data.oldSocketId);
      if (oldEntity) {
        oldEntity.destroy();
        this.players.delete(data.oldSocketId);
      }
      if (data.player && data.player.id !== onlineNetwork.localPlayerId) {
        this.players.set(data.player.id, new PlayerEntity(this.engineScene.scene, data.player, false));
      }
      this.ui.addKillFeedEntry(`${data.player?.name || 'A wizard'} reconnected to the covenant.`);
    });

    onlineNetwork.on('room_resumed', (data) => {
      if (data?.gameStarted) this.ui.setAccountStatus('Covenant restored. Rejoining the active ascent.');
    });

    onlineNetwork.on('promoted_to_host', (data = {}) => {
      if (!this.isGameActive && onlineNetwork.roomId) {
        const players = Array.isArray(data.players) && data.players.length
          ? data.players
          : Array.from(this.players.values()).map(player => ({
            id: player.id,
            name: player.name,
            wizardClass: player.wizardClass
          }));
        this.ui.showRoomWaiting(onlineNetwork.roomId, true, players);
      }
      this.ui.setAccountStatus('The covenant host disconnected. You are now leading the ascent.');
    });
    onlineNetwork.on('host_migrated', (data = {}) => {
      if (data.hostPeerId && data.hostPeerId !== onlineNetwork.peerId) {
        onlineNetwork.connectVoicePeer(data.hostPeerId);
      }
    });

    onlineNetwork.on('objective_update', (data) => {
      if (data?.floor) this.questManager.setServerObjective(data);
      if (data?.complete) this.ui.showStoryMessage(`Objective complete: ${data.label}`);
    });

    onlineNetwork.on('action_rejected', (data) => {
      if (data?.reason === 'objective_incomplete' && data.objective) {
        this.questManager.setServerObjective(data.objective);
        this.ui.showStoryMessage(`Not ready: ${data.objective.label}.`);
      } else if (data?.reason === 'cooldown') {
        if (data.spellType && Number.isFinite(Number(data.retryIn))) {
          this.cooldowns.trigger(data.spellType, Number(data.retryIn), 0);
        }
        this.ui.showStoryMessage('That spell is still cooling down.');
      } else if (data?.action === 'leyline_charge' || data?.action === 'leyline_align') {
        if (this.puzzleArena && data.puzzle) this.puzzleArena.syncServerState(data.puzzle);
        const messages = {
          out_of_range: 'Move closer to the leyline pedestal.',
          matching_spell_required: 'Use the matching elemental spell on that pedestal.',
          invalid_projectile: 'That spell did not strike the pedestal.',
          not_charged: 'Charge the pedestal before rotating its mirror.',
          player_unavailable: 'You cannot interact while disconnected or defeated.'
        };
        this.ui.showStoryMessage(messages[data.reason] || 'The leyline rejects that action.');
      } else if (data?.action === 'upgrade_talent') {
        const messages = {
          no_talent_points: 'You have no Talent Points available.',
          invalid_talent: 'That talent is not part of your class specialization.',
          prerequisite_required: 'Unlock the prerequisite talent first.'
        };
        this.ui.showStoryMessage(messages[data.reason] || 'The talent cannot be unlocked yet.');
      } else if (data?.action === 'crucible_interact' || data?.action === 'rotate_prism' || data?.action === 'keystone_activate') {
        this.ui.showStoryMessage(data.reason === 'out_of_range' ? 'Move closer to interact with the puzzle.' : 'The puzzle rejects that action.');
      }
    });

    onlineNetwork.on('input_rejected', (data) => {
      if (!this.localPlayer || !data?.position) return;
      this.localPlayer.position.set(data.position.x, data.position.y || 0, data.position.z);
      this.localPlayer.targetPos.copy(this.localPlayer.position);
    });

    onlineNetwork.on('player_effect', (data) => {
      if (!data) return;
      const player = this.players.get(data.playerId) || (this.localPlayer && (this.localPlayer.id === data.playerId || data.playerId === onlineNetwork.localPlayerId) ? this.localPlayer : null);
      if (!player) return;
      if (data.effect === 'heal' && data.source === 'party' && !this.ui.settings.reducedVfx) {
        this.spellVfx?.particles.spawnHealingBeam(player.position, player.position, 0.55, data.element === 'chrono' ? 'chrono' : 'light');
      }
      if (!this.ui.shouldShowDmgNumbers()) return;
      const color = data.effect === 'heal' || data.effect === 'regeneration' ? '#63e6a2' : '#ff6b6b';
      const prefix = data.effect === 'heal' || data.effect === 'regeneration' ? '+' : '-';
      if (Number(data.amount) > 0) this.particles.spawnFloatingText(player.position, `${prefix}${Math.round(data.amount)}`, color);
    });

    onlineNetwork.on('profile_applied', (data) => {
      if (!this.localPlayer || !data) return;
      this.localPlayer.maxHealth = data.maxHealth || this.localPlayer.maxHealth;
      this.localPlayer.maxMana = data.maxMana || this.localPlayer.maxMana;
      if (data.talents) this.localPlayer.talents = data.talents;
      if (Number.isFinite(Number(data.talentPoints))) this.localPlayer.talentPoints = data.talentPoints;
      this.ui.updatePlayerHUD(this.localPlayer);
    });

    onlineNetwork.on('game_started', (data) => {
      console.log('[Client] Spire ascent initiated! Floor:', data.floor, 'Players:', data.players);
      this.clearEncounterEntities();
      for (const entity of this.players.values()) entity.destroy?.();
      this.players.clear();
      this.localPlayer = null;
      this.isGameActive = true;
      this.currentFloor = data.floor || 1;
      this.tower.buildFloor(this.currentFloor);
      this.chunkLoader.preloadFloor(this.currentFloor).catch(error => console.warn('[Streaming] Current floor asset note:', error));
      this.chunkLoader.preloadFloor(this.currentFloor + 1, {
        onComplete: result => console.log(`[Streaming] Floor ${result.floor} ready (${result.loaded}/${result.total} assets).`)
      }).catch(error => console.warn('[Streaming] Next floor asset note:', error));
      this.ambientParticles.setFloor(this.currentFloor);
      this.questManager.setFloor(this.currentFloor);
      if (data.objective) this.questManager.setServerObjective(data.objective);
      if (this.puzzleArena) {
        this.puzzleArena.destroy();
        this.puzzleArena = null;
      }
      if (this.currentFloor === 10) {
        this.puzzleArena = new PuzzleBossArena(this.engineScene.scene, this.particles, this.engineScene);
        this.puzzleArena.onBeamAligned = (aligned, total) => {
          this.ui.showStoryMessage(`Leyline Aligned (${aligned}/${total})! Astraea's shield destabilizes!`);
          if (this.boss && this.boss.setAlignedBeams) this.boss.setAlignedBeams(aligned);
        };
      }
      this.applyPuzzleSnapshot(data.puzzles);

      const playersList = data.players || [];
      let localPData = playersList.find(p =>
        p.id === onlineNetwork.localPlayerId ||
        p.id === onlineNetwork.socket?.id ||
        (onlineNetwork.localPlayerName && p.name === onlineNetwork.localPlayerName)
      );
      if (!localPData && playersList.length > 0) {
        localPData = playersList[0];
      }

      playersList.forEach(pData => {
        const isLocal = (pData === localPData || pData.id === onlineNetwork.localPlayerId || pData.id === onlineNetwork.socket?.id);
        const player = new PlayerEntity(this.engineScene.scene, pData, isLocal);
        this.players.set(pData.id, player);

        if (isLocal) {
          this.localPlayer = player;
          onlineNetwork.localPlayerId = pData.id;
          player.mesh.visible = false;
          if (this.fpViewmodel) this.fpViewmodel.destroy();
          this.fpViewmodel = new FPViewmodel(this.engineScene.camera, player.wizardClass);
          this.ui.startGameHUD(player);
        }
      });

      if (!this.localPlayer && this.players.size > 0) {
        const first = this.players.values().next().value;
        this.localPlayer = first;
        onlineNetwork.localPlayerId = first.id;
        first.isLocal = true;
        first.mesh.visible = false;
        if (this.fpViewmodel) this.fpViewmodel.destroy();
        this.fpViewmodel = new FPViewmodel(this.engineScene.camera, first.wizardClass);
        this.ui.startGameHUD(first);
      }

      // Show initial tutorial & achievements
      this.tutorial.tryShowTip('movement');
      achievementSystem.unlock('first_step');
      // Microphone access is intentionally requested only after entering a
      // session, keeping the title screen permission-free.
      this.voiceChat.init().then(ok => {
        if (ok) this.ui.updateVoiceStatus(this.voiceChat.isHardwareMuted, this.voiceChat.voiceMode, this.voiceChat.isLocalSpeaking);
      }).catch(() => {});
      onlineNetwork.syncProfile({
        level: this.progression.level,
        xp: this.progression.xp,
        attributes: this.inventory.baseAttributes,
        talents: this.localPlayer?.talents,
        talentPoints: this.localPlayer?.talentPoints
      });
      accountClient.me().then(async (session) => {
        if (!session?.user) return;
        try {
          const save = await accountClient.getSave();
          if (save?.payload) {
            this.saveRevision = save.revision || 0;
            this.progression.level = Math.max(1, Math.min(15, Number(save.payload.level) || 1));
            this.progression.xp = Math.max(0, Number(save.payload.xp) || 0);
            if (save.payload.attributes && typeof save.payload.attributes === 'object') {
              for (const key of Object.keys(this.inventory.baseAttributes)) {
                const value = Number(save.payload.attributes[key]);
                if (Number.isFinite(value)) this.inventory.baseAttributes[key] = Math.max(0, Math.min(999, value));
              }
            }
            if (save.payload.equipment && typeof save.payload.equipment === 'object') {
              for (const key of Object.keys(this.inventory.equipment)) {
                if (save.payload.equipment[key]) this.inventory.equipment[key] = save.payload.equipment[key];
              }
            }
            if (Array.isArray(save.payload.bag)) this.inventory.bag = save.payload.bag.slice(0, 24).concat(new Array(Math.max(0, 24 - save.payload.bag.length)).fill(null));
            if (this.localPlayer && save.payload.talents && typeof save.payload.talents === 'object') {
              this.localPlayer.talents = Object.fromEntries(Object.entries(save.payload.talents).slice(0, 24).map(([key, value]) => [String(key).slice(0, 48), Boolean(value)]));
              this.localPlayer.talentPoints = Math.max(0, Math.min(32, Number(save.payload.talentPoints) || 0));
            }
            if (save.payload.settings && typeof save.payload.settings === 'object') {
              this.ui.settings = { ...this.ui.settings, ...save.payload.settings };
              this.ui.saveSettings();
              this.ui.applySettings();
            }
            this.ui.updateXPBar(this.progression.xp, this.progression.getXPToNextLevel(), this.progression.level);
            this.ui.setAccountStatus(`Campaign loaded from Floor ${save.payload.floor || 1}.`);
            onlineNetwork.syncProfile({
              level: this.progression.level,
              xp: this.progression.xp,
              attributes: this.inventory.baseAttributes,
              talents: this.localPlayer?.talents,
              talentPoints: this.localPlayer?.talentPoints
            });
          }
        } catch (error) { this.ui.setAccountStatus(`Campaign load pending: ${error.message}`, true); }
      });

      // Grand Scribe Alistair voiced introduction
      setTimeout(() => {
        voiceEngine.speak('alistair_act1_intro');
      }, 1200);
    });

    onlineNetwork.on('state_snapshot', (data) => {
      if (!this.isGameActive) return;
      // initFloor broadcasts the new snapshot before the matching floor event.
      // Wait for that event to tear down the old scene instead of treating the
      // previous floor's actors as defeated loot.
      if (data?.floor && data.floor !== this.currentFloor) return;
      if (data.objective) this.questManager.setServerObjective(data.objective);
      this.applyPuzzleSnapshot(data.puzzles);

      data.players.forEach(pData => {
        const isLocal = (pData.id === onlineNetwork.localPlayerId || (this.localPlayer && this.localPlayer.id === pData.id));
        const existing = this.players.get(pData.id);
        if (existing) {
          existing.peerId = pData.peerId || existing.peerId || null;
          if (isLocal && existing.health > pData.health) {
            const dmgTaken = existing.health - pData.health;
            this.engineScene.addScreenShake(Math.min(0.45, 0.15 + (dmgTaken / 80) * 0.25), 0.3);
            this.engineScene.triggerDamageFlash(Math.min(1.0, 0.4 + (dmgTaken / 50) * 0.6));
          }
          if (!existing.isLocal && !isLocal) {
            existing.targetPos.set(pData.x, pData.y || 0, pData.z);
            existing.rotationY = pData.rotY || 0;
          } else if (isLocal && pData.lastInputSeq !== undefined) {
            // Reconcile only material divergence; normal latency is hidden by
            // prediction while the server remains authoritative.
            const error = Math.hypot(existing.position.x - pData.x, existing.position.y - (pData.y || 0), existing.position.z - pData.z);
            if (error > 2.5) {
              existing.position.set(pData.x, pData.y || 0, pData.z);
              existing.targetPos.copy(existing.position);
            }
            existing.lastServerInputSeq = pData.lastInputSeq;
          }
          existing.health = pData.health;
          existing.mana = pData.mana;
          existing.talentPoints = pData.talentPoints;
          existing.talents = pData.talents;
          existing.isAlive = pData.isAlive;
          existing.score = pData.score;
          if (!existing.isLocal) existing.mesh.visible = pData.connected !== false && pData.isAlive !== false;
          if (existing.syncHealth) {
            existing.syncHealth(pData.health, pData.maxHealth);
          }

          // Handle death detection for local player
          if (isLocal && !pData.isAlive && !this.isDead) {
            this.isDead = true;
            this.respawnTimer = 10;
            this.ui.showDeathScreen(10, () => this.resurrectLocalPlayer());
            this.engineScene.addScreenShake(0.5, 0.6);
            soundEngine.playDeath();
          } else if (isLocal && pData.isAlive && this.isDead) {
            this.resurrectLocalPlayer(pData.x, pData.y, pData.z);
          }
        } else {
          const newPlayer = new PlayerEntity(this.engineScene.scene, pData, isLocal);
          this.players.set(pData.id, newPlayer);
          if (!isLocal && (pData.connected === false || pData.isAlive === false)) newPlayer.mesh.visible = false;
          if (isLocal) {
            this.localPlayer = newPlayer;
            newPlayer.mesh.visible = false;
          }
        }
      });

      // Check for party wipe
      if (data.players.length > 0 && data.players.every(p => !p.isAlive)) {
        this.ui.showPartyWipe();
      }

      if (this.localPlayer) {
        this.ui.updatePlayerHUD(this.localPlayer);
        this.ui.updatePartyHUD(data.players, onlineNetwork.localPlayerId);
      }

      // Sync Enemies
      const serverEnemyIds = new Set(data.enemies.map(e => e.id));
      for (const [id, enemyEntity] of this.enemies) {
        if (!serverEnemyIds.has(id)) {
          // Enemy defeated! Roll loot, soul dissolution VFX, and add kill feed
          const enemyType = enemyEntity.type || 'sentinel';
          this.particles.spawnSoulDissolution(enemyEntity.position, enemyType === 'boss' ? 0xffd700 : 0x9333ea, 24);
          this.engineScene.addScreenShake(enemyType === 'boss' ? 0.35 : 0.12, 0.25);

          const loot = rollLoot(enemyType);
          if (loot) {
            this.inventory.spawnWorldDrop(enemyEntity.position, loot);
          }

          // Award Physical 3D Gold Coins
          const goldDrop = Math.floor(Math.random() * 25 + 15);
          this.particles.spawnPhysicalCoins(enemyEntity.position, 4, goldDrop, (val) => {
            if (this.localPlayer) {
              this.localPlayer.gold = (this.localPlayer.gold || 100) + val;
            }
            soundEngine.playCoinPickup();
          });

          // Award XP
          const xpAmount = enemyType === 'boss' ? XP_SOURCES.BOSS_KILL : XP_SOURCES.ENEMY_KILL;
          const lvlResult = this.progression.addXP(xpAmount);
          this.ui.updateXPBar(this.progression.xp, this.progression.getXPToNextLevel(), this.progression.level);
          if (lvlResult.leveledUp) {
            this.ui.showLevelUp(lvlResult.newLevel);
            // Tutorial trigger for grimoire after earning skill point
            this.tutorial.tryShowTip('grimoire');
          }

          this.ui.addKillFeedEntry(`Defeated ${enemyEntity.name || enemyType}! (+${xpAmount} XP, +${goldDrop} Gold)`);

          if (enemyEntity.destroyWithDissolve) {
            enemyEntity.destroyWithDissolve();
          } else {
            enemyEntity.destroy();
          }
          this.enemies.delete(id);
        }
      }

      // Check if active boss was defeated
      if (this.boss && !serverEnemyIds.has(this.boss.id)) {
        this.particles.spawnSoulDissolution(this.boss.position, 0xffd700, 48);
        this.engineScene.addScreenShake(0.45, 0.6);
        const xpAmount = XP_SOURCES.BOSS_KILL;
        const lvlResult = this.progression.addXP(xpAmount);
        this.ui.updateXPBar(this.progression.xp, this.progression.getXPToNextLevel(), this.progression.level);
        if (lvlResult.leveledUp) this.ui.showLevelUp(lvlResult.newLevel);
        this.ui.addKillFeedEntry(`Defeated ${this.boss.name}! (+${xpAmount} XP, +100 Gold)`);
        this.particles.spawnPhysicalCoins(this.boss.position, 8, 100, (val) => {
          if (this.localPlayer) this.localPlayer.gold = (this.localPlayer.gold || 100) + val;
          soundEngine.playCoinPickup();
        });
        this.boss.triggerDeath();
        const defeatedBoss = this.boss;
        this.boss = null;
        setTimeout(() => {
          defeatedBoss.destroy();
        }, 2000);

        // 15-SECOND POST-KILL MELTDOWN FAIL-SAFE CHECK
        if (this.puzzleArena && !this.puzzleArena.isContained && this.puzzleArena.alignedCount < this.puzzleArena.totalBeams) {
          this.ui.showMeltdownBanner(15.0, this.puzzleArena.pedestals);
          this.puzzleArena.startMeltdown(
            (rem) => this.ui.updateMeltdownBanner(rem, this.puzzleArena.pedestals),
            () => {
              this.ui.setMeltdownContained();
              this.ui.showStoryMessage('✨ MELTDOWN CONTAINED! Leylines stabilized before catastrophic detonation!');
              achievementSystem.unlock('leyline_savior');
            },
            () => {
              this.ui.showStoryMessage('💥 CORE DETONATION! The chamber collapsed!');
              if (this.localPlayer) {
                this.localPlayer.health = 0;
                this.isDead = true;
                this.respawnTimer = 10.0;
                this.ui.showDeathScreen(10);
              }
            }
          );
        }
      }

      data.enemies.forEach(eData => {
        if (eData.type === 'boss') {
          if (!this.boss) {
            if (eData.bossType === 'astraea' || eData.id?.includes('astraea')) {
              this.boss = new BossAstraeaEntity(this.engineScene.scene, eData);
            } else {
              this.boss = new BossEntity(this.engineScene.scene, eData);
            }
            this.tutorial.tryShowTip('combat');
          } else {
            this.boss.sync(eData);
          }
        } else {
          let enemy = this.enemies.get(eData.id);
          if (!enemy) {
            enemy = new EnemyEntity(this.engineScene.scene, eData);
            this.enemies.set(eData.id, enemy);
            // Trigger combat tutorial on first enemy
            if (this.enemies.size === 1) this.tutorial.tryShowTip('combat');
          } else {
            enemy.sync(eData);
          }
        }
      });
    });

    onlineNetwork.on('spell_cast', (data) => {
      // Avoid duplicate effects if predicted locally
      if (data.casterId === onlineNetwork.localPlayerId || (this.localPlayer && data.casterId === this.localPlayer.id)) {
        // The relay is authoritative for adjusted mana costs and cooldowns
        // (equipment, talents and difficulty can change both). Reconcile the
        // local prediction as soon as the accepted cast comes back.
        if (this.localPlayer && Number.isFinite(Number(data.mana))) {
          this.localPlayer.mana = Math.max(0, Math.min(this.localPlayer.maxMana, Number(data.mana)));
        }
        if (data.spellType && Number.isFinite(Number(data.cooldown))) {
          this.cooldowns.trigger(data.spellType, Number(data.cooldown), 0);
        }
        return;
      }
      const origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
      const direction = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z);
      this.spellVfx.playCast({
        spellId: data.spellId,
        spellType: data.spellType,
        origin,
        direction,
        element: data.element,
        damage: data.damage,
        seed: data.token,
        source: 'remote'
      });

      if (data.element === 'fire') {
        if (data.spellType === 'ult') soundEngine.playFlameExplosion();
        else soundEngine.playFireball();
      } else if (data.element === 'frost') {
        if (data.spellType === 'ult' || data.spellType === 'skill1') soundEngine.playFrostNova();
        else if (data.spellType === 'skill2') soundEngine.playArcaneShield();
        else soundEngine.playIceLance();
      } else if (data.element === 'light') {
        if (data.spellType === 'ult') soundEngine.playDivineSanctuary();
        else soundEngine.playRadiantHeal();
      } else if (data.element === 'chrono') {
        soundEngine.playChrono();
      } else {
        soundEngine.playWandCast();
      }

      const caster = this.players.get(data.casterId);
      if (caster && !caster.isLocal) caster.triggerCastAnimation();
    });

    onlineNetwork.on('enemy_attack', (data) => {
      soundEngine.playEnemyMelee();
      if (this.boss && data.enemyId === this.boss.id) {
        this.boss.triggerAttack('stomp');
      }
    });

    onlineNetwork.on('enemy_ability', (data) => {
      if (data.ability === 'arcane_laser') {
        soundEngine.playSentinelLaser();
        const origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
        const target = new THREE.Vector3(data.targetPos.x, data.targetPos.y, data.targetPos.z);
        const dir = target.clone().sub(origin).normalize();
        this.particles.spawnProjectile(origin, dir, 'basic', 'frost');
      } else if (data.ability === 'ground_slam') {
        soundEngine.playGolemSlam();
        const origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
        this.particles.spawnImpactShockwave(origin, 0xff3d00, data.radius || 5.5, 0.65);
        this.engineScene.addScreenShake(0.32, 0.4);
      } else if (data.ability === 'void_missile') {
        soundEngine.playShadeBolt();
        const origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
        const target = new THREE.Vector3(data.targetPos.x, data.targetPos.y, data.targetPos.z);
        const dir = target.clone().sub(origin).normalize();
        this.particles.spawnProjectile(origin, dir, 'basic', 'chrono');
      }
    });

    onlineNetwork.on('player_respawned', (data) => {
      if (data.playerId === onlineNetwork.localPlayerId) {
        this.resurrectLocalPlayer(data.x, data.y, data.z);
      } else {
        const remote = this.players.get(data.playerId);
        if (remote) {
          remote.resurrect(new THREE.Vector3(data.x, data.y, data.z));
          this.particles.spawnChronomancyBurst(new THREE.Vector3(data.x, data.y + 0.5, data.z), 0x00e5ff);
        }
      }
    });

    onlineNetwork.on('floating_text', (data) => {
      if (!this.ui.shouldShowDmgNumbers()) return;
      const pos = new THREE.Vector3(data.x, data.y, data.z);
      this.particles.spawnFloatingText(pos, data.text, data.color);
    });

    onlineNetwork.on('puzzle_update', (data) => {
      if (data.type === 'prism_rotated') {
        const item = this.tower.interactables.find(i => i.id === data.prismId);
        if (item && item.mesh) {
          const targetRad = (data.angle * Math.PI) / 180;
          item.mesh.userData.headGroup.rotation.y = targetRad;
          soundEngine.playPuzzleSolve();
        }
        if (data.allAligned) {
          if (this.tower.exitPortal) this.tower.exitPortal.isUnlocked = true;
          this.ui.showStoryMessage('The light prisms connect! The gateway unseals!');
          this.questManager.advanceStep();
          voiceEngine.speak('alistair_prism_aligned');

          if (this.boss && this.boss.bossType === 'xyris') {
            this.groundSpells.spawnPrismaticMandala(this.boss.position, 8.0, 6.0);
            this.ui.showStoryMessage('✨ Prismatic Convergence! The 4 beams focus on Xyris, shattering the Void Ward!');
          }

          // XP for puzzle
          const lvlResult = this.progression.addXP(XP_SOURCES.PUZZLE_SOLVED);
          this.ui.updateXPBar(this.progression.xp, this.progression.getXPToNextLevel(), this.progression.level);
          if (lvlResult.leveledUp) this.ui.showLevelUp(lvlResult.newLevel);
        }
      } else if (data.type === 'crucible_charge') {
        soundEngine.playPuzzleSolve();
        this.ui.showStoryMessage(`The ${data.element.toUpperCase()} Crucible has ignited with magic!`);
        if (data.step >= 3) {
          this.questManager.advanceStep();
          voiceEngine.speak('ignatius_act2_complete');
          if (this.boss && this.boss.bossType === 'ignis') {
            this.groundSpells.spawnMoltenSurge(this.boss.position, 12.0, 2.5);
            this.ui.showStoryMessage('⚡ The Crucible Triad detonates! Ignis Molten Shield is shattered!');
          }
          const lvlResult = this.progression.addXP(XP_SOURCES.PUZZLE_SOLVED);
          this.ui.updateXPBar(this.progression.xp, this.progression.getXPToNextLevel(), this.progression.level);
          if (lvlResult.leveledUp) this.ui.showLevelUp(lvlResult.newLevel);
        } else {
          voiceEngine.speak('ignatius_crucible_charge');
        }
      } else if (data.type === 'crucible_reset') {
        soundEngine.playPuzzleFail();
        this.ui.showStoryMessage(data.message);
        voiceEngine.speak('ignatius_crucible_reset');
      } else if (data.type === 'keystone_activated') {
        const item = this.tower.interactables.find(i => i.id === data.keystoneId);
        if (item && item.mesh) {
          item.mesh.userData.beam.material.opacity = 0.95;
          soundEngine.playPuzzleSolve();
        }
        voiceEngine.speak('valerius_keystone_down');
        if (data.allActive) {
          this.questManager.advanceStep();
          voiceEngine.speak('valerius_shield_down');
          if (this.boss && this.boss.bossType === 'valerius') {
            this.groundSpells.spawnAstralNovaSigil(this.boss.position, 14.0, 3.0);
            this.ui.showStoryMessage('🌌 All 4 Temporal Keystones overloaded! Chrono Shield disrupted!');
          }
          const lvlResult = this.progression.addXP(XP_SOURCES.PUZZLE_SOLVED);
          this.ui.updateXPBar(this.progression.xp, this.progression.getXPToNextLevel(), this.progression.level);
          if (lvlResult.leveledUp) this.ui.showLevelUp(lvlResult.newLevel);
        }
      }
    });

    onlineNetwork.on('quiz_start', (data) => {
      this.ui.showQuizModal(data.quiz, data.timeLimit);
      voiceEngine.speak('alistair_quiz_prompt');
    });

    onlineNetwork.on('quiz_votes_update', (data) => {
      this.ui.updateQuizVotes(data.votes);
    });

    onlineNetwork.on('quiz_result', (data) => {
      this.ui.showQuizResult(data.isCorrect, data.correctIndex, data.reward);
      if (data.isCorrect) {
        achievementSystem.unlock('scholar');
        voiceEngine.speak('alistair_quiz_correct');
        const lvlResult = this.progression.addXP(XP_SOURCES.QUIZ_CORRECT);
        this.ui.updateXPBar(this.progression.xp, this.progression.getXPToNextLevel(), this.progression.level);
        if (lvlResult.leveledUp) this.ui.showLevelUp(lvlResult.newLevel);
        if (this.questManager.currentStepIndex === 1) this.questManager.advanceStep();
      }
    });

    onlineNetwork.on('floor_changed', (data) => {
      this.currentFloor = data.floor;
      if (this.groundSpells) this.groundSpells.clear();
      this.clearEncounterEntities();
      if (this.puzzleArena) {
        this.puzzleArena.destroy();
        this.puzzleArena = null;
        this.ui.hideMeltdownBanner();
      }

      this.tower.buildFloor(this.currentFloor);
      this.chunkLoader.preloadFloor(this.currentFloor).catch(error => console.warn('[Streaming] Current floor asset note:', error));
      this.chunkLoader.preloadFloor(this.currentFloor + 1, {
        onComplete: result => console.log(`[Streaming] Floor ${result.floor} ready (${result.loaded}/${result.total} assets).`)
      }).catch(error => console.warn('[Streaming] Next floor asset note:', error));
      this.ambientParticles.setFloor(this.currentFloor);
      this.engineScene.setFloorLighting(this.currentFloor);
      this.questManager.setFloor(this.currentFloor);
      if (data.objective) this.questManager.setServerObjective(data.objective);
      if (this.currentFloor === 10) {
        this.puzzleArena = new PuzzleBossArena(this.engineScene.scene, this.particles, this.engineScene);
        this.puzzleArena.onBeamAligned = (aligned, total) => {
          this.ui.showStoryMessage(`âš¡ Leyline Aligned (${aligned}/${total})! Astraea's shield destabilizes!`);
          if (this.boss && this.boss.setAlignedBeams) this.boss.setAlignedBeams(aligned);
        };
      }
      this.applyPuzzleSnapshot(data.puzzles);

      // Floor cleared XP
      const lvlResult = this.progression.addXP(XP_SOURCES.FLOOR_CLEARED);
      this.ui.updateXPBar(this.progression.xp, this.progression.getXPToNextLevel(), this.progression.level);
      if (lvlResult.leveledUp) this.ui.showLevelUp(lvlResult.newLevel);
      this.ui.addKillFeedEntry(`Floor ${data.floor - 1} cleared! Ascending to Floor ${data.floor}...`);
      this.saveCampaignCheckpoint();

      if (this.currentFloor === 2) {
        achievementSystem.unlock('crucible_breaker');
        soundEngine.startMusic('forge');
        setTimeout(() => voiceEngine.speak('ignatius_act2_intro'), 800);
      } else if (this.currentFloor === 5) {
        soundEngine.startMusic('boss');
        this.ui.showStoryMessage('⚔️ BOSS ENCOUNTER: IGNIS THE MOLTEN BEHEMOTH! Complete the Crucible Triad while fighting!');
      } else if (this.currentFloor === 10) {
        soundEngine.startMusic('boss');
        this.ui.showStoryMessage('⚔️ CLIMACTIC BOSS ENCOUNTER: ASTRAEA, THE DEMON-ANGEL SOVEREIGN! Align the 3 Elemental Leylines to shatter her Prismatic Shield!');
      } else if (this.currentFloor === 9) {
        soundEngine.startMusic('boss');
        this.ui.showStoryMessage('HERO ENCOUNTER: XYRIS, EYE OF THE ABYSS! Survive the void catwalks and break his gaze.');
      } else if (this.currentFloor === 15) {
        soundEngine.startMusic('boss');
        this.ui.showStoryMessage('⚔️ FINAL CONFRONTATION: ARCHON VALERIUS ASCENDANT! Disrupt 4 Temporal Keystones!');
      } else if (this.currentFloor === 3) {
        soundEngine.startMusic('boss');
        setTimeout(() => voiceEngine.speak('valerius_encounter'), 800);
      }
    });

    onlineNetwork.on('floor_retry', (data) => {
      this.currentFloor = data.floor || this.currentFloor;
      if (this.groundSpells) this.groundSpells.clear();
      this.clearEncounterEntities();
      if (this.puzzleArena) {
        this.puzzleArena.destroy();
        this.puzzleArena = null;
        this.ui.hideMeltdownBanner();
      }
      this.tower.buildFloor(this.currentFloor);
      this.ambientParticles.setFloor(this.currentFloor);
      this.engineScene.setFloorLighting(this.currentFloor);
      this.questManager.setFloor(this.currentFloor);
      if (data.objective) this.questManager.setServerObjective(data.objective);
      if (this.currentFloor === 10) {
        this.puzzleArena = new PuzzleBossArena(this.engineScene.scene, this.particles, this.engineScene);
        this.puzzleArena.onBeamAligned = (aligned, total) => {
          this.ui.showStoryMessage(`Leyline Aligned (${aligned}/${total})! Astraea's shield destabilizes!`);
          if (this.boss && this.boss.setAlignedBeams) this.boss.setAlignedBeams(aligned);
        };
      }
      this.applyPuzzleSnapshot(data.puzzles);
      this.ui.hideDeathScreen?.();
      this.ui.hideWipeScreen?.();
      this.ui.showStoryMessage(`Floor ${this.currentFloor} reset. The covenant has another chance.`);
    });

    onlineNetwork.on('boss_defeated_advancement', (data) => {
      if (this.tower.exitPortal) this.tower.exitPortal.isUnlocked = true;
      this.ui.showStoryMessage(data.message || 'The ascent gate is unlocked. Step through it to continue.');
      this.ui.addKillFeedEntry(`Gate unlocked: Floor ${data.nextFloor || this.currentFloor + 1}`);
      this.saveCampaignCheckpoint();
    });

    onlineNetwork.on('boss_phase_change', (data) => {
      if (data.voiceKey) voiceEngine.speak(data.voiceKey, null, null, true);
      soundEngine.playChrono();
      this.engineScene.addScreenShake(0.4, 0.6);
      this.ui.showStoryMessage(`[BOSS] ${data.title}`);
      this.ui.addKillFeedEntry(`⚠️ ARCHON VALERIUS HAS ENTERED ${data.title}!`);
      this.ui.showActiveSpellTimer(data.title, '⚡', 4.0);
    });

    onlineNetwork.on('boss_special', (data) => {
      if (data.voiceKey) voiceEngine.speak(data.voiceKey, null, null, true);

      // Trigger animation on rigged 3D boss model
      if (this.boss) {
        this.boss.triggerAttack(data.ability);
      }

      if (data.ability === 'magma_slam') {
        const targetPos = new THREE.Vector3(data.targetX || 0, 0, data.targetZ || -12);
        this.groundSpells.spawnMagmaCaldera(targetPos, data.duration || 6.0, 5.5, 35);
        this.engineScene.addScreenShake(0.42, 0.6);
        soundEngine.playGolemSlam();
        soundEngine.playFlameExplosion();
        this.ui.showStoryMessage('🌋 IGNIS MAGMA SLAM! Boiling lava caldera erupts on the floor!');
        this.ui.showActiveSpellTimer('Magma Caldera', '🌋', data.duration || 6.0);
      } else if (data.ability === 'magma_surge') {
        const pos = this.boss ? this.boss.position : new THREE.Vector3(0, 0, -12);
        this.groundSpells.spawnMoltenSurge(pos, 14.0, data.duration || 2.5);
        this.engineScene.addScreenShake(0.38, 0.5);
        soundEngine.playFlameExplosion();
        this.ui.showStoryMessage('🔥 IGNIS MOLTEN SURGE! Re-align the 3 Crucibles (Fire -> Frost -> Storm)!');
        this.ui.showActiveSpellTimer('Molten Surge', '🔥', data.duration || 2.5);
      } else if (data.ability === 'void_cataclysm') {
        const pos = this.boss ? this.boss.position : new THREE.Vector3(0, 0, -14);
        this.groundSpells.spawnVoidCataclysm(pos, data.duration || 6.5, 6.5, 40);
        this.engineScene.addScreenShake(0.5, 0.7);
        soundEngine.playShadeBolt();
        this.ui.showStoryMessage('🔮 VOID CATACLYSM! An abyssal event horizon chasm tears open the floor!');
        this.ui.showActiveSpellTimer('Void Cataclysm', '🔮', data.duration || 6.5);
      } else if (data.ability === 'void_missiles') {
        const targetPos = new THREE.Vector3(data.targetX || 0, 0, data.targetZ || -14);
        this.groundSpells.spawnVoidCataclysm(targetPos, data.duration || 4.0, 3.5, 25);
        soundEngine.playShadeBolt();
        this.ui.showStoryMessage('⚠️ Xyris fires Abyssal Missiles — evade ground void rifts!');
        this.ui.showActiveSpellTimer('Abyssal Missiles', '👁️', data.duration || 4.0);
      } else if (data.ability === 'arcane_barrage') {
        const targetPos = new THREE.Vector3(data.targetX || 0, 0, data.targetZ || -15);
        this.particles.spawnArcaneBarrageTelegraph(targetPos, data.duration || 2.0);
        this.groundSpells.spawnChronoDilationDial(targetPos, data.duration || 2.5, 3.2, 25);
        this.ui.showStoryMessage('⚠️ Valerius rains an Arcane Barrage from the cosmos!');
        this.ui.showActiveSpellTimer('Arcane Barrage', '☄️', data.duration || 2.0);
      } else if (data.ability === 'astral_nova') {
        const pos = new THREE.Vector3(data.x || 0, 0, data.z || 0);
        this.groundSpells.spawnAstralNovaSigil(pos, 18.0, data.duration || 3.2);
        this.particles.spawnAstralNova(pos, 18.0, data.duration || 3.0);
        soundEngine.playChrono();
        this.engineScene.addScreenShake(0.45, 0.6);
        this.ui.showStoryMessage('⚠️ ASTRAL NOVA! Dash [Space] to evade the expanding temporal shockwave!');
        this.ui.showActiveSpellTimer('Astral Nova', '🌟', data.duration || 3.2);
      } else if (data.ability === 'chrono_vortex') {
        const vortexPos = new THREE.Vector3(data.x || 0, 0, data.z || 0);
        this.groundSpells.spawnChronoDilationDial(vortexPos, data.duration || 6.0, 7.0, 35);
        this.particles.spawnChronoVortex(vortexPos, data.duration || 4.0);
        soundEngine.playFrostNova();
        this.ui.showStoryMessage('⚠️ Chrono Vortex active! Time is dilating on the floor!');
        this.ui.showActiveSpellTimer('Chrono Vortex', '⌛', data.duration || 4.0);
      } else if (data.ability === 'seraph_caldera') {
        const pos = this.boss ? this.boss.position : new THREE.Vector3(0, 0, -14);
        this.groundSpells.spawnBrimstoneSeraphCaldera(pos, data.duration || 6.5, 6.0, 35);
        if (this.boss && this.boss.triggerAttack) this.boss.triggerAttack('seraph_caldera');
        this.engineScene.addScreenShake(0.42, 0.5);
        soundEngine.playFlameExplosion();
        this.ui.showStoryMessage('🔥 BRIMSTONE SERAPH CALDERA! Sacred magma errupts beneath your feet!');
        this.ui.showActiveSpellTimer('Seraph Caldera', '🔥', data.duration || 6.5);
      } else if (data.ability === 'halo_singularity') {
        const targetPos = new THREE.Vector3(data.targetX || 0, 0, data.targetZ || -14);
        this.groundSpells.spawnHaloSingularityRift(targetPos, data.duration || 5.0, 5.0, 30);
        if (this.boss && this.boss.triggerAttack) this.boss.triggerAttack('queen_cast');
        soundEngine.playShadeBolt();
        this.ui.showStoryMessage('☀️ HALO SINGULARITY RIFT! Gravitational rift pulls wizards inward!');
        this.ui.showActiveSpellTimer('Halo Singularity', '☀️', data.duration || 5.0);
      } else if (data.ability === 'twin_rupture') {
        const targetPos = new THREE.Vector3(data.targetX || 0, 0, data.targetZ || -14);
        this.groundSpells.spawnTwinPrismaticRupture(targetPos, data.duration || 4.5, 18.0, 40);
        if (this.boss && this.boss.triggerAttack) this.boss.triggerAttack('queen_cast');
        this.engineScene.addScreenShake(0.35, 0.45);
        soundEngine.playChrono();
        this.ui.showStoryMessage('⚡ TWIN PRISMATIC RUPTURE! Dual holy-void energy beams sweep the arena!');
        this.ui.showActiveSpellTimer('Twin Rupture', '⚡', data.duration || 4.5);
      } else if (data.ability === 'wing_dash') {
        if (this.boss && this.boss.triggerAttack) this.boss.triggerAttack('wing_dash');
        this.engineScene.addScreenShake(0.2, 0.3);
        this.ui.showStoryMessage('💨 Astraea performs a Winged Tempest Dash!');
      }
    });

    onlineNetwork.on('boss_meltdown_started', (data) => {
      this.engineScene.addScreenShake(0.6, 1.2);
      this.ui.showStoryMessage(data.message || '⚠️ EMERGENCY: 15 SECONDS TO ALIGN LEYLINES OR WIPE!');
      if (this.puzzleArena && !this.puzzleArena.isMeltdownActive) {
        this.ui.showMeltdownBanner(data.duration || 15.0, this.puzzleArena.pedestals);
        this.puzzleArena.startMeltdown(
          (rem) => this.ui.updateMeltdownBanner(rem, this.puzzleArena.pedestals),
          () => {
            this.ui.setMeltdownContained();
            this.ui.showStoryMessage('✨ MELTDOWN CONTAINED! Leylines stabilized!');
          },
          () => {
            this.ui.showStoryMessage('💥 CORE DETONATION!');
            if (this.localPlayer) {
              this.localPlayer.health = 0;
              this.isDead = true;
              this.respawnTimer = 10.0;
              this.ui.showDeathScreen(10);
            }
          }
        );
      }
    });

    onlineNetwork.on('meltdown_contained', (data) => {
      if (this.puzzleArena) this.puzzleArena.containMeltdown();
      this.ui.setMeltdownContained();
      this.ui.showStoryMessage(data.message || '✨ CORE STABILIZED!');
    });

    onlineNetwork.on('encounter_wipe', (data) => {
      this.clearEncounterEntities();
      this.engineScene.addScreenShake(0.8, 1.5);
      this.ui.showStoryMessage(data.message || 'Encounter Wipe! Floor resetting.');
    });

    onlineNetwork.on('leyline_aligned', (data) => {
      if (this.puzzleArena) {
        this.puzzleArena.syncServerState(data.puzzle || {
          pedestals: { [data.pedestalKey]: { isCharged: true, isAligned: true } },
          alignedCount: data.alignedCount
        });
      }
      if (this.boss && this.boss.setAlignedBeams) {
        this.boss.setAlignedBeams(data.alignedCount);
      }
    });

    onlineNetwork.on('leyline_charged', (data) => {
      if (!this.puzzleArena || !data?.pedestalKey) return;
      this.puzzleArena.syncServerState(data.puzzle || {
        pedestals: { [data.pedestalKey]: { isCharged: true, isAligned: Boolean(data.isAligned) } }
      });
    });

    onlineNetwork.on('story_message', (data) => {
      this.ui.showStoryMessage(data.text);
    });

    onlineNetwork.on('chat_message', (data) => {
      let distText = '';
      let isAudible = true;
      if (data.x !== undefined && data.z !== undefined && this.localPlayer) {
        const dx = this.localPlayer.position.x - data.x;
        const dz = this.localPlayer.position.z - data.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        distText = ` (${Math.round(dist)}m)`;
        if (dist > 35 && data.channel === 'proximity') {
          isAudible = false;
        } else {
          const vol = Math.max(0.15, 1.0 - (dist / 35));
          soundEngine.playChatChirp(vol);
        }
      } else {
        soundEngine.playChatChirp(1.0);
      }

      // Display floating 3D speech bubble above avatar in the world
      if (data.senderId) {
        const remotePlayer = this.players.get(data.senderId);
        if (remotePlayer) {
          remotePlayer.showSpeechBubble(data.message);
        } else if (this.localPlayer && (data.senderId === this.localPlayer.id || data.sender === this.localPlayer.name)) {
          this.localPlayer.showSpeechBubble(data.message);
        }
      }

      if (isAudible) {
        this.ui.appendChatMessage(data.sender, data.class, data.message, distText, data.channel);
      }
    });

    onlineNetwork.on('game_victory', (data) => {
      this.isGameActive = false;
      this.footstepTimer = 0;
      if (document.exitPointerLock) document.exitPointerLock();
      soundEngine.stopMusic();
      achievementSystem.unlock('archon_slayer');
      voiceEngine.speak('valerius_defeat');

      // Roll Archon's Mythic Spoils
      const bossDrop = rollLoot('boss');
      if (bossDrop) {
        this.inventory.addItem(bossDrop);
        const lootNotice = document.getElementById('victory-loot-drop');
        if (lootNotice) {
          lootNotice.innerHTML = `🌟 <strong>Mythic Vault Relic:</strong> ${bossDrop.icon} ${bossDrop.name} (${bossDrop.rarity.toUpperCase()})`;
        }
      }
      storyLoreManager.addGold(500);
      this.progression.addXP(500);
      if (this.localPlayer) {
        this.localPlayer.talentPoints = (this.localPlayer.talentPoints || 0) + 3;
        this.ui.updatePlayerHUD(this.localPlayer);
      }
      this.saveCampaignCheckpoint();

      // Allow Valerius's final defeat speech to finish cleanly before popping the victory fanfare modal
      setTimeout(() => {
        this.ui.showVictoryModal(data.stats, () => {
          onlineNetwork.ascendNewGamePlus();
          this.isGameActive = true;
        });
      }, 3200);
    });

    onlineNetwork.on('ascension_started', (data) => {
      this.currentFloor = 1;
      this.tower.buildFloor(1);
      this.ambientParticles.setFloor(1);
      this.engineScene.setFloorLighting(1);
      this.questManager.setFloor(1);
      soundEngine.startMusic('archives');
      soundEngine.playLevelUp();
      this.ui.showStoryMessage(`[🌀 ASCENSION TIER ${data.tier}] The temporal loop resets! All enemies empowered (+${Math.round((data.healthMultiplier - 1) * 100)}% HP)!`);
      this.ui.addKillFeedEntry(`🌀 ASCENSION TIER ${data.tier} ACTIVATED!`);
      this.ui.showActiveSpellTimer(`Ascension Tier ${data.tier}`, '🌀', 6.0);
      this.isGameActive = true;
    });
  }

  initCombatInputs() {
    window.addEventListener('keydown', (e) => {
      if (!this.isGameActive || !this.localPlayer) return;
      if (document.activeElement.tagName === 'INPUT') return;

      if (this.isDead) {
        if (e.code === 'Space') {
          e.preventDefault();
          this.resurrectLocalPlayer();
        }
        return;
      }

      const spells = CLASS_SPELLS[this.localPlayer.wizardClass] || CLASS_SPELLS.pyromancer;

      if (e.code === 'KeyQ') {
        this.tryCastSpell('skill1', spells.skill1);
      } else if (e.code === 'KeyE') {
        this.tryCastSpell('skill2', spells.skill2);
      } else if (e.code === 'KeyR') {
        this.tryCastSpell('ult', spells.ult);
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.tryJump();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        this.tryDash();
      } else if (e.code === 'KeyF') {
        this.tryInteract();
      } else if (e.code === 'KeyV') {
        const isMuted = this.voiceChat.toggleMute();
        this.ui.updateVoiceStatus(isMuted, this.voiceChat.voiceMode, this.voiceChat.isLocalSpeaking);
      }
    });
  }

  tryCastSpell(slot, spellConfig) {
    if (!this.cooldowns.isReady(slot)) return;
    if (this.localPlayer.mana < spellConfig.mana) {
      this.particles.spawnFloatingText(this.localPlayer.position, 'NOT ENOUGH MANA!', '#448aff');
      return;
    }

    const derived = this.inventory.getDerivedStats();
    this.cooldowns.trigger(slot, spellConfig.cd, derived.cdr);
    this.localPlayer.mana = Math.max(0, this.localPlayer.mana - (spellConfig.mana || 0));

    const dir = this.physics.updateCrosshairAim();
    const origin = this.engineScene.camera.position.clone();

    const modifiedDamage = Math.round((spellConfig.damage || 0) * derived.spellPowerMultiplier);

    // Luminary Healer Skill logic
    if (spellConfig.heal) {
      const healAmt = Math.round(spellConfig.heal * derived.healingMultiplier);
      this.localPlayer.health = Math.min(derived.maxHealth, this.localPlayer.health + healAmt);
      this.particles.spawnFloatingText(this.localPlayer.position, `+${healAmt} HP`, '#4caf50');
      soundEngine.playPuzzleSolve();
    }

    // All player spells share one deterministic VFX route. Gameplay effects
    // remain authoritative on the relay; this is render/audio prediction only.
    this.spellVfx.playCast({
      spellId: spellConfig.id,
      spellType: slot,
      origin,
      direction: dir,
      element: spellConfig.element,
      damage: modifiedDamage,
      source: 'local'
    });
    if (spellConfig.id === 'fire_tornado') {
      this.ui.showActiveSpellTimer('Infernal Fire Tornado', '🌪️', 5.0);
      this.activeVortexTimer = { remaining: 5.0, total: 5.0 };
      soundEngine.playFlameExplosion();
      soundEngine.playTornadoWindRoar(5.0);
    } else if (spellConfig.id === 'divine_sanctuary') {
      this.ui.showActiveSpellTimer('Divine Sanctuary', '🌟', 6.0);
      this.activeVortexTimer = { remaining: 6.0, total: 6.0 };
    } else if (spellConfig.id === 'frost_nova') {
      this.ui.showActiveSpellTimer('Glacial Blizzard', '🌨️', 6.0);
      this.activeVortexTimer = { remaining: 6.0, total: 6.0 };
      soundEngine.playFrostNova();
    } else if (spellConfig.id === 'temporal_stasis') {
      this.ui.showActiveSpellTimer('Temporal Stasis', '⏱️', 5.0);
      this.activeVortexTimer = { remaining: 5.0, total: 5.0 };
      soundEngine.playChrono();
    } else if (!spellConfig.heal) {
      // Visuals were already predicted by SpellVfxDirector above.
    }

    onlineNetwork.castSpell({
      spellId: spellConfig.id,
      spellType: slot,
      origin: { x: origin.x, y: origin.y - 0.2, z: origin.z },
      direction: { x: dir.x, y: dir.y, z: dir.z },
      damage: modifiedDamage,
      element: spellConfig.element,
      manaCost: spellConfig.mana
    });

    // Audio SFX & Voiced Incantation
    this.playSpellAudioAndVoice(this.localPlayer.wizardClass, slot, spellConfig.element);

    if (this.fpViewmodel) {
      this.fpViewmodel.triggerCast(slot, slot === 'ult' ? 1.8 : 1.2);
    }

    // Dynamic camera screenshake on heavy spell cast
    if (slot === 'ult') {
      this.engineScene.addScreenShake(0.35, 0.45);
    } else if (slot === 'skill1' || slot === 'skill2') {
      this.engineScene.addScreenShake(0.12, 0.2);
    }

    // Achievements per discipline
    if (spellConfig.element === 'fire') achievementSystem.unlock('pyro_master');
    else if (spellConfig.element === 'frost') achievementSystem.unlock('frost_master');
    else if (spellConfig.element === 'light') achievementSystem.unlock('divine_touch');
    else if (spellConfig.element === 'chrono') achievementSystem.unlock('chrono_shift');

    // Track basic attacks for tutorial
    this.basicAttackCount++;
    if (this.basicAttackCount === 3) this.tutorial.tryShowTip('abilities');
  }

  playSpellAudioAndVoice(wizardClass, slot, element) {
    // 1. Play Studio Sound Effect
    if (element === 'fire') {
      if (slot === 'ult') soundEngine.playFlameExplosion();
      else soundEngine.playFireball();
    } else if (element === 'frost') {
      if (slot === 'ult') soundEngine.playFrostNova();
      else soundEngine.playIceLance();
    } else if (element === 'light') {
      if (slot === 'ult') soundEngine.playDivineSanctuary();
      else soundEngine.playRadiantHeal();
    } else if (element === 'chrono') {
      soundEngine.playChrono();
    } else {
      soundEngine.playWandCast();
    }

    // 2. Play Spell Voice Incantation
    const classPrefixMap = {
      pyromancer: 'pyro_',
      cryomancer: 'cryo_',
      luminary: 'lumi_',
      chronomancer: 'chrono_'
    };
    const prefix = classPrefixMap[wizardClass] || 'pyro_';

    // For basic attacks, play with 35% probability to prevent voice spam
    if (slot === 'basic' && Math.random() > 0.35) return;

    // Throttle voices so lines don't awkwardly cut each other off
    const now = Date.now();
    if (this._lastSpellVoiceTime && (now - this._lastSpellVoiceTime) < 1400 && slot === 'basic') {
      return;
    }
    this._lastSpellVoiceTime = now;

    const key = `${prefix}${slot}`;
    const cached = this.spellAudioMap?.get(key);
    if (cached) {
      try {
        cached.currentTime = 0;
        const vol = (this.ui?.settings?.voiceVol !== undefined ? this.ui.settings.voiceVol : 90) / 100;
        cached.volume = Math.max(0, Math.min(1, vol * 0.95));
        cached.play().catch(() => {});
      } catch (e) {}
    }
  }

  initSpellAudioPool() {
    this.spellAudioMap = new Map();
    const prefixes = ['pyro_', 'cryo_', 'lumi_', 'chrono_'];
    const slots = ['basic', 'skill1', 'skill2', 'ult'];
    prefixes.forEach(p => {
      slots.forEach(s => {
        const key = `${p}${s}`;
        const audio = new Audio(`/audio/voices/spells/${key}.mp3`);
        audio.preload = 'auto';
        this.spellAudioMap.set(key, audio);
      });
    });
  }

  tryJump() {
    if (!this.isGrounded) return;
    this.isGrounded = false;
    this.playerVelocityY = 8.5; // Crisp, responsive upward leap
    soundEngine.playJump();
    if (this.fpViewmodel && this.fpViewmodel.triggerJump) {
      this.fpViewmodel.triggerJump();
    }
  }

  tryDash() {
    if (!this.cooldowns.isReady('dash')) return;
    if (this.localPlayer.mana < 15) return;

    this.cooldowns.trigger('dash', 3.0);
    this.localPlayer.mana -= 15;
    achievementSystem.unlock('chrono_shift');

    const forward = new THREE.Vector3(
      -Math.sin(this.physics.yaw), 0, -Math.cos(this.physics.yaw)
    );

    // Speed warp FOV effect, chromatic aberration surge & camera shake
    const currentBaseFov = this.ui.getFOV();
    this.engineScene.setTargetFOV(currentBaseFov + 14);
    this.engineScene.triggerChromaticSurge(0.012);
    setTimeout(() => {
      this.engineScene.setTargetFOV(currentBaseFov);
    }, 220);
    this.engineScene.addScreenShake(0.18, 0.22);

    this.particles.spawnBurst(this.localPlayer.position, 'storm', 15);
    this.localPlayer.position.addScaledVector(forward, 7.0);
    const maxRadius = this.tower.currentFloor === 2 ? 64.0 : (this.tower.currentFloor === 3 ? 43.0 : 21.0);
    this.physics.resolveCollision(this.localPlayer.position, 0.7, this.tower.colliders, maxRadius, this.tower.currentFloor);
    this.particles.spawnBurst(this.localPlayer.position, 'storm', 15);

    if (this.fpViewmodel) this.fpViewmodel.triggerRecoil(1.5);
    soundEngine.playBlink();
  }

  tryInteract() {
    if (this.puzzleArena && this.localPlayer) {
      const pRes = this.puzzleArena.interactPedestal(this.localPlayer.position);
      if (pRes && pRes.handled) {
        if (pRes.message) this.ui.showStoryMessage(pRes.message);
        return;
      }
    }

    const interactable = this.physics.getNearbyInteractable(this.localPlayer.position, this.tower.interactables);
    if (!interactable) {
      if (this.tower.exitPortal) {
        const dx = this.localPlayer.position.x - this.tower.exitPortal.x;
        const dz = this.localPlayer.position.z - this.tower.exitPortal.z;
        if (Math.sqrt(dx * dx + dz * dz) <= this.tower.exitPortal.radius) {
          onlineNetwork.advanceFloor();
        }
      }
      return;
    }

    // Tutorial: first interactable used
    this.tutorial.tryShowTip('interact');

    if (interactable.type === 'vault_gate') {
      if (this.tower.openVaultGate(this.particles)) {
        soundEngine.playGateOpen();
        this.ui.showStoryMessage('✨ The Arcane Runegate dissolves into starlight! Enter the Forbidden Archives.');
        const idx = this.tower.interactables.findIndex(i => i.id === 'vault_runegate');
        if (idx !== -1) this.tower.interactables.splice(idx, 1);
      }
      return;
    }

    if (interactable.type === 'vault_chest') {
      if (this.tower.openVaultChest(this.particles)) {
        soundEngine.playChestOpen();
        this.particles.spawnPhysicalCoins(new THREE.Vector3(interactable.x, 0.6, interactable.z), 5, 50, (val) => {
          if (this.localPlayer) {
            this.localPlayer.gold = (this.localPlayer.gold || 100) + val;
          }
          soundEngine.playCoinPickup();
        });
        this.ui.showStoryMessage('✨ Unlocked Convict Stash (+50 Gold & Smuggled Elixir)!');
        const idx = this.tower.interactables.findIndex(i => i.id === 'vault_chest');
        if (idx !== -1) this.tower.interactables.splice(idx, 1);
      }
      return;
    }

    if (interactable.type === 'magic_book') {
      this.magicBookUI.open(interactable.bookId);
    } else if (interactable.type === 'npc_shopkeeper') {
      this.shopUI.toggle();
    } else if (interactable.type === 'npc_scribe') {
      voiceEngine.speak('alistair_act1_intro');
      if (this.questManager.currentStepIndex === 0) this.questManager.advanceStep();
    } else if (interactable.type === 'npc_alchemist') {
      voiceEngine.speak('ignatius_act2_intro');
    } else if (interactable.type === 'quest_lectern') {
      this.ui.toggleLecternModal(true);
      voiceEngine.speak('alistair_act1_intro');
      if (this.questManager.currentStepIndex === 0) this.questManager.advanceStep();
    } else if (interactable.type === 'prism') {
      onlineNetwork.rotatePrism(interactable.id);
    } else if (interactable.type === 'quiz_monolith') {
      onlineNetwork.triggerQuiz(interactable.id);
      voiceEngine.speak('alistair_quiz_prompt');
    } else if (interactable.type === 'keystone') {
      onlineNetwork.activateKeystone(interactable.id);
    } else if (interactable.type === 'crucible') {
      onlineNetwork.interactCrucible(interactable.index, interactable.element || 'fire');
      if (storyLoreManager.questState.accepted && !storyLoreManager.questState.completed) {
        const progress = storyLoreManager.addCrucibleCore();
        if (progress) {
          this.particles.spawnFloatingText(this.localPlayer.position, `+1 Crucible Core (${progress.current}/${progress.required})`, '#ff9800');
          this.ui.showStoryMessage(`[Quest] Crucible Core Acquired (${progress.current}/${progress.required})!`);
        }
      }
    }
  }

  /**
   * Reconstitutes the player at the safe Awakening Vault with full HP/MP
   */
  resurrectLocalPlayer(x = 0, y = 0, z = null) {
    if (!this.localPlayer) return;
    if (z === null) {
      z = this.currentFloor === 1 ? 31
        : this.currentFloor === 2 ? 40
          : (this.currentFloor === 5 || this.currentFloor === 6) ? 18
            : (this.currentFloor === 10 || this.currentFloor === 15) ? 24
              : 14;
    }
    this.isDead = false;
    this.respawnTimer = 0;
    this.ui.hideDeathScreen();

    this.localPlayer.resurrect(new THREE.Vector3(x, y, z));
    this.physics.yaw = 0;
    this.physics.pitch = 0;
    this.engineScene.camera.position.set(x, y + 1.7, z);
    this.engineScene.camera.rotation.set(0, 0, 0);
    this.engineScene.triggerChronoFlash();

    soundEngine.playResurrection();
    this.particles.spawnChronomancyBurst(new THREE.Vector3(x, y + 0.5, z), 0x00e5ff);
    this.ui.showStoryMessage('✨ You have been reconstituted at the Awakening Slab by the temporal continuum!');

    if (this.physics.domElement?.requestPointerLock) {
      this.physics.domElement.requestPointerLock();
    }
  }

  setFpsLimit(limit) {
    if (!limit || limit === 'unlimited' || limit === '0' || limit === 0) {
      this.targetFps = 0;
      console.log('[Performance] Target Framerate: UNLIMITED');
    } else {
      const parsed = parseInt(limit, 10);
      this.targetFps = isNaN(parsed) ? 0 : parsed;
      console.log(`[Performance] Target Framerate locked to: ${this.targetFps} FPS`);
    }
  }

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    // Target Frame Rate Limiter (60, 120, 144, 240 Hz or Unlimited)
    if (this.targetFps > 0) {
      const elapsed = currentTime - (this.lastRenderTime || 0);
      const targetInterval = 1000 / this.targetFps;
      // 1.0ms margin prevents timer jitter from skipping valid frames
      if (elapsed < targetInterval - 1.0) {
        return;
      }
      this.lastRenderTime = currentTime - (elapsed % targetInterval);
    } else {
      this.lastRenderTime = currentTime;
    }

    const deltaTime = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;
    this.engineScene.updatePerformance(deltaTime);
    this.spellVfx?.update(deltaTime, {
      quality: this.ui.settings.graphicsQuality || 'balanced',
      reducedMotion: Boolean(this.ui.settings.reducedVfx)
    });

    // FPS calculation & Dynamic Adaptive Performance
    this.fpsFrameCount++;
    if (currentTime - this.fpsLastCalc >= 1000) {
      this.currentFps = this.fpsFrameCount;
      this.fpsFrameCount = 0;
      this.fpsLastCalc = currentTime;
      this.ui.updateFPS(this.currentFps);

      // Auto-adapt if prolonged low FPS is detected (< 30 FPS)
      if (this.currentFps < 30 && !this._hasAdaptedPerformance && this.ui.settings.graphicsQuality !== 'performance') {
        this._lowFpsCounter = (this._lowFpsCounter || 0) + 1;
        if (this._lowFpsCounter >= 3) {
          this._hasAdaptedPerformance = true;
          this.engineScene.setGraphicsQuality('performance');
          this.ui.settings.graphicsQuality = 'performance';
          this.ui.saveSettings();
          const btnGfxPerf = document.getElementById('btn-gfx-perf');
          const btnGfxBal = document.getElementById('btn-gfx-balanced');
          if (btnGfxPerf && btnGfxBal) {
            btnGfxPerf.classList.add('active');
            btnGfxBal.classList.remove('active');
          }
          this.ui.showStoryMessage('⚡ Auto-adapted to High-Performance mode (60+ FPS)');
        }
      } else if (this.currentFps >= 45) {
        this._lowFpsCounter = 0;
      }
    }

    this.animations.update(deltaTime);
    this.cooldowns.update(deltaTime);
    this.ui.updateCooldowns(this.cooldowns);

    // Ambient particles
    this.ambientParticles.update(deltaTime);

    // Tower animated props (torches, orrery, chandeliers, cauldrons, etc.)
    if (this.tower.updateProps) this.tower.updateProps(deltaTime);

    if (this.isGameActive && this.localPlayer) {
      this.gameTime += deltaTime;

      // Update 3D Proximity Voice Chat spatial panning and distance rolloff
      if (this.voiceChat) {
        this.voiceChat.update(this.localPlayer.position, this.players);
      }

      // Tutorial: journal tip after 30s
      if (this.gameTime > 30) this.tutorial.tryShowTip('journal');

      if (this.localPlayer.isAlive && !this.isDead) {
        const derived = this.inventory.getDerivedStats();
        this.localPlayer.maxHealth = derived.maxHealth;
        this.localPlayer.maxMana = derived.maxMana;

        // Low-health heartbeat pulse
        const hpRatio = this.localPlayer.health / (this.localPlayer.maxHealth || 1);
        if (hpRatio < 0.35) {
          const lowPulse = (0.35 - hpRatio) / 0.35;
          this.engineScene.setLowHealthPulse(lowPulse);
        } else {
          this.engineScene.setLowHealthPulse(0);
        }

        // Apply settings sensitivity
        this.physics.mouseSensitivity = 0.0022 * this.ui.getSensitivity();

        // First-Person WASD Movement
        const moveVec = this.physics.getMovementVector();
        this.localPlayer.isMoving = moveVec.lengthSq() > 0;

        if (this.localPlayer.isMoving) {
          this.localPlayer.position.addScaledVector(moveVec, derived.moveSpeed * deltaTime);
          const maxRadius = this.tower.currentFloor === 2 ? 64.0 : (this.tower.currentFloor === 3 ? 43.0 : 21.0);
          this.physics.resolveCollision(this.localPlayer.position, 0.7, this.tower.colliders, maxRadius, this.tower.currentFloor);

          // Footstep audio synchronization
          if (this.isGrounded) {
            this.footstepTimer += deltaTime;
            const cadence = 0.36 / Math.max(0.5, derived.moveSpeed / 6.0);
            if (this.footstepTimer >= cadence) {
              this.footstepTimer = 0;
              const surface = this.currentFloor === 2 ? 'metal' : (this.currentFloor === 3 ? 'crystal' : 'stone');
              soundEngine.playFootstep(surface);
            }
          }
        } else {
          this.footstepTimer = 0.28;
        }

        // Vertical Jump Physics & Gravity
        if (!this.isGrounded) {
          this.playerVelocityY -= 26.0 * deltaTime; // gravity
          this.localPlayer.position.y += this.playerVelocityY * deltaTime;
          if (this.localPlayer.position.y <= 0) {
            this.localPlayer.position.y = 0;
            this.playerVelocityY = 0;
            this.isGrounded = true;
            const surface = this.currentFloor === 2 ? 'metal' : (this.currentFloor === 3 ? 'crystal' : 'stone');
            soundEngine.playFootstep(surface);
            if (this.fpViewmodel && this.fpViewmodel.triggerLanding) {
              this.fpViewmodel.triggerLanding();
            }
          }
        }

        this.localPlayer.rotationY = this.physics.yaw;
        this.physics.update(deltaTime);
        // Standard gamepad mapping: A/basic, B/Q, X/E, Y/R, LB/dash, RB/interact.
        const padPress = index => this.physics.consumeGamepadPress?.(index);
        const pad = this.physics.gamepad;
        const spells = CLASS_SPELLS[this.localPlayer.wizardClass] || CLASS_SPELLS.pyromancer;
        if (padPress(1)) this.tryCastSpell('skill1', spells.skill1);
        if (padPress(2)) this.tryCastSpell('skill2', spells.skill2);
        if (padPress(3)) this.tryCastSpell('ult', spells.ult);
        if (padPress(4)) this.tryDash();
        if (padPress(5)) this.tryInteract();
        this.engineScene.updateCameraPosition(this.localPlayer.position, deltaTime);

        if (this.fpViewmodel) {
          const mouseDelta = this.physics.consumeMouseDelta ? this.physics.consumeMouseDelta() : null;
          this.fpViewmodel.update(deltaTime, this.localPlayer.isMoving, mouseDelta);
        }

        // First-Person LMB Attack (Shoots basic elemental projectile)
        if ((this.physics.isLMBDown || Boolean(pad?.buttons?.[0]?.pressed)) && this.cooldowns.isReady('basic')) {
          this.cooldowns.trigger('basic', spells.basic.cd, derived.cdr);

          const dir = this.physics.updateCrosshairAim();
          const origin = this.engineScene.camera.position.clone();
          const basicDmg = Math.round(spells.basic.damage * derived.spellPowerMultiplier);

          // Instantly spawn local projectile & muzzle flash through the VFX director.
          this.spellVfx.playCast({
            spellId: spells.basic.id,
            spellType: 'basic',
            origin,
            direction: dir,
            element: spells.basic.element,
            damage: basicDmg,
            source: 'local'
          });

          onlineNetwork.castSpell({
            spellId: spells.basic.id,
            spellType: 'basic',
            origin: { x: origin.x, y: origin.y - 0.2, z: origin.z },
            direction: { x: dir.x, y: dir.y, z: dir.z },
            damage: basicDmg,
            element: spells.basic.element,
            manaCost: 0
          });

          // SFX & Voiced Incantation
          this.playSpellAudioAndVoice(this.localPlayer.wizardClass, 'basic', spells.basic.element);

          if (this.fpViewmodel) this.fpViewmodel.triggerRecoil(0.85);
          this.basicAttackCount++;
          if (this.basicAttackCount === 3) this.tutorial.tryShowTip('abilities');
        }

        // Check 3D In-World Loot Pickups
        const pickedItem = this.inventory.updateWorldDrops(this.localPlayer.position, deltaTime);
        if (pickedItem) {
          this.ui.showLootNotification(pickedItem);
          if (this.inventoryUI.isOpen) this.inventoryUI.render();
          this.tutorial.tryShowTip('inventory');

          this.lootCount = (this.lootCount || 0) + 1;
          if (this.lootCount >= 3) {
            achievementSystem.unlock('treasure_hunter');
          }
          if (pickedItem.rarity === 'epic' || pickedItem.rarity === 'legendary') {
            achievementSystem.unlock('fashion_forward');
          }
        }

        // Update Quest Tracker
        const questInfo = this.questManager.update(this.localPlayer.position, deltaTime);
        this.ui.updateQuestTracker(questInfo.quest, questInfo.distance);

        // Nearby interactable HUD prompt
        let nearby = this.physics.getNearbyInteractable(this.localPlayer.position, this.tower.interactables);
        if (!nearby && this.puzzleArena) {
          nearby = this.puzzleArena.getNearbyInteractable(this.localPlayer.position);
        }
        if (nearby) {
          this.ui.showInteractionPrompt(true, nearby.prompt);
        } else if (this.tower.exitPortal) {
          const pdx = this.localPlayer.position.x - this.tower.exitPortal.x;
          const pdz = this.localPlayer.position.z - this.tower.exitPortal.z;
          if (Math.sqrt(pdx * pdx + pdz * pdz) <= this.tower.exitPortal.radius) {
            this.ui.showInteractionPrompt(true, 'Ascend to Next Spire Level [F]');
          } else {
            this.ui.showInteractionPrompt(false);
          }
        } else {
          this.ui.showInteractionPrompt(false);
        }

        // Network snapshot send
        if (currentTime - this.lastNetworkSend > 40) {
          this.lastNetworkSend = currentTime;
          onlineNetwork.sendInput({
            x: this.localPlayer.position.x,
            y: this.localPlayer.position.y,
            z: this.localPlayer.position.z,
            rotY: this.localPlayer.rotationY
          });
        }

        // Minimap update
        const enemyPositions = [];
        for (const enemy of this.enemies.values()) {
          if (enemy.isAlive) enemyPositions.push(enemy.position);
        }
        if (this.boss && this.boss.isAlive) enemyPositions.push(this.boss.position);

        const partyPositions = [];
        for (const player of this.players.values()) {
          if (!player.isLocal && player.isAlive) {
            partyPositions.push(player.position || player.targetPos);
          }
        }

        const waypointPos = this.questManager.waypointPosition || null;
        const currentFloorRadius = this.tower.currentFloor === 2 ? 65 : (this.tower.currentFloor === 3 ? 45 : 18);
        this.minimap.update(
          this.localPlayer.position,
          this.localPlayer.rotationY,
          enemyPositions,
          partyPositions,
          waypointPos,
          currentFloorRadius
        );
      } else if (this.isDead) {
        // Active 10-second temporal resurrection countdown
        this.respawnTimer -= deltaTime;
        const secondsLeft = Math.max(0, Math.ceil(this.respawnTimer));
        this.ui.updateDeathCountdown(secondsLeft);

        if (this.respawnTimer <= 0) {
          // Reconstitute local wizard at the Awakening Slab
          this.resurrectLocalPlayer();
        }
      }
    }

    // Update active ability countdown timer banner
    if (this.activeVortexTimer && this.activeVortexTimer.remaining > 0) {
      this.activeVortexTimer.remaining -= deltaTime;
      this.ui.updateActiveSpellTimer(this.activeVortexTimer.remaining, this.activeVortexTimer.total);
    }

    // Particles, Persistent Vortices & Hit Detection
    this.particles.update(
      deltaTime,
      (projectile) => {
        for (const enemy of this.enemies.values()) {
          if (!enemy.isAlive) continue;
          const dist = projectile.mesh.position.distanceTo(enemy.position);
          if (dist < 1.9) {
            onlineNetwork.hitEnemy(enemy.id, projectile.spellType === 'ult' ? 140 : 50, projectile.element);
            this.ui.triggerHitmarker();
            return true;
          }
        }

        if (this.boss && this.boss.isAlive) {
          const bossDist = projectile.mesh.position.distanceTo(this.boss.position);
          if (bossDist < 2.6) {
            onlineNetwork.hitEnemy(this.boss.id, projectile.spellType === 'ult' ? 140 : 50, projectile.element);
            this.ui.triggerHitmarker();
            return true;
          }
        }

        if (this.puzzleArena) {
          if (this.puzzleArena.checkProjectileHit(projectile)) {
            return true;
          }
        }

        if (this.currentFloor === 2 || this.currentFloor === 5) {
          for (const item of this.tower.interactables) {
            if (item.type === 'crucible') {
              const cDist = projectile.mesh.position.distanceTo(new THREE.Vector3(item.x, 1, item.z));
              if (cDist < 2.2) {
                onlineNetwork.interactCrucible(item.index, projectile.element);
                if (storyLoreManager.questState.accepted && !storyLoreManager.questState.completed) {
                  const progress = storyLoreManager.addCrucibleCore();
                  if (progress) {
                    this.particles.spawnFloatingText(this.localPlayer.position, `+1 Crucible Core (${progress.current}/${progress.required})`, '#ff9800');
                    this.ui.showStoryMessage(`[Quest] Crucible Core Acquired (${progress.current}/${progress.required})!`);
                  }
                }
                return true;
              }
            }
          }
        }

        // Check Destructible Props (Urns, Wooden Crates)
        if (this.tower.destructibles && this.tower.destructibles.length > 0) {
          for (const dest of this.tower.destructibles) {
            if (dest.isDestroyed) continue;
            const pDist = Math.hypot(projectile.mesh.position.x - dest.x, projectile.mesh.position.z - dest.z);
            if (pDist < (dest.radius || 0.9) && projectile.mesh.position.y < 2.4) {
              this.tower.shatterProp(dest, projectile.mesh.position, projectile.element);
              soundEngine.playPuzzleSolve();
              const goldBonus = Math.floor(Math.random() * 12) + 6;
              if (this.localPlayer) {
                this.localPlayer.gold = (this.localPlayer.gold || 100) + goldBonus;
                this.particles.spawnFloatingText(new THREE.Vector3(dest.x, 1.2, dest.z), `+${goldBonus} Gold 🪙`, '#ffd700');
              }
              this.engineScene.addScreenShake(0.09, 0.16);
              return true;
            }
          }
        }

        return false;
      },
      (vortex) => {
        if (vortex.type === 'fire_tornado') {
          for (const enemy of this.enemies.values()) {
            if (!enemy.isAlive) continue;
            const dist = vortex.position.distanceTo(enemy.position);
            if (dist <= vortex.radius) {
              // Dramatic cyclonic vortex suction + angular spin!
              const dx = vortex.position.x - enemy.position.x;
              const dz = vortex.position.z - enemy.position.z;
              const planarDist = Math.hypot(dx, dz);
              if (planarDist > 0.001 && planarDist <= vortex.radius) {
                const inwardStrength = Math.min(1.4, 0.5 + (vortex.radius - planarDist) * 0.16);
                const tangentStrength = 0.5;
                enemy.position.x += (dx / planarDist) * inwardStrength + (-dz / planarDist) * tangentStrength;
                enemy.position.z += (dz / planarDist) * inwardStrength + (dx / planarDist) * tangentStrength;
                onlineNetwork.hitEnemy(enemy.id, vortex.tickDamage || 32, 'fire');
                this.ui.triggerHitmarker();
              }
            }
          }

          if (this.boss && this.boss.isAlive) {
            const dist = vortex.position.distanceTo(this.boss.position);
            if (dist <= vortex.radius) {
              onlineNetwork.hitEnemy(this.boss.id, vortex.tickDamage || 32, 'fire');
              this.ui.triggerHitmarker();
            }
          }
        } else if (vortex.type === 'divine_sanctuary') {
          if (this.localPlayer && this.localPlayer.isAlive) {
            const dist = vortex.position.distanceTo(this.localPlayer.position);
            if (dist <= vortex.radius) {
              this.localPlayer.health = Math.min(this.localPlayer.maxHealth, this.localPlayer.health + 20);
            }
          }
        } else if (vortex.type === 'blizzard') {
          for (const enemy of this.enemies.values()) {
            if (!enemy.isAlive) continue;
            const dist = vortex.position.distanceTo(enemy.position);
            if (dist <= vortex.radius) {
              onlineNetwork.hitEnemy(enemy.id, vortex.tickDamage || 28, 'frost');
              this.ui.triggerHitmarker();
            }
          }
          if (this.boss && this.boss.isAlive) {
            const dist = vortex.position.distanceTo(this.boss.position);
            if (dist <= vortex.radius) {
              onlineNetwork.hitEnemy(this.boss.id, vortex.tickDamage || 28, 'frost');
              this.ui.triggerHitmarker();
            }
          }
        } else if (vortex.type === 'temporal_stasis') {
          for (const enemy of this.enemies.values()) {
            if (!enemy.isAlive) continue;
            const dist = vortex.position.distanceTo(enemy.position);
            if (dist <= vortex.radius) {
              onlineNetwork.hitEnemy(enemy.id, vortex.tickDamage || 35, 'chrono');
              this.ui.triggerHitmarker();
            }
          }
          if (this.boss && this.boss.isAlive) {
            const dist = vortex.position.distanceTo(this.boss.position);
            if (dist <= vortex.radius) {
              onlineNetwork.hitEnemy(this.boss.id, vortex.tickDamage || 35, 'chrono');
              this.ui.triggerHitmarker();
            }
          }
        }
      },
      this.localPlayer?.position
    );

    // Update Boss & Floor Ground Spells with Hazard Damage
    if (this.groundSpells) {
      this.groundSpells.update(deltaTime, this.localPlayer ? this.localPlayer.position : null, (damage, type) => {
        if (this.localPlayer && !this.isDead) {
          this.engineScene.addScreenShake(0.22, 0.25);
          this.engineScene.triggerDamageFlash(0.35);
          this.particles.spawnFloatingText(this.localPlayer.position, `-${damage} HP`, '#ff3b30');
          soundEngine.playDamage();
          onlineNetwork.takeHazardDamage(damage);
        }
      });
    }

    // Frustum Culling Matrix Optimization for off-screen entities (Zero-Allocation)
    this._cullingMatrix.multiplyMatrices(this.engineScene.camera.projectionMatrix, this.engineScene.camera.matrixWorldInverse);
    this._cullingFrustum.setFromProjectionMatrix(this._cullingMatrix);

    for (const player of this.players.values()) {
      if (!player.isLocal) player.update(deltaTime, this.animations);
    }
    for (const enemy of this.enemies.values()) {
      if (!enemy.isAlive) continue;
      const inView = this._cullingFrustum.containsPoint(enemy.position);
      if (inView) {
        enemy.mesh.matrixAutoUpdate = true;
        enemy.update(deltaTime, this.animations);
      } else {
        // Off-screen: update position without heavy skeletal animations or matrix updates
        enemy.position.lerp(enemy.targetPos, 12 * deltaTime);
        enemy.mesh.position.copy(enemy.position);
        if (enemy.hasRiggedModel && enemy.animator) {
          enemy.animator.setPosition(enemy.position.x, enemy.position.y, enemy.position.z);
        }
        enemy.mesh.matrixAutoUpdate = false;
      }
    }
    if (this.puzzleArena) {
      this.puzzleArena.update(deltaTime);
    }
    if (this.boss) {
      this.boss.update(deltaTime, this.animations);
    }

    this.engineScene.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
