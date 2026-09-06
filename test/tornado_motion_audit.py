"""Cold-start diagnostics and multi-frame, multi-angle tornado regression."""
import base64
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path('C:/Temp/spire-tornado-motion')
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True,
        args=['--enable-gpu', '--use-angle=d3d11'] if os.environ.get('SPIRE_AUDIT_GPU') == 'hardware' else [])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' and ('THREE' in msg.text or 'GL_' in msg.text) else None)
    try:
        page.goto('http://localhost:3000', wait_until='networkidle', timeout=120000)
        page.wait_for_selector('#btn-enter-spire:not(.hidden)', timeout=120000)
        boot = page.evaluate('''() => {
          const g=window.__spireGame;
          window.auditFloor=g.tower.roomGroup.children[0].uuid;
          window.auditQuality=[];
          const setQuality=g.engineScene.setGraphicsQuality.bind(g.engineScene);
          g.engineScene.setGraphicsQuality=q=>{const t=performance.now();setQuality(q);window.auditQuality.push({q,t,ms:performance.now()-t});};
          return {readyMs:performance.now(),programs:g.engineScene.renderer.info.programs.length};
        }''')
        print('Ready:', boot, flush=True)
        page.locator('#btn-enter-spire').click(force=True)
        page.wait_for_selector('#loading-screen', state='hidden')
        page.wait_for_selector('#lobby-screen:not(.hidden)')
        page.locator('#player-name-input').fill('Motion Audit')
        page.locator('.class-card[data-class="pyromancer"]').click(force=True)
        page.locator('#btn-host-game').click(force=True)
        page.wait_for_selector('#btn-start-game', state='visible')
        page.locator('#btn-start-game').click(force=True)
        page.wait_for_selector('#hud:not(.hidden)')
        startup = page.evaluate('''async () => {
          const g=window.__spireGame, frames=[];
          const sameFloor=window.auditFloor===g.tower.roomGroup.children[0].uuid;
          let start=performance.now(),last=start;
          await new Promise(resolve=>{function sample(t){frames.push(t-last);last=t;
            if(t-start<5000)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});
          frames.sort((a,b)=>a-b);
          return {sameFloor,frames:frames.length,p95Ms:frames[Math.floor(frames.length*.95)],maxMs:frames.at(-1),qualityChanges:window.auditQuality,graphics:g.engineScene.getPerformanceInfo()};
        }''')
        assert startup['sameFloor'], startup
        print('First playable five seconds (headless GPU):', startup, flush=True)
        result = page.evaluate('''() => {
          const g=window.__spireGame,c=g.engineScene.camera;
          g.isGameActive=false;g.particles.clear();
          c.position.set(5,2.6,32);c.lookAt(5,3,22);c.updateMatrixWorld(true);
          const origin=c.position.clone(),direction=origin.clone().set(0,0,-1);
          g.spellVfx.playCast({spellId:'fire_tornado',spellType:'ult',element:'fire',origin,direction,target:origin.clone().set(5,0,22),source:'local'});
          const v=g.particles.vortices.at(-1),captures=[];
          for(let frame=0;frame<3;frame++){
            for(let i=0;i<30;i++)g.particles.update(1/60);
            g.engineScene.render();
            captures.push({time:v.volume.material.uniforms.uTime.value,yaw:v.vortexGroup.rotation.y,
              png:g.engineScene.renderer.domElement.toDataURL('image/png')});
          }
          c.position.set(0,2.6,31);c.lookAt(5,3,22);c.updateMatrixWorld(true);g.engineScene.render();
          const side=g.engineScene.renderer.domElement.toDataURL('image/png');
          return {captures,side,structure:{halfWidth:v.volume.material.uniforms.uHalfSize.value.x,
            windStripes:v.windStripes.length,embers:v.emberCloud.geometry.attributes.position.count,
            dust:v.windDust.geometry.attributes.position.count}};
        }''')
        frames = result['captures']
        assert frames[2]['time'] - frames[0]['time'] > .9
        assert frames[2]['yaw'] - frames[0]['yaw'] > 1
        assert len(set(frame['png'] for frame in frames)) == 3
        assert result['side'] != frames[-1]['png']
        assert result['structure']['halfWidth'] > 2.2
        assert result['structure']['windStripes'] == 5
        assert result['structure']['embers'] == 112 and result['structure']['dust'] == 56
        for i, frame in enumerate(frames):
            (OUT / f'frame-{i}.png').write_bytes(base64.b64decode(frame.pop('png').split(',')[1]))
        (OUT / 'side.png').write_bytes(base64.b64decode(result['side'].split(',')[1]))
        assert not errors, errors
        report = {'boot':boot,'startup':startup,'motion':frames,'structure':result['structure'],'errors':errors}
        (OUT / 'report.json').write_text(json.dumps(report,indent=2))
        print(json.dumps(report,indent=2), flush=True)
    finally:
        browser.close()
