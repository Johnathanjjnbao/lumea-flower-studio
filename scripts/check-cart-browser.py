from pathlib import Path
from tempfile import gettempdir

from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:4173/lumea-flower-studio"
ARTIFACT_DIR = Path(gettempdir()) / "lumea-step11-qa"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def wait_for_live_cart(page):
    page.locator('.cart-line[data-valid="true"]').first.wait_for(state="visible", timeout=20_000)
    page.wait_for_function("document.querySelectorAll('.cart-line__status[data-tone=neutral]').length === 0")


def assert_no_overflow(page, label):
    result = page.evaluate("""() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('body *')]
        .map((element) => ({ selector: element.className || element.tagName, right: element.getBoundingClientRect().right, width: element.scrollWidth }))
        .filter((item) => item.right > window.innerWidth + 1 || item.width > window.innerWidth + 1)
        .slice(0, 12),
    })""")
    assert result["documentWidth"] <= result["viewport"], f"{label} overflow: {result}"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    console_errors = []
    page_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))

    page.goto(f"{BASE_URL}/", wait_until="networkidle")
    page.evaluate("localStorage.removeItem('lumea.cart.v1')")
    page.reload(wait_until="networkidle")
    assert page.locator("main#main-content").is_visible()

    page.goto(f"{BASE_URL}/flowers", wait_until="networkidle")
    assert page.get_by_label("Tìm trong bộ sưu tập").is_visible()
    product_links = page.locator(".product-card .product-image")
    product_links.first.wait_for(state="visible", timeout=20_000)
    product_url = None
    for index in range(product_links.count()):
        product_links.nth(index).click()
        page.wait_for_load_state("networkidle")
        page.locator(".product-detail h1").wait_for(state="visible", timeout=20_000)
        if page.locator('.size-option input[type="radio"]').count() >= 2:
            product_url = page.url
            break
        page.locator(".product-detail__back").click()
        page.wait_for_load_state("networkidle")
        product_links = page.locator(".product-card .product-image")
    assert product_url, "live catalog needs one product with two variants for browser QA"

    quantity = page.locator(".product-quantity input")
    quantity.fill("2")
    page.get_by_role("button", name="Thêm vào giỏ").click()
    assert page.locator(".cart-count").inner_text() == "2"
    assert page.get_by_role("status").filter(has_text="Thiết kế đã có trong giỏ hàng").is_visible()
    page.locator(".cart-button").click()
    page.wait_for_load_state("networkidle")
    wait_for_live_cart(page)
    assert page.locator(".cart-line").count() == 1
    subtotal_before = page.locator(".cart-summary dd").inner_text()
    page.locator(".cart-line .cart-quantity button").nth(1).click()
    subtotal_after = page.locator(".cart-summary dd").inner_text()
    assert subtotal_after != subtotal_before
    assert page.locator(".cart-count").inner_text() == "3"
    page.reload(wait_until="networkidle")
    wait_for_live_cart(page)
    assert page.locator(".cart-count").inner_text() == "3"

    page.locator(".cart-line h2 a").click()
    page.wait_for_load_state("networkidle")
    page.get_by_role("button", name="Thêm vào giỏ").click()
    assert page.locator(".cart-count").inner_text() == "4"
    page.locator(".cart-button").click()
    page.wait_for_load_state("networkidle")
    wait_for_live_cart(page)
    assert page.locator(".cart-line").count() == 1, "identical configuration did not merge"

    page.locator(".cart-line h2 a").click()
    page.wait_for_load_state("networkidle")
    size_radios = page.locator('.size-option input[type="radio"]')
    size_radios.nth(1).check()
    page.get_by_role("button", name="Thêm vào giỏ").click()
    page.locator(".cart-button").click()
    page.wait_for_load_state("networkidle")
    wait_for_live_cart(page)
    assert page.locator(".cart-line").count() == 2, "distinct variant was merged incorrectly"

    page.goto(f"{BASE_URL}/create-bouquet", wait_until="networkidle")
    available_stem = page.locator('.stem-card:not([data-unavailable="true"])').first
    available_stem.locator(".quantity-control button").nth(1).click()
    page.get_by_role("button", name="Hoàn thành bó hoa").click()
    page.get_by_role("button", name="Thêm bó hoa vào giỏ").click()
    assert page.get_by_role("link", name="Xem giỏ hàng").is_visible()
    page.get_by_role("link", name="Xem giỏ hàng").click()
    page.wait_for_load_state("networkidle")
    wait_for_live_cart(page)
    assert page.locator(".cart-line").count() == 3
    assert page.locator(".cart-line__kind", has_text="Bó hoa tự tạo").is_visible()

    desktop_shot = ARTIFACT_DIR / "cart-1440.png"
    assert page.locator(".skip-link").evaluate("link => link.getBoundingClientRect().bottom <= 0"), "skip link remained visible after route navigation"
    page.screenshot(path=str(desktop_shot), full_page=True)
    assert_no_overflow(page, "desktop")

    page.get_by_role("link", name="Chuyển sang tiếng Hàn").click()
    page.wait_for_load_state("networkidle")
    wait_for_live_cart(page)
    assert "/ko/cart" in page.url
    assert page.get_by_role("heading", name="마음을 전할 꽃이 기다리고 있어요.").is_visible()

    page.set_viewport_size({"width": 768, "height": 1024})
    assert_no_overflow(page, "tablet")
    page.set_viewport_size({"width": 390, "height": 844})
    assert_no_overflow(page, "mobile")
    mobile_shot = ARTIFACT_DIR / "cart-390-ko.png"
    page.screenshot(path=str(mobile_shot), full_page=True)

    while page.locator(".cart-line__remove").count():
        page.locator(".cart-line__remove").first.click()
    assert page.locator(".cart-empty").is_visible()
    assert page.locator(".cart-count").inner_text() == "0"
    empty_shot = ARTIFACT_DIR / "cart-empty-390-ko.png"
    page.screenshot(path=str(empty_shot), full_page=True)

    page.evaluate("url => { history.pushState(null, '', url); window.dispatchEvent(new PopStateEvent('popstate')); }", f"{BASE_URL}/admin/products")
    page.locator(".admin-login").wait_for(state="visible", timeout=20_000)
    assert page.get_by_role("heading", name="Đăng nhập quản trị").is_visible()

    assert not page_errors, f"page errors: {page_errors}"
    assert not console_errors, f"console errors: {console_errors}"
    print("Cart browser QA passed: ready-made, quantity, duplicate merge, distinct variant, builder, persistence, VI/KO, 1440/768/390, empty state, and Admin guard.")
    print(f"Screenshots: {desktop_shot}; {mobile_shot}; {empty_shot}")
    browser.close()
