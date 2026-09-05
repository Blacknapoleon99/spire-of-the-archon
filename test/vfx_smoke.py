"""Browser smoke test for the pooled spell VFX path.

Run with the local server active: python test/vfx_smoke.py
"""
import os
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("AUDIT_BASE_URL", "http://127.0.0.1:3000")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector("#btn-enter-spire:not(.hidden)", timeout=90000)
    page.locator("#btn-enter-spire").click(force=True)
    page.locator("#player-name-input").fill("VFX Smoke Wizard")
    page.locator("#btn-host-game").click(force=True)
    page.wait_for_selector("#room-lobby-panel:not(.hidden)", timeout=15000)
    page.locator("#btn-start-game").click(force=True)
    page.wait_for_selector("#hud:not(.hidden)", timeout=20000)
    page.wait_for_selector("#game-container canvas", timeout=20000)
    page.locator("#game-container canvas").click(position={"x": 640, "y": 360})
    page.keyboard.press("r")
    page.wait_for_timeout(350)
    perf = page.evaluate("window.__vfxPerf || null")
    assert not errors, errors
    assert perf is not None, "VFX telemetry was not published"
    assert perf["activeVortices"] >= 1, perf
    assert perf["activeEffects"] >= 0, perf
    # Headless Chromium can throttle RAF to 10 FPS; the cast-path CPU marker
    # is the stable gate here. Hardware frame-time thresholds are measured in
    # the headed stress harness.
    assert perf["lastCastMs"] < 50, perf
    print("VFX smoke passed:", perf)
    browser.close()
