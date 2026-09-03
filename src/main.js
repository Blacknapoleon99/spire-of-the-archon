import * as THREE from 'three';
import { EngineScene } from './engine/scene.js';
import { PhysicsController } from './engine/physics.js';
import { TowerEnvironment } from './graphics/towerEnvironment.js';
import { AnimationController } from './graphics/animations.js';
import { ParticleSystem } from './graphics/particleSystem.js';
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
import { voiceEngine } from './engine/voiceNarration.js';
import { achievementSystem } from './systems/achievementSystem.js';
import { storyLoreManager } from './systems/storyLore.js';
import { assetLoader } from './graphics/assetLoader.js';
import { VoiceChatSystem } from './systems/voiceChatSystem.js';

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
    this.cooldowns = new CooldownManager();
    this.questManager = new QuestManager(this.engineScene.scene);
    this.ui = new UIManager(onlineNetwork);
    this.ui.getChatCoordinates = () => (this.localPlayer ? { x: this.localPlayer.position.x, y: this.localPlayer.position.y, z: this.localPlayer.position.z } : null);
    this.progression = new ProgressionSystem();
    this.tutorial = new TutorialSystem();

    // Studio 3D Spatial Proximity Voice Chat
    this.voiceChat = new VoiceChatSystem(onlineNetwork, this.engineScene.scene, this.engineScene.camera);
    this.voiceChat.onPeerSpeakingChange = (peerId, isSpeaking) => {
      const player = this.players.get(peerId);
      if (player) player.setSpeaking(isSpeaking);
    };
    this.ui.registerVoiceToggle(() => {
      const isMuted = this.voiceChat.toggleMute();
      this.ui.updateVoiceStatus(!isMuted);
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

    // Timing
    this.lastTime = performance.now();
    this.lastNetworkSend = 0;
    this.fpsFrameCount = 0;
    this.fpsLastCalc = performance.now();
    this.currentFps = 60;

    this.initNetworkListeners();
    this.initCombatInputs();
    this.setupUIButtons();

    // Loading screen with random tip
    const tip = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    this.ui.updateLoadingProgress(10, tip);

    // Preload local 3D GLTF models (Characters, NPCs, Monsters)
    assetLoader.preloadAll().catch(err => console.warn('[AssetLoader] Preload notice:', err));

    // Start building Floor 1
    this.tower.buildFloor(1);
    this.ambientParticles.setFloor(1);
    this.engineScene.setFloorLighting(1);
    this.ui.updateLoadingProgress(60, 'Weaving the arcane wards...');

    // Pre-warm WebGL shaders and materials during loading screen to eliminate combat stutter
    this.engineScene.warmupShaders();

    // Guarantee loading screen ALWAYS hides within 1.8s even if network handshake is slow
    let isLoaded = false;
    const finishLoading = () => {
      if (isLoaded) return;
      isLoaded = true;
      this.ui.updateLoadingProgress(100, 'The Spire awaits.');
      setTimeout(() => this.ui.hideLoadingScreen(), 300);
      // Start background progressive lazy-loading of Floor 2 & 3
      this.chunkLoader.startBackgroundPreload();
      soundEngine.startMusic('archives');

      // Initialize Studio Proximity Voice Chat
      this.voiceChat.init().then(() => {
        this.ui.updateVoiceStatus(!this.voiceChat.isMuted);
      });
    };

    const loadSafetyTimer = setTimeout(finishLoading, 1800);

    // Initialize WebRTC STUN network
    onlineNetwork.init((peerId) => {
      clearTimeout(loadSafetyTimer);
      this.ui.setOnlinePeerId(peerId);
      this.ui.updateLoadingProgress(90, 'Connecting to the Spire network...');
      setTimeout(finishLoading, 400);
    });

    // Register Quest Journal toggle
    this.ui.registerQuestJournalToggle(() => this.questJournalUI.toggle());

    // Start 60fps render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  setupUIButtons() {
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
        this.ui.updateVoiceStatus(!isMuted);
      }
    });
  }

  initNetworkListeners() {
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
      const playersList = Array.from(this.players.values()).map(p => ({
        name: p.name,
        wizardClass: p.wizardClass
      }));
      playersList.push(data.player);
      this.ui.updateLobbyPlayerList(playersList);
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

    onlineNetwork.on('game_started', (data) => {
      console.log('[Client] Spire ascent initiated! Floor:', data.floor, 'Players:', data.players);
      this.isGameActive = true;
      this.currentFloor = data.floor || 1;
      this.tower.buildFloor(this.currentFloor);
      this.ambientParticles.setFloor(this.currentFloor);
      this.questManager.setAct(this.currentFloor);

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

      // Grand Scribe Alistair voiced introduction
      setTimeout(() => {
        voiceEngine.speak('alistair_act1_intro');
      }, 1200);
    });

    onlineNetwork.on('state_snapshot', (data) => {
      if (!this.isGameActive) return;

      data.players.forEach(pData => {
        const isLocal = (pData.id === onlineNetwork.localPlayerId || (this.localPlayer && this.localPlayer.id === pData.id));
        const existing = this.players.get(pData.id);
        if (existing) {
          if (isLocal && existing.health > pData.health) {
            const dmgTaken = existing.health - pData.health;
            this.engineScene.addScreenShake(Math.min(0.45, 0.15 + (dmgTaken / 80) * 0.25), 0.3);
            this.engineScene.triggerDamageFlash(Math.min(1.0, 0.4 + (dmgTaken / 50) * 0.6));
          }
          if (!existing.isLocal && !isLocal) {
            existing.targetPos.set(pData.x, pData.y || 0, pData.z);
            existing.rotationY = pData.rotY || 0;
          }
          existing.health = pData.health;
          existing.mana = pData.mana;
          existing.talentPoints = pData.talentPoints;
          existing.talents = pData.talents;
          existing.isAlive = pData.isAlive;
          existing.score = pData.score;

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

      data.enemies.forEach(eData => {
        if (eData.type === 'boss') {
          if (!this.boss) {
            this.boss = new BossEntity(this.engineScene.scene, eData);
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
        return;
      }
      const origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
      const direction = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z);

      if (data.spellId === 'fire_tornado') {
        const groundTarget = origin.clone().addScaledVector(direction, 10);
        groundTarget.y = 0;
        this.particles.spawnFireTornado(groundTarget, 5.0, data.damage || 32);
      } else if (data.spellId === 'divine_sanctuary') {
        const groundTarget = origin.clone();
        groundTarget.y = 0;
        this.particles.spawnDivineSanctuary(groundTarget, 6.0);
      } else if (data.spellId === 'frost_nova') {
        const groundTarget = origin.clone().addScaledVector(direction, 9);
        groundTarget.y = 0;
        this.particles.spawnBlizzardZone(groundTarget, 6.0, 7.0, data.damage || 28);
      } else if (data.spellId === 'temporal_stasis') {
        const groundTarget = origin.clone().addScaledVector(direction, 10);
        groundTarget.y = 0;
        this.particles.spawnTemporalStasisDome(groundTarget, 5.0, 6.5, data.damage || 35);
      } else {
        this.particles.spawnMuzzleFlash(origin, direction, data.element);
        this.particles.spawnProjectile(origin, direction, data.spellType, data.element);
      }

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
      this.tower.buildFloor(this.currentFloor);
      this.ambientParticles.setFloor(this.currentFloor);
      this.engineScene.setFloorLighting(this.currentFloor);
      this.questManager.setAct(this.currentFloor);

      // Floor cleared XP
      const lvlResult = this.progression.addXP(XP_SOURCES.FLOOR_CLEARED);
      this.ui.updateXPBar(this.progression.xp, this.progression.getXPToNextLevel(), this.progression.level);
      if (lvlResult.leveledUp) this.ui.showLevelUp(lvlResult.newLevel);
      this.ui.addKillFeedEntry(`Floor ${data.floor - 1} cleared! Ascending to Floor ${data.floor}...`);

      if (this.currentFloor === 2) {
        achievementSystem.unlock('crucible_breaker');
        soundEngine.startMusic('forge');
        setTimeout(() => voiceEngine.speak('ignatius_act2_intro'), 800);
      } else if (this.currentFloor === 3) {
        soundEngine.startMusic('boss');
        setTimeout(() => voiceEngine.speak('valerius_encounter'), 800);
      }
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

      if (data.ability === 'arcane_barrage') {
        const targetPos = new THREE.Vector3(data.targetX, 0, data.targetZ);
        this.particles.spawnArcaneBarrageTelegraph(targetPos, data.duration || 2.0);
        this.ui.showStoryMessage('⚠️ Valerius rains an Arcane Barrage from the cosmos!');
        this.ui.showActiveSpellTimer('Arcane Barrage', '☄️', data.duration || 2.0);
      } else if (data.ability === 'astral_nova') {
        this.particles.spawnAstralNova(new THREE.Vector3(data.x, 0, data.z), 18.0, data.duration || 3.0);
        soundEngine.playChrono();
        this.engineScene.addScreenShake(0.35, 0.5);
        this.ui.showStoryMessage('⚠️ ASTRAL NOVA! Dash [Space] to evade the expanding temporal shockwave!');
        this.ui.showActiveSpellTimer('Astral Nova', '🌟', data.duration || 3.0);
      } else if (data.ability === 'chrono_vortex') {
        const vortexPos = new THREE.Vector3(data.x, 0, data.z);
        this.particles.spawnChronoVortex(vortexPos, data.duration || 4.0);
        soundEngine.playFrostNova();
        this.ui.showStoryMessage('⚠️ Chrono Vortex active! Time is dilating!');
        this.ui.showActiveSpellTimer('Chrono Vortex', '⌛', data.duration || 4.0);
      }
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
        this.inventorySystem.addItem(bossDrop);
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
      this.questManager.setAct(1);
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
        // Contextual interaction: interact if near object/NPC/portal, else cast Skill 2
        const interactable = this.physics.getNearbyInteractable(this.localPlayer.position, this.tower.interactables);
        const nearPortal = this.tower.exitPortal && Math.hypot(this.localPlayer.position.x - this.tower.exitPortal.x, this.localPlayer.position.z - this.tower.exitPortal.z) <= this.tower.exitPortal.radius;
        if (interactable || nearPortal) {
          this.tryInteract();
        } else {
          this.tryCastSpell('skill2', spells.skill2);
        }
      } else if (e.code === 'KeyR') {
        this.tryCastSpell('ult', spells.ult);
      } else if (e.code === 'Space') {
        this.tryDash();
      } else if (e.code === 'KeyF') {
        this.tryInteract();
      } else if (e.code === 'KeyV') {
        const isMuted = this.voiceChat.toggleMute();
        this.ui.updateVoiceStatus(!isMuted);
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

    // Area-of-Effect Field Spells
    const isAoeVortex = ['fire_tornado', 'divine_sanctuary', 'frost_nova', 'temporal_stasis'].includes(spellConfig.id);
    if (spellConfig.id === 'fire_tornado') {
      const groundTarget = origin.clone().addScaledVector(dir, 10);
      groundTarget.y = 0;
      this.particles.spawnFireTornado(groundTarget, 5.0, modifiedDamage || 32);
      this.ui.showActiveSpellTimer('Infernal Fire Tornado', '🌪️', 5.0);
      this.activeVortexTimer = { remaining: 5.0, total: 5.0 };
      soundEngine.playFlameExplosion();
    } else if (spellConfig.id === 'divine_sanctuary') {
      const groundTarget = this.localPlayer.position.clone();
      groundTarget.y = 0;
      this.particles.spawnDivineSanctuary(groundTarget, 6.0);
      this.ui.showActiveSpellTimer('Divine Sanctuary', '🌟', 6.0);
      this.activeVortexTimer = { remaining: 6.0, total: 6.0 };
    } else if (spellConfig.id === 'frost_nova') {
      const groundTarget = origin.clone().addScaledVector(dir, 9);
      groundTarget.y = 0;
      this.particles.spawnBlizzardZone(groundTarget, 6.0, 7.0, modifiedDamage || 28);
      this.ui.showActiveSpellTimer('Glacial Blizzard', '🌨️', 6.0);
      this.activeVortexTimer = { remaining: 6.0, total: 6.0 };
      soundEngine.playFrostNova();
    } else if (spellConfig.id === 'temporal_stasis') {
      const groundTarget = origin.clone().addScaledVector(dir, 10);
      groundTarget.y = 0;
      this.particles.spawnTemporalStasisDome(groundTarget, 5.0, 6.5, modifiedDamage || 35);
      this.ui.showActiveSpellTimer('Temporal Stasis', '⏱️', 5.0);
      this.activeVortexTimer = { remaining: 5.0, total: 5.0 };
      soundEngine.playChrono();
    } else if (!spellConfig.heal) {
      // Instantly spawn projectile for Skill 1 (Q), Skill 2 (E), and basic attacks
      this.particles.spawnProjectile(origin, dir, slot, spellConfig.element);
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
      onlineNetwork.interactCrucible(interactable.index, 'fire');
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
  resurrectLocalPlayer(x = 0, y = 0, z = 31) {
    if (!this.localPlayer) return;
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

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    const deltaTime = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    // FPS calculation
    this.fpsFrameCount++;
    if (currentTime - this.fpsLastCalc >= 1000) {
      this.currentFps = this.fpsFrameCount;
      this.fpsFrameCount = 0;
      this.fpsLastCalc = currentTime;
      this.ui.updateFPS(this.currentFps);
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
        this.physics.sensitivity = this.ui.getSensitivity();

        // First-Person WASD Movement
        const moveVec = this.physics.getMovementVector();
        this.localPlayer.isMoving = moveVec.lengthSq() > 0;

        if (this.localPlayer.isMoving) {
          this.localPlayer.position.addScaledVector(moveVec, derived.moveSpeed * deltaTime);
          const maxRadius = this.tower.currentFloor === 2 ? 64.0 : (this.tower.currentFloor === 3 ? 43.0 : 21.0);
          this.physics.resolveCollision(this.localPlayer.position, 0.7, this.tower.colliders, maxRadius, this.tower.currentFloor);

          // Footstep audio synchronization
          this.footstepTimer += deltaTime;
          const cadence = 0.36 / Math.max(0.5, derived.moveSpeed / 6.0);
          if (this.footstepTimer >= cadence) {
            this.footstepTimer = 0;
            const surface = this.currentFloor === 2 ? 'metal' : (this.currentFloor === 3 ? 'crystal' : 'stone');
            soundEngine.playFootstep(surface);
          }
        } else {
          this.footstepTimer = 0.28;
        }

        this.localPlayer.rotationY = this.physics.yaw;
        this.physics.update(deltaTime);
        this.engineScene.updateCameraPosition(this.localPlayer.position, deltaTime);

        if (this.fpViewmodel) {
          const mouseDelta = this.physics.consumeMouseDelta ? this.physics.consumeMouseDelta() : null;
          this.fpViewmodel.update(deltaTime, this.localPlayer.isMoving, mouseDelta);
        }

        // First-Person LMB Attack
        if (this.physics.isLMBDown && this.cooldowns.isReady('basic') && this.physics.isLocked) {
          const spells = CLASS_SPELLS[this.localPlayer.wizardClass] || CLASS_SPELLS.pyromancer;
          this.cooldowns.trigger('basic', spells.basic.cd, derived.cdr);

          const dir = this.physics.updateCrosshairAim();
          const origin = this.engineScene.camera.position.clone();
          const basicDmg = Math.round(spells.basic.damage * derived.spellPowerMultiplier);

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

          if (this.fpViewmodel) this.fpViewmodel.triggerRecoil(0.8);
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
        const nearby = this.physics.getNearbyInteractable(this.localPlayer.position, this.tower.interactables);
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
          this.resurrectLocalPlayer(0, 0, 31);
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

        if (this.currentFloor === 2) {
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
              const toCenter = vortex.position.clone().sub(enemy.position);
              toCenter.y = 0;
              const dist = toCenter.length();
              if (dist <= vortex.radius) {
                const inward = toCenter.clone().normalize().multiplyScalar(Math.min(1.4, 0.5 + (vortex.radius - dist) * 0.16));
                const tangent = new THREE.Vector3(-toCenter.z, 0, toCenter.x).normalize().multiplyScalar(0.5);
                enemy.position.add(inward).add(tangent);
                onlineNetwork.hitEnemy(enemy.id, vortex.tickDamage || 32, 'fire');
                this.particles.spawnFloatingText(enemy.position, `🔥 ${vortex.tickDamage || 32}`, '#ff5722');
                this.ui.triggerHitmarker();
              }
            }
          }

          if (this.boss && this.boss.isAlive) {
            const dist = vortex.position.distanceTo(this.boss.position);
            if (dist <= vortex.radius) {
              onlineNetwork.hitEnemy(this.boss.id, vortex.tickDamage || 32, 'fire');
              this.particles.spawnFloatingText(this.boss.position, `🔥 ${vortex.tickDamage || 32}`, '#ff5722');
              this.ui.triggerHitmarker();
            }
          }
        } else if (vortex.type === 'divine_sanctuary') {
          if (this.localPlayer && this.localPlayer.isAlive) {
            const dist = vortex.position.distanceTo(this.localPlayer.position);
            if (dist <= vortex.radius) {
              this.localPlayer.health = Math.min(this.localPlayer.maxHealth, this.localPlayer.health + 20);
              this.particles.spawnFloatingText(this.localPlayer.position, '+20 HP 💖', '#ffd700');
            }
          }
        } else if (vortex.type === 'blizzard') {
          for (const enemy of this.enemies.values()) {
            if (!enemy.isAlive) continue;
            const dist = vortex.position.distanceTo(enemy.position);
            if (dist <= vortex.radius) {
              onlineNetwork.hitEnemy(enemy.id, vortex.tickDamage || 28, 'frost');
              this.particles.spawnFloatingText(enemy.position, `❄️ ${vortex.tickDamage || 28}`, '#00e5ff');
              this.ui.triggerHitmarker();
            }
          }
          if (this.boss && this.boss.isAlive) {
            const dist = vortex.position.distanceTo(this.boss.position);
            if (dist <= vortex.radius) {
              onlineNetwork.hitEnemy(this.boss.id, vortex.tickDamage || 28, 'frost');
              this.particles.spawnFloatingText(this.boss.position, `❄️ ${vortex.tickDamage || 28}`, '#00e5ff');
              this.ui.triggerHitmarker();
            }
          }
        } else if (vortex.type === 'temporal_stasis') {
          for (const enemy of this.enemies.values()) {
            if (!enemy.isAlive) continue;
            const dist = vortex.position.distanceTo(enemy.position);
            if (dist <= vortex.radius) {
              onlineNetwork.hitEnemy(enemy.id, vortex.tickDamage || 35, 'chrono');
              this.particles.spawnFloatingText(enemy.position, `⏳ ${vortex.tickDamage || 35}`, '#bf5af2');
              this.ui.triggerHitmarker();
            }
          }
          if (this.boss && this.boss.isAlive) {
            const dist = vortex.position.distanceTo(this.boss.position);
            if (dist <= vortex.radius) {
              onlineNetwork.hitEnemy(this.boss.id, vortex.tickDamage || 35, 'chrono');
              this.particles.spawnFloatingText(this.boss.position, `⏳ ${vortex.tickDamage || 35}`, '#bf5af2');
              this.ui.triggerHitmarker();
            }
          }
        }
      },
      this.localPlayer?.position
    );

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
        enemy.mesh.matrixAutoUpdate = false;
      }
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
