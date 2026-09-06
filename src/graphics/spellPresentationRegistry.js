/**
 * Runtime presentation contract for spells.
 *
 * Gameplay remains authoritative in shared/combatRules.js.  This registry is
 * deliberately client-only: it tells the renderer, viewmodel, and audio
 * mixer how a spell should feel without duplicating damage or cooldown data.
 * A spell id is the stable key so local prediction and remote relays always
 * resolve the same visual language.
 */

const PYROMANCER_PRESENTATIONS = {
  ember_bolt: {
    spellId: 'ember_bolt',
    slot: 'basic',
    family: 'fire',
    vfxKey: 'pyro_ember_bolt',
    audioKey: 'pyro_ember_bolt',
    castClip: 'Cast_Ember',
    socket: 'WandTipSocket',
    duration: 0.34,
    cameraSafeDistance: 0.72,
    visualScale: 0.78,
    trailRate: 0.032,
    impactRadius: 1.05,
    qualityCost: 1
  },
  fireball: {
    spellId: 'fireball',
    slot: 'skill1',
    family: 'fire',
    vfxKey: 'pyro_fireball',
    audioKey: 'pyro_fireball',
    castClip: 'Cast_Fireball',
    socket: 'WandTipSocket',
    duration: 0.72,
    cameraSafeDistance: 0.86,
    visualScale: 1.0,
    trailRate: 0.026,
    impactRadius: 3.5,
    qualityCost: 3
  },
  flame_wave: {
    spellId: 'flame_wave',
    slot: 'skill2',
    family: 'fire',
    vfxKey: 'pyro_flame_wave',
    audioKey: 'pyro_flame_wave',
    castClip: 'Cast_FlameWave',
    socket: 'WandTipSocket',
    duration: 0.58,
    cameraSafeDistance: 0.82,
    visualScale: 1.18,
    trailRate: 0.022,
    impactRadius: 2.8,
    qualityCost: 4
  },
  fire_tornado: {
    spellId: 'fire_tornado',
    slot: 'ult',
    family: 'fire',
    vfxKey: 'pyro_fire_tornado',
    audioKey: 'pyro_fire_tornado',
    castClip: 'Cast_Tornado',
    socket: 'WandTipSocket',
    duration: 1.05,
    cameraSafeDistance: 0.9,
    visualScale: 1.32,
    qualityCost: 8
  }
};

const FALLBACK_PRESENTATION = Object.freeze({
  spellId: 'unknown',
  slot: 'basic',
  family: 'arcane',
  vfxKey: 'default_projectile',
  audioKey: 'wand_cast',
  castClip: 'Cast_Basic',
  socket: 'CastSocket',
  duration: 0.35,
  cameraSafeDistance: 0.72,
  visualScale: 1,
  trailRate: 0.035,
  impactRadius: 1,
  qualityCost: 1
});

export const SPELL_PRESENTATIONS = Object.freeze(
  Object.fromEntries(Object.entries(PYROMANCER_PRESENTATIONS).map(([id, value]) => [id, Object.freeze(value)]))
);

export function getSpellPresentation(spellId) {
  return SPELL_PRESENTATIONS[spellId] || FALLBACK_PRESENTATION;
}

export function getSpellPresentationBySlot(wizardClass, slot, spells = null) {
  if (wizardClass === 'pyromancer' && spells?.[slot]?.id) {
    return getSpellPresentation(spells[slot].id);
  }
  return FALLBACK_PRESENTATION;
}

export function isPyromancerSignatureSpell(spellId) {
  return Boolean(SPELL_PRESENTATIONS[spellId]);
}

