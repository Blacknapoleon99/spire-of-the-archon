import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVANCED_SPELLS, sanitizeMastery, masteryBudget } from '../src/shared/spellMastery.js';
import { CLASS_SPELL_IDS, getSpellRule } from '../src/shared/combatRules.js';
import { TALENT_TREES } from '../src/systems/talents.js';
import { getEquippedSpells } from '../src/systems/spells.js';
import { ProgressionSystem } from '../src/systems/progressionSystem.js';
import { GameState } from '../server/gameState.js';
import { sanitizeCampaignPayload } from '../server/accountStore.js';
const io={to:()=>({emit:()=>{}})};
function fixture(cls='pyromancer') {
  const state=new GameState('MASTERY',io,{}); state.isGameStarted=true;
  const player=state.addPlayer('p','Test',cls); state.applyPlayerProfile('p',{level:15});
  player.mana=999; player.maxMana=999;
  return {state,player};
}
test('every class has 28 usable spells and four six-node talent paths',()=>{
  for(const cls of Object.keys(CLASS_SPELL_IDS)) {
    assert.equal(CLASS_SPELL_IDS[cls].length,28);
    assert.equal(new Set(CLASS_SPELL_IDS[cls]).size,28);
    assert.equal(TALENT_TREES[cls].branches.length,4);
    for(const branch of TALENT_TREES[cls].branches) {
      assert.equal(branch.talents.length,6);
      assert.ok(branch.talents.every(t=>t.title && t.stats));
    }
    assert.ok(masteryBudget(15)>=ADVANCED_SPELLS[cls].length);
    for(const spell of ADVANCED_SPELLS[cls]) assert.equal(getSpellRule(spell.id,cls),spell);
  }
});
test('learning validates ownership, levels, points and duplicate purchases',()=>{
  const {state,player}=fixture(); player.level=1;
  assert.equal(state.changeMastery('p',{action:'learn',spellId:'pyromancer_lance_1'}),false);
  player.level=2;
  assert.equal(state.changeMastery('p',{action:'learn',spellId:'cryomancer_lance_1'}),false);
  assert.equal(state.changeMastery('p',{action:'learn',spellId:'pyromancer_lance_1'}),true);
  assert.equal(state.changeMastery('p',{action:'learn',spellId:'pyromancer_lance_1'}),false);
  assert.equal(player.skillPoints,3);
  for(const spell of ADVANCED_SPELLS.pyromancer.filter(s=>s.level===2)) state.changeMastery('p',{action:'learn',spellId:spell.id});
  assert.equal(player.learnedSpells.length,4); assert.equal(player.skillPoints,0);
});
test('equipping changes the real hotbar, respects cooldowns and supports restoration',()=>{
  const {state,player}=fixture(); const id='pyromancer_lance_1';
  assert.equal(state.changeMastery('p',{action:'equip',spellId:id,slot:'skill1'}),false);
  state.changeMastery('p',{action:'learn',spellId:id});
  assert.equal(state.changeMastery('p',{action:'equip',spellId:id,slot:'skill1'}),true);
  assert.equal(getEquippedSpells(player).skill1.id,id);
  state.playerCooldowns.get('p').set(id,Date.now()+1000);
  assert.equal(state.changeMastery('p',{action:'equip',spellId:null,slot:'skill1'}),false);
  state.playerCooldowns.get('p').clear();
  assert.equal(state.changeMastery('p',{action:'equip',spellId:null,slot:'skill1'}),true);
  assert.equal(getEquippedSpells(player).skill1.id,'fireball');
});
test('all 96 advanced spells can be learned, equipped and accepted by the authority',()=>{
  for(const [cls,spells] of Object.entries(ADVANCED_SPELLS)) {
    const {state,player}=fixture(cls);
    for(const spell of spells) {
      state.playerCooldowns.get('p').clear(); player.mana=999;
      assert.equal(state.changeMastery('p',{action:'learn',spellId:spell.id}),true,spell.id);
      assert.equal(state.changeMastery('p',{action:'equip',spellId:spell.id,slot:'skill1'}),true,spell.id);
      state.handleSpellCast('p',{spellId:spell.id,spellType:'skill1',direction:{x:0,y:0,z:-1}});
      assert.equal(player.lastSpell.id,spell.id);
      assert.ok(player.mana<999);
    }
  }
});
test('saved mastery rejects cross-class IDs, locked tiers, duplicates and invalid slots',()=>{
  const learned=['pyromancer_lance_1','pyromancer_lance_1','pyromancer_lance_4','cryomancer_lance_1'];
  const result=sanitizeMastery('pyromancer',2,learned,{skill1:learned[0],basic:learned[0],ult:learned[2]});
  assert.deepEqual(result.learnedSpells,['pyromancer_lance_1']);
  assert.deepEqual(result.equippedSpells,{skill1:'pyromancer_lance_1'});
  assert.equal(result.skillPoints,3);
  assert.deepEqual(sanitizeCampaignPayload({wizardClass:'pyromancer',level:2,learnedSpells:learned,equippedSpells:result.equippedSpells}).learnedSpells,result.learnedSpells);
});
test('level rewards bridge into the live profile once, including multi-level gains',()=>{
  const progression=new ProgressionSystem(); let calls=0;
  progression.onLevelUp=()=>calls++;
  const gain=progression.addXP(1000000);
  assert.equal(progression.level,15); assert.equal(gain.rewards.skillPoints,28); assert.equal(calls,1);
  progression.addXP(-1); progression.addXP(Infinity); assert.equal(calls,1);
  const {state,player}=fixture(); const before=player.talentPoints;
  state.applyPlayerProfile('p',{level:15}); assert.equal(player.talentPoints,before);
});
test('new talents alter real stats and repeated profile sync does not stack them',()=>{
  const {state,player}=fixture(); player.talentPoints=5;
  const hp=player.maxHealth;
  assert.equal(state.upgradeTalent('p','pyromancer_cinderward_1'),true);
  assert.equal(player.maxHealth,hp+25);
  state.applyPlayerProfile('p',{level:15}); const expected=player.maxHealth;
  state.applyPlayerProfile('p',{level:15}); assert.equal(player.maxHealth,expected);
});

