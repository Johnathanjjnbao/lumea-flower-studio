"""Read-only browser checks for the V2.3 storefront routes and navigation."""

import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("LUMEA_BASE_URL", "http://127.0.0.1:5173/lumea-flower-studio").rstrip("/")
SCREENSHOT_DIR = os.environ.get("LUMEA_QA_SCREENSHOT_DIR")
STAGING_HOST = "puzuubnxarmviwgpjclj.supabase.co"
ROUTES = (
    ("home", ""),
    ("about", "/about"),
    ("contact", "/contact"),
    ("same-day", "/same-day"),
    ("catalog", "/flowers"),
    ("policies", "/policies"),
    ("ready-pdp", "/flowers/qa-ready-bouquet"),
    ("cart", "/cart"),
    ("checkout", "/checkout"),
    ("admin-login", "/admin/login"),
)
WIDTHS = tuple(int(width) for width in os.environ.get("LUMEA_QA_WIDTHS", "390,768,1440").split(","))


def check_page(page, label):
    try:
        page.locator("main h1").first.wait_for(state="visible", timeout=15000)
    except Exception as error:
        raise AssertionError(f"{label}: no visible h1; url={page.url}; body={page.locator('body').inner_text()[:300]!r}") from error
    page.wait_for_timeout(500)
    width = page.evaluate("() => ({client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth})")
    assert width["scroll"] <= width["client"], f"{label}: horizontal overflow {width}"
    assert page.locator("main h1").count() == 1, f"{label}: expected one main heading"


def main():
    if SCREENSHOT_DIR:
        Path(SCREENSHOT_DIR).mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=os.environ.get("LUMEA_BROWSER_CHANNEL", "msedge"))
        try:
            checked = 0
            for width in WIDTHS:
                page = browser.new_page(viewport={"width": width, "height": 900}, device_scale_factor=1)
                errors = []
                forbidden = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
                page.on("request", lambda request: forbidden.append(f"{request.method} {request.url}") if STAGING_HOST in request.url and request.method not in ("GET", "HEAD", "OPTIONS") and "/rpc/get_checkout_options" not in request.url else None)
                for locale_prefix, locale in (("", "vi"), ("/ko", "ko")):
                    for name, route in ROUTES:
                        label = f"{locale}/{name}/{width}"
                        print(f"Checking {label}", flush=True)
                        page.goto(f"{BASE_URL}{locale_prefix}{route or '/'}", wait_until="domcontentloaded")
                        check_page(page, label)
                        if name == "ready-pdp":
                            page.wait_for_function("document.querySelector('.product-gallery__main img')?.naturalWidth > 0")
                        assert page.evaluate("document.documentElement.lang") == locale, f"{label}: wrong document language"
                        if SCREENSHOT_DIR and width in (390, 1440) and name in ("home", "about", "contact", "same-day", "catalog", "policies", "ready-pdp"):
                            page.screenshot(path=str(Path(SCREENSHOT_DIR) / f"{locale}-{name}-{width}.png"), full_page=True)
                        checked += 1
                page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
                page.get_by_role("link", name="Tìm kiếm").click()
                page.wait_for_url("**/flowers#catalog-search")
                page.wait_for_function("document.activeElement?.id === 'catalog-search'")
                assert page.evaluate("document.activeElement?.id") == "catalog-search", f"search focus lost at {width}px"
                page.locator("#catalog-search").fill("hoa")
                page.wait_for_function("location.search.includes('q=hoa')")
                page.get_by_role("button", name="Tìm kiếm", exact=True).click()
                try:
                    page.wait_for_function("location.search.includes('q=hoa') && document.activeElement?.id === 'catalog-search'", timeout=5000)
                except Exception as error:
                    raise AssertionError(f"search state at {width}px: url={page.url}, focused={page.evaluate('document.activeElement?.id')!r}") from error
                assert "q=hoa" in page.url and page.evaluate("document.activeElement?.id") == "catalog-search", f"search query lost at {width}px; url={page.url}"
                if width == 390:
                    page.goto(f"{BASE_URL}/flowers/qa-ready-bouquet", wait_until="domcontentloaded")
                    add_button = page.locator(".product-purchase__button")
                    add_button.wait_for(state="visible")
                    assert add_button.is_enabled(), "READY QA product cannot be added"
                    add_button.click()
                    page.wait_for_function("document.querySelector('.cart-count')?.textContent?.trim() === '1'")
                    page.goto(f"{BASE_URL}/cart", wait_until="domcontentloaded")
                    page.locator(".cart-line").first.wait_for(state="visible")
                    page.locator(".cart-summary__checkout").wait_for(state="visible")
                    page.goto(f"{BASE_URL}/ko/cart", wait_until="domcontentloaded")
                    page.locator(".cart-line").first.wait_for(state="visible")
                    assert page.evaluate("document.documentElement.lang") == "ko", "Cart locale switch failed"
                    page.goto(f"{BASE_URL}/ko/checkout", wait_until="domcontentloaded")
                    page.locator("main h1").first.wait_for(state="visible")
                    print("READY PDP → Cart persistence → KO Cart/Checkout preview PASS; no order submitted", flush=True)
                    page.emulate_media(reduced_motion="reduce")
                    page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
                    page.keyboard.press("Tab")
                    assert page.evaluate("document.activeElement?.classList.contains('skip-link')"), "keyboard skip link unavailable"
                    page.get_by_role("link", name="Tìm kiếm").click()
                    page.wait_for_function("document.activeElement?.id === 'catalog-search'")
                    print("Keyboard skip link and reduced-motion search navigation PASS", flush=True)
                assert not forbidden, f"Unexpected staging mutation-capable request: {forbidden[:2]}"
                assert not errors, f"Browser error at {width}px: {errors[:2]}"
                page.close()
            print(f"V2.3 browser routes PASS: {checked} page/locale/viewport checks; search/focus PASS; no staging writes")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
