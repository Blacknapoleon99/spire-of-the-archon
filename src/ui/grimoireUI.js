import { CLASS_SPELLS, getEquippedSpells } from '../systems/spells.js';
import { soundEngine } from '../engine/audio.js';
import { getCustomIcon } from './customIcons.js';

/** Authoritative learning and equipped loadout state. */
export class GrimoireUI {
  constructor() {
    this.isOpen=false;
    this.modal=document.getElementById('grimoire-modal');
    this.spellsListContainer=document.getElementById('grimoire-spells-list');
    this.skillPointsText=document.getElementById('grimoire-skill-points');
    document.getElementById('btn-close-grimoire')?.addEventListener('click',()=>this.toggle(false));
  }
  toggle(force=null) {
    this.isOpen=force ?? !this.isOpen;
    this.modal?.classList.toggle('hidden',!this.isOpen);
    if(this.isOpen) { this.render(); soundEngine.playMenuOpen(); }
    else soundEngine.playMenuClose();
  }
  render(wizardClass='pyromancer') {
    const player=this.getPlayer?.() || {wizardClass,level:1,skillPoints:2};
    const config=CLASS_SPELLS[player.wizardClass] || CLASS_SPELLS.pyromancer;
    const loadout=getEquippedSpells(player);
    if(this.skillPointsText) this.skillPointsText.textContent=player.skillPoints ?? 2;
    const list=this.spellsListContainer;
    if(!list) return;
    list.replaceChildren();
    const header=document.createElement('section');
    header.className='mastery-loadout';
    header.innerHTML=`<h3>${config.title} · Level ${player.level || 1}/15</h3><p>28 spells · 2 spell points per level · Equip Q / E / R after cooldowns end.</p>`;
    for(const slot of ['skill1','skill2','ult']) {
      const button=document.createElement('button');
      button.textContent=`${loadout[slot].key} · ${loadout[slot].name} ↺`;
      button.title='Restore the starting spell in this slot';
      button.addEventListener('click',()=>this.onAction?.({action:'equip',slot,spellId:null}));
      header.appendChild(button);
    }
    list.appendChild(header);
    const kinds=['lance','burst','field','ward','heal','wave'];
    const labels=['Focused attacks','Impact explosions','Persistent fields','Defensive wards','Personal recovery','Party restoration'];
    kinds.forEach((kind,i)=>{
      const heading=document.createElement('h3'); heading.className='mastery-heading'; heading.textContent=labels[i]; list.appendChild(heading);
      for(const spell of config.unlockables.filter(s=>s.kind===kind)) {
        const learned=player.learnedSpells?.includes(spell.id);
        const available=(player.level||1)>=spell.level;
        const card=document.createElement('article');
        card.className=`grimoire-spell-card ${learned?'active':'locked'}`;
        card.innerHTML=`<div class="spell-grimoire-icon">${getCustomIcon(spell.id)}</div><div class="spell-info"><h4>${spell.name}<small> LEVEL ${spell.level}</small></h4><p>${spell.desc}</p><p>${spell.mana} mana · ${spell.cd}s cooldown</p></div>`;
        const controls=document.createElement('div'); controls.className='mastery-actions';
        if(learned) {
          for(const [slot,key] of [['skill1','Q'],['skill2','E'],['ult','R']]) {
            const button=document.createElement('button');
            button.textContent=player.equippedSpells?.[slot]===spell.id?`${key} ✓`:`Equip ${key}`;
            button.disabled=player.equippedSpells?.[slot]===spell.id;
            button.addEventListener('click',()=>this.onAction?.({action:'equip',slot,spellId:spell.id})); controls.appendChild(button);
          }
        } else {
          const button=document.createElement('button'); button.textContent=available?'Learn · 1 SP':`Requires level ${spell.level}`;
          button.disabled=!available || !(player.skillPoints>0);
          button.addEventListener('click',()=>this.onAction?.({action:'learn',spellId:spell.id})); controls.appendChild(button);
        }
        card.appendChild(controls); list.appendChild(card);
      }
    });
  }
}
