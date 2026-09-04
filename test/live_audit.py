import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("AUDIT_BASE_URL", "https://spire-of-the-archon.onrender.com")
ARTIFACT_DIR = Path("C:/Temp")


def wait_visible(page, selector, timeout_ms):
    deadline = page.evaluate("Date.now()") + timeout_ms
    locator = page.locator(selector)
    while page.evaluate("Date.now()") < deadline:
        if locator.is_visible():
            return
        page.wait_for_timeout(250)
    raise AssertionError(f"Timed out waiting for visible selector: {selector}")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    page_errors = []
    raw_console_errors = []
    failed_requests = []
    socket_events = []

    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: raw_console_errors.append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: failed_requests.append(f"{request.method} {request.url}: {request.failure}"))
    page.on(
        "response",
        lambda response: failed_requests.append(f"HTTP {response.status} {response.url}")
        if response.status >= 500
        else None,
    )
    page.on(
        "websocket",
        lambda websocket: (
            socket_events.append(f"opened {websocket.url}"),
            websocket.on("close", lambda: socket_events.append(f"closed {websocket.url}")),
        ),
    )

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=90000)
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        pass
    wait_visible(page, "#btn-enter-spire:not(.hidden)", 90000)
    page.screenshot(path=str(ARTIFACT_DIR / "spire-live-loading.png"), full_page=True)
    page.locator("#btn-enter-spire").click(force=True)
    wait_visible(page, "#lobby-screen:not(.hidden)", 15000)
    assert page.locator(".class-card").count() == 4
    assert page.locator("#btn-quick-ascend").count() == 1

    page.locator("#player-name-input").fill("Render Audit Wizard")
    page.locator("#btn-quick-ascend").click(force=True)
    wait_visible(page, "#hud:not(.hidden)", 60000)
    wait_visible(page, "#game-container canvas", 30000)
    page.wait_for_timeout(2500)
    page.screenshot(path=str(ARTIFACT_DIR / "spire-live-hud.png"), full_page=True)

    assert page.locator("#quest-tracker-card").is_visible()
    assert page.locator("#spell-hotbar").is_visible()
    assert page.locator("#hud-health-text").inner_text().strip()
    assert page.locator("#hud-mana-text").inner_text().strip()
    assert page.locator("#spell-hotbar .spell-slot").count() == 5

    page.locator("#btn-toggle-inventory").click(force=True)
    wait_visible(page, "#inventory-modal:not(.hidden)", 5000)
    bag_slot_count = page.locator("#bag-grid .bag-slot").count()
    assert bag_slot_count > 0
    page.locator("#btn-close-inventory").click(force=True)

    page.keyboard.press("h")
    wait_visible(page, "#controls-modal:not(.hidden)", 5000)
    page.locator("#btn-done-controls").click(force=True)

    console_errors = [message for message in raw_console_errors if "401" not in message]
    print(f"Live Render audit passed: loading, lobby, quick ascend, WebGL scene, HUD, inventory ({bag_slot_count} slots) and controls")
    print(f"Screenshots: {ARTIFACT_DIR / 'spire-live-loading.png'}, {ARTIFACT_DIR / 'spire-live-hud.png'}")
    print(f"WebSockets: {socket_events}")
    print(f"Page errors: {page_errors}")
    print(f"Console errors (excluding expected auth 401s): {console_errors}")
    print(f"Failed requests: {failed_requests}")
    assert not page_errors, page_errors
    assert not console_errors, console_errors
    assert not failed_requests, failed_requests
    browser.close()
