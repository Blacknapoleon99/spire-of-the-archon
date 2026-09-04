/**
 * Shared, data-first game rules.  Keep this module free of Three.js so it can
 * be imported by both browser code and server-side validation/tests.
 */
export const GAME_VERSION = '2.0.0';
export const MAX_PLAYERS = 4;
export const MAX_FLOORS = 15;

export const ATTRIBUTES = Object.freeze([
  'vitality',
  'arcana',
  'focus',
  'haste',
  'mastery'
]);

export const DIFFICULTIES = Object.freeze({
  story: { id: 'story', label: 'Story', enemyHealth: 0.72, enemyDamage: 0.65, reward: 0.85 },
  standard: { id: 'standard', label: 'Standard', enemyHealth: 1, enemyDamage: 1, reward: 1 },
  archon: { id: 'archon', label: 'Archon', enemyHealth: 1.35, enemyDamage: 1.3, reward: 1.35 }
});

export const FLOOR_DEFINITIONS = Object.freeze([
  { number: 1, act: 1, biome: 'archives', name: 'The Awakening Vault', boss: null },
  { number: 2, act: 1, biome: 'catacombs', name: 'The Flooded Crypt', boss: null },
  { number: 3, act: 1, biome: 'scriptorium', name: 'The Drowned Scriptorium', boss: null },
  { number: 4, act: 1, biome: 'mirrors', name: 'The Mirror Gauntlet', boss: null },
  { number: 5, act: 1, biome: 'ignis', name: 'The Crucible of Ignis', boss: 'ignis' },
  { number: 6, act: 2, biome: 'foundry', name: 'The Smoldering Foundry', boss: null },
  { number: 7, act: 2, biome: 'golem-lab', name: 'The Golem Laboratory', boss: null },
  { number: 8, act: 2, biome: 'crystals', name: 'The Aetherite Veins', boss: null },
  { number: 9, act: 2, biome: 'catwalks', name: 'The Void Catwalks', boss: 'xyris' },
  { number: 10, act: 2, biome: 'astraea', name: 'Astraea\'s Leyline Core', boss: 'astraea' },
  { number: 11, act: 3, biome: 'star-gallery', name: 'The Constellation Gallery', boss: null },
  { number: 12, act: 3, biome: 'chronometer', name: 'The Chronometer', boss: null },
  { number: 13, act: 3, biome: 'promenade', name: 'The Sky Promenade', boss: null },
  { number: 14, act: 3, biome: 'sanctum', name: 'The Archon\'s Sanctum', boss: null },
  { number: 15, act: 3, biome: 'valerius', name: 'Valerius\'s Temporal Throne', boss: 'valerius' }
]);

export const CLASS_IDS = Object.freeze(['pyromancer', 'cryomancer', 'luminary', 'chronomancer']);

export function getDifficulty(id = 'standard', playerCount = 1) {
  const base = DIFFICULTIES[id] || DIFFICULTIES.standard;
  const countScale = 1 + Math.max(0, Math.min(MAX_PLAYERS, playerCount) - 1) * 0.22;
  return {
    ...base,
    playerCount: Math.max(1, Math.min(MAX_PLAYERS, playerCount)),
    enemyHealth: base.enemyHealth * countScale,
    enemyDamage: base.enemyDamage * (1 + Math.max(0, playerCount - 1) * 0.12),
    reward: base.reward * (1 + Math.max(0, playerCount - 1) * 0.08)
  };
}

export function getFloorDefinition(number) {
  return FLOOR_DEFINITIONS.find(floor => floor.number === Number(number)) || FLOOR_DEFINITIONS[0];
}

/**
 * Server-facing objective contract. A floor is not complete until its
 * objective is fulfilled; the client may display this data but cannot mark it
 * complete by itself.
 */
export function getFloorObjective(number) {
  const floor = getFloorDefinition(number);
  if (floor.boss) {
    const bossLabel = floor.number === 5
      ? 'Break the crucible shield and defeat Ignis'
      : floor.number === 10
        ? 'Align the three leylines and defeat Astraea'
        : floor.number === 15
          ? 'Activate the four keystones and defeat Valerius'
          : `Defeat ${floor.boss}`;
    return {
      id: `floor_${floor.number}_${floor.boss}`,
      kind: 'boss',
      required: 1,
      label: bossLabel
    };
  }
  if (floor.number === 1) return { id: 'floor_1_prisms', kind: 'prism_and_clear', required: 1, label: 'Align the prisms and clear the archives' };
  if (floor.number === 2) return { id: 'floor_2_crucibles', kind: 'crucible_and_clear', required: 1, label: 'Harmonize the crucibles and clear the crypt' };
  if (floor.number === 3) return { id: 'floor_3_keystones', kind: 'keystone_and_clear', required: 1, label: 'Activate the keystones and clear the scriptorium' };
  return { id: `floor_${floor.number}_clear`, kind: 'clear', required: 1, label: `Clear ${floor.name}` };
}

export const SAVE_VERSION = 3;
