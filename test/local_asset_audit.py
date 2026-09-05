from pathlib import Path

from playwright.sync_api import sync_playwright


ARTIFACT_DIR = Path('C:/Temp')
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    errors = []
    failed = []
    loaded_glb = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(f'console:{message.text}') if message.type == 'error' and '401 (Unauthorized)' not in message.text else None)
    page.on('requestfailed', lambda request: failed.append(f'{request.method} {request.url}: {request.failure}'))
    page.on('response', lambda response: loaded_glb.append((response.url, response.status)) if response.url.endswith('.glb') else None)

    page.goto('http://127.0.0.1:3000', wait_until='domcontentloaded', timeout=30000)
    try:
        page.wait_for_load_state('networkidle', timeout=10000)
    except Exception:
        pass
    page.locator('#btn-enter-spire').wait_for(state='visible', timeout=30000)
    page.locator('#btn-enter-spire').click(force=True)
    page.locator('#lobby-screen:not(.hidden)').wait_for(state='visible', timeout=10000)
    page.locator('#player-name-input').fill('Asset Audit Wizard')
    page.locator('#btn-quick-ascend').click(force=True)
    page.locator('#hud:not(.hidden)').wait_for(state='visible', timeout=30000)
    page.locator('#game-container canvas').wait_for(state='visible', timeout=10000)
    page.wait_for_timeout(5000)
    page.screenshot(path=str(ARTIFACT_DIR / 'spire-local-authored-hero.png'), full_page=True)

    # Focus the scene and exercise the authored fireball/tornado paths.
    page.mouse.click(720, 450)
    page.keyboard.press('q')
    page.wait_for_timeout(350)
    page.screenshot(path=str(ARTIFACT_DIR / 'spire-local-fireball.png'), full_page=True)
    page.keyboard.press('r')
    page.wait_for_timeout(900)
    page.screenshot(path=str(ARTIFACT_DIR / 'spire-local-fire-tornado.png'), full_page=True)
    stats = page.evaluate('window.__vfxPerf || null')
    fire_visual = page.evaluate("""() => {
      const vortex = window.__spireGame?.particles?.vortices?.find(item => item.type === 'fire_tornado');
      return vortex ? {
        hasHeroAsset: Boolean(vortex.heroAsset),
        hasClosedVolume: Boolean(vortex.volume),
        heroPosition: vortex.heroAsset ? vortex.heroAsset.position.toArray() : null,
        heroScale: vortex.heroAsset ? vortex.heroAsset.scale.toArray() : null,
        volumePosition: vortex.volume ? vortex.volume.position.toArray() : null,
        volumeVisible: Boolean(vortex.volume?.visible),
        groupPosition: vortex.group ? vortex.group.position.toArray() : null,
        flatCardsVisible: (vortex.flameCards || []).filter(card => card.visible).length,
        groundedY: vortex.group?.position?.y ?? null
      } : null;
    }""")
    print({'glb': loaded_glb, 'vfx': stats, 'fireVisual': fire_visual, 'pageErrors': errors, 'failed': failed})
    assert not errors, errors
    assert not failed, failed
    assert any('player_pyromancer.glb' in url for url, status in loaded_glb if status == 200)
    assert any('fp_wand_hero.glb' in url for url, status in loaded_glb if status == 200)
    assert any('spell_fireball.glb' in url for url, status in loaded_glb if status == 200)
    assert fire_visual and fire_visual['hasHeroAsset'] and fire_visual['hasClosedVolume']
    assert fire_visual['flatCardsVisible'] == 0
    browser.close()
