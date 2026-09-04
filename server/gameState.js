// Quizzes and Riddles embedded into the Spire's Lore
export const QUIZ_DATABASE = {
  1: [ // Floor 1: Archives of the Scribes
    {
      id: 'f1_riddle_1',
      title: 'The Scribe\'s First Test',
      riddle: 'I consume everything yet have no mouth. Water is my demise, but air is my breath. Which element am I?',
      options: ['Pyromancy (Fire)', 'Cryomancy (Ice)', 'Electromancy (Storm)', 'Chronomancy (Time)'],
      correctIndex: 0,
      lore: 'The ancient Pyromancers sealed the lower archives with burning glyphs.',
      reward: { exp: 50, talentPoints: 1, unlock: 'f1_glyph_1' }
    },
    {
      id: 'f1_riddle_2',
      title: 'The Balance of Arcana',
      riddle: 'When Fire meets Ice in equal measure, what arcane essence rises to blind the senses?',
      options: ['Volcanic Ash', 'Obscuring Steam', 'Molten Glass', 'Liquid Lightning'],
      correctIndex: 1,
      lore: 'Elemental convergence creates vapors capable of disorienting even towering spire golems.',
      reward: { exp: 50, talentPoints: 1, unlock: 'f1_glyph_2' }
    },
    {
      id: 'f1_riddle_3',
      title: 'The Riddle of the Chronometer',
      riddle: 'I fly without wings, I mourn without tears, wherever I pass, death follows near. What governs Archon Valerius\'s curse?',
      options: ['Shadow', 'Wind', 'Time', 'Gravity'],
      correctIndex: 2,
      lore: 'Valerius fractured the spire\'s hourglass, locking the sanctuary in perpetual loops.',
      reward: { exp: 75, talentPoints: 1, unlock: 'f1_door_unlocked' }
    }
  ],
  2: [ // Floor 2: The Alchemical Crucible
    {
      id: 'f2_alchemy_1',
      title: 'The Alchemist\'s Axiom',
      riddle: 'To neutralize the Volatile Brimstone Core of a Spire Golem, which elemental spell must chill its molten joints?',
      options: ['Chain Lightning', 'Ice Lance / Frost Nova', 'Meteor Strike', 'Flame Wave'],
      correctIndex: 1,
      lore: 'Cryomancy rapidly contracts heated alchemical alloy, creating crystalline fractures.',
      reward: { exp: 100, talentPoints: 1, unlock: 'f2_crucible_hint' }
    },
    {
      id: 'f2_alchemy_2',
      title: 'The Astral Conduit',
      riddle: 'Gold conducts the strike of thunder, but what mystical stone stores celestial arcana without decaying?',
      options: ['Cobalt Glass', 'Aetherite Crystal', 'Obsidian Shard', 'Crushed Brimstone'],
      correctIndex: 1,
      lore: 'The Aetherite crystals in the Spire\'s pinnacle pulse with limitless astral resonance.',
      reward: { exp: 100, talentPoints: 1, unlock: 'f2_door_unlocked' }
    }
  ],
  3: [ // Floor 3: Astral Observatory & Valerius's Sanctum
    {
      id: 'f3_astral_1',
      title: 'The Archon\'s Paradox',
      riddle: 'To break a shield forged in frozen time, one must strike not with brute force, but align the four...',
      options: ['Elemental Runes', 'Celestial Keystones', 'Sacrificial Offerings', 'Scribe Tomes'],
      correctIndex: 1,
      lore: 'The four keystones in the observatory anchor the temporal barrier surrounding Valerius.',
      reward: { exp: 150, talentPoints: 2, unlock: 'f3_boss_weakness' }
    }
  ]
};

export class GameState {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.floor = 1;
    this.maxFloors = 15;
    this.isGameStarted = false;
    this.isGameOver = false;
    this.isVictory = false;

    // Entities
    this.players = new Map(); // socketId -> PlayerState
    this.enemies = new Map(); // enemyId -> EnemyState
    this.projectiles = [];
    this.activePuzzles = {};

    // Puzzles for Exploration & Climactic Boss Levels (Floors 5, 10, 15)
    this.puzzles = {
      floor1: {
        prisms: [
          { id: 1, angle: 0, targetAngle: 90, isAligned: false },
          { id: 2, angle: 180, targetAngle: 270, isAligned: false },
          { id: 3, angle: 90, targetAngle: 0, isAligned: false }
        ],
        unlocked: false
      },
      floor2: {
        crucibles: [
          { element: 'fire', charged: false, color: 0xff4400 },
          { element: 'frost', charged: false, color: 0x00ccff },
          { element: 'storm', charged: false, color: 0xffea00 }
        ],
        order: ['fire', 'frost', 'storm'],
        currentStep: 0,
        unlocked: false
      },
      floor3: {
        keystones: [
          { id: 'north', active: false, x: 0, z: -16 },
          { id: 'south', active: false, x: 0, z: 16 },
          { id: 'east', active: false, x: 16, z: 0 },
          { id: 'west', active: false, x: -16, z: 0 }
        ],
        bossShieldActive: false
      },
      // FLOOR 5 BOSS ROOM PUZZLE: Simultaneous Crucible Triad under Molten Colossus bombardment
      floor5: {
        crucibles: [
          { element: 'fire', charged: false, color: 0xff4400 },
          { element: 'frost', charged: false, color: 0x00ccff },
          { element: 'storm', charged: false, color: 0xffea00 }
        ],
        order: ['fire', 'frost', 'storm'],
        currentStep: 0,
        unlocked: false,
        bossShieldActive: true
      },
      // FLOOR 10 BOSS ROOM PUZZLE: Simultaneous Tri-Elemental Leylines & Meltdown Fail-Safe
      floor10: {
        mirrors: [
          { id: 1, angle: 0, targetAngle: 90, isAligned: false },
          { id: 2, angle: 180, targetAngle: 270, isAligned: false },
          { id: 3, angle: 90, targetAngle: 0, isAligned: false },
          { id: 4, angle: 270, targetAngle: 180, isAligned: false }
        ],
        pedestals: {
          pyretic: { isCharged: false, isAligned: false },
          cryo: { isCharged: false, isAligned: false },
          chrono: { isCharged: false, isAligned: false }
        },
        alignedCount: 0,
        annihilationTimer: 14.0,
        unlocked: false,
        bossShieldActive: true,
        meltdownActive: false,
        meltdownTimer: 15.0
      },
      // FLOOR 15 GRAND FINALE BOSS ROOM PUZZLE: Simultaneous 4 Temporal Paradox Keystones
      floor15: {
        keystones: [
          { id: 'north', active: false, x: 0, z: -16 },
          { id: 'south', active: false, x: 0, z: 16 },
          { id: 'east', active: false, x: 16, z: 0 },
          { id: 'west', active: false, x: -16, z: 0 }
        ],
        bossShieldActive: true
      }
    };

    // Active Quiz state
    this.currentQuiz = null;
    this.quizVotes = new Map(); // socketId -> optionIndex

    // Story progress
    this.storyLog = [
      'You awake in the subterranean archives of the Spire of Aethelgard. Corrupted Archmage Valerius has locked the temporal seals.'
    ];

