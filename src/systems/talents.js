/**
 * Advanced Multi-Branch Talent Specialization System for The Spire of the Archon.
 * Four classes, four specializations each, six connected nodes per path.
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

// Four paths, six nodes each. Preserve existing keys for saved characters.
const NEW_PATHS = {
  pyromancer: [['cinderward', 'Cinder Warden', 'Survival in the heart of the blaze.'], ['phoenix', 'Phoenix Covenant', 'Recovery and sustainable spellcraft.']],
  cryomancer: [['vanguard', 'Sunsteel Vanguard', 'Front-line endurance and decisive strikes.'], ['winterheart', 'Winterheart', 'Recovery and sustained defense.']],
  luminary: [['aegis', 'Seraph Aegis', 'Resilient protection for the healer.'], ['pilgrim', 'Dawn Pilgrim', 'Mobile and sustainable restoration.']],
  chronomancer: [['riftwalker', 'Riftwalker', 'Agile offensive spellcraft.'], ['keeper', 'Timekeeper', 'Endurance through long encounters.']],
};
const EXTRA_STATS = [
  [{maxHealth: 25}, {damageReduction: 0.04}, {maxHealth: 40}, {spellPowerBonus: 0.05}, {damageReduction: 0.06}, {maxHealth: 65}],
  [{maxMana: 25}, {healingPowerBonus: 0.08}, {cdr: 0.04}, {maxMana: 40}, {speed: 0.35}, {healingPowerBonus: 0.14}],
];
const TITLES = [['Tempered Resolve','Impact Guard','Unbroken','Measured Force','Layered Defense','Indomitable'],['Deep Reserves','Restorative Study','Spell Rhythm','Inner Reservoir','Light Footsteps','Perfect Renewal']];
// Replace unimplemented legacy proc promises with functioning spell-family
// synergies. Existing keys are retained so saved builds can be migrated.
const LEGACY_STATS = {
  pyro_ignite:{maxHealth:35,fieldBonus:0.10}, pyro_combustion:{maxMana:45,burstBonus:0.15},
  pyro_inferno:{spellPowerBonus:0.20,speed:1.2}, pyro_aether:{maxMana:50,fireCostReduction:12},
  pyro_molten:{maxHealth:45,lanceBonus:0.20}, pyro_supernova:{fieldBonus:0.40},
  cryo_plating:{maxHealth:80,damageReduction:0.18}, cryo_barrier:{maxMana:40,wardBonus:0.25},
  cryo_juggernaut:{maxHealth:60,damageReduction:0.10}, cryo_pierce:{maxMana:45,lanceBonus:0.20},
  cryo_siphon:{maxHealth:40,healBonus:0.25}, cryo_zero:{freezeBonus:1,fieldBonus:0.25},
  lumi_focus:{maxMana:50,healingPowerBonus:0.30}, lumi_salvation:{maxHealth:45,waveBonus:0.25},
  lumi_intervention:{maxHealth:50,wardBonus:0.35}, lumi_wrath:{maxMana:40,burstBonus:0.20},
  lumi_dawn:{maxHealth:40,lanceBonus:0.20}, lumi_sanctuary:{healingPowerBonus:0.20,fieldBonus:0.30},
  chrono_anchor:{cdr:0.20,speed:1.4,maxHealth:35}, chrono_paradox:{maxMana:50,wardBonus:0.20},
  chrono_rift:{cdr:0.08,spellPowerBonus:0.15}, chrono_entropy:{maxMana:75,healBonus:0.30},
  chrono_dilation:{maxHealth:40,fieldBonus:0.20}, chrono_singularity:{stasisDurationBonus:2.5,fieldBonus:0.25},
};
function describeStats(stats) {
  const labels={maxHealth:'maximum health',maxMana:'maximum mana',damageReduction:'damage reduction',spellPowerBonus:'spell damage',healingPowerBonus:'healing',cdr:'cooldown reduction',speed:'movement speed',fieldBonus:'field damage / healing',burstBonus:'explosion damage',lanceBonus:'focused-attack damage',wardBonus:'ward absorption',healBonus:'personal healing',waveBonus:'party-wave healing',fireCostReduction:'fire mana cost reduction',freezeBonus:'seconds of freeze',stasisDurationBonus:'seconds of stasis'};
  return Object.entries(stats).map(([k,v])=>`+${k === 'speed' ? `${v} m/s` : k.endsWith('Bonus') && !['freezeBonus','stasisDurationBonus'].includes(k) || ['cdr','damageReduction'].includes(k) ? `${Math.round(v*100)}%` : v} ${labels[k]}`).join('; ') + '.';
}
for (const [cls, tree] of Object.entries(TALENT_TREES)) {
  for (const branch of tree.branches) {
    branch.desc = branch === tree.branches[0] ? 'Endurance, sustained fields and restorative spellcraft.' : 'Focused attacks, burst damage and spell efficiency.';
    branch.talents.forEach(t=>{
      t.level = 1 + (t.tier-1)*3;
      t.stats=LEGACY_STATS[t.key] || t.stats;
      t.generic=true;
      t.desc=describeStats(t.stats);
    });
    for(let tier=4;tier<=6;tier++) {
      const stats=tier===4?{maxMana:35}:tier===5?{spellPowerBonus:0.08}:{cdr:0.06,maxHealth:35};
      const key=`${branch.id}_mastery_${tier}`;
      branch.talents.push({key,tier,level:1+(tier-1)*2,requires:branch.talents.at(-1).key,title:['','', '', '', 'Deep Attunement','Focused Mastery','Ascendant Discipline'][tier],desc:describeStats(stats),stats,generic:true});
    }
  }
  NEW_PATHS[cls].forEach(([id,name,desc],index)=>tree.branches.push({id,name,desc,talents:EXTRA_STATS[index].map((stats,i)=>({key:`${cls}_${id}_${i+1}`,tier:i+1,level:1+i*2,requires:i?`${cls}_${id}_${i}`:null,title:TITLES[index][i],desc:describeStats(stats),stats,generic:true}))}));
}

/** Returns a flat array of all talents for a class. */
export function getAllClassTalents(wizardClass = 'pyromancer') {
  const tree = TALENT_TREES[wizardClass] || TALENT_TREES.pyromancer;
  const list = [];
  tree.branches.forEach(b => {
    b.talents.forEach(t => list.push(t));
  });
  return list;
}
