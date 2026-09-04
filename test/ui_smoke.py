from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:3000", wait_until="networkidle", timeout=30000)
    page.wait_for_selector("#btn-enter-spire:not(.hidden)", timeout=20000)
    page.locator("#btn-enter-spire").click(force=True)
    page.wait_for_selector("#lobby-screen:not(.hidden)", timeout=5000)
    assert page.locator("#difficulty-select").count() == 1
    assert page.locator("#account-username").count() == 1
    assert not errors, errors
    browser.close()
