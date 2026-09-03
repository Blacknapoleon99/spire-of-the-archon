/**
 * Holy Trinity Magic Classes (DPS, Tank, Healer, Support) and Spell Definitions
 */
export const CLASS_SPELLS = {
  pyromancer: {
    avatar: '🔥',
    role: 'DPS',
    title: 'Pyromancer',
    desc: 'High-octane fiery devastation and area of effect burst damage.',
    basic: { id: 'ember_bolt', name: 'Ember Bolt', key: 'LMB', icon: '🔥', mana: 0, cd: 0.35, damage: 28, element: 'fire' },
    skill1: { id: 'fireball', name: 'Fireball', key: 'Q', icon: '☄️', mana: 25, cd: 4.0, damage: 75, element: 'fire', isAoe: true },
    skill2: { id: 'flame_wave', name: 'Flame Wave', key: 'E', icon: '🌋', mana: 35, cd: 6.0, damage: 55, element: 'fire' },
    ult: { id: 'fire_tornado', name: 'Infernal Fire Tornado', key: 'R', icon: '🌪️', mana: 60, cd: 12.0, damage: 32, tickRate: 0.4, duration: 5.0, element: 'fire', isAoe: true, isVortex: true },
    unlockables: [
      { id: 'inferno_beam', name: 'Inferno Beam', icon: '🔥', cost: 1, desc: 'Channels an intense beam of flame piercing all targets.' },
      { id: 'phoenix_ward', name: 'Phoenix Ward', icon: '🦅', cost: 2, desc: 'Surrounds the caster in flame that burns attacking foes.' }
    ]
  },
  cryomancer: {
    avatar: '❄️',
    role: 'TANK',
    title: 'Cryomancer',
    desc: 'Defensive frost guardian that taunts monsters and absorbs brutal hits with ice armor.',
    basic: { id: 'frost_shard', name: 'Frost Shard', key: 'LMB', icon: '❄️', mana: 0, cd: 0.35, damage: 22, element: 'frost' },
    skill1: { id: 'ice_lance', name: 'Ice Lance', key: 'Q', icon: '🧊', mana: 25, cd: 4.0, damage: 60, element: 'frost', slow: true },
    skill2: { id: 'glacial_bulwark', name: 'Glacial Bulwark', key: 'E', icon: '🛡️', mana: 30, cd: 7.0, shield: 120, taunt: true, element: 'frost' },
    ult: { id: 'frost_nova', name: 'Frost Nova', key: 'R', icon: '🌨️', mana: 55, cd: 13.0, damage: 70, freeze: true, element: 'frost' },
    unlockables: [
      { id: 'ice_barrier', name: 'Ice Fortress Dome', icon: '🏰', cost: 1, desc: 'Erects an impassable wall of ice blocking monster projectiles.' },
      { id: 'permafrost_thorns', name: 'Permafrost Spikes', icon: '💎', cost: 2, desc: 'Reflects 35% of incoming physical damage as frostbite.' }
    ]
  },
  luminary: {
    avatar: '✨',
    role: 'HEALER',
    title: 'Luminary',
    desc: 'Sacred conduit of restorative solar grace that heals allies and cleanses hexes.',
    basic: { id: 'sacred_spark', name: 'Sacred Spark', key: 'LMB', icon: '✨', mana: 0, cd: 0.35, damage: 24, element: 'light' },
    skill1: { id: 'radiant_heal', name: 'Radiant Heal', key: 'Q', icon: '💖', mana: 30, cd: 4.0, heal: 90, element: 'light' },
    skill2: { id: 'cleansing_wave', name: 'Cleansing Wave', key: 'E', icon: '🕊️', mana: 40, cd: 8.0, aoeHeal: 55, element: 'light' },
    ult: { id: 'divine_sanctuary', name: 'Divine Sanctuary', key: 'R', icon: '🌟', mana: 65, cd: 15.0, regenAura: true, element: 'light' },
    unlockables: [
      { id: 'solar_flare', name: 'Solar Ray', icon: '☀️', cost: 1, desc: 'Channels blinding solar light that heals allies and burns foes.' },
      { id: 'resurrection_ward', name: 'Aura of Grace', icon: '👼', cost: 2, desc: 'Passive aura providing +15% healing received to the covenant.' }
    ]
  },
  chronomancer: {
    avatar: '⏳',
    role: 'SUPPORT',
    title: 'Chronomancer',
    desc: 'Master of temporal mechanics, accelerating allies and dilating enemy time.',
    basic: { id: 'chrono_dart', name: 'Chrono Dart', key: 'LMB', icon: '⏳', mana: 0, cd: 0.35, damage: 22, element: 'chrono' },
    skill1: { id: 'temporal_rewind', name: 'Temporal Rewind', key: 'Q', icon: '⌛', mana: 25, cd: 5.0, heal: 60, element: 'chrono' },
    skill2: { id: 'time_dilation', name: 'Time Dilation', key: 'E', icon: '🌀', mana: 35, cd: 8.0, damage: 35, slow: true, element: 'chrono' },
    ult: { id: 'temporal_stasis', name: 'Temporal Stasis', key: 'R', icon: '⏱️', mana: 60, cd: 15.0, damage: 80, stasis: true, element: 'chrono' },
    unlockables: [
      { id: 'haste_rift', name: 'Chrono Acceleration', icon: '🚀', cost: 1, desc: 'Grants +40% movement and cast speed to all party members for 6s.' },
      { id: 'paradox_blast', name: 'Temporal Collapse', icon: '🌌', cost: 2, desc: 'Detonates a rift that snaps enemies backward in space.' }
    ]
  }
};

export class CooldownManager {
  constructor() {
    this.cooldowns = {
      basic: 0,
      skill1: 0,
      skill2: 0,
      ult: 0,
      dash: 0
    };
  }

  isReady(slot) {
    return (this.cooldowns[slot] || 0) <= 0;
  }

  trigger(slot, duration, cdr = 0) {
    const adjusted = Math.max(0.15, duration * (1.0 - cdr));
    this.cooldowns[slot] = adjusted;
  }

  update(deltaTime) {
    for (const key of Object.keys(this.cooldowns)) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - deltaTime);
      }
    }
  }

  getProgress(slot, maxDuration) {
    const current = this.cooldowns[slot] || 0;
    if (current <= 0) return 0;
    return (current / maxDuration);
  }
}
