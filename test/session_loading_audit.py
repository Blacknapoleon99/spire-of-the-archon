"""Hold GPU readiness to prove Ascend cannot expose controls prematurely."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path('C:/Temp/spire-session-loading')
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True,
        args=['--enable-gpu', '--use-angle=d3d11'] if os.environ.get('SPIRE_AUDIT_GPU') == 'hardware' else [])
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto('http://localhost:3000', wait_until='networkidle', timeout=120000)
        page.wait_for_selector('#btn-enter-spire:not(.hidden)', timeout=120000)
        print('Core ready', flush=True)
        page.locator('#btn-enter-spire').click(force=True)
        page.wait_for_selector('#loading-screen', state='hidden')
        page.wait_for_selector('#lobby-screen:not(.hidden)')
        page.locator('#player-name-input').fill('Loading Audit')
        page.locator('.class-card[data-class="pyromancer"]').click(force=True)
        page.locator('#btn-host-game').click(force=True)
        print(page.evaluate('''() => ({network:window.__spireGame.ui.network.connectionState,
          room:window.__spireGame.ui.network.roomId,errors:document.querySelector('#account-status')?.textContent})'''), flush=True)
        page.wait_for_selector('#btn-start-game', state='visible')
        page.evaluate('''() => {
          const renderer=window.__spireGame.engineScene.renderer;
          const compile=renderer.compileAsync.bind(renderer);
          window.auditOriginalCompile=compile;
          let first=true;
          renderer.compileAsync=async (...args)=>{
            if(first){first=false;await new Promise(resolve=>window.auditReleaseGPU=resolve);}
            return compile(...args);
          };
        }''')
        page.locator('#btn-start-game').click(force=True)
        page.wait_for_selector('#session-loading-overlay:not(.hidden)', timeout=30000)
        page.wait_for_function('typeof window.auditReleaseGPU === "function"', timeout=120000)
        before = page.evaluate('''() => ({loading:window.__spireGame._sessionLoading,
          position:window.__spireGame.localPlayer.position.toArray(),casts:window.__spireGame.spellVfx.stats.casts,
          hudHidden:document.querySelector('#hud').classList.contains('hidden')})''')
        page.screenshot(path=str(OUT / 'loading.png'))
        page.keyboard.down('w')
        page.keyboard.press('r')
        page.wait_for_timeout(350)
        page.keyboard.up('w')
        after = page.evaluate('''() => ({position:window.__spireGame.localPlayer.position.toArray(),
          casts:window.__spireGame.spellVfx.stats.casts})''')
        assert before['loading'] and before['hudHidden'], before
        assert before['position'] == after['position'] and before['casts'] == after['casts'], (before, after)
        page.evaluate('window.auditReleaseGPU()')
        page.wait_for_function('window.__spireGame._sessionLoading === false', timeout=120000)
        page.wait_for_selector('#session-loading-overlay', state='hidden', timeout=30000)
        page.wait_for_selector('#hud:not(.hidden)')
        metrics = page.evaluate('''async () => {
          const g=window.__spireGame,frames=[];
          let start=performance.now(),last=start;
          await new Promise(resolve=>{function sample(t){frames.push(t-last);last=t;
            if(t-start<5000)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});
          frames.sort((a,b)=>a-b);
          return {frames:frames.length,p95Ms:frames[Math.floor(frames.length*.95)],maxMs:frames.at(-1),
            graphics:g.engineScene.getPerformanceInfo(),ready:!!g.fpViewmodel?.hasRiggedModel,
            enemies:g.enemies.size};
        }''')
        assert not errors, errors
        page.screenshot(path=str(OUT / 'ready.png'))
        # Fail an actual readiness stage and exercise the visible retry action.
        page.evaluate('''() => {
          const g=window.__spireGame;
          g.engineScene.renderer.compileAsync=async()=>{throw new Error('Audit: simulated GPU preparation failure');};
          g.beginSessionLoading({floor:g.currentFloor,players:[]});
        }''')
        page.wait_for_selector('#session-loading-overlay[data-state="error"]', timeout=60000)
        assert page.evaluate('window.__spireGame._sessionLoading && document.querySelector("#hud").classList.contains("hidden")')
        page.screenshot(path=str(OUT / 'retry.png'))
        page.evaluate('() => { window.__spireGame.engineScene.renderer.compileAsync=window.auditOriginalCompile; }')
        page.locator('[data-session-loading-retry]').click(force=True)
        page.wait_for_function('window.__spireGame._sessionReady && !window.__spireGame._sessionLoading', timeout=120000)
        assert not errors, errors
        report = {'blockedDuringPreparation':before,'startup':metrics,'retryRecovered':True,'errors':errors}
        (OUT / 'report.json').write_text(json.dumps(report,indent=2))
        print(json.dumps(report,indent=2),flush=True)
    except Exception:
        print('Browser errors:', errors, flush=True)
        page.screenshot(path=str(OUT / 'failure.png'))
        raise
    finally:
        browser.close()
