import { CLASS_IDS, getDifficulty, getFloorObjective, MAX_FLOORS } from '../src/shared/gameData.js';
import { CLASS_SPELL_IDS, PLAYER_CLASS_CONFIG, SPELL_RULES, clampNumber, getSpellRule, sanitizeDirection } from '../src/shared/combatRules.js';
import { getAllClassTalents } from '../src/systems/talents.js';

// World-space puzzle anchors are shared with the client arena.  Keeping these
// coordinates on the authority means a forged socket event cannot solve a
// puzzle from across the room (or from a different floor).
const LEYLINE_PEDESTAL_POSITIONS = Object.freeze({
  pyretic: Object.freeze({ x: 0, z: 22, element: 'fire' }),
  cryo: Object.freeze({ x: -18, z: -10, element: 'frost' }),
  chrono: Object.freeze({ x: 18, z: -10, element: 'chrono' })
});

const PRISM_POSITIONS = Object.freeze({
  1: Object.freeze({ 1: Object.freeze({ x: -7, z: -5 }), 2: Object.freeze({ x: 7, z: -5 }), 3: Object.freeze({ x: 0, z: -11 }) })
});

const CRUCIBLE_POSITIONS = Object.freeze({
  2: Object.freeze([
    Object.freeze({ x: -12, z: -4 }),
    Object.freeze({ x: 0, z: -14 }),
    Object.freeze({ x: 12, z: -4 })
  ]),
  5: Object.freeze([
    Object.freeze({ x: -10, z: -8 }),
    Object.freeze({ x: 10, z: -8 }),
    Object.freeze({ x: 0, z: 12 })
  ])
});

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
  constructor(roomId, io, options = {}) {
    this.roomId = roomId;
    this.io = io;
    this.floor = 1;
    this.maxFloors = MAX_FLOORS;
    this.difficultyId = 'standard';
    this.setDifficulty(options.difficulty);
    this.isGameStarted = false;
    this.isGameOver = false;
    this.isVictory = false;
    this.ascensionTier = Number.isFinite(Number(options.ascensionTier)) ? Math.max(0, Number(options.ascensionTier)) : 0;
    this.serverTick = 0;
    this.startedAt = null;
    this.objective = null;
    this._objectiveSignature = '';

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
          { id: 'north', active: false, x: 0, z: -17 },
          { id: 'south', active: false, x: 0, z: 17 },
          { id: 'east', active: false, x: 17, z: 0 },
          { id: 'west', active: false, x: -17, z: 0 }
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
        pedestals: {
          pyretic: { ...LEYLINE_PEDESTAL_POSITIONS.pyretic, isCharged: false, isAligned: false },
          cryo: { ...LEYLINE_PEDESTAL_POSITIONS.cryo, isCharged: false, isAligned: false },
          chrono: { ...LEYLINE_PEDESTAL_POSITIONS.chrono, isCharged: false, isAligned: false }
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
          { id: 'north', active: false, x: 0, z: -14 },
          { id: 'south', active: false, x: 0, z: 14 },
          { id: 'east', active: false, x: 14, z: 0 },
          { id: 'west', active: false, x: -14, z: 0 }
        ],
        bossShieldActive: true
      }
    };

    // Active Quiz state
    this.currentQuiz = null;
    this.quizVotes = new Map(); // socketId -> optionIndex

    // Per-player authoritative action state. Clients may predict visuals, but
    // the relay owns cooldowns, sequence ordering and effect outcomes.
    this.playerCooldowns = new Map();
    this.lastHitAt = new Map();

    // Story progress
    this.storyLog = [
      'You awake in the subterranean archives of the Spire of Aethelgard. Corrupted Archmage Valerius has locked the temporal seals.'
    ];

    this.initFloor(1);
  }

  getDifficultyProfile() {
    return getDifficulty(this.difficultyId, this.players.size || 1);
  }

  setDifficulty(difficultyId) {
    this.difficultyId = ['story', 'standard', 'archon'].includes(difficultyId) ? difficultyId : 'standard';
  }

  getSpawnPosition(floorNumber = this.floor) {
    const floor = Number(floorNumber) || 1;
    if (floor === 1) return { x: 0, y: 0, z: 31 };
    if (floor === 2) return { x: 0, y: 0, z: 40 };
    if (floor === 5 || floor === 6) return { x: 0, y: 0, z: 18 };
    if (floor === 10 || floor === 15) return { x: 0, y: 0, z: 24 };
    return { x: 0, y: 0, z: 14 };
  }

  // Keep the covenant in a readable first-person formation. The host starts
  // a couple of metres ahead and other slots fan out behind them, which keeps
  // the host inside a joining player's forward camera instead of placing the
  // two avatars side-by-side at the exact same depth (an off-screen 90° angle).
  getPartySpawnPosition(floorNumber = this.floor, slot = 0) {
    const base = this.getSpawnPosition(floorNumber);
    const index = Math.max(0, Number(slot) || 0);
    if (index === 0) return { x: base.x - 2.0, y: base.y, z: base.z - 4.0 };
    const side = index % 2 === 1 ? -1 : 1;
    const lane = Math.ceil(index / 2);
    return { x: base.x + side * (0.75 + (lane - 1) * 0.9), y: base.y, z: base.z };
  }

  resetObjective(floorNumber = this.floor) {
    const definition = getFloorObjective(floorNumber);
    this.objective = {
      floor: Number(floorNumber),
      id: definition.id,
      kind: definition.kind,
      label: definition.label,
      required: definition.required,
      progress: 0,
      complete: false,
      updatedAt: Date.now()
    };
    this._objectiveSignature = '';
  }

  getLivingEnemyCount() {
    return Array.from(this.enemies.values()).filter(enemy => enemy.isAlive).length;
  }

  refreshObjective(force = false) {
    if (!this.objective) this.resetObjective(this.floor);
    const previous = {
      floor: this.objective.floor,
      id: this.objective.id,
      kind: this.objective.kind,
      required: this.objective.required,
      progress: this.objective.progress,
      complete: this.objective.complete,
      remainingEnemies: this.objective.remainingEnemies
    };
    const livingEnemies = this.getLivingEnemyCount();
    const floorPuzzle = this.puzzles[`floor${this.floor}`];
    let progress = this.objective.progress;
    let complete = false;

    if (this.objective.kind === 'boss') {
      const boss = Array.from(this.enemies.values()).find(enemy => enemy.type === 'boss');
      const puzzleComplete = this.floor === 5
        ? Boolean(this.puzzles.floor5?.unlocked)
        : this.floor === 10
          ? Boolean(this.puzzles.floor10?.unlocked || (this.puzzles.floor10?.alignedCount || 0) >= 3)
          : this.floor === 15
            ? Boolean(this.puzzles.floor15?.keystones?.every(keystone => keystone.active))
            : true;
      complete = (Boolean(boss && !boss.isAlive) || (!boss && this.isVictory)) && puzzleComplete;
      progress = complete ? 1 : 0;
    } else if (this.objective.kind === 'prism_and_clear') {
      const puzzleComplete = Boolean(floorPuzzle?.unlocked);
      complete = puzzleComplete && livingEnemies === 0;
      progress = puzzleComplete ? (complete ? 1 : 0.5) : 0;
    } else if (this.objective.kind === 'crucible_and_clear') {
      const puzzleComplete = Boolean(floorPuzzle?.unlocked);
      complete = puzzleComplete && livingEnemies === 0;
      progress = puzzleComplete ? (complete ? 1 : 0.5) : 0;
    } else if (this.objective.kind === 'keystone_and_clear') {
      const puzzleComplete = Boolean(floorPuzzle?.keystones?.every(keystone => keystone.active));
      complete = puzzleComplete && livingEnemies === 0;
      progress = puzzleComplete ? (complete ? 1 : 0.5) : 0;
    } else {
      complete = livingEnemies === 0;
      progress = complete ? 1 : 0;
    }

    this.objective.progress = progress;
    this.objective.complete = complete;
    this.objective.remainingEnemies = livingEnemies;
    const stateChanged = previous.floor !== this.objective.floor
      || previous.id !== this.objective.id
      || previous.kind !== this.objective.kind
      || previous.required !== this.objective.required
      || previous.progress !== this.objective.progress
      || previous.complete !== this.objective.complete
      || previous.remainingEnemies !== this.objective.remainingEnemies;
    if (force || stateChanged) this.objective.updatedAt = Date.now();

    // Exclude the bookkeeping timestamp from the signature. Otherwise every
    // 20 Hz simulation tick looks like a new objective and floods the room
    // with redundant broadcasts.
    const { updatedAt: _updatedAt, ...objectiveSignature } = this.objective;
    const signature = JSON.stringify(objectiveSignature);
    if (force || this._objectiveSignature !== signature) {
      this._objectiveSignature = signature;
      this.io.to(this.roomId).emit('objective_update', this.objective);
    }
    return this.objective;
  }

  getSnapshot() {
    return {
      players: Array.from(this.players.values()),
      // Defeated enemies stay in the authoritative map long enough for
      // objective bookkeeping, but are not part of the live replication set.
      // Omitting them lets clients retire meshes immediately and prevents a
      // reconnect from resurrecting already-cleared encounter actors.
      enemies: Array.from(this.enemies.values()).filter(enemy => enemy.isAlive),
      floor: this.floor,
      difficulty: this.difficultyId,
      serverTick: this.serverTick,
      objective: this.objective,
      puzzles: this.puzzles
    };
  }

  initFloor(floorNumber) {
    this.floor = Math.max(1, Math.min(this.maxFloors, Number(floorNumber) || 1));
    // Use the bounded value for every spawn/puzzle branch below. This keeps
    // malformed resume requests from producing an empty, unwinnable floor.
    floorNumber = this.floor;
    this.resetObjective(this.floor);
    this.enemies.clear();
    this.projectiles = [];
    this.currentQuiz = null;
    this.quizVotes.clear();
    this.lastHitAt.clear();

    // Reinitialize reusable puzzle state on every attempt so retries are
    // deterministic and a previous run cannot unlock a later ascent.
    if (this.puzzles.floor1) {
      this.puzzles.floor1.prisms.forEach((prism, index) => {
        prism.angle = [0, 180, 90][index] ?? 0;
        prism.isAligned = false;
      });
      this.puzzles.floor1.unlocked = false;
    }
    if (this.puzzles.floor2) {
      this.puzzles.floor2.currentStep = 0;
      this.puzzles.floor2.unlocked = false;
      this.puzzles.floor2.crucibles.forEach(crucible => { crucible.charged = false; });
    }
    if (this.puzzles.floor3) {
      this.puzzles.floor3.bossShieldActive = false;
      this.puzzles.floor3.keystones.forEach(keystone => { keystone.active = false; });
    }

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
      // Floor 9: the first hero encounter before Astraea's core.
      this.spawnBossXyris(0, 0, -16);
      this.spawnEnemy('shade', -16, 0, -10, 220, 26, 'Void Horror');
      this.spawnEnemy('sentry', 16, 0, -10, 220, 26, 'Abyssal Eye');
      this.broadcastStory('Floor 9: The Void-Touched Catwalks. Xyris, the Eye of the Abyss, guards the approach to Astraea!');
    } else if (floorNumber === 10) {
      // Floor 10: BOSS LEVEL & BOSS ROOM - Astraea the Demon-Angel Sovereign
      this.spawnBossAstraea(0, 0, -14);
      this.puzzles.floor10.bossShieldActive = true;
      this.puzzles.floor10.alignedCount = 0;
      this.puzzles.floor10.meltdownActive = false;
      this.puzzles.floor10.meltdownTimer = 15.0;
      if (this.puzzles.floor10.pedestals) {
        for (const [key, anchor] of Object.entries(LEYLINE_PEDESTAL_POSITIONS)) {
          this.puzzles.floor10.pedestals[key] = { ...anchor, isCharged: false, isAligned: false };
        }
      }
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
      const partySpawn = this.getPartySpawnPosition(floorNumber, Array.from(this.players.keys()).indexOf(socketId));
      player.x = partySpawn.x;
      player.y = partySpawn.y;
      player.z = partySpawn.z;
      player.rotY = 0;
      player.health = player.maxHealth;
      player.mana = player.maxMana;
      player.isAlive = true;
    }

    this.rescaleEncounter();
    this.refreshObjective(true);
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
      baseHealth,
      damage,
      baseDamage,
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
      baseHealth: 1400,
      damage,
      baseDamage: 38,
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
      baseHealth: 2200,
      damage,
      baseDamage: 48,
      speed: 3.5,
      state: 'combat',
      targetId: null,
      phase: 1,
      invulnerable: false,
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
      baseHealth: 42000,
      damage,
      baseDamage: 52,
      speed: 4.0,
      state: 'combat',
      targetId: null,
      phase: 1,
      invulnerable: false,
      shieldReduction: 0.75, // 75% damage reduction until leylines align
      alignedBeams: 0,
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
      baseHealth: 3500,
      damage,
      baseDamage: 58,
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

  ascendNewGamePlus(requesterId = null) {
    if (!this.isVictory) {
      if (requesterId) this.io.to(requesterId).emit('action_rejected', { action: 'ascend_ng_plus', reason: 'victory_required' });
      return false;
    }
    this.ascensionTier = (this.ascensionTier || 0) + 1;
    this.isVictory = false;
    this.isGameOver = false;
    this.initFloor(1);
    this.io.to(this.roomId).emit('ascension_started', {
      tier: this.ascensionTier,
      healthMultiplier: 1 + this.ascensionTier * 0.45
    });
    this.broadcastStory(`[ASCENSION TIER ${this.ascensionTier}] The temporal loop resets with intensified chronomantic corruption!`);
    return true;
  }

  addPlayer(socketId, name, wizardClass) {
    const safeClass = CLASS_IDS.includes(wizardClass) ? wizardClass : 'pyromancer';
    const config = PLAYER_CLASS_CONFIG[safeClass] || PLAYER_CLASS_CONFIG.pyromancer;
    const spawn = this.getPartySpawnPosition(this.floor, this.players.size);

    const player = {
      id: socketId,
      name: String(name || 'Apprentice').replace(/[<>]/g, '').trim().slice(0, 24) || 'Apprentice',
      wizardClass: safeClass,
      color: config.color,
      speed: config.speed,
      damageMitigation: 0,
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
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
      connected: true,
      lastInputSeq: 0,
      lastInputAt: Date.now(),
      velocity: { x: 0, y: 0, z: 0 },
      statusEffects: {},
      shield: 0,
      disconnectedAt: null
    };

    this.players.set(socketId, player);
    this.playerCooldowns.set(socketId, new Map());
    this.rescaleEncounter();
    return player;
  }

  rescaleEncounter() {
    const scale = this.getDifficultyProfile();
    for (const enemy of this.enemies.values()) {
      const healthRatio = enemy.maxHealth > 0 ? Math.max(0, Math.min(1, enemy.health / enemy.maxHealth)) : 1;
      if (enemy.baseHealth === undefined) enemy.baseHealth = enemy.maxHealth;
      if (enemy.baseDamage === undefined) enemy.baseDamage = enemy.damage;
      const asc = this.ascensionTier || 0;
      enemy.maxHealth = Math.round(enemy.baseHealth * scale.enemyHealth * (1 + asc * 0.4));
      enemy.health = enemy.isAlive === false ? 0 : Math.round(enemy.maxHealth * healthRatio);
      enemy.damage = Math.round(enemy.baseDamage * scale.enemyDamage * (1 + asc * 0.25));
    }
  }

  applyPlayerProfile(socketId, profile = {}) {
    const player = this.players.get(socketId);
    if (!player) return false;
    const level = clampNumber(profile.level, 1, 15, player.level || 1);
    const xp = clampNumber(profile.xp, 0, 9999999, player.xp || 0);
    const attributes = profile.attributes && typeof profile.attributes === 'object' ? profile.attributes : {};
    const bounded = {
      vitality: clampNumber(attributes.vitality, 0, 999, 15),
      arcana: clampNumber(attributes.arcana, 0, 999, 20),
      focus: clampNumber(attributes.focus, 0, 999, 18),
      haste: clampNumber(attributes.haste, 0, 999, 10),
      mastery: clampNumber(attributes.mastery, 0, 999, 10)
    };
    player.level = level;
    player.xp = xp;
    player.attributes = bounded;
    player.speed = (PLAYER_CLASS_CONFIG[player.wizardClass]?.speed || player.speed || 6.5) + bounded.haste * 0.035;
    player.maxHealth = Math.round(150 + bounded.vitality * 8);
    player.maxMana = Math.round(100 + bounded.focus * 5);
    player.damageMitigation = Math.min(0.55, bounded.vitality * 0.0035);
    player.spellPowerMultiplier = 1 + bounded.arcana * 0.015;
    player.healingMultiplier = 1 + bounded.focus * 0.012 + bounded.mastery * 0.008;
    player.cooldownMultiplier = Math.max(0.55, 1 - bounded.haste * 0.003 - bounded.mastery * 0.001);
    const currentHealth = Number.isFinite(Number(player.health)) ? Number(player.health) : player.maxHealth;
    const currentMana = Number.isFinite(Number(player.mana)) ? Number(player.mana) : player.maxMana;
    player.health = Math.min(player.maxHealth, Math.max(0, currentHealth));
    player.mana = Math.min(player.maxMana, Math.max(0, currentMana));
    if (profile.talents && typeof profile.talents === 'object') {
      const requested = profile.talents;
      const unlocked = {};
      const maxUnlocks = Math.min(24, Math.max(1, Math.floor(level) + 3));
      for (const talent of getAllClassTalents(player.wizardClass)) {
        if (Object.keys(unlocked).length >= maxUnlocks || !requested[talent.key]) continue;
        if (talent.requires && !unlocked[talent.requires]) continue;
        unlocked[talent.key] = true;
        this.applyTalentPassive(player, talent.key);
      }
      player.talents = unlocked;
      const requestedPoints = clampNumber(profile.talentPoints, 0, 32, Math.max(0, player.talentPoints || 0));
      player.talentPoints = Math.min(requestedPoints, Math.max(0, level + 8 - Object.keys(unlocked).length));
    }
    this.io.to(socketId).emit('profile_applied', {
      level: player.level,
      xp: player.xp,
      maxHealth: player.maxHealth,
      maxMana: player.maxMana,
      speed: player.speed,
      attributes: player.attributes,
      talents: player.talents,
      talentPoints: player.talentPoints
    });
    return true;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.quizVotes.delete(socketId);
    this.playerCooldowns.delete(socketId);
    for (const key of this.lastHitAt.keys()) {
      if (key.startsWith(`${socketId}:`)) this.lastHitAt.delete(key);
    }
    this.rescaleEncounter();
  }

  handlePlayerInput(socketId, data = {}) {
    const player = this.players.get(socketId);
    if (!player || !player.isAlive || player.connected === false) return;

    const now = Date.now();
    const elapsed = Math.max(0.01, Math.min(0.25, (now - (player.lastInputAt || now)) / 1000));
    const incomingSeq = Number.isFinite(Number(data.seq)) ? Math.floor(Number(data.seq)) : player.lastInputSeq + 1;
    if (incomingSeq <= player.lastInputSeq) return;

    const x = clampNumber(data.x, -80, 80, player.x);
    const y = clampNumber(data.y, -2, 12, player.y);
    const z = clampNumber(data.z, -120, 80, player.z);
    const rotY = clampNumber(data.rotY, -Math.PI * 4, Math.PI * 4, player.rotY);
    const distance = Math.hypot(x - player.x, y - player.y, z - player.z);
    const speed = Number(player.speed) || PLAYER_CLASS_CONFIG[player.wizardClass]?.speed || 6.5;
    const allowedDistance = speed * elapsed * 2.4 + 1.0;
    if (distance > allowedDistance) {
      this.io.to(socketId).emit('input_rejected', {
        seq: incomingSeq,
        reason: 'movement_limit',
        position: { x: player.x, y: player.y, z: player.z },
        ackInputSeq: player.lastInputSeq
      });
      player.lastInputAt = now;
      return;
    }

    player.x = x;
    player.y = y;
    player.z = z;
    player.rotY = rotY;
    if (data.action) player.action = data.action;
    player.lastInputSeq = incomingSeq;
    player.lastInputAt = now;
  }

  handleSpellCast(socketId, spellData) {
    const player = this.players.get(socketId);
    if (!player || !player.isAlive || player.connected === false) return;

    const spell = spellData && typeof spellData.spellId === 'string' ? spellData.spellId : '';
    const rule = getSpellRule(spell, player.wizardClass);
    if (!rule || !CLASS_SPELL_IDS[player.wizardClass]?.includes(spell)) return;

    const now = Date.now();
    const cooldowns = this.playerCooldowns.get(socketId) || new Map();
    const readyAt = Number(cooldowns.get(spell) || 0);
    if (readyAt > now) {
      this.io.to(socketId).emit('action_rejected', {
        action: 'cast_spell',
        spellId: spell,
        spellType: typeof spellData?.spellType === 'string' ? spellData.spellType : null,
        reason: 'cooldown',
        retryIn: (readyAt - now) / 1000
      });
      return;
    }

    const manaCost = Math.max(0, rule.mana - (rule.element === 'fire' ? clampNumber(player.fireCostReduction, 0, 24, 0) : 0));
    if (player.mana < manaCost) {
      this.io.to(socketId).emit('action_rejected', { action: 'cast_spell', spellId: spell, reason: 'mana' });
      return; // Not enough mana
    }

    player.mana -= manaCost;
    const cooldownSeconds = rule.cooldown
      * (Number(player.cooldownMultiplier) || 1)
      * Math.max(0.45, 1 - clampNumber(player.cdr, 0, 0.4, 0));
    cooldowns.set(spell, now + Math.max(150, cooldownSeconds * 1000));
    this.playerCooldowns.set(socketId, cooldowns);

    const requestedOrigin = spellData?.origin && typeof spellData.origin === 'object'
      ? { x: clampNumber(spellData.origin.x, -80, 80, player.x), y: clampNumber(spellData.origin.y, -2, 12, player.y + 1.7), z: clampNumber(spellData.origin.z, -120, 80, player.z) }
      : { x: player.x, y: player.y + 1.7, z: player.z };
    // A client can render a predicted muzzle flash, but it cannot move the
    // authoritative cast origin to another location in the room.
    const origin = Math.hypot(requestedOrigin.x - player.x, requestedOrigin.y - (player.y + 1.7), requestedOrigin.z - player.z) <= 2.5
      ? requestedOrigin
      : { x: player.x, y: player.y + 1.7, z: player.z };
    const direction = sanitizeDirection(spellData?.direction);
    const serverDamage = Math.round(rule.damage
      * clampNumber(player.spellPowerMultiplier, 0.5, 4, 1)
      * (1 + clampNumber(player.spellPowerBonus, 0, 1, 0)));
    player.lastSpell = {
      id: spell,
      damage: serverDamage,
      element: rule.element,
      origin,
      direction,
      at: now,
      token: `${socketId}:${now}:${Math.random().toString(36).slice(2, 8)}`
    };

    // Broadcast spell effect to all players in room
    this.io.to(this.roomId).emit('spell_cast', {
      casterId: socketId,
      spellId: spellData.spellId,
      spellType: typeof spellData.spellType === 'string' ? spellData.spellType : 'basic',
      origin,
      direction,
      damage: serverDamage,
      element: rule.element,
      mana: player.mana,
      cooldown: cooldownSeconds,
      token: player.lastSpell.token
    });

    // Resolve non-projectile support effects on the authority immediately.
    if (rule.heal) this.applyPlayerHeal(player, rule.heal * (Number(player.healingMultiplier) || 1) * (1 + clampNumber(player.healingPowerBonus, 0, 1, 0)), 'self', rule.element);
    if (rule.aoeHeal || rule.regenAura) this.applyPartyEffect(player, rule);
    if (rule.shield) {
      player.shield = Math.max(Number(player.shield) || 0, rule.shield);
      player.statusEffects.shield = { amount: player.shield, expiresAt: now + (rule.duration || 5) * 1000 };
      this.io.to(this.roomId).emit('player_effect', { playerId: player.id, effect: 'shield', amount: player.shield, duration: rule.duration || 5 });
    }

    // Check interaction with Floor 2 crucibles
    if (this.floor === 2 && spellData.targetType === 'crucible') {
      this.handleCrucibleInteraction(spellData.crucibleIndex, rule.element, socketId);
    }
  }

  applyPlayerHeal(player, amount, source = 'spell', element = 'light') {
    if (!player || !player.isAlive || player.connected === false) return 0;
    const before = player.health;
    player.health = Math.min(player.maxHealth, player.health + Math.max(0, Number(amount) || 0));
    const healed = player.health - before;
    if (healed > 0) {
      this.io.to(this.roomId).emit('player_effect', { playerId: player.id, effect: 'heal', amount: healed, source, element });
      this.io.to(this.roomId).emit('floating_text', { x: player.x, y: player.y + 2, z: player.z, text: `+${Math.round(healed)}`, color: '#63e6a2' });
    }
    return healed;
  }

  applyPartyEffect(sourcePlayer, rule) {
    const radius = rule.aoeRadius || 8;
    const healingScale = (Number(sourcePlayer.healingMultiplier) || 1) * (1 + clampNumber(sourcePlayer.healingPowerBonus, 0, 1, 0));
    for (const player of this.players.values()) {
      if (!player.isAlive || player.connected === false) continue;
      const distance = Math.hypot(player.x - sourcePlayer.x, player.z - sourcePlayer.z);
      if (distance <= radius || player.id === sourcePlayer.id) {
        if (rule.aoeHeal) this.applyPlayerHeal(player, rule.aoeHeal * healingScale, 'party', rule.element);
        if (rule.regenAura) player.statusEffects.regen = { expiresAt: Date.now() + (rule.duration || 6) * 1000, amount: 8 * healingScale };
      }
    }
    this.io.to(this.roomId).emit('party_effect', { sourceId: sourcePlayer.id, element: rule.element, radius, duration: rule.duration || 0 });
  }

  damagePlayer(player, amount, source = 'enemy') {
    if (!player || !player.isAlive || player.connected === false) return 0;
    let incoming = Math.max(0, Number(amount) || 0);
    const shield = Math.max(0, Number(player.shield) || 0);
    const absorbed = Math.min(shield, incoming);
    if (absorbed > 0) {
      player.shield -= absorbed;
      incoming -= absorbed;
      if (player.shield <= 0) delete player.statusEffects.shield;
    }
    const mitigation = clampNumber(Math.max(Number(player.damageMitigation) || 0, Number(player.damageReduction) || 0), 0, 0.7, 0);
    const actual = incoming * (1 - mitigation);
    player.health = Math.max(0, player.health - actual);
    this.io.to(this.roomId).emit('player_effect', { playerId: player.id, effect: 'damage', amount: actual, absorbed, source });
    if (player.health <= 0) {
      player.health = 0;
      player.isAlive = false;
      player.respawnTimer = 0;
      this.io.to(this.roomId).emit('player_died', { playerId: player.id, source });
    }
    return actual;
  }

  handleDamageToEnemy(enemyId, damage, element, attackerId) {
    const enemy = this.enemies.get(enemyId);
    if (!enemy || !enemy.isAlive) return;
    const attacker = this.players.get(attackerId);
    if (!attacker || !attacker.isAlive || attacker.connected === false) return;
    const distance = Math.hypot(attacker.x - enemy.x, attacker.z - enemy.z);
    if (distance > 42) return;
    // Client reports a hit, but the server owns the damage ceiling and target.
    const now = Date.now();
    const recentSpell = attacker.lastSpell && now - attacker.lastSpell.at < 3000 ? attacker.lastSpell : null;
    if (!recentSpell) return;
    const hitKey = `${attackerId}:${enemyId}:${recentSpell.token}`;
    const lastHit = Number(this.lastHitAt.get(hitKey) || 0);
    if (now - lastHit < 120) return;
    this.lastHitAt.set(hitKey, now);
    const rule = SPELL_RULES[recentSpell.id];
    if (!rule || rule.damage <= 0) return;

    if (recentSpell.origin && recentSpell.direction && rule?.range) {
      const toTarget = { x: enemy.x - recentSpell.origin.x, y: enemy.y - recentSpell.origin.y, z: enemy.z - recentSpell.origin.z };
      const along = toTarget.x * recentSpell.direction.x + toTarget.y * recentSpell.direction.y + toTarget.z * recentSpell.direction.z;
      const nearest = {
        x: recentSpell.origin.x + recentSpell.direction.x * Math.max(0, along),
        y: recentSpell.origin.y + recentSpell.direction.y * Math.max(0, along),
        z: recentSpell.origin.z + recentSpell.direction.z * Math.max(0, along)
      };
      const rayDistance = Math.hypot(enemy.x - nearest.x, enemy.y - nearest.y, enemy.z - nearest.z);
      if (along < -1 || along > rule.range + 3 || rayDistance > 5.5) return;
    }
    damage = Math.max(1, Math.min(300, Number(damage) || 1));
    damage = Math.min(damage, Math.max(1, recentSpell.damage));
    element = recentSpell.element;

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

    if (attacker.cdRefundOnHit) {
      const cooldowns = this.playerCooldowns.get(attackerId);
      if (cooldowns?.has(recentSpell.id)) {
        const readyAt = Number(cooldowns.get(recentSpell.id)) || now;
        cooldowns.set(recentSpell.id, Math.max(now, readyAt - clampNumber(attacker.cdRefundOnHit, 0, 5, 0) * 1000));
      }
    }

    if (element === 'frost' && rule.slow) {
      enemy.statusEffect = 'slowed';
      enemy.statusExpiresAt = now + 2500;
    } else if (element === 'frost' && rule.freeze) {
      enemy.statusEffect = 'frozen';
      enemy.statusExpiresAt = now + ((rule.freeze + clampNumber(attacker.freezeBonus, 0, 5, 0)) * 1000);
    } else if (element === 'chrono' && rule.stasis) {
      enemy.statusEffect = 'stasis';
      enemy.statusExpiresAt = now + ((rule.stasis + clampNumber(attacker.stasisDurationBonus, 0, 8, 0)) * 1000);
    }
    if (enemy.statusEffect) {
      this.io.to(this.roomId).emit('enemy_effect', {
        enemyId: enemy.id,
        effect: enemy.statusEffect,
        duration: Math.max(0, ((enemy.statusExpiresAt || now) - now) / 1000)
      });
    }

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
        } else if (this.floor === 9 && enemy.bossType === 'xyris') {
          this.broadcastStory('XYRIS HAS FALLEN! The void catwalks stabilize and the way to Astraea\'s Leyline Core opens.');
          this.io.to(this.roomId).emit('boss_defeated_advancement', {
            nextFloor: 10,
            message: 'Void Sovereign defeated. Astraea\'s Leyline Core awaits.'
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
      this.refreshObjective(true);
    }
  }

  // Tri-Elemental Leylines (Floor 10 Boss Astraea)
  ensureFloor10Pedestals() {
    const puzzle = this.puzzles.floor10;
    if (!puzzle) return null;
    if (!puzzle.pedestals || typeof puzzle.pedestals !== 'object') puzzle.pedestals = {};
    for (const [key, anchor] of Object.entries(LEYLINE_PEDESTAL_POSITIONS)) {
      const current = puzzle.pedestals[key] || {};
      puzzle.pedestals[key] = {
        ...anchor,
        isCharged: Boolean(current.isCharged),
        isAligned: Boolean(current.isAligned)
      };
    }
    return puzzle;
  }

  getFloor10PuzzleSnapshot() {
    const puzzle = this.ensureFloor10Pedestals();
    if (!puzzle) return null;
    return {
      pedestals: Object.fromEntries(Object.entries(puzzle.pedestals).map(([key, ped]) => [key, {
        x: ped.x,
        z: ped.z,
        element: ped.element,
        isCharged: Boolean(ped.isCharged),
        isAligned: Boolean(ped.isAligned)
      }])),
      alignedCount: Math.max(0, Math.min(3, Number(puzzle.alignedCount) || 0)),
      totalBeams: 3,
      unlocked: Boolean(puzzle.unlocked),
      bossShieldActive: Boolean(puzzle.bossShieldActive),
      meltdownActive: Boolean(puzzle.meltdownActive),
      meltdownTimer: Math.max(0, Number(puzzle.meltdownTimer) || 0)
    };
  }

  rejectPuzzleAction(requesterId, action, reason, extra = {}) {
    if (!requesterId) return;
    this.io.to(requesterId).emit('action_rejected', {
      action,
      reason,
      ...extra,
      ...(this.floor === 10 ? { puzzle: this.getFloor10PuzzleSnapshot() } : {})
    });
  }

  getPuzzlePlayer(requesterId, action, target, radius = 5.5) {
    if (!requesterId) return null;
    if (!this.isGameStarted) {
      this.rejectPuzzleAction(requesterId, action, 'game_not_started');
      return null;
    }
    const player = this.players.get(requesterId);
    if (!player || !player.isAlive || player.connected === false) {
      this.rejectPuzzleAction(requesterId, action, 'player_unavailable');
      return null;
    }
    const distance = Math.hypot(player.x - target.x, player.z - target.z);
    if (distance > radius) {
      this.rejectPuzzleAction(requesterId, action, 'out_of_range', { distance: Math.round(distance * 100) / 100, radius });
      return null;
    }
    return player;
  }

  isRecentSpellTarget(player, target, acceptedElements, tolerance = 4.5) {
    if (!player) return false;
    const now = Date.now();
    const recentSpell = player.lastSpell && now - player.lastSpell.at < 3000 ? player.lastSpell : null;
    const spellRule = recentSpell ? SPELL_RULES[recentSpell.id] : null;
    if (!recentSpell || !spellRule || spellRule.damage <= 0 || !acceptedElements.includes(recentSpell.element)) return false;
    const origin = recentSpell.origin || { x: player.x, y: player.y + 1.7, z: player.z };
    const direction = recentSpell.direction || { x: 0, y: 0, z: -1 };
    const toTarget = { x: target.x - origin.x, y: (target.y ?? 1.0) - origin.y, z: target.z - origin.z };
    const along = toTarget.x * direction.x + toTarget.y * direction.y + toTarget.z * direction.z;
    const nearestDistance = Math.hypot(
      target.x - (origin.x + direction.x * Math.max(0, along)),
      (target.y ?? 1.0) - (origin.y + direction.y * Math.max(0, along)),
      target.z - (origin.z + direction.z * Math.max(0, along))
    );
    const maxRange = Number(spellRule.range) || 42;
    return along >= -2 && along <= maxRange + 3 && nearestDistance <= tolerance;
  }

  chargeLeylinePedestal(pedestalKey, requesterId = null) {
    if (this.floor !== 10) {
      this.rejectPuzzleAction(requesterId, 'leyline_charge', 'floor_required');
      return false;
    }
    const key = String(pedestalKey || '');
    const anchor = LEYLINE_PEDESTAL_POSITIONS[key];
    const puzzle = this.ensureFloor10Pedestals();
    const ped = puzzle?.pedestals?.[key];
    if (!anchor || !ped) {
      this.rejectPuzzleAction(requesterId, 'leyline_charge', 'invalid_target');
      return false;
    }
    if (ped.isCharged) return false;

    if (requesterId) {
      const player = this.getPuzzlePlayer(requesterId, 'leyline_charge', anchor, 34);
      if (!player) return false;
      const acceptedElements = anchor.element === 'chrono' ? ['chrono', 'arcane', 'light'] : [anchor.element];
      if (!this.isRecentSpellTarget(player, { x: anchor.x, y: 2.4, z: anchor.z }, acceptedElements, 4.5)) {
        const recentSpell = player.lastSpell && Date.now() - player.lastSpell.at < 3000 ? player.lastSpell : null;
        const accepted = recentSpell && acceptedElements.includes(recentSpell.element);
        this.rejectPuzzleAction(requesterId, 'leyline_charge', accepted ? 'invalid_projectile' : 'matching_spell_required', { pedestalKey: key });
        return false;
      }
    }

    ped.isCharged = true;
    this.io.to(this.roomId).emit('leyline_charged', {
      pedestalKey: key,
      isCharged: true,
      isAligned: Boolean(ped.isAligned),
      puzzle: this.getFloor10PuzzleSnapshot()
    });
    return true;
  }

  alignLeylinePedestal(pedestalKey, requesterId = null) {
    if (this.floor !== 10) {
      this.rejectPuzzleAction(requesterId, 'leyline_align', 'floor_required');
      return false;
    }
    const key = String(pedestalKey || '');
    const anchor = LEYLINE_PEDESTAL_POSITIONS[key];
    const puzzle = this.ensureFloor10Pedestals();
    const ped = puzzle?.pedestals?.[key];
    if (!anchor || !ped) {
      this.rejectPuzzleAction(requesterId, 'leyline_align', 'invalid_target');
      return false;
    }
    if (requesterId && !this.getPuzzlePlayer(requesterId, 'leyline_align', anchor, 5.5)) return false;
    if (!ped.isCharged) {
      this.rejectPuzzleAction(requesterId, 'leyline_align', 'not_charged', { pedestalKey: key });
      return false;
    }
    if (ped.isAligned) return false;

    ped.isCharged = true;
    ped.isAligned = true;
    puzzle.alignedCount = Math.min(3, (Number(puzzle.alignedCount) || 0) + 1);

      const boss = this.enemies.get('boss_astraea');
    if (boss && boss.isAlive) {
      boss.alignedBeams = puzzle.alignedCount;
      boss.shieldReduction = Math.max(0, (boss.shieldReduction !== undefined ? boss.shieldReduction : 0.75) - 0.25);
      if (puzzle.alignedCount >= 3) {
          boss.shieldReduction = 0;
          boss.stunnedTimer = 6.0;
          this.broadcastStory('✨ TRIPLE LEYLINE CONVERGENCE! Astraea\'s Prismatic Shield shattered! SHE IS STUNNED FOR 6s (+150% DMG)!');
      }
    }

    const puzzleSolved = puzzle.alignedCount >= 3;
    if (puzzleSolved) {
      puzzle.unlocked = true;
      puzzle.bossShieldActive = false;
    }

    this.io.to(this.roomId).emit('leyline_aligned', {
      pedestalKey: key,
      isCharged: true,
      isAligned: true,
      alignedCount: puzzle.alignedCount,
      totalBeams: 3,
      shieldReduction: boss ? boss.shieldReduction : 0,
      puzzle: this.getFloor10PuzzleSnapshot()
    });

    if (puzzleSolved) {
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
    this.refreshObjective(true);
    return true;
  }

  // Interactive Prism Rotation (Floor 1). Floor 10 uses the Astraea leyline
  // contract; the old Xyris mirror branch is intentionally retired.
  rotatePrism(prismId, requesterId = null) {
    if (this.floor === 10) {
      this.rejectPuzzleAction(requesterId, 'rotate_prism', 'leyline_required');
      return false;
    }
    if (this.floor !== 1) return false;

    const puzzle = this.puzzles.floor1;
    const id = Math.floor(Number(prismId));
    const prism = puzzle.prisms.find(p => p.id === id);
    const anchor = PRISM_POSITIONS[1]?.[id];
    if (!prism || !anchor) {
      this.rejectPuzzleAction(requesterId, 'rotate_prism', 'invalid_target', { prismId: id });
      return false;
    }
    if (requesterId && !this.getPuzzlePlayer(requesterId, 'rotate_prism', anchor, 5.5)) return false;

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
    this.refreshObjective(true);
    return true;
  }

  // Interactive Crucible Imbue (Floor 2 & Boss Floor 5)
  handleCrucibleInteraction(index, element, requesterId = null) {
    if (this.floor !== 2 && this.floor !== 5) {
      this.rejectPuzzleAction(requesterId, 'crucible_interact', 'floor_required');
      return false;
    }
    const puzzle = (this.floor === 5) ? this.puzzles.floor5 : this.puzzles.floor2;
    if (!puzzle) return false;
    const crucibleIndex = Math.floor(Number(index));
    const normalizedElement = String(element || '').toLowerCase();
    const anchor = CRUCIBLE_POSITIONS[this.floor]?.[crucibleIndex];
    if (!Number.isInteger(crucibleIndex) || !puzzle.crucibles[crucibleIndex] || !anchor) {
      this.rejectPuzzleAction(requesterId, 'crucible_interact', 'invalid_target', { index: crucibleIndex });
      return false;
    }
    if (!['fire', 'frost', 'storm'].includes(normalizedElement)) {
      this.rejectPuzzleAction(requesterId, 'crucible_interact', 'invalid_element', { index: crucibleIndex });
      return false;
    }
    if (puzzle.crucibles[crucibleIndex].element !== normalizedElement) {
      this.rejectPuzzleAction(requesterId, 'crucible_interact', 'element_mismatch', { index: crucibleIndex });
      return false;
    }
    if (requesterId) {
      if (!this.isGameStarted) {
        this.rejectPuzzleAction(requesterId, 'crucible_interact', 'game_not_started');
        return false;
      }
      const player = this.players.get(requesterId);
      if (!player || !player.isAlive || player.connected === false) {
        this.rejectPuzzleAction(requesterId, 'crucible_interact', 'player_unavailable');
        return false;
      }
      const nearby = Math.hypot(player.x - anchor.x, player.z - anchor.z) <= 5.5;
      const validSpell = this.isRecentSpellTarget(player, { x: anchor.x, y: 1.0, z: anchor.z }, [normalizedElement], 4.5);
      if (!nearby && !validSpell) {
        this.rejectPuzzleAction(requesterId, 'crucible_interact', 'out_of_range', { index: crucibleIndex });
        return false;
      }
    }
    if (puzzle.crucibles[crucibleIndex].charged) return false;
    const expected = puzzle.order[puzzle.currentStep];

    if (normalizedElement === expected) {
      puzzle.crucibles[crucibleIndex].charged = true;
      puzzle.currentStep++;

      this.io.to(this.roomId).emit('puzzle_update', {
        floor: this.floor,
        type: 'crucible_charge',
        index: crucibleIndex,
        element: normalizedElement,
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
      this.refreshObjective(true);
    } else {
      // Mistake! Reset and warn players
      puzzle.currentStep = 0;
      puzzle.crucibles.forEach(c => c.charged = false);
      this.io.to(this.roomId).emit('puzzle_update', {
        floor: this.floor,
        type: 'crucible_reset',
        message: 'The elements clash! The crucible resets.'
      });
      this.refreshObjective(true);
    }
    return true;
  }

  // Interactive Keystone Activate (Floor 3 & Boss Floor 15)
  activateKeystone(keystoneId, requesterId = null) {
    if (this.floor !== 3 && this.floor !== 15) {
      this.rejectPuzzleAction(requesterId, 'keystone_activate', 'floor_required');
      return false;
    }
    const puzzle = (this.floor === 15) ? this.puzzles.floor15 : this.puzzles.floor3;
    if (!puzzle) return false;
    const id = String(keystoneId || '').slice(0, 24);
    const keystone = puzzle.keystones.find(k => k.id === id);
    if (!keystone) {
      this.rejectPuzzleAction(requesterId, 'keystone_activate', 'invalid_target', { keystoneId: id });
      return false;
    }
    if (requesterId && !this.getPuzzlePlayer(requesterId, 'keystone_activate', keystone, 5.5)) return false;
    if (keystone.active) return false;

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
      keystoneId: id,
      allActive
    });
    this.refreshObjective(true);
    return true;
  }

  // Quiz Chamber
  startQuiz(quizId, requesterId = null) {
    if (requesterId) {
      const player = this.players.get(requesterId);
      if (!this.isGameStarted || !player || player.connected === false || !player.isAlive) {
        this.io.to(requesterId).emit('action_rejected', { action: 'trigger_quiz', reason: 'player_unavailable' });
        return false;
      }
    }
    if (this.currentQuiz) {
      this.rejectPuzzleAction(requesterId, 'trigger_quiz', 'quiz_in_progress');
      return false;
    }
    const floorQuizzes = QUIZ_DATABASE[this.floor] || [];
    const quiz = floorQuizzes.find(q => q.id === quizId) || floorQuizzes[0];
    if (!quiz) return false;

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
    return true;
  }

  voteQuiz(socketId, optionIndex) {
    if (!this.currentQuiz) return;
    const voter = this.players.get(socketId);
    if (!voter || voter.connected === false || !voter.isAlive) return;
    const option = Math.floor(Number(optionIndex));
    if (!Number.isInteger(option) || option < 0 || option >= this.currentQuiz.options.length) {
      this.io.to(socketId).emit('action_rejected', { action: 'vote_quiz', reason: 'invalid_option' });
      return false;
    }
    this.quizVotes.set(socketId, option);

    // Broadcast current votes
    const votesSummary = Array.from(this.quizVotes.entries()).map(([sid, opt]) => ({
      playerName: this.players.get(sid)?.name || 'Apprentice',
      optionIndex: opt
    }));

    this.io.to(this.roomId).emit('quiz_votes_update', { votes: votesSummary });

    // If all living players have voted, evaluate
    const connectedPlayers = Array.from(this.players.values()).filter(player => player.connected !== false && player.isAlive);
    if (this.quizVotes.size >= connectedPlayers.length) {
      this.evaluateQuiz();
    }
    return true;
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
        if (p.connected === false) continue;
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

  applyTalentPassive(player, talentKey) {
    if (!player) return;
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
  }

  upgradeTalent(socketId, talentKey) {
    const player = this.players.get(socketId);
    if (!player || player.connected === false || !player.isAlive) return false;
    if (player.talentPoints <= 0) {
      this.io.to(socketId).emit('action_rejected', { action: 'upgrade_talent', reason: 'no_talent_points' });
      return false;
    }

    const key = String(talentKey || '').slice(0, 48);
    const talent = getAllClassTalents(player.wizardClass).find(item => item.key === key);
    if (!talent) {
      this.io.to(socketId).emit('action_rejected', { action: 'upgrade_talent', reason: 'invalid_talent' });
      return false;
    }
    if (talent.requires && !player.talents[talent.requires]) {
      this.io.to(socketId).emit('action_rejected', { action: 'upgrade_talent', reason: 'prerequisite_required', talentKey: key });
      return false;
    }

    if (!player.talents[key]) {
      player.talents[key] = true;
      player.talentPoints--;

      this.applyTalentPassive(player, key);

      this.io.to(socketId).emit('talent_updated', {
        talents: player.talents,
        talentPoints: player.talentPoints,
        maxHealth: player.maxHealth,
        maxMana: player.maxMana
      });
      return true;
    }
    return false;
  }

  advanceFloor(requesterId = null) {
    if (this.floor >= this.maxFloors) return false;
    this.refreshObjective();
    if (!this.objective?.complete) {
      if (requesterId) this.io.to(requesterId).emit('action_rejected', {
        action: 'advance_floor',
        reason: 'objective_incomplete',
        objective: this.objective
      });
      return false;
    }
    this.initFloor(this.floor + 1);
    this.io.to(this.roomId).emit('floor_changed', {
      floor: this.floor,
      objective: this.objective,
      puzzles: this.puzzles
    });
    return true;
  }

  retryFloor(requesterId = null) {
    if (!this.isGameStarted) return false;
    this.isGameOver = false;
    this.isVictory = false;
    this.initFloor(this.floor);
    this.io.to(this.roomId).emit('floor_retry', { floor: this.floor, objective: this.objective, puzzles: this.puzzles });
    if (requesterId) this.io.to(requesterId).emit('action_accepted', { action: 'retry_floor', floor: this.floor });
    return true;
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
    this.serverTick += 1;
    const now = Date.now();

    // Expire temporary authority-owned effects and apply regeneration.
    for (const player of this.players.values()) {
      for (const [key, effect] of Object.entries(player.statusEffects || {})) {
        if (effect?.expiresAt && effect.expiresAt <= now) {
          delete player.statusEffects[key];
          if (key === 'shield') player.shield = 0;
        }
      }
      if (player.isAlive && player.connected !== false && player.statusEffects?.regen?.expiresAt > now) {
        this.applyPlayerHeal(player, (player.statusEffects.regen.amount || 8) * deltaTime, 'regeneration', 'light');
      }
      if (player.statusEffects?.shield) player.shield = Math.max(0, Number(player.statusEffects.shield.amount) || 0);
    }
    for (const enemy of this.enemies.values()) {
      if (enemy.statusExpiresAt && enemy.statusExpiresAt <= now) {
        enemy.statusEffect = null;
        enemy.statusExpiresAt = 0;
      }
    }

    // Regenerate mana slowly
    for (const player of this.players.values()) {
      if (player.isAlive && player.connected !== false && player.mana < player.maxMana) {
        player.mana = Math.min(player.maxMana, player.mana + 4 * deltaTime);
      }
    }

    // AI Logic for Enemies & Boss
    for (const enemy of this.enemies.values()) {
      if (!enemy.isAlive) continue;

      if (enemy.cooldown > 0) enemy.cooldown -= deltaTime;
      if (enemy.statusEffect === 'frozen' || enemy.statusEffect === 'stasis') {
        enemy.state = enemy.statusEffect;
        continue;
      }
      const aiDeltaTime = enemy.statusEffect === 'slowed' ? deltaTime * 0.45 : deltaTime;

      // Find closest living player
      let closestPlayer = null;
      let closestDist = 999;

      for (const player of this.players.values()) {
        if (!player.isAlive || player.connected === false) continue;
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
        this.updateBossAI(enemy, closestPlayer, closestDist, aiDeltaTime);
      } else {
        this.updateStandardEnemyAI(enemy, closestPlayer, closestDist, aiDeltaTime);
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
          if (p.isAlive && p.connected !== false) {
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
      if (player.connected === false) continue;
      if (!player.isAlive) {
        player.respawnTimer = (player.respawnTimer || 0) + deltaTime;
        if (player.respawnTimer >= 10.0) {
          player.respawnTimer = 0;
          player.isAlive = true;
          player.health = player.maxHealth;
          player.mana = player.maxMana;
          const spawn = this.getPartySpawnPosition(this.floor, Array.from(this.players.keys()).indexOf(player.id));
          player.x = spawn.x;
          player.y = spawn.y;
          player.z = spawn.z;
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
          this.damagePlayer(target, 20, 'sentry_laser');
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
                this.damagePlayer(p, 28, 'golem_slam');
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
          this.damagePlayer(target, 18, 'void_missile');
        } else if (dist <= 3.0 && enemy.cooldown <= 0) {
          enemy.cooldown = 1.6;
          enemy.state = 'attack';
          this.io.to(this.roomId).emit('enemy_attack', {
            enemyId: enemy.id,
            targetId: target.id,
            damage: enemy.damage
          });
          this.damagePlayer(target, enemy.damage, 'shade_melee');
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
            this.damagePlayer(target, enemy.damage, 'enemy_melee');
            this.io.to(this.roomId).emit('enemy_attack', {
              enemyId: enemy.id,
              targetId: target.id,
              damage: enemy.damage
            });
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
    // HERO BOSS: XYRIS THE VOID SOVEREIGN (Floor 9)
    // -------------------------------------------------------------------------
    else if (boss.bossType === 'xyris') {
      // Void Annihilation channel loop
      boss.annihilationTimer = (boss.annihilationTimer || 14.0) - deltaTime;
      if (boss.annihilationTimer <= 0) {
        // Annihilation detonates; the encounter is self-contained on Floor 9
        // and no longer depends on Astraea's later leyline puzzle state.
        boss.annihilationTimer = 14.0;
        this.broadcastStory('VOID ANNIHILATION DETONATES! Break Xyris\'s gaze and keep moving!');
        for (const p of this.players.values()) {
          if (p.isAlive && p.connected !== false) {
            this.damagePlayer(p, 45, 'void_annihilation');
          }
        }
        this.io.to(this.roomId).emit('boss_special', {
          bossId: boss.id,
          ability: 'void_cataclysm',
          duration: 2.0
        });
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
      this.damagePlayer(target, boss.damage, `${boss.bossType}_melee`);
      this.io.to(this.roomId).emit('enemy_attack', {
        enemyId: boss.id,
        targetId: target.id,
        damage: boss.damage
      });

    }
  }

  handleHazardDamage(playerId, damage) {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive || player.connected === false) return;
    this.damagePlayer(player, clampNumber(damage, 0, 250, 0), 'hazard');
  }

  broadcastState() {
    this.io.to(this.roomId).emit('state_snapshot', this.getSnapshot());
  }
}
