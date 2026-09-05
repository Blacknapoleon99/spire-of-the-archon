from pathlib import Path

from playwright.sync_api import sync_playwright


ARTIFACT_DIR = Path('C:/Temp')
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def boot(page, name, wizard_class):
    page.goto('http://127.0.0.1:3000', wait_until='domcontentloaded', timeout=30000)
    page.locator('#btn-enter-spire').wait_for(state='visible', timeout=30000)
    page.locator('#btn-enter-spire').click(force=True)
    page.locator('#lobby-screen:not(.hidden)').wait_for(state='visible', timeout=10000)
    page.locator('#player-name-input').fill(name)
    page.locator(f'.class-card[data-class="{wizard_class}"]').click(force=True)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    host_context = browser.new_context(viewport={'width': 1440, 'height': 900})
    guest_context = browser.new_context(viewport={'width': 1440, 'height': 900})
    host = host_context.new_page()
    guest = guest_context.new_page()
    host_glb = []
    guest_glb = []
    logs = []
    host.on('response', lambda response: host_glb.append(response.url) if response.url.endswith('.glb') else None)
    guest.on('response', lambda response: guest_glb.append(response.url) if response.url.endswith('.glb') else None)
    host.on('console', lambda message: logs.append(f'host:{message.type}:{message.text}'))
    guest.on('console', lambda message: logs.append(f'guest:{message.type}:{message.text}'))

    boot(host, 'Host Pyromancer', 'pyromancer')
    host.locator('#btn-host-game').click(force=True)
    host.locator('#room-lobby-panel:not(.hidden)').wait_for(state='visible', timeout=15000)
    room_code = host.locator('#display-room-code').inner_text().strip()
    assert room_code

    boot(guest, 'Guest Cryomancer', 'cryomancer')
    guest.locator('#join-code-input').fill(room_code)
    guest.locator('#btn-join-game').click(force=True)
    guest.locator('#room-lobby-panel:not(.hidden)').wait_for(state='visible', timeout=15000)
    host.locator('#party-count').wait_for(state='visible', timeout=5000)
    host.locator('#btn-start-game').click(force=True)
    host.locator('#hud:not(.hidden)').wait_for(state='visible', timeout=30000)
    guest.locator('#hud:not(.hidden)').wait_for(state='visible', timeout=30000)
    host.wait_for_timeout(6000)
    guest.wait_for_timeout(6000)
    host.screenshot(path=str(ARTIFACT_DIR / 'spire-host-remote-hero.png'), full_page=True)
    guest.screenshot(path=str(ARTIFACT_DIR / 'spire-guest-remote-hero.png'), full_page=True)
    print({'room': room_code, 'hostGlb': host_glb, 'guestGlb': guest_glb, 'logs': [line for line in logs if 'AssetLoader' in line or 'PlayerEntity' in line or 'Draco' in line]})
    assert any('player_cryomancer.glb' in url for url in host_glb)
    assert any('player_pyromancer.glb' in url for url in guest_glb)
    browser.close()
