import os
from pathlib import Path
from tempfile import gettempdir

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("LUMEA_BASE_URL", "http://127.0.0.1:4173/lumea-flower-studio")
ARTIFACT_DIR = Path(gettempdir()) / "lumea-functional-qa"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
HOME_SECTIONS = [
    "top",
    "occasions",
    "best-sellers",
    "budget",
    "same-day",
    "florist-choice",
    "custom",
    "why-lumea",
    "gallery",
    "visit",
]


def assert_no_overflow(page, label):
    result = page.evaluate("""() => ({
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth
    })""")
    assert result["documentWidth"] <= result["viewport"], f"{label} overflow: {result}"


def assert_images_loaded(page, label):
    broken = page.locator("img").evaluate_all(
        """images => images
          .filter(image => (image.currentSrc || image.src) && image.complete && image.naturalWidth === 0)
          .map(image => ({ src: image.currentSrc || image.src, alt: image.alt }))"""
    )
    assert not broken, f"{label} broken images: {broken}"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=os.environ.get(
            "LUMEA_BROWSER_EXECUTABLE",
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        ),
    )
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    page_errors = []
    console_errors = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)

    page.goto(f"{BASE_URL}/", wait_until="networkidle")
    page.locator("#visit").wait_for(state="attached", timeout=20_000)
    assert page.locator("header .wordmark").is_visible()
    assert page.locator("footer.site-footer").is_visible()
    for section_id in HOME_SECTIONS:
        section = page.locator(f"#{section_id}")
        assert section.count() == 1, f"missing Home section #{section_id}"
        section.scroll_into_view_if_needed()
    page.wait_for_timeout(800)
    assert_images_loaded(page, "VI Home")
    assert_no_overflow(page, "VI Home desktop")
    page.screenshot(path=ARTIFACT_DIR / "home-1440-vi.png", full_page=True)

    page.set_viewport_size({"width": 768, "height": 1024})
    assert_no_overflow(page, "VI Home tablet")
    page.set_viewport_size({"width": 390, "height": 844})
    assert_no_overflow(page, "VI Home mobile")
    menu = page.locator(".menu-toggle")
    menu.click()
    assert page.locator("#mobile-menu").is_visible()
    page.keyboard.press("Escape")
    page.screenshot(path=ARTIFACT_DIR / "home-390-vi.png", full_page=False)

    page.set_viewport_size({"width": 1440, "height": 1000})
    page.goto(f"{BASE_URL}/ko/", wait_until="networkidle")
    page.locator("#visit").wait_for(state="attached", timeout=20_000)
    for section_id in HOME_SECTIONS:
        section = page.locator(f"#{section_id}")
        assert section.count() == 1, f"missing KO Home section #{section_id}"
        section.scroll_into_view_if_needed()
    page.wait_for_timeout(800)
    assert_no_overflow(page, "KO Home desktop")
    assert_images_loaded(page, "KO Home")

    page.goto(f"{BASE_URL}/flowers", wait_until="networkidle")
    page.locator(".catalog-grid .product-card").first.wait_for(state="visible", timeout=20_000)
    initial_count = page.locator(".catalog-grid .product-card").count()
    assert initial_count > 0
    page.locator("#catalog-search").fill("pink garden")
    page.wait_for_timeout(300)
    pink_card = page.locator('.product-card a[href$="/flowers/pink-garden"]').first
    assert pink_card.is_visible(), "Pink Garden not found through customer search"

    page.set_viewport_size({"width": 390, "height": 844})
    assert_no_overflow(page, "Catalog mobile")
    page.locator(".catalog-filter-toggle").click()
    close_filter = page.locator('.catalog-filter-panel__head button')
    assert close_filter.evaluate("node => document.activeElement === node")
    page.keyboard.press("Escape")
    assert page.locator(".catalog-filter-toggle").evaluate("node => document.activeElement === node")

    page.set_viewport_size({"width": 1440, "height": 1000})
    pink_card.click()
    page.get_by_role("heading", level=1).wait_for(state="visible", timeout=20_000)
    assert page.url.endswith("/flowers/pink-garden")
    assert "120.000.000" in page.locator(".product-detail__commerce-head strong").inner_text()
    standard = page.locator('.size-option input[value="standard"]')
    if standard.count():
        standard.check()
        assert "120.000.000" in page.locator(".product-detail__commerce-head strong").inner_text()
    assert_images_loaded(page, "Pink Garden detail")
    page.reload(wait_until="networkidle")
    assert page.locator(".product-detail").is_visible()
    page.go_back(wait_until="networkidle")
    assert page.locator(".catalog-page").is_visible()
    page.go_forward(wait_until="networkidle")
    assert page.locator(".product-detail").is_visible()

    assert not page_errors, f"page errors: {page_errors}"
    assert not console_errors, f"console errors: {console_errors}"
    context.close()
    browser.close()

print(
    "Functional browser QA passed: VI/KO managed Home sections, navigation, images, "
    "1440/768/390, catalog search/filter keyboard flow, Pink Garden live price, refresh, back/forward."
)
print(f"Screenshots: {ARTIFACT_DIR}")
