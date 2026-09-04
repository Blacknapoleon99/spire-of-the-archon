/**
 * Canonical combat contract shared by the browser, relay and tests.
 * Keep this module dependency-free so every simulation agrees on costs,
 * cooldowns, effects and class access.
 */
import { CLASS_IDS } from './gameData.js';

export const CLASS_SPELL_IDS = Object.freeze({
  pyromancer: Object.freeze(['ember_bolt', 'fireball', 'flame_wave', 'fire_tornado']),
  cryomancer: Object.freeze(['frost_shard', 'ice_lance', 'glacial_bulwark', 'frost_nova']),
  luminary: Object.freeze(['sacred_spark', 'radiant_heal', 'cleansing_wave', 'divine_sanctuary']),
  chronomancer: Object.freeze(['chrono_dart', 'temporal_rewind', 'time_dilation', 'temporal_stasis'])
});

export const SPELL_RULES = Object.freeze({
  ember_bolt: Object.freeze({ mana: 0, damage: 28, element: 'fire', cooldown: 0.35, range: 42 }),
  fireball: Object.freeze({ mana: 25, damage: 75, element: 'fire', cooldown: 4.0, range: 42, aoeRadius: 3.5 }),
  flame_wave: Object.freeze({ mana: 35, damage: 55, element: 'fire', cooldown: 6.0, range: 18 }),
  fire_tornado: Object.freeze({ mana: 60, damage: 32, element: 'fire', cooldown: 12.0, duration: 5.0, aoeRadius: 5.0 }),
  frost_shard: Object.freeze({ mana: 0, damage: 22, element: 'frost', cooldown: 0.35, range: 42 }),
  ice_lance: Object.freeze({ mana: 25, damage: 60, element: 'frost', cooldown: 4.0, range: 42, slow: 0.5 }),
  glacial_bulwark: Object.freeze({ mana: 30, damage: 0, element: 'frost', cooldown: 7.0, shield: 120, duration: 5.0 }),
  frost_nova: Object.freeze({ mana: 55, damage: 70, element: 'frost', cooldown: 13.0, freeze: 3.0, aoeRadius: 8.0 }),
  sacred_spark: Object.freeze({ mana: 0, damage: 24, element: 'light', cooldown: 0.35, range: 42 }),
  radiant_heal: Object.freeze({ mana: 30, damage: 0, element: 'light', cooldown: 4.0, heal: 90, range: 18 }),
  cleansing_wave: Object.freeze({ mana: 40, damage: 0, element: 'light', cooldown: 8.0, aoeHeal: 55, aoeRadius: 8.0 }),
  divine_sanctuary: Object.freeze({ mana: 65, damage: 0, element: 'light', cooldown: 15.0, regenAura: true, duration: 6.0, aoeRadius: 6.0 }),
  chrono_dart: Object.freeze({ mana: 0, damage: 22, element: 'chrono', cooldown: 0.35, range: 42 }),
  temporal_rewind: Object.freeze({ mana: 25, damage: 0, element: 'chrono', cooldown: 5.0, heal: 60, range: 18 }),
  time_dilation: Object.freeze({ mana: 35, damage: 35, element: 'chrono', cooldown: 8.0, slow: 0.6, range: 24 }),
  temporal_stasis: Object.freeze({ mana: 60, damage: 80, element: 'chrono', cooldown: 15.0, stasis: 3.0, aoeRadius: 6.5 })
});

export const PLAYER_CLASS_CONFIG = Object.freeze({
  pyromancer: Object.freeze({ maxHealth: 180, maxMana: 140, speed: 6.5, color: 0xff3b30 }),
  cryomancer: Object.freeze({ maxHealth: 240, maxMana: 120, speed: 6.0, color: 0x0a84ff }),
  luminary: Object.freeze({ maxHealth: 200, maxMana: 180, speed: 6.4, color: 0xffc107 }),
  chronomancer: Object.freeze({ maxHealth: 190, maxMana: 150, speed: 6.5, color: 0xbf5af2 })
});

export function getSpellRule(spellId, wizardClass = null) {
  if (typeof spellId !== 'string') return null;
  if (wizardClass && !CLASS_IDS.includes(wizardClass)) return null;
  if (wizardClass && !CLASS_SPELL_IDS[wizardClass]?.includes(spellId)) return null;
  return SPELL_RULES[spellId] || null;
}

export function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

export function sanitizeDirection(direction = {}) {
  const x = clampNumber(direction.x, -1, 1, 0);
  const y = clampNumber(direction.y, -1, 1, 0);
  const z = clampNumber(direction.z, -1, 1, -1);
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