test('ward and healing talents change actual spell outcomes',()=>{
  const {state,player}=fixture(); player.health=10; player.talentPoints=20;
  state.upgradeTalent('p','pyromancer_phoenix_1');
  state.upgradeTalent('p','pyromancer_phoenix_2');
  const heal='pyromancer_heal_1';
  state.changeMastery('p',{action:'learn',spellId:heal});
  state.changeMastery('p',{action:'equip',spellId:heal,slot:'skill1'});
  state.handleSpellCast('p',{spellId:heal,direction:{z:-1}});
  assert.ok(player.health>52);
  const tank=fixture('cryomancer'); tank.player.talentPoints=20;
  tank.state.upgradeTalent('p','cryo_plating'); tank.state.upgradeTalent('p','cryo_barrier');
  tank.state.handleSpellCast('p',{spellId:'glacial_bulwark',direction:{z:-1}});
  assert.equal(tank.player.shield,150);
});

test('impact spells damage targets, respect walls and cannot be replayed by clients',()=>{
  for(const blocked of [false,true]) {
    const {state,player}=fixture(); player.x=0; player.y=0; player.z=0;
    state.enemies.clear();
    const enemy={id:'target',x:0,y:0,z:-7,health:1000,maxHealth:1000,isAlive:true,type:'sentinel'};
    state.enemies.set(enemy.id,enemy);
    state.getServerSpellColliders=()=>blocked?[{type:'rect',minX:-4,maxX:4,minZ:-3.5,maxZ:-2.5}]:[];
    const id='pyromancer_burst_1';
    state.changeMastery('p',{action:'learn',spellId:id}); state.changeMastery('p',{action:'equip',spellId:id,slot:'skill1'});
    state.handleSpellCast('p',{spellId:id,direction:{x:0,y:0,z:-1}});
    const after=enemy.health;
    assert.equal(after<1000,!blocked);
    state.handleDamageToEnemy(enemy.id,999,'fire',player.id);
    assert.equal(enemy.health,after);
  }
});

test('persistent fire fields continue after another spell and expire',()=>{
  const {state,player}=fixture(); player.x=0; player.y=0; player.z=0;
  state.enemies.clear(); state.getServerSpellColliders=()=>[];
  const enemy={id:'target',x:0,y:0,z:-10,health:1000,maxHealth:1000,isAlive:true,type:'sentinel'};
  state.enemies.set(enemy.id,enemy);
  state.handleSpellCast('p',{spellId:'fire_tornado',direction:{x:0,y:0,z:-1}});
  const field=state.masteryFields[0]; assert.ok(field);
  state.handleSpellCast('p',{spellId:'ember_bolt',direction:{x:1,y:0,z:0}});
  state.updateMasteryFields(Date.now()); assert.ok(enemy.health<1000);
  assert.equal(player.lastSpell.id,'ember_bolt');
  state.updateMasteryFields(field.until+1); assert.equal(state.masteryFields.length,0);
});
