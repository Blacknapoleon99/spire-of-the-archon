"""Exercise actual grimoire actions and render every spell family in Chromium."""
import base64
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path('C:/Temp/spire-mastery-audit')
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' and ('THREE' in m.text or 'GL_' in m.text) else None)
    try:
        page.goto('http://127.0.0.1:3000',wait_until='networkidle',timeout=90000)
        page.wait_for_function('!document.querySelector("#btn-enter-spire").classList.contains("hidden")',timeout=90000)
        page.locator('#btn-enter-spire').click(force=True)
        print('Entered lobby',flush=True)
        page.locator('#btn-host-game').click(force=True)
        page.wait_for_function('!document.querySelector("#room-lobby-panel").classList.contains("hidden")')
        page.locator('#btn-start-game').click(force=True)
        page.wait_for_function('window.__spireGame?.localPlayer && !document.querySelector("#hud").classList.contains("hidden")',timeout=90000)
        print('Game started',flush=True)
        page.evaluate('window.__spireGame.progression.addXP(1000000)')
        page.wait_for_function('window.__spireGame.localPlayer.level===15')
        page.evaluate('window.__spireGame.grimoireUI.toggle(true)')
        assert page.locator('.grimoire-spell-card').count()==24
        card=page.locator('.grimoire-spell-card').filter(has=page.get_by_role('heading',name='Cinder Spear',exact=False))
        card.get_by_role('button',name='Learn · 1 SP').click()
        card.get_by_role('button',name='Equip Q').click()
        page.wait_for_function('window.__spireGame.localPlayer.equippedSpells.skill1 === "pyromancer_lance_1"')
        page.screenshot(path=str(OUT/'grimoire.png'))
        page.evaluate('''() => { const g=window.__spireGame; g.grimoireUI.toggle(false); g.ui.toggleTalentModal(true); g.ui.renderTalents(g.localPlayer.wizardClass); }''')
        assert page.locator('.talent-branch-column').count()==4
        assert page.locator('.talent-node-card').count()==24
        page.locator('#btn-node-pyromancer_cinderward_1').click()
        page.wait_for_function('window.__spireGame.localPlayer.talents.pyromancer_cinderward_1')
        page.screenshot(path=str(OUT/'talents.png'))
        page.evaluate('''() => { const g=window.__spireGame; g.ui.toggleTalentModal(false); g.isGameActive=false; g.engineScene.camera.position.set(0,3,15); g.engineScene.camera.lookAt(0,3,5); g.engineScene.camera.updateMatrixWorld(true); g.engineScene.auditRender=g.engineScene.render.bind(g.engineScene); g.engineScene.render=()=>{}; }''')
        # Render all 112 definitions, not just the menu entries.
        result=page.evaluate('''async () => {
          const g=window.__spireGame;
          // Shared catalogue is exposed through rendered grimoire configuration
          // in this audit via a list supplied by the test below.
          return {level:g.localPlayer.level,points:g.localPlayer.skillPoints,loadout:g.localPlayer.equippedSpells};
        }''')
        # Definitions are dependency-free; load their actual IDs through Node.
        import subprocess
        spells=json.loads(subprocess.check_output(['node','--input-type=module','-e','import {SPELL_RULES} from "./src/shared/combatRules.js"; console.log(JSON.stringify(SPELL_RULES))'],text=True))
        for index,(spell_id,rule) in enumerate(spells.items()):
            image=page.evaluate('''({id,rule})=>{
              const g=window.__spireGame,c=g.engineScene.camera;
              g.particles.clear();
              const origin=c.position.clone(),direction=origin.clone().set(0,0,-1),target=origin.clone().set(0,0,5);
              g.spellVfx.playCast({spellId:id,spellType:'skill1',element:rule.element,origin,direction,target,damage:rule.damage,source:'local'});
              for(let i=0;i<45;i++)g.particles.update(1/60);
              g.engineScene.auditRender();
              return g.engineScene.renderer.domElement.toDataURL('image/png');
            }''',{'id':spell_id,'rule':rule})
            if spell_id in ['fire_tornado','glacial_bulwark','frost_nova','divine_sanctuary','temporal_stasis','pyromancer_burst_4','pyromancer_ward_4']:
                (OUT/f'{spell_id}.png').write_bytes(base64.b64decode(image.split(',')[1]))
            if index%20==0: print(f'Rendered {index+1}/{len(spells)}',flush=True)
        assert not errors,errors
        print(json.dumps({'spellsRendered':len(spells),'progression':result,'errors':errors}),flush=True)
    finally:
        browser.close()
