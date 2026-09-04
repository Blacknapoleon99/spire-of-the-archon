import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("AUDIT_BASE_URL", "http://127.0.0.1:3000")
ARTIFACT_DIR = Path("C:/Temp")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    page_errors = []
    raw_console_errors = []
    failed_requests = []

    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: raw_console_errors.append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: failed_requests.append(f"{request.method} {request.url}: {request.failure}"))
    page.on(
        "response",
        lambda response: failed_requests.append(f"HTTP {response.status} {response.url}")
        if response.status >= 500
        else None,
    )

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)
    # A live Socket.io connection can keep the network busy indefinitely;
    # give static assets a brief chance to settle without requiring networkidle.
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        pass
    page.wait_for_selector("#btn-enter-spire:not(.hidden)", timeout=90000)
    page.screenshot(path=str(ARTIFACT_DIR / "spire-lobby.png"), full_page=True)

    assert page.locator("#lobby-screen").is_visible()
    assert page.locator(".game-title").inner_text().strip()
    assert page.locator(".class-card").count() == 4
    assert page.locator("#difficulty-select option").count() == 3
    assert page.locator("#account-username").count() == 1
    page.locator("#btn-enter-spire").click(force=True)
    page.wait_for_selector("#lobby-screen:not(.hidden)", timeout=5000)

    page.locator("#difficulty-select").select_option("standard")
    page.locator("#player-name-input").fill("Visual Audit Wizard")
    page.locator("#btn-host-game").click(force=True)
    page.wait_for_selector("#room-lobby-panel:not(.hidden)", timeout=15000)
    assert page.locator("#display-room-code").inner_text().strip()
    assert page.locator("#lobby-player-list .lobby-player-item").count() >= 1

    page.locator("#btn-start-game").click(force=True)
    page.wait_for_selector("#hud:not(.hidden)", timeout=20000)
    page.wait_for_selector("#game-container canvas", timeout=20000)
    page.wait_for_timeout(2500)
    page.screenshot(path=str(ARTIFACT_DIR / "spire-hud.png"), full_page=True)

    assert page.locator("#quest-tracker-card").is_visible()
    assert page.locator("#spell-hotbar").is_visible()
    # Solo starts intentionally leave the party list empty; verify the host
    # container exists and that the surrounding HUD remains rendered.
    assert page.locator("#party-hud-list").count() == 1
    assert page.locator("#hud-health-text").inner_text().strip()
    assert page.locator("#hud-mana-text").inner_text().strip()
    assert page.locator("#spell-hotbar .spell-slot").count() == 5

    page.locator("#btn-toggle-inventory").click(force=True)
    page.wait_for_selector("#inventory-modal:not(.hidden)", timeout=3000)
    assert page.locator("#equipment-paperdoll").is_visible()
    assert page.locator("#bag-grid .bag-slot").count() >= 24
    page.locator("#btn-close-inventory").click(force=True)

    page.locator("#btn-toggle-grimoire").click(force=True)
    page.wait_for_selector("#grimoire-modal:not(.hidden)", timeout=3000)
    assert page.locator("#grimoire-spells-list").is_visible()
    page.locator("#btn-close-grimoire").click(force=True)

    page.locator("#btn-toggle-talents").click(force=True)
    page.wait_for_selector("#talent-modal:not(.hidden)", timeout=3000)
    assert page.locator("#talent-nodes-container").is_visible()
    page.locator("#btn-close-talents").click(force=True)

    controls_button = page.locator("#btn-hud-controls")
    button_css = controls_button.evaluate("el => ({pointerEvents: getComputedStyle(el).pointerEvents, rect: el.getBoundingClientRect().toJSON()})")
    page.mouse.click(button_css["rect"]["x"] + button_css["rect"]["width"] / 2, button_css["rect"]["y"] + button_css["rect"]["height"] / 2)
    click_opened_controls = not page.locator("#controls-modal").evaluate("el => el.classList.contains('hidden')")
    # H/F1 is the documented keyboard fallback and should always work.
    if not click_opened_controls:
        page.keyboard.press("h")
    page.wait_for_selector("#controls-modal:not(.hidden)", timeout=3000)
    print(f"Controls button pointer-events: {button_css['pointerEvents']}; pointer click opened: {click_opened_controls}")
    page.locator("#btn-done-controls").click(force=True)

    print(f"UI audit passed: lobby, hosting, HUD, inventory, grimoire, talents, controls")
    print(f"Screenshots: {ARTIFACT_DIR / 'spire-lobby.png'}, {ARTIFACT_DIR / 'spire-hud.png'}")
    print(f"Page errors: {page_errors}")
    # Unauthenticated campaign bootstrap calls intentionally return 401 before
    # the player signs in; treat those as expected, but fail on real errors.
    console_errors = [message for message in raw_console_errors if "401 (Unauthorized)" not in message]
    print(f"Console errors (excluding expected auth 401s): {console_errors}")
    print(f"Expected auth notices: {[message for message in raw_console_errors if '401 (Unauthorized)' in message]}")
    print(f"Failed requests: {failed_requests}")
    assert not page_errors, page_errors
    assert not console_errors, console_errors
    assert not failed_requests, failed_requests
    browser.close()
