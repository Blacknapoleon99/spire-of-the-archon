import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPELL_PRESENTATIONS,
  getSpellPresentation,
  isPyromancerSignatureSpell
} from '../src/graphics/spellPresentationRegistry.js';

const PYRO_IDS = ['ember_bolt', 'fireball', 'flame_wave', 'fire_tornado'];

test('Pyromancer signature spells have distinct presentation contracts', () => {
  const vfxKeys = new Set();
  const audioKeys = new Set();
  const castClips = new Set();
  for (const id of PYRO_IDS) {
    const profile = getSpellPresentation(id);
    assert.equal(profile.spellId, id);
    assert.ok(profile.vfxKey);
    assert.ok(profile.audioKey);
    assert.ok(profile.castClip);
    assert.ok(profile.socket);
    vfxKeys.add(profile.vfxKey);
    audioKeys.add(profile.audioKey);
    castClips.add(profile.castClip);
    assert.equal(isPyromancerSignatureSpell(id), true);
  }
  assert.equal(vfxKeys.size, PYRO_IDS.length);
  assert.equal(audioKeys.size, PYRO_IDS.length);
  assert.equal(castClips.size, PYRO_IDS.length);
});

test('presentation fallback is safe for future classes and unknown ids', () => {
  const fallback = getSpellPresentation('future_spell');
  assert.equal(fallback.spellId, 'unknown');
  assert.equal(fallback.castClip, 'Cast_Basic');
  assert.equal(Object.keys(SPELL_PRESENTATIONS).length, PYRO_IDS.length);
});

