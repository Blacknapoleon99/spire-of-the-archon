/** Additional learnable spells. Shared by rendering, UI and the authority. */
export const MAX_LEVEL = 15;
export const MASTERY_SLOTS = ['skill1', 'skill2', 'ult'];
// Each row is deliberately a playable effect, not a future-feature description.
const NAMES = {
  pyromancer: [
    ['Cinder Spear', 'Scorch Lance', 'Molten Needle', 'Sunfire Lance'],
    ['Magma Orb', 'Brimstone Burst', 'Meteor Heart', 'Solar Rupture'],
    ['Ashen Vortex', 'Ember Cyclone', 'Hellfire Spiral', 'Phoenix Tempest'],
    ['Coalguard', 'Furnace Ward', 'Obsidian Aegis', 'Phoenix Carapace'],
    ['Kindle', 'Phoenix Breath', 'Rekindling', 'Second Dawn'],
    ['Ember Communion', 'Hearthlight', 'Covenant of Ash', 'Phoenix Chorus'],
  ],
  cryomancer: [
    ['Rime Javelin', 'Hoarfrost Lance', 'Diamond Needle', 'Winter Spear'],
    ['Hailstone', 'Shatter Orb', 'Glacial Rupture', 'Avalanche Heart'],
    ['Sleet Circle', 'Biting Gale', 'Whiteout', 'Polar Tempest'],
    ['Frostguard', 'Ice Fortress', 'Diamond Aegis', 'Winter Bastion'],
    ['Cooling Breath', 'Icebound Renewal', 'Glacial Recovery', 'Winter Respite'],
    ['Snowmelt', 'Rime Communion', 'Sheltering Snow', 'Northern Grace'],
  ],
  luminary: [
    ['Dawn Lance', 'Judgement Spear', 'Prismatic Needle', 'Zenith Ray'],
    ['Sun Orb', 'Consecrated Burst', 'Judgement Star', 'Solar Flare'],
    ['Hallowed Circle', 'Daybreak Field', 'Sacred Constellation', 'Archon Sanctuary'],
    ['Lightguard', 'Seraph Ward', 'Prismatic Aegis', 'Dawn Bastion'],
    ['Mending Light', 'Seraph Touch', 'Restoration', 'Miracle'],
    ['Dawn Chorus', 'Grace Wave', 'Covenant Renewal', 'Celestial Communion'],
  ],
  chronomancer: [
    ['Epoch Needle', 'Paradox Lance', 'Continuum Spear', 'Infinity Dart'],
    ['Rift Orb', 'Entropy Burst', 'Temporal Collapse', 'Paradox Rupture'],
    ['Dilation Circle', 'Entropy Well', 'Epoch Prison', 'Singularity Field'],
    ['Momentguard', 'Paradox Ward', 'Continuum Aegis', 'Timeless Bastion'],
    ['Recall', 'Time Stitch', 'Restored Moment', 'Perfect Rewind'],
    ['Shared Moment', 'Covenant Recall', 'Timeflow Renewal', 'Epoch Communion'],
  ],
};
const ELEMENTS = { pyromancer: 'fire', cryomancer: 'frost', luminary: 'light', chronomancer: 'chrono' };
const KINDS = ['lance', 'burst', 'field', 'ward', 'heal', 'wave'];
export const ADVANCED_SPELLS = Object.freeze(Object.fromEntries(Object.entries(NAMES).map(([cls, rows]) => [cls,
  Object.freeze(rows.flatMap((names, family) => names.map((name, rank) => {
    const kind = KINDS[family], element = ELEMENTS[cls];
    const spell = { id: `${cls}_${kind}_${rank + 1}`, name, kind, element, cost: 1,
      level: 2 + rank * 4, mana: 16 + rank * 7 + family * 2,
      cooldown: 3 + family + rank, damage: 0, range: 36, rank: rank + 1 };
    if (kind === 'lance') Object.assign(spell, { damage: 42 + rank * 15, range: 42, slow: element === 'frost' ? 0.5 : 0 });
    if (kind === 'burst') Object.assign(spell, { damage: 48 + rank * 16, aoeRadius: 2.5 + rank * 0.5 });
    if (kind === 'field') Object.assign(spell, { damage: element === 'light' ? 0 : 16 + rank * 6,
      range: 10, aoeRadius: 3 + rank * 0.65, duration: 3 + rank * 0.5,
      regenAura: element === 'light', freeze: element === 'frost' ? 1 : 0, stasis: element === 'chrono' ? 1 : 0 });
    if (kind === 'ward') Object.assign(spell, { shield: 60 + rank * 30, duration: 4 + rank });
    if (kind === 'heal') spell.heal = 42 + rank * 22;
    if (kind === 'wave') Object.assign(spell, { aoeHeal: 25 + rank * 15, aoeRadius: 5 + rank });
    spell.cd = spell.cooldown;
    spell.desc = kind === 'lance' ? `Launch a focused ${element} lance for ${spell.damage} damage.`
      : kind === 'burst' ? `Explode on contact for ${spell.damage} damage within ${spell.aoeRadius}m.`
      : kind === 'field' ? (spell.regenAura ? `Create a ${spell.duration}s restorative field.` : `Create a ${spell.duration}s ${element} field: ${spell.damage} damage per tick.`)
      : kind === 'ward' ? `Absorb ${spell.shield} damage for ${spell.duration}s.`
      : kind === 'heal' ? `Restore ${spell.heal} of your health.`
      : `Restore ${spell.aoeHeal} health to allies within ${spell.aoeRadius}m.`;
    return Object.freeze(spell);
  }))),
])));
export const ADVANCED_BY_ID = Object.freeze(Object.fromEntries(Object.values(ADVANCED_SPELLS).flat().map(s => [s.id, s])));
export function masteryBudget(level) { return 2 + 2 * (Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1))) - 1); }
export function sanitizeMastery(cls, level, learned = [], equipped = {}) {
  const valid = ADVANCED_SPELLS[cls] || [];
  const unique = new Set(Array.isArray(learned) ? learned : []);
  const unlocked = valid.filter(s => unique.has(s.id) && s.level <= level).slice(0, masteryBudget(level)).map(s => s.id);
  const loadout = {};
  for (const slot of MASTERY_SLOTS) if (unlocked.includes(equipped?.[slot])) loadout[slot] = equipped[slot];
  return { learnedSpells: unlocked, equippedSpells: loadout, skillPoints: masteryBudget(level) - unlocked.length };
}
