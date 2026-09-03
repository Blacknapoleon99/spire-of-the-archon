/**
 * Advanced Multi-Branch Talent Specialization System for The Spire of the Archon.
 * 4 Wizard Classes × 2 Distinct Branches × 3 Tiers = 24 Unique Talents!
 */

export const TALENT_TREES = {
  pyromancer: {
    className: "Pyromancer",
    crest: "🔥",
    themeColor: "#ff3d00",
    branches: [
      {
        id: "conflagration",
        name: "Conflagration",
        desc: "Persistent brimstone burns, burn proliferation, and death detonations.",
        talents: [
          {
            key: "pyro_ignite",
            tier: 1,
            title: "Ignition Core",
            desc: "All spell casts ignite targets, inflicting 14 Fire burn damage per second for 4s.",
            icon: "pyro_ignite",
            stats: { maxHealth: 35, igniteDps: 14 }
          },
          {
            key: "pyro_combustion",
            tier: 2,
            requires: "pyro_ignite",
            title: "Spontaneous Combustion",
            desc: "Slain ignited enemies explode violently, dealing 45 Fire AoE damage to nearby foes.",
            icon: "pyro_combustion",
            stats: { maxMana: 45, deathExplosion: 45 }
          },
          {
            key: "pyro_inferno",
            tier: 3,
            requires: "pyro_combustion",
            title: "Living Inferno",
            desc: "Capstone: Dealing burn damage grants +20% move speed and increases total spell damage by 30%.",
            icon: "pyro_inferno",
            stats: { spellPowerBonus: 0.30, speed: 1.2 }
          }
        ]
      },
      {
        id: "cataclysm",
        name: "Cataclysm",
        desc: "Raw concentrated burst spellcraft and cataclysmic solar tornados.",
        talents: [
          {
            key: "pyro_aether",
            tier: 1,
            title: "Aether Flame",
            desc: "Reduces Fireball mana cost by 12, and critical strikes restore 25 Mana.",
            icon: "pyro_aether",
            stats: { maxMana: 50, fireCostReduction: 12 }
          },
          {
            key: "pyro_molten",
            tier: 2,
            requires: "pyro_aether",
            title: "Molten Volley",
            desc: "Casting Fireball launches two secondary homing magma embers at secondary targets.",
            icon: "pyro_molten",
            stats: { maxHealth: 45, extraCinders: 2 }
          },
          {
            key: "pyro_supernova",
            tier: 3,
            requires: "pyro_molten",
            title: "Solar Supernova",
            desc: "Capstone: Infernal Fire Tornado suction radius expanded by +4m and deals +40% bonus damage.",
            icon: "pyro_supernova",
            stats: { vortexRadiusBonus: 4.0, vortexDamageMultiplier: 1.4 }
          }
        ]
      }
    ]
  },

  cryomancer: {
    className: "Cryomancer",
    crest: "❄️",
    themeColor: "#00e5ff",
    branches: [
      {
        id: "bastion",
        name: "Glacial Bastion",
        desc: "Unyielding armor of permafrost, absorption shields, and ground slam immunity.",
        talents: [
          {
            key: "cryo_plating",
            tier: 1,
            title: "Permafrost Plating",
            desc: "+80 Maximum Health and 18% mitigation against physical and magical impact.",
            icon: "cryo_plating",
            stats: { maxHealth: 80, damageReduction: 0.18 }
          },
          {
            key: "cryo_barrier",
            tier: 2,
            requires: "cryo_plating",
            title: "Crystalline Barrier",
            desc: "Taking damage generates an ice absorption barrier that soaks up to 60 damage.",
            icon: "cryo_barrier",
            stats: { shieldAmount: 60, maxMana: 40 }
          },
          {
            key: "cryo_juggernaut",
            tier: 3,
            requires: "cryo_barrier",
            title: "Glacial Juggernaut",
            desc: "Capstone: Complete immunity to ground slam stuns; enemies within 8m move 35% slower.",
            icon: "cryo_juggernaut",
            stats: { stunImmune: true, slowAura: 0.35 }
          }
        ]
      },
      {
        id: "shatter",
        name: "Absolute Shatter",
        desc: "Piercing frost lances, glacial life-drain, and catastrophic freeze vulnerability.",
        talents: [
          {
            key: "cryo_pierce",
            tier: 1,
            title: "Piercing Rime",
            desc: "Ice Lance penetrates all targets in a direct line, chilling each enemy struck.",
            icon: "cryo_pierce",
            stats: { pierceEnemies: true, maxMana: 45 }
          },
          {
            key: "cryo_siphon",
            tier: 2,
            requires: "cryo_pierce",
            title: "Glacial Siphon",
            desc: "Frost Nova restores 20 Mana and 20 HP per enemy frozen in the blizzard.",
            icon: "cryo_siphon",
            stats: { iceLifeLeech: 20, maxHealth: 40 }
          },
          {
            key: "cryo_zero",
            tier: 3,
            requires: "cryo_siphon",
            title: "Absolute Zero",
            desc: "Capstone: Chilled and frozen foes take +45% bonus shatter damage from all allies.",
            icon: "cryo_zero",
            stats: { freezeBonus: 0.45, shatterAoe: 40 }
          }
        ]
      }
    ]
  },

  luminary: {
    className: "Luminary",
    crest: "✨",
    themeColor: "#ffd700",
    branches: [
      {
        id: "grace",
        name: "Dawn's Grace",
        desc: "Empowered sacred healing, passive party regeneration, and cheat-death miracles.",
        talents: [
          {
            key: "lumi_focus",
            tier: 1,
            title: "Radiant Focus",
            desc: "+30% healing effectiveness on Radiant Heal, and +50 Maximum Mana.",
            icon: "lumi_focus",
            stats: { healingPowerBonus: 0.30, maxMana: 50 }
          },
          {
            key: "lumi_salvation",
            tier: 2,
            requires: "lumi_focus",
            title: "Aura of Salvation",
            desc: "Party members within 14m passively regenerate +6 HP per second.",
            icon: "lumi_salvation",
            stats: { partyRegenAura: 6, maxHealth: 45 }
          },
          {
            key: "lumi_intervention",
            tier: 3,
            requires: "lumi_salvation",
            title: "Divine Intervention",
            desc: "Capstone: Fatal damage taken by you or an ally triggers a divine ward, restoring 35% HP.",
            icon: "lumi_intervention",
            stats: { cheatDeath: true, maxHealth: 50 }
          }
        ]
      },
      {
        id: "judgement",
        name: "Solar Judgement",
        desc: "Offensive smiting radiance, attack power debuffs, and celestial damage auras.",
        talents: [
          {
            key: "lumi_wrath",
            tier: 1,
            title: "Luminescent Wrath",
            desc: "Casting Radiant Heal also smites enemies within 9m for 36 Holy damage.",
            icon: "lumi_wrath",
            stats: { healSmiteDamage: 36, maxMana: 40 }
          },
          {
            key: "lumi_dawn",
            tier: 2,
            requires: "lumi_wrath",
            title: "Righteous Dawn",
            desc: "Basic wand attacks mark foes with Holy Radiance, reducing their damage output by 25%.",
            icon: "lumi_dawn",
            stats: { enemyWeaken: 0.25, maxHealth: 40 }
          },
          {
            key: "lumi_sanctuary",
            tier: 3,
            requires: "lumi_dawn",
            title: "Sanctuary of Archons",
            desc: "Capstone: Divine Sanctuary increases all party damage dealt by +30% while standing inside.",
            icon: "lumi_sanctuary",
            stats: { sanctuaryDamageBuff: 0.30, holyShieldBonus: 50 }
          }
        ]
      }
    ]
  },

  chronomancer: {
    className: "Chronomancer",
    crest: "⏳",
    themeColor: "#bf5af2",
    branches: [
      {
        id: "continuum",
        name: "Continuum Warp",
        desc: "Extreme temporal agility, cooldown acceleration, and decoy time paradoxes.",
        talents: [
          {
            key: "chrono_anchor",
            tier: 1,
            title: "Temporal Anchor",
            desc: "+20% Cooldown Recovery Speed and +1.4 first-person movement speed.",
            icon: "chrono_anchor",
            stats: { cdr: 0.20, speed: 1.4, maxHealth: 35 }
          },
          {
            key: "chrono_paradox",
            tier: 2,
            requires: "chrono_anchor",
            title: "Paradox Dash",
            desc: "Blink Dash leaves behind a temporal decoy mirror that taunts foes for 3.5s.",
            icon: "chrono_paradox",
            stats: { blinkDecoy: true, maxMana: 50 }
          },
          {
            key: "chrono_rift",
            tier: 3,
            requires: "chrono_paradox",
            title: "Chrono Rift",
            desc: "Capstone: Dealing spell damage reduces the remaining cooldown of all other spells by 1.5s.",
            icon: "chrono_rift",
            stats: { cdRefundOnHit: 1.5, spellPowerBonus: 0.25 }
          }
        ]
      },
      {
        id: "horizon",
        name: "Event Horizon",
        desc: "Spacetime disruption fields, debuff cleansing, and universal chronostasis.",
        talents: [
          {
            key: "chrono_entropy",
            tier: 1,
            title: "Entropy Font",
            desc: "+75 Maximum Mana; Temporal Rewind restores an additional +45 HP and clears debuffs.",
            icon: "chrono_entropy",
            stats: { maxMana: 75, rewindBonus: 45 }
          },
          {
            key: "chrono_dilation",
            tier: 2,
            requires: "chrono_entropy",
            title: "Dilation Field",
            desc: "Enemies within 10m of you suffer -40% attack cadence and projectile velocity.",
            icon: "chrono_dilation",
            stats: { attackSpeedDebuff: 0.40, maxHealth: 40 }
          },
          {
            key: "chrono_singularity",
            tier: 3,
            requires: "chrono_dilation",
            title: "Singularity",
            desc: "Capstone: Temporal Stasis dome duration extended by +2.5s and suspends boss cooldowns.",
            icon: "chrono_singularity",
            stats: { stasisDurationBonus: 2.5, bossStun: true }
          }
        ]
      }
    ]
  }
};

/**
 * Returns flat array of all talents for a class for simple lookups.
 */
export function getAllClassTalents(wizardClass = 'pyromancer') {
  const tree = TALENT_TREES[wizardClass] || TALENT_TREES.pyromancer;
  const list = [];
  tree.branches.forEach(b => {
    b.talents.forEach(t => list.push(t));
  });
  return list;
}
