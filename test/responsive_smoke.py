from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:3000"
ARTIFACT_DIR = Path("C:/Temp")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    for width, height, label in ((390, 844, "mobile"), (1024, 768, "tablet")):
        page = browser.new_page(viewport={"width": width, "height": height})
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        page.wait_for_selector("#btn-enter-spire:not(.hidden)", timeout=20000)
        page.locator("#btn-enter-spire").click(force=True)
        page.wait_for_selector("#lobby-screen:not(.hidden)", timeout=5000)
        metrics = page.evaluate(
            """() => ({
                innerWidth: window.innerWidth,
                documentWidth: document.documentElement.scrollWidth,
                bodyWidth: document.body.scrollWidth,
                lobbyRight: document.querySelector('#lobby-screen .lobby-card')?.getBoundingClientRect().right,
                actionTabsRight: document.querySelector('.lobby-action-tabs')?.getBoundingClientRect().right,
                overflow: [...document.querySelectorAll('*')].map(el => {
                    const r = el.getBoundingClientRect();
                    return {tag: el.tagName, id: el.id, cls: el.className?.toString().slice(0, 80), left: r.left, right: r.right, width: r.width};
                }).filter(item => item.right > window.innerWidth + 1 || item.left < -1).sort((a, b) => b.right - a.right).slice(0, 8)
            })"""
        )
        page.screenshot(path=str(ARTIFACT_DIR / f"spire-{label}.png"), full_page=True)
        print(f"{label}: {metrics}")
        assert metrics["documentWidth"] <= metrics["innerWidth"] + 1, metrics
        assert metrics["bodyWidth"] <= metrics["innerWidth"] + 1, metrics
        page.close()
    browser.close()
