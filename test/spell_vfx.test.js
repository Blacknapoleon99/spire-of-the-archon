import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_SPELLS } from '../src/systems/spells.js';
import { CLASS_SPELL_IDS } from '../src/shared/combatRules.js';
import { SPELL_VFX_PROFILES, getSpellVfxProfile, hashVfxSeed } from '../src/graphics/spellVfxProfiles.js';

test('every live class spell has a dedicated VFX profile', () => {
  const ids = Object.values(CLASS_SPELL_IDS).flat();
  assert.equal(ids.length, 16);
  for (const spellId of ids) {
    const profile = getSpellVfxProfile(spellId);
    assert.equal(profile, SPELL_VFX_PROFILES[spellId]);
    assert.ok(profile.family);
    assert.ok(profile.kind);
  }
  assert.ok(CLASS_SPELLS.pyromancer.ult.id in SPELL_VFX_PROFILES);
});

test('VFX seeds are deterministic and bounded', () => {
  const a = hashVfxSeed('fire_tornado:cast:1');
  const b = hashVfxSeed('fire_tornado:cast:1');
  assert.equal(a, b);
  assert.ok(a >= 0 && a < 1);
  assert.notEqual(a, hashVfxSeed('fire_tornado:cast:2'));
});