    this.initFloor(1);
  }

  initFloor(floorNumber) {
    this.floor = floorNumber;
    this.enemies.clear();
    this.projectiles = [];
    this.currentQuiz = null;
    this.quizVotes.clear();

    // =========================================================================
    // TIER 1: THE FORBIDDEN ARCHIVES & ANCIENT CATACOMBS (Floors 1 - 5)
    // =========================================================================
    if (floorNumber === 1) {
      // Floor 1: The Archives of the Scribes
      this.spawnEnemy('sentry', -14, 0, -12, 80, 10, 'Arcane Sentinel');
      this.spawnEnemy('sentry', 14, 0, -12, 80, 10, 'Arcane Sentinel');
      this.spawnEnemy('shade', 0, 0, -20, 120, 15, 'Library Shade');
      this.broadcastStory('Floor 1: The Archives of the Scribes. Seek the riddle monolith and align the light prisms to unlock the elevator gate!');
    } else if (floorNumber === 2) {
      // Floor 2: The Crypt of the Archons
      this.spawnEnemy('sentry', -12, 0, -8, 110, 14, 'Crypt Guardian');
      this.spawnEnemy('sentry', 12, 0, -8, 110, 14, 'Crypt Guardian');
      this.spawnEnemy('shade', 0, 0, -16, 130, 16, 'Tomb Wraith');
      this.spawnEnemy('shade', -8, 0, -24, 130, 16, 'Shadow Spectre');
      this.broadcastStory('Floor 2: The Crypt of the Archons. Ancient sarcophagi rest under ethereal mist. Beware of awakening wraiths!');
    } else if (floorNumber === 3) {
      // Floor 3: The Sunken Scriptorium
      this.spawnEnemy('golem', -10, 0, -12, 180, 20, 'Waterlogged Construct');
      this.spawnEnemy('golem', 10, 0, -12, 180, 20, 'Waterlogged Construct');
      this.spawnEnemy('shade', 0, 0, -22, 140, 18, 'Sunken Apparition');
      this.broadcastStory('Floor 3: The Sunken Scriptorium. Tidal mana surges through shattered flooded chambers!');
    } else if (floorNumber === 4) {
      // Floor 4: The Hall of Whispering Mirrors
      this.spawnEnemy('shade', -14, 0, -10, 150, 20, 'Mirror Phantom');
      this.spawnEnemy('shade', 14, 0, -10, 150, 20, 'Mirror Phantom');
      this.spawnEnemy('sentry', 0, 0, -20, 160, 22, 'Prismatic Sentinel');
      this.spawnEnemy('golem', 0, 0, -30, 220, 24, 'Obsidian Ward');
      this.broadcastStory('Floor 4: The Hall of Whispering Mirrors. The mirrors twist perception—the molten caldera looms just ahead!');
    } else if (floorNumber === 5) {
      // Floor 5: BOSS LEVEL & BOSS ROOM - Ignis the Molten Behemoth
      this.spawnBossIgnis(0, 0, -12);
      this.puzzles.floor5.bossShieldActive = true;
      this.puzzles.floor5.currentStep = 0;
      this.puzzles.floor5.crucibles.forEach(c => c.charged = false);
      this.broadcastStory('FLOOR 5 [BOSS ROOM]: The Magma Crucible! Ignis the Molten Behemoth rises! Solve the Crucible Triad (Fire -> Frost -> Storm) during combat to shatter his Molten Shield!');
    }

    // =========================================================================
    // TIER 2: THE ALCHEMICAL FORGE & VOID UNDER-SPIRE (Floors 6 - 10)
    // =========================================================================
    else if (floorNumber === 6) {
      // Floor 6: The Smoldering Foundry
      this.spawnEnemy('golem', -16, 0, -12, 260, 26, 'Forge Juggernaut');
      this.spawnEnemy('golem', 16, 0, -12, 260, 26, 'Forge Juggernaut');
      this.spawnEnemy('shade', 0, 0, -24, 180, 22, 'Cinder Stalker');
      this.broadcastStory('Floor 6: The Smoldering Foundry. Industrial blast furnaces heat the spire\'s metallic marrow!');
    } else if (floorNumber === 7) {
      // Floor 7: The Golem Assembly Laboratory
      this.spawnEnemy('golem', -20, 0, -10, 290, 28, 'Titan Prototype');
      this.spawnEnemy('golem', 20, 0, -10, 290, 28, 'Titan Prototype');
      this.spawnEnemy('sentry', 0, 0, -22, 190, 24, 'Tesla Conductor');
      this.broadcastStory('Floor 7: The Golem Assembly Laboratory. Arcane machinery hums with volatile electrical current!');
    } else if (floorNumber === 8) {
      // Floor 8: The Crystalline Caverns
      this.spawnEnemy('shade', -15, 0, -15, 200, 24, 'Aether Stalker');
      this.spawnEnemy('shade', 15, 0, -15, 200, 24, 'Aether Stalker');
      this.spawnEnemy('golem', 0, 0, -26, 310, 30, 'Crystalline Colossus');
      this.broadcastStory('Floor 8: The Crystalline Caverns. Resonating amethyst geodes channel unfiltered raw arcana!');
    } else if (floorNumber === 9) {
      // Floor 9: The Void-Touched Catwalks
      this.spawnEnemy('shade', -18, 0, -12, 220, 26, 'Void Horror');
      this.spawnEnemy('shade', 18, 0, -12, 220, 26, 'Void Horror');
      this.spawnEnemy('sentry', 0, 0, -24, 220, 26, 'Abyssal Eye');
      this.broadcastStory('Floor 9: The Void-Touched Catwalks. The fabric of reality thins as the Void Nexus approaches!');
    } else if (floorNumber === 10) {
      // Floor 10: BOSS LEVEL & BOSS ROOM - Astraea the Demon-Angel Sovereign
      this.spawnBossAstraea(0, 0, -14);
      this.puzzles.floor10.bossShieldActive = true;
      this.puzzles.floor10.alignedCount = 0;
      this.puzzles.floor10.meltdownActive = false;
      this.puzzles.floor10.meltdownTimer = 15.0;
      if (this.puzzles.floor10.pedestals) {
        this.puzzles.floor10.pedestals.pyretic = { isCharged: false, isAligned: false };
        this.puzzles.floor10.pedestals.cryo = { isCharged: false, isAligned: false };
        this.puzzles.floor10.pedestals.chrono = { isCharged: false, isAligned: false };
      }
      this.puzzles.floor10.mirrors.forEach(m => m.isAligned = false);
      this.broadcastStory('FLOOR 10 [BOSS ROOM]: The Astral-Brimstone Sanctum! Astraea the Demon-Angel Sovereign descends! Align the 3 Elemental Leylines during combat to pierce her Prismatic Shield — beware the 15-second core meltdown if she falls before containment!');
    }

    // =========================================================================
    // TIER 3: THE CELESTIAL PINNACLE & ASTRAL DOMAIN (Floors 11 - 15)
    // =========================================================================
    else if (floorNumber === 11) {
      // Floor 11: The Star-Woven Gallery
      this.spawnEnemy('sentry', -16, 0, -14, 240, 28, 'Astral Warder');
      this.spawnEnemy('sentry', 16, 0, -14, 240, 28, 'Astral Warder');
      this.spawnEnemy('shade', 0, 0, -25, 240, 28, 'Cosmic Phantom');
      this.broadcastStory('Floor 11: The Star-Woven Gallery. Constellation mosaics illuminate the ascent to the outer atmosphere!');
    } else if (floorNumber === 12) {
      // Floor 12: The Chronometer Clockwork Gears
      this.spawnEnemy('golem', -18, 0, -14, 340, 32, 'Clockwork Sentinel');
      this.spawnEnemy('golem', 18, 0, -14, 340, 32, 'Clockwork Sentinel');
      this.spawnEnemy('sentry', 0, 0, -26, 250, 30, 'Time-Twisted Watcher');
      this.broadcastStory('Floor 12: The Chronometer Clockwork Gears. Giant brass cogs tick with rhythmic temporal tension!');
    } else if (floorNumber === 13) {
      // Floor 13: The High Spire Sky Promenade
      this.spawnEnemy('shade', -18, 0, -16, 260, 30, 'Tempest Spectre');
      this.spawnEnemy('shade', 18, 0, -16, 260, 30, 'Tempest Spectre');
      this.spawnEnemy('golem', 0, 0, -28, 360, 34, 'Gale Titan');
      this.broadcastStory('Floor 13: The High Spire Sky Promenade. Piercing gale winds howl across the open sky bridges!');
    } else if (floorNumber === 14) {
      // Floor 14: The Sanctum of Eternity
      this.spawnEnemy('sentry', -16, 0, -14, 280, 32, 'Archon Praetor');
      this.spawnEnemy('sentry', 16, 0, -14, 280, 32, 'Archon Praetor');
      this.spawnEnemy('golem', 0, 0, -24, 380, 36, 'Eternal Guardian');
      this.broadcastStory('Floor 14: The Sanctum of Eternity. Pure aether flows from the astral vault. The Archon awaits above!');
    } else if (floorNumber === 15) {
      // Floor 15: FINAL BOSS LEVEL & BOSS ROOM - Archon Valerius Ascendant
      this.spawnBossValerius(0, 0, -15);
      this.puzzles.floor15.bossShieldActive = true;
      this.puzzles.floor15.keystones.forEach(k => k.active = false);
      this.broadcastStory('FLOOR 15 [GRAND BOSS ROOM]: The Astral Pinnacle! Archon Valerius Ascendant manipulates time itself! Disrupt all 4 Cardinal Temporal Keystones during combat to shatter his Chrono Barrier!');
    }

    // Reset player floor positions to entrance
    for (const [socketId, player] of this.players) {
      player.x = (Math.random() - 0.5) * 2;
      player.y = 0;
      player.z = (floorNumber === 5 || floorNumber === 6) ? 38 : ((floorNumber === 10 || floorNumber === 15) ? 24 : 31);
      player.rotY = 0;
      player.health = player.maxHealth;
      player.mana = player.maxMana;
      player.isAlive = true;
    }

    this.broadcastState();
  }

  spawnEnemy(type, x, y, z, baseHealth, baseDamage, name) {
    const id = `enemy_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const asc = this.ascensionTier || 0;
    const health = Math.round(baseHealth * (1 + asc * 0.4));
    const damage = Math.round(baseDamage * (1 + asc * 0.25));

    this.enemies.set(id, {
      id,
      type,
      name: asc > 0 ? `[NG+${asc}] ${name}` : name,
      x,
      y,
      z,
      health,
      maxHealth: health,
      damage,
      speed: type === 'golem' ? 2.2 : type === 'shade' ? 4.0 : 3.0,
      state: 'patrol',
      patrolCenter: { x, z },
      targetId: null,
      cooldown: 0,
      attackRange: type === 'golem' ? 3.5 : 8.0,
      isAlive: true
    });
  }

  spawnBossIgnis(x, y, z) {
    const id = 'boss_ignis';
    const asc = this.ascensionTier || 0;
    const health = Math.round(1400 * (1 + asc * 0.45));
    const damage = Math.round(38 * (1 + asc * 0.3));

    this.enemies.set(id, {
      id,
      type: 'boss',
      bossType: 'ignis',
      name: asc > 0 ? `[NG+${asc}] Ignis the Molten Behemoth` : 'Ignis the Molten Behemoth, Lord of the Crucible',
      x, y, z,
      health,
      maxHealth: health,
      damage,
      speed: 2.8,
      state: 'combat',
      targetId: null,
      phase: 1,
      invulnerable: true, // Immune while Crucible Shield is active
      cooldown: 0,
      specialTimer: 6.0,
      stunnedTimer: 0,
      isAlive: true
    });
  }

  spawnBossXyris(x, y, z) {
    const id = 'boss_xyris';
    const asc = this.ascensionTier || 0;
    const health = Math.round(2200 * (1 + asc * 0.45));
    const damage = Math.round(48 * (1 + asc * 0.3));

    this.enemies.set(id, {
      id,
      type: 'boss',
      bossType: 'xyris',
      name: asc > 0 ? `[NG+${asc}] Xyris the Void Sovereign` : 'Xyris the Void Sovereign, Eye of the Abyss',
      x, y, z,
      health,
      maxHealth: health,
      damage,
      speed: 3.5,
      state: 'combat',
      targetId: null,
      phase: 1,
      invulnerable: true, // Protected by Void Ward until mirrors align
      cooldown: 0,
      specialTimer: 8.0,
      channelingAnnihilation: false,
      channelTimer: 0,
      stunnedTimer: 0,
      isAlive: true
    });
  }

  spawnBossAstraea(x, y, z) {
    const id = 'boss_astraea';
    const asc = this.ascensionTier || 0;
    const health = Math.round(42000 * (1 + asc * 0.45));
    const damage = Math.round(52 * (1 + asc * 0.3));

    this.enemies.set(id, {
      id,
      type: 'boss',
      bossType: 'astraea',
      name: asc > 0 ? `[NG+${asc}] Astraea, Demon-Angel Sovereign` : 'Astraea, the Demon-Angel Sovereign',
      x, y, z,
      health,
      maxHealth: health,
      damage,
      speed: 4.0,
      state: 'combat',
      targetId: null,
      phase: 1,
      invulnerable: false,
      shieldReduction: 0.75, // 75% damage reduction until leylines align
      cooldown: 0,
      specialTimer: 5.5,
      channelTimer: 0,
      stunnedTimer: 0,
      isAlive: true
    });
  }

  spawnBossValerius(x, y, z) {
    const id = 'boss_valerius';
    const asc = this.ascensionTier || 0;
    const health = Math.round(3500 * (1 + asc * 0.45));
    const damage = Math.round(58 * (1 + asc * 0.3));

    this.enemies.set(id, {
      id,
      type: 'boss',
      bossType: 'valerius',
      name: asc > 0 ? `[NG+${asc}] Archon Valerius Ascendant` : 'Archon Valerius, Eternal Chronomancer Ascendant',
      x, y, z,
      health,
      maxHealth: health,
      damage,
      speed: 3.4,
      state: 'combat',
      targetId: null,
      phase: 1,
      invulnerable: true, // Temporal rewind shield until keystones disrupted
      cooldown: 0,
      specialTimer: 6.0,
      stunnedTimer: 0,
      isAlive: true
    });
  }

  ascendNewGamePlus() {
    this.ascensionTier = (this.ascensionTier || 0) + 1;
    this.isVictory = false;
    this.isGameOver = false;
    this.initFloor(1);
    this.io.to(this.roomId).emit('ascension_started', {
      tier: this.ascensionTier,
      healthMultiplier: 1 + this.ascensionTier * 0.45
    });
    this.broadcastStory(`[ASCENSION TIER ${this.ascensionTier}] The temporal loop resets with intensified chronomantic corruption!`);
  }

  addPlayer(socketId, name, wizardClass) {
    const classConfigs = {
      pyromancer: { maxHealth: 180, maxMana: 140, speed: 6.5, color: 0xff3b30 },
      cryomancer: { maxHealth: 240, maxMana: 120, speed: 6.0, color: 0x0a84ff },
      luminary: { maxHealth: 200, maxMana: 180, speed: 6.4, color: 0xffc107 },
      stormcaller: { maxHealth: 170, maxMana: 160, speed: 7.2, color: 0xffd60a },
      chronomancer: { maxHealth: 190, maxMana: 150, speed: 6.5, color: 0xbf5af2 }
    };

    const config = classConfigs[wizardClass] || classConfigs.pyromancer;

    const player = {
      id: socketId,
      name: name || 'Apprentice',
      wizardClass,
      color: config.color,
      x: (this.players.size * 2) - 2,
      y: 0,
      z: this.floor === 1 ? 31 : (this.floor === 2 ? 40 : 14),
      rotY: 0,
      health: config.maxHealth,
      maxHealth: config.maxHealth,
      mana: config.maxMana,
      maxMana: config.maxMana,
      talentPoints: 1,
      level: 1,
      xp: 0,
      talents: {
        t1: false,
        t2: false,
        t3: false
      },
      score: 0,
      isReady: false,
      isAlive: true,
      lastInputSeq: 0
    };

    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.quizVotes.delete(socketId);
  }

  handlePlayerInput(socketId, data) {
    const player = this.players.get(socketId);
    if (!player || !player.isAlive) return;

    if (data.x !== undefined) player.x = data.x;
    if (data.y !== undefined) player.y = data.y;
    if (data.z !== undefined) player.z = data.z;
    if (data.rotY !== undefined) player.rotY = data.rotY;
    if (data.action) player.action = data.action;
    player.lastInputSeq = data.seq || 0;
  }

  handleSpellCast(socketId, spellData) {
    const player = this.players.get(socketId);
    if (!player || !player.isAlive) return;

    if (player.mana < (spellData.manaCost || 10)) {
      return; // Not enough mana
    }

    player.mana -= (spellData.manaCost || 10);

    // Broadcast spell effect to all players in room
    this.io.to(this.roomId).emit('spell_cast', {
      casterId: socketId,
      spellId: spellData.spellId,
      spellType: spellData.spellType,
      origin: spellData.origin,
      direction: spellData.direction,
      damage: spellData.damage,
      element: spellData.element
    });

    // Check interaction with Floor 2 crucibles
    if (this.floor === 2 && spellData.targetType === 'crucible') {
      this.handleCrucibleInteraction(spellData.crucibleIndex, spellData.element);
    }
  }

  handleDamageToEnemy(enemyId, damage, element, attackerId) {
    const enemy = this.enemies.get(enemyId);
    if (!enemy || !enemy.isAlive) return;

    // Check boss shields during simultaneous combat puzzles
    if (enemy.type === 'boss') {
      if (this.floor === 5 && this.puzzles.floor5?.bossShieldActive) {
        this.io.to(this.roomId).emit('floating_text', {
          x: enemy.x, y: enemy.y + 2.5, z: enemy.z,
          text: 'MOLTEN SHIELD (Charge Crucibles!)',
          color: '#ff3b30'
        });
        return;
      }
      if (this.floor === 10) {
        if (enemy.bossType === 'astraea') {
          const reduction = enemy.shieldReduction !== undefined ? enemy.shieldReduction : 0.75;
          if (reduction > 0) {
            damage = Math.max(1, Math.round(damage * (1 - reduction)));
            this.io.to(this.roomId).emit('floating_text', {
              x: enemy.x, y: enemy.y + 2.5, z: enemy.z,
              text: `PRISMATIC SHIELD (-${Math.round(reduction * 100)}% DMG)`,
              color: '#00e5ff'
            });
          }
        } else if (this.puzzles.floor10?.bossShieldActive) {
          this.io.to(this.roomId).emit('floating_text', {
            x: enemy.x, y: enemy.y + 2.5, z: enemy.z,
            text: 'VOID WARD (Align 4 Mirrors!)',
            color: '#9333ea'
          });
          return;
        }
      }
      if (this.floor === 15 && this.puzzles.floor15?.bossShieldActive) {
        this.io.to(this.roomId).emit('floating_text', {
          x: enemy.x, y: enemy.y + 2.5, z: enemy.z,
          text: 'TEMPORAL SHIELD (Disrupt Keystones!)',
          color: '#00e5ff'
        });
        return;
      }
    }

    if (enemy.invulnerable) {
      this.io.to(this.roomId).emit('floating_text', {
        x: enemy.x,
        y: enemy.y + 2,
        z: enemy.z,
        text: 'SHIELDED!',
        color: '#ffcc00'
      });
      return;
    }

    // Elemental combos: Frost + Fire = SHATTER (1.5x damage)
    let actualDamage = damage;
    if (enemy.statusEffect === 'frozen' && element === 'fire') {
      actualDamage *= 1.5;
      enemy.statusEffect = null;
      this.io.to(this.roomId).emit('floating_text', {
        x: enemy.x,
        y: enemy.y + 2.5,
        z: enemy.z,
        text: 'SHATTER!',
        color: '#ff4500'
      });
    }

    enemy.health -= actualDamage;

    // Floating combat text
    this.io.to(this.roomId).emit('floating_text', {
      x: enemy.x,
      y: enemy.y + 2,
      z: enemy.z,
      text: `-${Math.round(actualDamage)}`,
      color: element === 'fire' ? '#ff3b30' : element === 'frost' ? '#0a84ff' : element === 'storm' ? '#ffd60a' : '#bf5af2'
    });

    if (attackerId) {
      const player = this.players.get(attackerId);
      if (player) player.score += Math.round(actualDamage);
      enemy.targetId = attackerId;
    }

    if (enemy.health <= 0) {
      enemy.health = 0;
      enemy.isAlive = false;

      this.io.to(this.roomId).emit('enemy_defeated', {
        enemyId,
        name: enemy.name
      });

      // Grant talent points and score
      for (const p of this.players.values()) {
        p.score += 50;
      }

      if (enemy.type === 'boss') {
        if (this.floor === 15) {
          this.isVictory = true;
          this.broadcastStory('Victory! Archon Valerius Ascendant has fallen. The temporal curse shatters, and eternity is restored!');
          this.io.to(this.roomId).emit('game_victory', {
            stats: Array.from(this.players.values()).map(p => ({
              name: p.name,
              class: p.wizardClass,
              score: p.score
            }))
          });
        } else if (this.floor === 5) {
          this.broadcastStory('IGNIS HAS FALLEN! The Molten Gates to Tier 2 (Floor 6: The Smoldering Foundry) have been breached! Step into the portal!');
          this.io.to(this.roomId).emit('boss_defeated_advancement', {
            nextFloor: 6,
            message: 'Tier 1 Conquered! The Alchemical Under-Spire Awaits.'
          });
        } else if (this.floor === 10) {
          const puzzle = this.puzzles.floor10;
          const isPuzzleSolved = puzzle && (puzzle.unlocked || (puzzle.alignedCount !== undefined && puzzle.alignedCount >= 3));
          if (isPuzzleSolved) {
            this.broadcastStory('ASTRAEA HAS FALLEN! The Leylines are stabilized, revealing the star-gate to Tier 3 (Floor 11: The Celestial Pinnacle)!');
            this.io.to(this.roomId).emit('boss_defeated_advancement', {
              nextFloor: 11,
              message: 'Tier 2 Conquered! The Celestial Pinnacle Awaits.'
            });
          } else {
            // 15-SECOND POST-KILL MELTDOWN FAIL-SAFE!
            puzzle.meltdownActive = true;
            puzzle.meltdownTimer = 15.0;
            this.broadcastStory('⚠️ EMERGENCY: ASTRAEA DEFEATED BUT CORE DESTABILIZING! 15 SECONDS TO ALIGN LEYLINES OR PERISH!');
            this.io.to(this.roomId).emit('boss_meltdown_started', {
              duration: 15.0,
              message: 'EMERGENCY: Complete the Leyline Matrix within 15 seconds!'
            });
          }
        }
      }
    }
  }

  // Tri-Elemental Leylines (Floor 10 Boss Astraea)
  chargeLeylinePedestal(pedestalKey) {
    if (this.floor !== 10) return;
    const puzzle = this.puzzles.floor10;
    if (!puzzle.pedestals) {
      puzzle.pedestals = {
        pyretic: { isCharged: false, isAligned: false },
        cryo: { isCharged: false, isAligned: false },
        chrono: { isCharged: false, isAligned: false }
      };
    }
    const ped = puzzle.pedestals[pedestalKey];
    if (ped && !ped.isCharged) {
      ped.isCharged = true;
      this.io.to(this.roomId).emit('leyline_charged', { pedestalKey });
    }
  }

  alignLeylinePedestal(pedestalKey) {
    if (this.floor !== 10) return;
    const puzzle = this.puzzles.floor10;
    if (!puzzle.pedestals) {
      puzzle.pedestals = {
        pyretic: { isCharged: false, isAligned: false },
        cryo: { isCharged: false, isAligned: false },
        chrono: { isCharged: false, isAligned: false }
      };
    }
    const ped = puzzle.pedestals[pedestalKey];
    if (ped && !ped.isAligned) {
      ped.isCharged = true;
      ped.isAligned = true;
      puzzle.alignedCount = (puzzle.alignedCount || 0) + 1;

      const boss = this.enemies.get('boss_astraea');
      if (boss && boss.isAlive) {
        boss.shieldReduction = Math.max(0, (boss.shieldReduction !== undefined ? boss.shieldReduction : 0.75) - 0.25);
        if (puzzle.alignedCount >= 3) {
          boss.shieldReduction = 0;
          boss.stunnedTimer = 6.0;
          this.broadcastStory('✨ TRIPLE LEYLINE CONVERGENCE! Astraea\'s Prismatic Shield shattered! SHE IS STUNNED FOR 6s (+150% DMG)!');
        }
      }

      this.io.to(this.roomId).emit('leyline_aligned', {
        pedestalKey,
        alignedCount: puzzle.alignedCount,
        totalBeams: 3,
        shieldReduction: boss ? boss.shieldReduction : 0
      });

      if (puzzle.alignedCount >= 3) {
        puzzle.unlocked = true;
        puzzle.bossShieldActive = false;
        if (puzzle.meltdownActive) {
          puzzle.meltdownActive = false;
          this.broadcastStory('✨ CORE STABILIZED! Meltdown averted with seconds to spare! The star-gate to Tier 3 (Floor 11) is revealed!');
          this.io.to(this.roomId).emit('meltdown_contained', {
            message: 'Core Stabilized! Victory Secured.'
          });
          this.io.to(this.roomId).emit('boss_defeated_advancement', {
            nextFloor: 11,
            message: 'Tier 2 Conquered! The Celestial Pinnacle Awaits.'
          });
        }
      }
    }
  }

  // Interactive Prism / Mirror Rotation (Floor 1 & Boss Floor 10)
  rotatePrism(prismId) {
    if (this.floor === 10) {
      // Floor 10 Boss Xyris 4-Mirror Puzzle
      const puzzle = this.puzzles.floor10;
      const mirror = puzzle.mirrors.find(m => m.id === prismId);
      if (!mirror) return;

      mirror.angle = (mirror.angle + 90) % 360;
      mirror.isAligned = (mirror.angle === mirror.targetAngle);
      const allAligned = puzzle.mirrors.every(m => m.isAligned);
      puzzle.unlocked = allAligned;

      this.io.to(this.roomId).emit('puzzle_update', {
        floor: 10,
        type: 'mirror_rotated',
        prismId,
        angle: mirror.angle,
        allAligned
      });

      if (allAligned) {
        puzzle.bossShieldActive = false;
        const boss = this.enemies.get('boss_xyris');
        if (boss) {
          boss.invulnerable = false;
          boss.stunnedTimer = 8.0;
          this.broadcastStory('PRISMATIC CONVERGENCE! The redirected Aether Beam pierces Xyris\'s Void Eye! Void Annihilation interrupted! HE IS STUNNED!');
        }
        this.io.to(this.roomId).emit('boss_shield_broken', { bossId: 'boss_xyris', duration: 8.0 });
      }
      return;
    }

    const puzzle = this.puzzles.floor1;
    const prism = puzzle.prisms.find(p => p.id === prismId);
    if (!prism) return;

    prism.angle = (prism.angle + 90) % 360;
    prism.isAligned = (prism.angle === prism.targetAngle);

    // Check all prisms
    const allAligned = puzzle.prisms.every(p => p.isAligned);
    puzzle.unlocked = allAligned;

    this.io.to(this.roomId).emit('puzzle_update', {
      floor: 1,
      type: 'prism_rotated',
      prismId,
      angle: prism.angle,
      allAligned
    });

    if (allAligned) {
      this.broadcastStory('The light prisms connect! The celestial rune barrier on the door dissolves into stardust.');
    }
  }

  // Interactive Crucible Imbue (Floor 2 & Boss Floor 5)
  handleCrucibleInteraction(index, element) {
    const puzzle = (this.floor === 5) ? this.puzzles.floor5 : this.puzzles.floor2;
    if (!puzzle) return;
    const expected = puzzle.order[puzzle.currentStep];

    if (element === expected) {
      puzzle.crucibles[index].charged = true;
      puzzle.currentStep++;

      this.io.to(this.roomId).emit('puzzle_update', {
        floor: this.floor,
        type: 'crucible_charge',
        index,
        element,
        step: puzzle.currentStep,
        success: true
      });

      if (puzzle.currentStep >= puzzle.order.length) {
        puzzle.unlocked = true;

        if (this.floor === 5) {
          puzzle.bossShieldActive = false;
          const boss = this.enemies.get('boss_ignis');
          if (boss) {
            boss.invulnerable = false;
            boss.stunnedTimer = 8.0;
            this.broadcastStory('THE CRUCIBLE OVERFLOWS! Ignis\'s Molten Aegis has SHATTERED! HE IS STUNNED FOR 8 SECONDS! STRIKE NOW!');
          }
          this.io.to(this.roomId).emit('boss_shield_broken', { bossId: 'boss_ignis', duration: 8.0 });
        } else {
          this.broadcastStory('The Crucible harmonizes! The molten elevator gate lowers, granting access to the upper levels.');
        }
      }
    } else {
      // Mistake! Reset and warn players
      puzzle.currentStep = 0;
      puzzle.crucibles.forEach(c => c.charged = false);
      this.io.to(this.roomId).emit('puzzle_update', {
        floor: this.floor,
        type: 'crucible_reset',
        message: 'The elements clash! The crucible resets.'
      });
    }
  }

  // Interactive Keystone Activate (Floor 3 & Boss Floor 15)
  activateKeystone(keystoneId) {
    const puzzle = (this.floor === 15) ? this.puzzles.floor15 : this.puzzles.floor3;
    if (!puzzle) return;
    const keystone = puzzle.keystones.find(k => k.id === keystoneId);
    if (!keystone || keystone.active) return;

    keystone.active = true;

    const allActive = puzzle.keystones.every(k => k.active);
    if (allActive) {
      puzzle.bossShieldActive = false;
      const boss = this.enemies.get('boss_valerius');
      if (boss) {
        boss.invulnerable = false;
        boss.stunnedTimer = 6.0;
        this.broadcastStory('TEMPORAL OVERLOAD! Archon Valerius\'s time-stasis barrier has collapsed! STRIKE HIM NOW!');
      }
      this.io.to(this.roomId).emit('boss_shield_broken', { bossId: 'boss_valerius', duration: 6.0 });
    }

    this.io.to(this.roomId).emit('puzzle_update', {
      floor: this.floor,
      type: 'keystone_activated',
      keystoneId,
      allActive
    });
  }

  // Quiz Chamber
  startQuiz(quizId) {
    const floorQuizzes = QUIZ_DATABASE[this.floor] || [];
    const quiz = floorQuizzes.find(q => q.id === quizId) || floorQuizzes[0];
    if (!quiz) return;

    this.currentQuiz = quiz;
    this.quizVotes.clear();

    this.io.to(this.roomId).emit('quiz_start', {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        riddle: quiz.riddle,
        options: quiz.options,
        lore: quiz.lore
      },
      timeLimit: 25 // 25 seconds for co-op discussion
    });
  }

  voteQuiz(socketId, optionIndex) {
    if (!this.currentQuiz) return;
    this.quizVotes.set(socketId, optionIndex);

    // Broadcast current votes
    const votesSummary = Array.from(this.quizVotes.entries()).map(([sid, opt]) => ({
      playerName: this.players.get(sid)?.name || 'Apprentice',
      optionIndex: opt
    }));

    this.io.to(this.roomId).emit('quiz_votes_update', { votes: votesSummary });

    // If all living players have voted, evaluate
    if (this.quizVotes.size >= this.players.size) {
      this.evaluateQuiz();
    }
  }

  evaluateQuiz() {
    if (!this.currentQuiz) return;

    // Count votes
    const voteCounts = {};
    for (const opt of this.quizVotes.values()) {
      voteCounts[opt] = (voteCounts[opt] || 0) + 1;
    }

    // Determine majority choice
    let majorityOption = -1;
    let maxVotes = -1;
    for (const [opt, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        majorityOption = parseInt(opt, 10);
      }
    }

    const isCorrect = (majorityOption === this.currentQuiz.correctIndex);

    if (isCorrect) {
      // Reward all players with talent point and score
      for (const p of this.players.values()) {
        p.talentPoints += this.currentQuiz.reward.talentPoints || 1;
        p.score += this.currentQuiz.reward.exp || 50;
      }
      this.broadcastStory(`Wisdom prevails! The riddle was solved correctly. Everyone gained ${this.currentQuiz.reward.talentPoints} Talent Point!`);
    } else {
      this.broadcastStory('An arcane surge repels you! The answer was incorrect. Spire wardens awaken!');
      // Spawn extra minion penalty
      this.spawnEnemy('sentry', 0, 0, 0, 60, 10, 'Curse Warden');
    }

    this.io.to(this.roomId).emit('quiz_result', {
      isCorrect,
      correctIndex: this.currentQuiz.correctIndex,
      reward: isCorrect ? this.currentQuiz.reward : null
    });

    this.currentQuiz = null;
    this.quizVotes.clear();
  }

  upgradeTalent(socketId, talentKey) {
    const player = this.players.get(socketId);
    if (!player || player.talentPoints <= 0) return;

    if (!player.talents[talentKey]) {
      player.talents[talentKey] = true;
      player.talentPoints--;

      // Apply class-specific distinct multi-branch talent passives
      // Pyromancer
      if (talentKey === 'pyro_ignite') { player.maxHealth += 35; player.health += 35; player.igniteBurn = true; }
      else if (talentKey === 'pyro_combustion') { player.maxMana += 45; player.mana += 45; player.deathExplosion = true; }
      else if (talentKey === 'pyro_inferno') { player.spellPowerBonus = (player.spellPowerBonus || 0) + 0.30; player.speed += 1.2; }
      else if (talentKey === 'pyro_aether') { player.maxMana += 50; player.mana += 50; player.fireCostReduction = 12; }
      else if (talentKey === 'pyro_molten') { player.maxHealth += 45; player.health += 45; player.extraCinders = 2; }
      else if (talentKey === 'pyro_supernova') { player.vortexRadiusBonus = 4.0; player.vortexDamageMultiplier = 1.4; }

      // Cryomancer
      else if (talentKey === 'cryo_plating') { player.maxHealth += 80; player.health += 80; player.damageReduction = 0.18; }
      else if (talentKey === 'cryo_barrier') { player.maxMana += 40; player.mana += 40; player.shieldAmount = 60; }
      else if (talentKey === 'cryo_juggernaut') { player.stunImmune = true; player.slowAura = 0.35; }
      else if (talentKey === 'cryo_pierce') { player.maxMana += 45; player.mana += 45; player.pierceEnemies = true; }
      else if (talentKey === 'cryo_siphon') { player.maxHealth += 40; player.health += 40; player.iceLifeLeech = 20; }
      else if (talentKey === 'cryo_zero') { player.freezeBonus = 0.45; player.shatterAoe = 40; }

      // Luminary
      else if (talentKey === 'lumi_focus') { player.maxMana += 50; player.mana += 50; player.healingPowerBonus = 0.30; }
      else if (talentKey === 'lumi_salvation') { player.maxHealth += 45; player.health += 45; player.partyRegenAura = 6; }
      else if (talentKey === 'lumi_intervention') { player.maxHealth += 50; player.health += 50; player.cheatDeath = true; }
      else if (talentKey === 'lumi_wrath') { player.maxMana += 40; player.mana += 40; player.healSmiteDamage = 36; }
      else if (talentKey === 'lumi_dawn') { player.maxHealth += 40; player.health += 40; player.enemyWeaken = 0.25; }
      else if (talentKey === 'lumi_sanctuary') { player.holyShieldBonus = 50; player.sanctuaryDamageBuff = 0.30; }

      // Chronomancer
      else if (talentKey === 'chrono_anchor') { player.maxHealth += 35; player.health += 35; player.cdr = 0.20; player.speed += 1.4; }
      else if (talentKey === 'chrono_paradox') { player.maxMana += 50; player.mana += 50; player.blinkDecoy = true; }
      else if (talentKey === 'chrono_rift') { player.spellPowerBonus = (player.spellPowerBonus || 0) + 0.25; player.cdRefundOnHit = 1.5; }
      else if (talentKey === 'chrono_entropy') { player.maxMana += 75; player.mana += 75; player.rewindBonus = 45; }
      else if (talentKey === 'chrono_dilation') { player.maxHealth += 40; player.health += 40; player.attackSpeedDebuff = 0.40; }
      else if (talentKey === 'chrono_singularity') { player.stasisDurationBonus = 2.5; player.bossStun = true; }

      this.io.to(socketId).emit('talent_updated', {
        talents: player.talents,
        talentPoints: player.talentPoints,
        maxHealth: player.maxHealth,
        maxMana: player.maxMana
      });
    }
  }

  advanceFloor() {
    if (this.floor < this.maxFloors) {
      this.initFloor(this.floor + 1);
      this.io.to(this.roomId).emit('floor_changed', {
        floor: this.floor
      });
    }
  }

  broadcastStory(text) {
    this.storyLog.push(text);
    this.io.to(this.roomId).emit('story_message', {
      text,
      timestamp: Date.now()
    });
  }

  // Game tick for AI & state updates (ran at 20 ticks/sec)
  tick(deltaTime) {
    // Regenerate mana slowly
    for (const player of this.players.values()) {
      if (player.isAlive && player.mana < player.maxMana) {
        player.mana = Math.min(player.maxMana, player.mana + 4 * deltaTime);
      }
    }

    // AI Logic for Enemies & Boss
    for (const enemy of this.enemies.values()) {
      if (!enemy.isAlive) continue;

      if (enemy.cooldown > 0) enemy.cooldown -= deltaTime;

      // Find closest living player
      let closestPlayer = null;
      let closestDist = 999;

      for (const player of this.players.values()) {
        if (!player.isAlive) continue;
        const dx = player.x - enemy.x;
        const dz = player.z - enemy.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < closestDist) {
          closestDist = dist;
          closestPlayer = player;
        }
      }

      if (!closestPlayer) continue;

      // Enemy AI Behavior
      if (enemy.type === 'boss') {
        this.updateBossAI(enemy, closestPlayer, closestDist, deltaTime);
      } else {
        this.updateStandardEnemyAI(enemy, closestPlayer, closestDist, deltaTime);
      }
    }

    // Floor 10 Meltdown Fail-Safe Loop
    if (this.floor === 10 && this.puzzles.floor10?.meltdownActive) {
      const puzzle = this.puzzles.floor10;
      puzzle.meltdownTimer -= deltaTime;
      if (puzzle.meltdownTimer <= 0) {
        puzzle.meltdownActive = false;
        this.broadcastStory('💥 CATASTROPHIC CORE DETONATION! The chamber collapsed! (15s Fail-Safe Expired)');
        for (const p of this.players.values()) {
          if (p.isAlive) {
            p.health = 0;
            p.isAlive = false;
            this.io.to(this.roomId).emit('player_died', { playerId: p.id });
          }
        }
        this.io.to(this.roomId).emit('encounter_wipe', {
          floor: 10,
          message: 'Core Meltdown wiped the party. Floor resetting.'
        });
        setTimeout(() => {
          this.initFloor(10);
        }, 3500);
      }
    }

    // Handle player respawns (10-second temporal resurrection loop)
    for (const player of this.players.values()) {
      if (!player.isAlive) {
        player.respawnTimer = (player.respawnTimer || 0) + deltaTime;
        if (player.respawnTimer >= 10.0) {
          player.respawnTimer = 0;
          player.isAlive = true;
          player.health = player.maxHealth;
          player.mana = player.maxMana;
          player.x = 0;
          player.y = 0;
          player.z = this.floor === 1 ? 31 : (this.floor === 2 ? 40 : 14);
          player.rotY = 0;

          this.io.to(this.roomId).emit('player_respawned', {
            playerId: player.id,
            name: player.name,
            x: player.x,
            y: player.y,
            z: player.z,
            health: player.health,
            maxHealth: player.maxHealth,
            mana: player.mana,
            maxMana: player.maxMana
          });
          this.broadcastStory(`${player.name} reconstituted by the temporal continuum at the Awakening Vault!`);
        }
      } else {
        player.respawnTimer = 0;
      }
    }

    this.broadcastState();
  }

  updateStandardEnemyAI(enemy, target, dist, deltaTime) {
    // Safe Zone: Enemies will NEVER aggro or attack players inside or near the Awakening Vault (Floor 1, z > 16.5)
    if (this.floor === 1 && target.z > 16.5) {
      enemy.state = 'idle';
      return;
    }

    const aggroRadius = this.floor === 2 ? 55 : 30;

    if (dist < aggroRadius) {
      // Crowd separation to prevent enemies merging into each other
      let sepX = 0, sepZ = 0;
      for (const other of this.enemies.values()) {
        if (other.id !== enemy.id && other.isAlive) {
          const odx = enemy.x - other.x;
          const odz = enemy.z - other.z;
          const odist = Math.hypot(odx, odz);
          if (odist < 2.8 && odist > 0.05) {
            const force = (2.8 - odist) / 2.8;
            sepX += (odx / odist) * force * 2.4;
            sepZ += (odz / odist) * force * 2.4;
          }
        }
      }

      const dx = target.x - enemy.x;
      const dz = target.z - enemy.z;
      const angle = Math.atan2(dx, dz);

      // Distinct AI Behaviors per enemy type:
      if (enemy.type === 'sentry') {
        // === Arcane Sentinel: Ranged Sniper ===
        if (dist > 18) {
          // Approach
          enemy.x += (Math.sin(angle) * enemy.speed + sepX) * deltaTime;
          enemy.z += (Math.cos(angle) * enemy.speed + sepZ) * deltaTime;
          enemy.state = 'walk';
        } else if (dist < 8) {
          // Back up if player gets too close
          enemy.x -= (Math.sin(angle) * (enemy.speed * 0.7) - sepX) * deltaTime;
          enemy.z -= (Math.cos(angle) * (enemy.speed * 0.7) - sepZ) * deltaTime;
          enemy.state = 'walk';
        } else {
          // In sweet spot range: circle target and charge laser
          enemy.x += (Math.cos(angle) * (enemy.speed * 0.5) + sepX) * deltaTime;
          enemy.z += (-Math.sin(angle) * (enemy.speed * 0.5) + sepZ) * deltaTime;
          enemy.state = 'cast';
        }

        if (dist >= 6 && dist <= 24 && enemy.cooldown <= 0) {
          enemy.cooldown = 2.8;
          this.io.to(this.roomId).emit('enemy_ability', {
            enemyId: enemy.id,
            type: 'sentry',
            ability: 'arcane_laser',
            origin: { x: enemy.x, y: 1.8, z: enemy.z },
            targetId: target.id,
            targetPos: { x: target.x, y: 1.2, z: target.z },
            damage: 20
          });
          target.health -= 20;
          if (target.health <= 0) {
            target.health = 0;
            target.isAlive = false;
            this.io.to(this.roomId).emit('player_died', { playerId: target.id });
          }
        }
      } else if (enemy.type === 'golem') {
        // === Forge Golem: Heavy Tank & Seismic Slam ===
        if (dist > 4.5) {
          enemy.x += (Math.sin(angle) * enemy.speed + sepX) * deltaTime;
          enemy.z += (Math.cos(angle) * enemy.speed + sepZ) * deltaTime;
          enemy.state = 'walk';
        } else {
          enemy.state = 'attack';
          if (enemy.cooldown <= 0) {
            enemy.cooldown = 3.2;
            // Seismic Earth Slam
            this.io.to(this.roomId).emit('enemy_ability', {
              enemyId: enemy.id,
              type: 'golem',
              ability: 'ground_slam',
              origin: { x: enemy.x, y: 0, z: enemy.z },
              radius: 5.5,
              damage: 28
            });

            // Damage all nearby players
            for (const p of this.players.values()) {
              if (p.isAlive && Math.hypot(p.x - enemy.x, p.z - enemy.z) <= 5.5) {
                p.health -= 28;
                if (p.health <= 0) {
                  p.health = 0;
                  p.isAlive = false;
                  this.io.to(this.roomId).emit('player_died', { playerId: p.id });
                }
              }
            }
          }
        }
      } else if (enemy.type === 'shade') {
        // === Void Shade: Swift Stalker & Void Missiles ===
        if (dist > 3.0) {
          enemy.x += (Math.sin(angle) * enemy.speed + sepX) * deltaTime;
          enemy.z += (Math.cos(angle) * enemy.speed + sepZ) * deltaTime;
          enemy.state = 'walk';
        }

        if (dist > 8 && dist < 22 && enemy.cooldown <= 0) {
          enemy.cooldown = 2.4;
          this.io.to(this.roomId).emit('enemy_ability', {
            enemyId: enemy.id,
            type: 'shade',
            ability: 'void_missile',
            origin: { x: enemy.x, y: 1.5, z: enemy.z },
            targetId: target.id,
            targetPos: { x: target.x, y: 1.2, z: target.z },
            damage: 18
          });
          target.health -= 18;
          if (target.health <= 0) {
            target.health = 0;
            target.isAlive = false;
            this.io.to(this.roomId).emit('player_died', { playerId: target.id });
          }
        } else if (dist <= 3.0 && enemy.cooldown <= 0) {
          enemy.cooldown = 1.6;
          enemy.state = 'attack';
          this.io.to(this.roomId).emit('enemy_attack', {
            enemyId: enemy.id,
            targetId: target.id,
            damage: enemy.damage
          });
          target.health -= enemy.damage;
          if (target.health <= 0) {
            target.health = 0;
            target.isAlive = false;
            this.io.to(this.roomId).emit('player_died', { playerId: target.id });
          }
        }
      } else {
        // Default standard melee
        if (dist > (enemy.attackRange || 2.0)) {
          enemy.x += (Math.sin(angle) * enemy.speed + sepX) * deltaTime;
          enemy.z += (Math.cos(angle) * enemy.speed + sepZ) * deltaTime;
          enemy.state = 'walk';
        } else {
          enemy.state = 'attack';
          if (enemy.cooldown <= 0) {
            enemy.cooldown = 2.0;
            target.health -= enemy.damage;
            this.io.to(this.roomId).emit('enemy_attack', {
              enemyId: enemy.id,
              targetId: target.id,
              damage: enemy.damage
            });
            if (target.health <= 0) {
              target.health = 0;
              target.isAlive = false;
              this.io.to(this.roomId).emit('player_died', { playerId: target.id });
            }
          }
        }
      }
    } else {
      enemy.state = 'idle';
    }
  }

  updateBossAI(boss, target, dist, deltaTime) {
    // If stunned from puzzle mechanics, skip AI actions
    if (boss.stunnedTimer > 0) {
      boss.stunnedTimer -= deltaTime;
      return;
    }

    if (boss.specialTimer > 0) boss.specialTimer -= deltaTime;

    // Face target
    const dx = target.x - boss.x;
    const dz = target.z - boss.z;
    const angle = Math.atan2(dx, dz);

    if (dist > (boss.bossType === 'ignis' ? 4 : 6)) {
      boss.x += Math.sin(angle) * boss.speed * deltaTime;
      boss.z += Math.cos(angle) * boss.speed * deltaTime;
    }

    // -------------------------------------------------------------------------
    // BOSS 1: IGNIS THE MOLTEN BEHEMOTH (Floor 5)
    // -------------------------------------------------------------------------
    if (boss.bossType === 'ignis') {
      // Shield regeneration check
      if (!this.puzzles.floor5.bossShieldActive) {
        boss.shieldRegenTimer = (boss.shieldRegenTimer || 0) + deltaTime;
        if (boss.shieldRegenTimer > 18.0) {
          boss.shieldRegenTimer = 0;
          this.puzzles.floor5.bossShieldActive = true;
          this.puzzles.floor5.currentStep = 0;
          this.puzzles.floor5.crucibles.forEach(c => c.charged = false);
          this.broadcastStory('IGNIS ROARS! The volcanic core erupts, restoring his Molten Shield! RE-ALIGN THE CRUCIBLES!');
          this.io.to(this.roomId).emit('boss_special', {
            bossId: boss.id,
            ability: 'magma_surge',
            duration: 2.0
          });
        }
      }

      if (boss.specialTimer <= 0) {
        boss.specialTimer = 6.0;
        this.io.to(this.roomId).emit('boss_special', {
          bossId: boss.id,
          ability: 'magma_slam',
          targetX: target.x,
          targetZ: target.z,
          duration: 2.2
        });
      }
    }

    // -------------------------------------------------------------------------
    // BOSS 2: XYRIS THE VOID SOVEREIGN (Floor 10)
    // -------------------------------------------------------------------------
    else if (boss.bossType === 'xyris') {
      // Void Annihilation channel loop
      if (this.puzzles.floor10.bossShieldActive) {
        boss.annihilationTimer = (boss.annihilationTimer || 14.0) - deltaTime;
        if (boss.annihilationTimer <= 0) {
          // Annihilation detonates!
          boss.annihilationTimer = 14.0;
          this.broadcastStory('VOID ANNIHILATION DETONATES! The mirrors were not aligned in time!');
          for (const p of this.players.values()) {
            if (p.isAlive) {
              p.health -= 45;
              if (p.health <= 0) {
                p.health = 0;
                p.isAlive = false;
                this.io.to(this.roomId).emit('player_died', { playerId: p.id });
              }
            }
          }
          this.io.to(this.roomId).emit('boss_special', {
            bossId: boss.id,
            ability: 'void_cataclysm',
            duration: 2.0
          });
        }
      }

      if (boss.specialTimer <= 0) {
        boss.specialTimer = 7.0;
        this.io.to(this.roomId).emit('boss_special', {
          bossId: boss.id,
          ability: 'void_missiles',
          targetX: target.x,
          targetZ: target.z,
          duration: 2.5
        });
      }
    }

    // -------------------------------------------------------------------------
    // BOSS 2 (ALTERNATE/ENHANCED): ASTRAEA THE DEMON-ANGEL SOVEREIGN (Floor 10)
    // -------------------------------------------------------------------------
    else if (boss.bossType === 'astraea') {
      const hpRatio = boss.health / boss.maxHealth;
      if (hpRatio < 0.35 && boss.phase !== 3) {
        boss.phase = 3;
        this.broadcastStory('ASTRAEA: "Mortal insects! Witness the celestial cataclysm of holy wrath and netherflame!" (Phase 3: Nether-Seraph Enrage!)');
        this.io.to(this.roomId).emit('boss_phase_change', {
          bossId: boss.id,
          phase: 3,
          title: 'PHASE 3: NETHER-SERAPH ENRAGE'
        });
      } else if (hpRatio < 0.70 && boss.phase === 1) {
        boss.phase = 2;
        this.broadcastStory('ASTRAEA: "Ascend to the heavens or burn in the caldera!" (Phase 2: Celestial Flight)');
        this.io.to(this.roomId).emit('boss_phase_change', {
          bossId: boss.id,
          phase: 2,
          title: 'PHASE 2: CELESTIAL FLIGHT'
        });
      }

      if (boss.specialTimer <= 0) {
        const abilities = ['seraph_caldera', 'halo_singularity', 'twin_rupture', 'wing_dash'];
        const chosenAbility = abilities[Math.floor(Math.random() * (boss.phase >= 2 ? 4 : 2))];
        boss.specialTimer = boss.phase === 3 ? 4.5 : 6.0;

        this.io.to(this.roomId).emit('boss_special', {
          bossId: boss.id,
          ability: chosenAbility,
          targetX: target.x,
          targetZ: target.z,
          duration: 3.0
        });
      }
    }

    // -------------------------------------------------------------------------
    // BOSS 3: ARCHON VALERIUS ASCENDANT (Floor 15)
    // -------------------------------------------------------------------------
    else {
      // Boss Phase transition based on health
      const hpRatio = boss.health / boss.maxHealth;
      if (hpRatio < 0.35 && boss.phase !== 3) {
        boss.phase = 3;
        boss.invulnerable = true;
        this.puzzles.floor15.bossShieldActive = true;
        this.puzzles.floor15.keystones.forEach(k => k.active = false);
        this.broadcastStory('VALERIUS: "Fools! You cannot defy time itself! The Spire crumbles with you!" Valerius triggers Temporal Collapse!');
        this.io.to(this.roomId).emit('boss_phase_change', {
          bossId: boss.id,
          phase: 3,
          voiceKey: 'valerius_phase3',
          title: 'PHASE 3: TEMPORAL COLLAPSE'
        });
      } else if (hpRatio < 0.7 && boss.phase === 1) {
        boss.phase = 2;
        this.broadcastStory('VALERIUS: "Witness the dilation of centuries!" Valerius warps time in the observatory!');
        this.io.to(this.roomId).emit('boss_phase_change', {
          bossId: boss.id,
          phase: 2,
          voiceKey: 'valerius_phase2',
          title: 'PHASE 2: TEMPORAL DILATION'
        });
      }

      // Boss special attack logic
      if (boss.specialTimer <= 0) {
        boss.specialTimer = boss.phase === 3 ? 5.0 : 7.0;

        if (boss.phase === 1) {
          this.io.to(this.roomId).emit('boss_special', {
            bossId: boss.id,
            ability: 'arcane_barrage',
            voiceKey: 'valerius_special_barrage',
            targetX: target.x,
            targetZ: target.z,
            duration: 2.5
          });
        } else if (boss.phase === 2) {
          this.io.to(this.roomId).emit('boss_special', {
            bossId: boss.id,
            ability: 'chrono_vortex',
            x: boss.x,
            z: boss.z,
            duration: 4.0
          });
        } else if (boss.phase === 3) {
          this.io.to(this.roomId).emit('boss_special', {
            bossId: boss.id,
            ability: 'astral_nova',
            voiceKey: 'valerius_special_nova',
            x: 0,
            z: 0,
            duration: 3.0
          });
        }
      }
    }

    // Basic boss attack
    if (boss.cooldown <= 0) {
      boss.cooldown = 2.0;
      target.health -= boss.damage;
      this.io.to(this.roomId).emit('enemy_attack', {
        enemyId: boss.id,
        targetId: target.id,
        damage: boss.damage
      });

      if (target.health <= 0) {
        target.health = 0;
        target.isAlive = false;
        this.io.to(this.roomId).emit('player_died', { playerId: target.id });
      }
    }
  }

  handleHazardDamage(playerId, damage) {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) return;
    player.health = Math.max(0, player.health - damage);
    if (player.health <= 0) {
      player.health = 0;
      player.isAlive = false;
      this.io.to(this.roomId).emit('player_died', { playerId });
    }
  }

  broadcastState() {
    this.io.to(this.roomId).emit('state_snapshot', {
      players: Array.from(this.players.values()),
      enemies: Array.from(this.enemies.values()),
      floor: this.floor,
      puzzles: this.puzzles
    });
  }
}
