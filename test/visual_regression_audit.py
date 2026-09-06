"""Real browser regression: duplicate names, reconnect, actual avatar draws,
camera-clear projectiles, and the flame volume seen in the game renderer."""
import base64
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('AUDIT_BASE_URL', 'http://127.0.0.1:3000')
OUT = Path('C:/Temp/spire-clarity-audit')
OUT.mkdir(parents=True, exist_ok=True)


def visible(page, selector, timeout=90000):
    page.wait_for_function('(s) => { const e=document.querySelector(s); return e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== "hidden"; }', arg=selector, timeout=timeout)


def boot(browser, class_id, errors):
    print(f'Booting {class_id}', flush=True)
    page = browser.new_context(viewport={'width': 1280, 'height': 800}).new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' and ('THREE' in msg.text or 'GL_' in msg.text) else None)
    page.goto(BASE, wait_until='domcontentloaded', timeout=90000)
    visible(page, '#btn-enter-spire:not(.hidden)')
    page.locator('#btn-enter-spire').click(force=True)
    page.wait_for_selector('#loading-screen', state='hidden')
    visible(page, '#lobby-screen:not(.hidden)')
    page.locator('#player-name-input').fill('Same Wizard')
    page.locator(f'.class-card[data-class="{class_id}"]').click(force=True)
    page.evaluate('''() => { const e=window.__spireGame.engineScene; e.auditRender=e.render.bind(e); e.render=()=>{}; }''')
    print(f'Ready {class_id}', flush=True)
    return page


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True,
        args=['--enable-gpu', '--use-angle=d3d11'] if os.environ.get('SPIRE_AUDIT_GPU') == 'hardware' else [])
    errors = []
    try:
        host = boot(browser, 'pyromancer', errors)
        host.locator('#btn-host-game').click(force=True)
        visible(host, '#room-lobby-panel:not(.hidden)')
        code = host.locator('#display-room-code').inner_text().strip()
        guest = boot(browser, 'cryomancer', errors)
        guest.locator('#join-code-input').fill(code)
        guest.locator('#btn-join-game').click(force=True)
        visible(guest, '#room-lobby-panel:not(.hidden)')
        third = boot(browser, 'luminary', errors)
        third.locator('#join-code-input').fill(code)
        third.locator('#btn-join-game').click(force=True)
        visible(third, '#room-lobby-panel:not(.hidden)')
        host.locator('#btn-start-game').click(force=True)
        for page in [host, guest, third]:
            visible(page, '#hud:not(.hidden)')
        print('All three players in game', flush=True)
        results = []
        for index, page in enumerate([host, guest, third]):
            page.wait_for_function('() => window.__spireGame?.players.size === 3 && [...window.__spireGame.players.values()].every(p => p.hasRiggedModel)', timeout=45000)
            result = page.evaluate('''() => {
              const g=window.__spireGame;
              g.isGameActive=false;
              g.engineScene.render=g.engineScene.auditRender;
              const players=[...g.players.values()];
              const camera=g.engineScene.camera;
              const remote=players.filter(p=>!p.isLocal);
              const draws=[];
              for(const p of remote) {
                let drawn=0;
                p.update(0.016,g.animations);
                const root=p.getVisualRoot();
                root.traverse(c=>{if(c.isMesh) c.onAfterRender=()=>drawn++;});
                camera.position.copy(p.position).add({x:0,y:1.7,z:-5});
                camera.lookAt(p.position.x,p.position.y+1.35,p.position.z);
                camera.updateMatrixWorld(true);
                g.engineScene.render();
                draws.push({id:p.id,classId:p.wizardClass,visible:root.visible,drawn});
              }
              return {local:players.filter(p=>p.isLocal).map(p=>p.wizardClass),draws,
                image:g.engineScene.renderer.domElement.toDataURL('image/png')};
            }''')
            (OUT / f'party-{index}.png').write_bytes(base64.b64decode(result.pop('image').split(',')[1]))
            assert len(result['local']) == 1, result
            assert result['local'][0] == ['pyromancer', 'cryomancer', 'luminary'][index], result
            assert len(result['draws']) == 2 and all(d['drawn'] > 0 and d['visible'] for d in result['draws']), result
            results.append(result)
            print(f'Player {index}: {result}', flush=True)
            page.evaluate('window.__spireGame.isGameActive=true; window.__spireGame.engineScene.render=()=>{}')
        # A fresh page must reclaim the guest identity, never the host's,
        # even though all three players deliberately share a display name.
        guest.reload(wait_until='domcontentloaded', timeout=90000)
        visible(guest, '#hud:not(.hidden)')
        guest.wait_for_function('''() => {
          const ps=[...window.__spireGame.players.values()];
          return ps.length===3 && ps.filter(p=>p.isLocal).length===1
            && ps.find(p=>p.isLocal).wizardClass==='cryomancer'
            && ps.filter(p=>!p.isLocal).every(p=>p.hasRiggedModel && p.getVisualRoot().visible);
        }''', timeout=45000)
        print('Guest reload restored the correct identity and visible remote avatars', flush=True)
        guest.evaluate('window.__spireGame.engineScene.render=()=>{}')
        # Freeze only this test client's simulation for reproducible camera
        # framing; exercise the same VFX director/update/render as gameplay.
        fire = host.evaluate('''() => {
          const g=window.__spireGame, camera=g.engineScene.camera;
          g.isGameActive=false;
          g.engineScene.render=g.engineScene.auditRender;
          g.particles.clear();
          camera.position.set(5,2.2,31);
          camera.lookAt(5,2.7,22);
          camera.updateMatrixWorld(true);
          const origin=camera.position.clone(), direction=origin.clone().set(0,0,-1);
          g.spellVfx.playCast({spellId:'fireball',spellType:'skill1',element:'fire',origin,direction,source:'local'});
          const p=g.particles.projectiles.at(-1);
          const launch={originDistance:p.mesh.position.distanceTo(origin), offset:p.visual.position.toArray(), scale:p.visual.scale.x};
          g.engineScene.render();
          const projectileImage=g.engineScene.renderer.domElement.toDataURL('image/png');
          g.particles.clear();
          g.spellVfx.playCast({spellId:'fire_tornado',spellType:'ult',element:'fire',origin,direction,target:origin.clone().set(5,0,22),source:'local'});
          for(let i=0;i<60;i++)g.particles.update(1/60);
          g.engineScene.render();
          const v=g.particles.vortices.at(-1);
          return {launch,volume:v.volume.name,steps:v.volume.material.uniforms.uSteps.value,
            oldConeVisible:v.heroAsset?.visible,rotationX:v.emberCloud.rotation.x,
            projectileImage,image:g.engineScene.renderer.domElement.toDataURL('image/png'),
            renderer:g.engineScene.renderer.info.render};
        }''')
        for key, name in [('projectileImage','projectile-launch.png'),('image','tornado.png')]:
            (OUT / name).write_bytes(base64.b64decode(fire.pop(key).split(',')[1]))
        assert fire['launch']['originDistance'] == 0, fire
        assert fire['launch']['offset'][0] > 0.25 and fire['launch']['offset'][1] < -0.2, fire
        assert fire['launch']['scale'] <= 0.5, fire
        assert fire['volume'] == 'TornadoDensityVolume' and not fire['oldConeVisible'], fire
        assert fire['rotationX'] == 0, fire
        assert not errors, errors
        print(json.dumps({'base':BASE, 'party':results, 'fire':fire, 'errors':errors}, indent=2), flush=True)
    finally:
        browser.close()
