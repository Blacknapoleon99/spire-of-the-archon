/**
 * RPG Item Database with 7 Core Attributes, Rarities, and Equipment Slots
 */
export const RARITY_CONFIG = {
  common: { name: 'Common', color: '#b0bec5', border: '#78909c' },
  rare: { name: 'Rare', color: '#42a5f5', border: '#1e88e5' },
  epic: { name: 'Epic', color: '#ab47bc', border: '#8e24aa' },
  legendary: { name: 'Legendary', color: '#ffa726', border: '#fb8c00' }
};

export const ITEMS = {
  // ==================== WEAPONS (MAIN HAND) ====================
  starter_wand: {
    id: 'starter_wand',
    name: 'Apprentice Birch Wand',
    type: 'mainHand',
    rarity: 'common',
    icon: '🪄',
    desc: 'A simple birch wand imbued with introductory spellcraft.',
    stats: { arcana: 10, intellect: 5 }
  },
  pyre_staff: {
    id: 'pyre_staff',
    name: 'Staff of the Pyre Lord',
    type: 'mainHand',
    rarity: 'epic',
    icon: '🔥',
    desc: 'Carved from petrified ash wood, pulsating with everlasting brimstone fire.',
    stats: { arcana: 40, vigor: 20, haste: 12, mastery: 15 }
  },
  frost_scepter: {
    id: 'frost_scepter',
    name: 'Permafrost Spire Scepter',
    type: 'mainHand',
    rarity: 'epic',
    icon: '❄️',
    desc: 'Forged within glacial caverns. Strikes chill enemy souls.',
    stats: { resilience: 35, vigor: 30, arcana: 15, mastery: 20 }
  },
  luminary_crozier: {
    id: 'luminary_crozier',
    name: 'Crozier of the Dawn Seraph',
    type: 'mainHand',
    rarity: 'epic',
    icon: '✨',
    desc: 'Channels divine radiance that accelerates team healing.',
    stats: { wisdom: 42, intellect: 25, vigor: 18, haste: 10 }
  },
  chrono_staff: {
    id: 'chrono_staff',
    name: 'Scepter of the Astral Weaver',
    type: 'mainHand',
    rarity: 'legendary',
    icon: '⏳',
    desc: 'Bends the flow of causality around the caster.',
    stats: { arcana: 45, haste: 28, intellect: 30, mastery: 25 }
  },

  // ==================== OFF-HAND ====================
  apprentice_tome: {
    id: 'apprentice_tome',
    name: 'Initiate\'s Lexicon',
    type: 'offHand',
    rarity: 'common',
    icon: '📖',
    desc: 'Contains fundamental notes on mana circulation.',
    stats: { intellect: 8, wisdom: 6 }
  },
  glacial_aegis: {
    id: 'glacial_aegis',
    name: 'Glacial Aegis of Fortitude',
    type: 'offHand',
    rarity: 'epic',
    icon: '🛡️',
    desc: 'A floating crystalline shield that absorbs crushing blows.',
    stats: { resilience: 45, vigor: 35, mastery: 18 }
  },
  sun_relic: {
    id: 'sun_relic',
    name: 'Solar Relic of Aethelgard',
    type: 'offHand',
    rarity: 'epic',
    icon: '☀️',
    desc: 'A sacred golden orb that pulses with continuous healing energy.',
    stats: { wisdom: 35, intellect: 20, vigor: 15 }
  },
  astral_hourglass: {
    id: 'astral_hourglass',
    name: 'Hourglass of Infinity',
    type: 'offHand',
    rarity: 'legendary',
    icon: '⌛',
    desc: 'Contains sand harvested from dying celestial stars.',
    stats: { haste: 30, arcana: 25, intellect: 22, mastery: 20 }
  },

  // ==================== HELM ====================
  novice_hood: {
    id: 'novice_hood',
    name: 'Novice Cloth Cowl',
    type: 'helm',
    rarity: 'common',
    icon: '🧢',
    desc: 'Protects against dust and ambient chill.',
    stats: { vigor: 8, resilience: 5 }
  },
  valerius_crown: {
    id: 'valerius_crown',
    name: 'Horned Diadem of Valerius',
    type: 'helm',
    rarity: 'legendary',
    icon: '👑',
    desc: 'Archon Valerius\'s ornate crowned helm, vibrating with temporal supremacy.',
    stats: { arcana: 35, intellect: 30, resilience: 22, vigor: 25 }
  },

  // ==================== CHEST ====================
  initiate_robe: {
    id: 'initiate_robe',
    name: 'Initiate Weaver Robe',
    type: 'chest',
    rarity: 'common',
    icon: '🥋',
    desc: 'Standard covenant apprentice vestment.',
    stats: { vigor: 12, resilience: 8 }
  },
  astral_vestment: {
    id: 'astral_vestment',
    name: 'Vestment of Astral Resonance',
    type: 'chest',
    rarity: 'epic',
    icon: '🔮',
    desc: 'Woven from celestial threads, warding against magical distortion.',
    stats: { vigor: 45, arcana: 30, resilience: 25, wisdom: 18 }
  },

  // ==================== HANDS ====================
  cloth_wraps: {
    id: 'cloth_wraps',
    name: 'Linen Hand Wraps',
    type: 'hands',
    rarity: 'common',
    icon: '🧤',
    desc: 'Prevents staff splinters during incantations.',
    stats: { haste: 6 }
  },
  spellweaver_bracers: {
    id: 'spellweaver_bracers',
    name: 'Bracers of Arcane Acceleration',
    type: 'hands',
    rarity: 'rare',
    icon: '⚡',
    desc: 'Etched with lightning runes that speed up hand gestures.',
    stats: { haste: 22, arcana: 16, intellect: 12 }
  },

  // ==================== RING ====================
  copper_band: {
    id: 'copper_band',
    name: 'Simple Copper Ring',
    type: 'ring',
    rarity: 'common',
    icon: '💍',
    desc: 'A modest keepsake from the academy.',
    stats: { intellect: 5 }
  },
  singularity_ring: {
    id: 'singularity_ring',
    name: 'Band of the Singularity',
    type: 'ring',
    rarity: 'legendary',
    icon: '🌌',
    desc: 'Infused with gravitational mana, amplifying critical spell strikes.',
    stats: { arcana: 25, intellect: 25, haste: 15, vigor: 18 }
  },

  // ==================== CONSUMABLES ====================
  healing_potion: {
    id: 'healing_potion',
    name: 'Elixir of Vitality',
    type: 'consumable',
    rarity: 'rare',
    icon: '🧪',
    desc: 'Instantly restores 90 Health.',
    effect: { healHP: 90 }
  },
  mana_potion: {
    id: 'mana_potion',
    name: 'Draught of Astral Mana',
    type: 'consumable',
    rarity: 'rare',
    icon: '💧',
    desc: 'Instantly restores 80 Mana.',
    effect: { restoreMP: 80 }
  },
  ember_wand: {
    id: 'ember_wand',
    name: 'Ember Wand',
    type: 'mainHand',
    rarity: 'rare',
    icon: '🪄',
    desc: 'A wand crafted from smoldering wood.',
    stats: { arcana: 20, haste: 10 }
  },
  frost_rod: {
    id: 'frost_rod',
    name: 'Frost Rod',
    type: 'mainHand',
    rarity: 'rare',
    icon: '🦯',
    desc: 'Chills to the touch.',
    stats: { resilience: 20, mastery: 10 }
  },
  scholars_codex: {
    id: 'scholars_codex',
    name: 'Scholar\'s Codex',
    type: 'offHand',
    rarity: 'rare',
    icon: '📔',
    desc: 'A heavy tome of magical theories.',
    stats: { intellect: 15, wisdom: 15 }
  },
  obsidian_focus: {
    id: 'obsidian_focus',
    name: 'Obsidian Focus',
    type: 'offHand',
    rarity: 'rare',
    icon: '🧿',
    desc: 'A dark stone that absorbs light.',
    stats: { arcana: 18, mastery: 12 }
  },
  circlet_of_flames: {
    id: 'circlet_of_flames',
    name: 'Circlet of Flames',
    type: 'helm',
    rarity: 'rare',
    icon: '👑',
    desc: 'A crown of ever-burning embers.',
    stats: { arcana: 15, haste: 15 }
  },
  hood_of_shadows: {
    id: 'hood_of_shadows',
    name: 'Hood of Shadows',
    type: 'helm',
    rarity: 'epic',
    icon: '🥷',
    desc: 'Conceals the wearer in darkness.',
    stats: { resilience: 25, vigor: 25 }
  },
  vestment_of_the_forge: {
    id: 'vestment_of_the_forge',
    name: 'Vestment of the Forge',
    type: 'chest',
    rarity: 'rare',
    icon: '🧥',
    desc: 'Thick protective wear for pyromancers.',
    stats: { vigor: 20, resilience: 20 }
  },
  robe_of_starlight: {
    id: 'robe_of_starlight',
    name: 'Robe of Starlight',
    type: 'chest',
    rarity: 'rare',
    icon: '👘',
    desc: 'Shimmers with the light of distant stars.',
    stats: { arcana: 25, intellect: 15 }
  },
  gauntlets_of_the_forge: {
    id: 'gauntlets_of_the_forge',
    name: 'Gauntlets of the Forge',
    type: 'hands',
    rarity: 'rare',
    icon: '🥊',
    desc: 'Heavy gauntlets that withstand intense heat.',
    stats: { vigor: 18, resilience: 18 }
  },
  chronoweave_gloves: {
    id: 'chronoweave_gloves',
    name: 'Chronoweave Gloves',
    type: 'hands',
    rarity: 'epic',
    icon: '🧤',
    desc: 'Woven with threads of time.',
    stats: { haste: 25, mastery: 25 }
  },
  ring_of_wisdom: {
    id: 'ring_of_wisdom',
    name: 'Ring of Wisdom',
    type: 'ring',
    rarity: 'rare',
    icon: '💍',
    desc: 'Enhances the mind and spirit.',
    stats: { wisdom: 15, intellect: 15 }
  },
  band_of_embers: {
    id: 'band_of_embers',
    name: 'Band of Embers',
    type: 'ring',
    rarity: 'rare',
    icon: '🌋',
    desc: 'A ring that pulses with heat.',
    stats: { arcana: 15, vigor: 15 }
  },

  // ==================== BOOTS ====================
  apprentice_boots: {
    id: 'apprentice_boots',
    name: 'Apprentice Leather Boots',
    type: 'boots',
    rarity: 'common',
    icon: 'boots',
    desc: 'Lightweight leather boots allowing agile movement throughout the Spire.',
    stats: { vigor: 10, haste: 12 }
  },
  cinder_striders: {
    id: 'cinder_striders',
    name: 'Cinder Stride Sabatons',
    type: 'boots',
    rarity: 'epic',
    icon: 'boots',
    desc: 'Forged from molten brimstone slag, granting swift fiery strides.',
    stats: { arcana: 25, vigor: 20, haste: 18 }
  },
  glacial_treads: {
    id: 'glacial_treads',
    name: 'Glacial Frost Treads',
    type: 'boots',
    rarity: 'epic',
    icon: 'boots',
    desc: 'Reinforced with permafrost soles that anchor the wearer against knockbacks.',
    stats: { resilience: 30, vigor: 25, haste: 10 }
  },
  chrono_sandals: {
    id: 'chrono_sandals',
    name: 'Sandals of the Chrono Walker',
    type: 'boots',
    rarity: 'legendary',
    icon: 'boots',
    desc: 'Allows the wearer to step slightly between the folds of time.',
    stats: { haste: 35, mastery: 25, intellect: 20 }
  },

  // ==================== AMULETS ====================
  apprentice_amulet: {
    id: 'apprentice_amulet',
    name: 'Amulet of the Novice',
    type: 'amulet',
    rarity: 'common',
    icon: 'amulet',
    desc: 'A small polished quartz talisman imbued with introductory cantrips.',
    stats: { intellect: 10, wisdom: 10 }
  },
  pyro_pendant: {
    id: 'pyro_pendant',
    name: 'Heart of the Volcano Pendant',
    type: 'amulet',
    rarity: 'epic',
    icon: 'amulet',
    desc: 'Contains a single drop of primoridal lava that amplifies spell destructive power.',
    stats: { arcana: 35, haste: 20, vigor: 15 }
  },
  frozen_choker: {
    id: 'frozen_choker',
    name: 'Amulet of the Winter Solstice',
    type: 'amulet',
    rarity: 'epic',
    icon: 'amulet',
    desc: 'Chills the wearer\'s blood, fortifying defenses against devastating blows.',
    stats: { resilience: 32, vigor: 28, mastery: 15 }
  },
  hourglass_locket: {
    id: 'hourglass_locket',
    name: 'Chronomancer\'s Paradox Locket',
    type: 'amulet',
    rarity: 'legendary',
    icon: 'amulet',
    desc: 'Suspends moments of danger within a pocket chronofield.',
    stats: { mastery: 35, haste: 30, intellect: 25 }
  }
};
