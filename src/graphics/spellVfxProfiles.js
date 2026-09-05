/**
 * Client-only visual contract for the sixteen live class spells.  Gameplay
 * truth stays in shared/combatRules.js; these profiles only describe how a
 * cast should be staged and how much render budget it may consume.
 */
export const SPELL_VFX_PROFILES = Object.freeze({
  ember_bolt: { family: 'fire', kind: 'projectile', cast: 'ember', cost: 1 },
  fireball: { family: 'fire', kind: 'projectile', cast: 'fireball', cost: 3 },
  flame_wave: { family: 'fire', kind: 'projectile', cast: 'wave', cost: 4 },
  fire_tornado: { family: 'fire', kind: 'field', cast: 'tornado', cost: 8, radius: 5.5, duration: 5 },

  frost_shard: { family: 'frost', kind: 'projectile', cast: 'shard', cost: 1 },
  ice_lance: { family: 'frost', kind: 'projectile', cast: 'lance', cost: 3 },
  glacial_bulwark: { family: 'frost', kind: 'shield', cast: 'bulwark', cost: 5, duration: 5 },
  frost_nova: { family: 'frost', kind: 'field', cast: 'nova', cost: 8, radius: 7, duration: 6 },

  sacred_spark: { family: 'light', kind: 'projectile', cast: 'spark', cost: 1 },
  radiant_heal: { family: 'light', kind: 'beam', cast: 'heal', cost: 3, duration: 0.8 },
  cleansing_wave: { family: 'light', kind: 'wave', cast: 'cleanse', cost: 5, duration: 1 },
  divine_sanctuary: { family: 'light', kind: 'field', cast: 'sanctuary', cost: 8, radius: 6, duration: 6 },

  chrono_dart: { family: 'chrono', kind: 'projectile', cast: 'dart', cost: 1 },
  temporal_rewind: { family: 'chrono', kind: 'rewind', cast: 'rewind', cost: 3, duration: 1.2 },
  time_dilation: { family: 'chrono', kind: 'field', cast: 'dilation', cost: 5, radius: 5.5, duration: 3 },
  temporal_stasis: { family: 'chrono', kind: 'field', cast: 'stasis', cost: 8, radius: 6.5, duration: 5 }
});

const FALLBACK_PROFILE = Object.freeze({ family: 'arcane', kind: 'projectile', cast: 'default', cost: 2 });

export function getSpellVfxProfile(spellId) {
  return SPELL_VFX_PROFILES[spellId] || FALLBACK_PROFILE;
}

export function hashVfxSeed(value = '') {
  const source = String(value);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}
