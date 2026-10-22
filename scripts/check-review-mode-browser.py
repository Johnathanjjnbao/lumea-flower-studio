"""Browser acceptance for the isolated local or hosted Luméa Review Mode."""

import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE = os.environ.get("LUMEA_REVIEW_URL", "http://127.0.0.1:4174/lumea-flower-studio").rstrip("/")
SHOTS = os.environ.get("LUMEA_REVIEW_SCREENSHOTS")
ROUTES = ("", "/flowers", "/flowers/pink-garden", "/flowers/morning-peony", "/cart", "/checkout", "/order-confirmation", "/about", "/contact", "/same-day", "/policies", "/create-bouquet", "/admin/login")
WIDTHS = tuple(int(value) for value in os.environ.get("LUMEA_REVIEW_WIDTHS", "320,390,768,1440").split(",") if value)
HOME_IDS = ("top", "occasions", "best-sellers", "budget", "same-day", "florist-choice", "custom", "why-lumea", "gallery", "visit")


def inspect(page, label):
    page.locator("main h1").first.wait_for(state="visible", timeout=15000)
    assert page.locator("main h1").count() == 1, f"{label}: incorrect h1 count"
    assert page.locator('[data-review-mode="true"]').count() == 1, f"{label}: review disclaimer missing"
    width = page.evaluate("() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]")
    assert width[1] <= width[0], f"{label}: overflow {width}"


def capture(page, path):
    # Progressive media loads near the viewport. Visit each section before a
    # full-page capture so the handoff never mistakes loading placeholders for
    # the finished visual design.
    height = page.evaluate("document.documentElement.scrollHeight")
    for y in range(0, height, 650):
        page.evaluate("y => window.scrollTo(0, y)", y)
        page.wait_for_timeout(85)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(500)
    page.screenshot(path=str(path), full_page=True)


def main():
    if SHOTS:
        Path(SHOTS).mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=os.environ.get("LUMEA_BROWSER_CHANNEL", "msedge"))
        try:
            checked = 0
            errors = []
            backend = []
            mutations = []
            broken = []
            for width in WIDTHS:
                context = browser.new_context(viewport={"width": width, "height": 900}, device_scale_factor=1, reduced_motion="reduce")
                page = context.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
                page.on("request", lambda request: backend.append(f"{request.method} {request.url}") if "supabase.co" in request.url or "create-checkout-order" in request.url else None)
                page.on("request", lambda request: mutations.append(f"{request.method} {request.url}") if request.method not in ("GET", "HEAD", "OPTIONS") else None)
                page.on("response", lambda response: broken.append(f"{response.status} {response.url}") if response.status >= 400 and response.request.resource_type == "image" else None)
                for prefix, locale in (("", "vi"), ("/ko", "ko")):
                    for route in ROUTES:
                        label = f"{locale}{route or '/'}@{width}"
                        response = page.goto(f"{BASE}{prefix}{route or '/'}", wait_until="domcontentloaded")
                        assert response and response.status < 400, f"{label}: direct link returned {response.status if response else 'no response'}"
                        inspect(page, label)
                        assert page.evaluate("document.documentElement.lang") == locale, f"{label}: wrong language"
                        if route == "":
                            for section_id in HOME_IDS:
                                assert page.locator(f"main #{section_id}").count() == 1, f"{label}: missing {section_id}"
                                assert page.locator(f"main #{section_id} a[href]").count() > 0, f"{label}: no section action in {section_id}"
                            assert page.locator("#best-sellers .product-card").count() >= 6, f"{label}: less than six curated products"
                            page.wait_for_function("document.querySelector('.hero-image--main img')?.naturalWidth > 0")
                        if route == "/flowers":
                            assert page.locator(".product-card").count() >= 6, f"{label}: catalog too small"
                        if route == "/flowers/morning-peony":
                            assert page.locator(".product-purchase__button").is_disabled(), f"{label}: seasonal product purchasable"
                        if route == "/flowers/pink-garden":
                            page.wait_for_function("document.querySelector('.product-gallery__main img')?.naturalWidth > 0")
                        if route == "/admin/login":
                            assert "REVIEW MODE" in page.locator("main").inner_text(), f"{label}: real Admin loaded"
                        if route == "/order-confirmation":
                            assert page.locator(".confirmation-missing").count() == 1, f"{label}: live order receipt exposed"
                        if SHOTS and (locale, route, width) in {
                            ("vi", "", 1440), ("vi", "", 390), ("ko", "", 1440),
                            ("vi", "/flowers", 1440), ("vi", "/flowers/pink-garden", 1440),
                            ("vi", "/about", 1440), ("vi", "/contact", 1440),
                            ("vi", "/policies", 1440), ("vi", "/admin/login", 1440),
                        }:
                            capture(page, Path(SHOTS) / f"review-{locale}-{route.strip('/').replace('/', '-') or 'home'}-{width}.png")
                        checked += 1
                context.close()

            context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
            page = context.new_page()
            page.on("request", lambda request: backend.append(f"{request.method} {request.url}") if any(marker in request.url for marker in ("supabase.co", "create-checkout-order", "/functions/v1/", "/payment/")) else None)
            page.on("request", lambda request: mutations.append(f"{request.method} {request.url}") if request.method not in ("GET", "HEAD", "OPTIONS") else None)
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(f"{BASE}/flowers/pink-garden")
            page.locator(".product-purchase__button").click()
            page.goto(f"{BASE}/cart")
            page.locator(".cart-line[data-valid='true']").wait_for(state="visible")
            page.locator(".cart-quantity button").last.click()
            assert page.locator(".cart-quantity input").input_value() == "2", "cart quantity did not update"
            page.locator(".cart-line__remove").click()
            page.locator(".cart-empty").wait_for(state="visible")
            page.goto(f"{BASE}/flowers/pink-garden")
            page.locator(".product-purchase__button").click()
            page.goto(f"{BASE}/cart")
            page.locator(".cart-line[data-valid='true']").wait_for(state="visible")
            page.goto(f"{BASE}/ko/cart")
            page.locator(".cart-line[data-valid='true']").wait_for(state="visible")
            page.goto(f"{BASE}/ko/checkout")
            page.locator(".checkout-form").wait_for(state="visible")
            if SHOTS:
                capture(page, Path(SHOTS) / "review-ko-checkout-390.png")
            assert page.locator('#buyerName, #buyerPhone, #buyerEmail, #recipientName, #recipientPhone, #deliveryAddress').count() == 0, "review checkout accepts personal data"
            assert page.locator('[autocomplete="name"], [autocomplete="tel"], [autocomplete="email"], [autocomplete^="shipping"]').count() == 0, "review checkout enables personal autofill"
            page.locator('input[name="reviewFulfillment"][value="PICKUP"]').check()
            assert page.locator('input[name="reviewFulfillment"][value="PICKUP"]').is_checked()
            page.get_by_role("button", name="데모 종료 화면 보기").click()
            page.locator(".review-complete").wait_for(state="visible")
            assert page.locator(".review-complete").count() == 1
            assert page.evaluate("Object.keys(localStorage).every(key => key === 'lumea.review.cart.v1')"), "demo created an unexpected stored value"
            assert page.evaluate("sessionStorage.length") == 0, "demo wrote session storage"
            if SHOTS:
                capture(page, Path(SHOTS) / "review-ko-demo-complete-390.png")
            context.close()
            context = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
            page = context.new_page()
            page.on("request", lambda request: backend.append(f"{request.method} {request.url}") if "supabase.co" in request.url else None)
            page.goto(f"{BASE}/")
            page.get_by_role("link", name="Tìm kiếm").click()
            page.wait_for_url("**/flowers#catalog-search")
            page.wait_for_function("document.activeElement?.id === 'catalog-search'")
            assert page.evaluate("document.activeElement?.id") == "catalog-search", "search did not receive focus"
            page.locator("#catalog-search").fill("Pink Garden")
            page.wait_for_function("location.search.includes('q=Pink')")
            page.locator(".product-card").first.wait_for(state="visible")
            assert page.locator(".product-card").count() == 1, "search did not filter catalog"
            page.locator(".language-switch--desktop a").last.click()
            page.wait_for_url("**/ko/flowers?*")
            page.wait_for_function("document.documentElement.lang === 'ko'")
            assert "q=Pink" in page.url and page.evaluate("document.documentElement.lang") == "ko", f"search context not preserved across locale switch: {page.url} / {page.evaluate('document.documentElement.lang')}"
            for route in ("", "/flowers/pink-garden", "/policies"):
                page.goto(f"{BASE}{route or '/'}")
                page.locator(".language-switch--desktop a").last.click()
                page.wait_for_function("(route) => location.pathname.replace(/\\/$/, '').endsWith('/ko' + route)", arg=route)
                page.wait_for_function("document.documentElement.lang === 'ko'")
                assert page.evaluate("document.documentElement.lang") == "ko", f"language switch failed at {route}"
            page.evaluate("""() => localStorage.setItem('lumea.order-receipt.v1', JSON.stringify({
                savedAt: Date.now(), receipt: {
                    version: 1, orderId: '123e4567-e89b-42d3-a456-426614174000',
                    orderNumber: 'LUM-0123456789ABCDEF', subtotalAmount: 590000,
                    deliveryFeeAmount: null, totalAmount: null, orderStatus: 'PENDING',
                    paymentStatus: 'UNPAID', paymentMethod: 'CASH',
                    placedAt: new Date().toISOString(), locale: 'vi'
                }
            }))""")
            page.goto(f"{BASE}/order-confirmation")
            assert page.locator(".confirmation-missing").count() == 1, "stored live receipt leaked into review"
            page.goto(f"{BASE}/flowers/pink-garden")
            page.reload()
            page.locator(".product-detail__heading h1").wait_for(state="visible")
            page.goto(f"{BASE}/cart")
            page.reload()
            page.locator("main h1").wait_for(state="visible")
            page.goto(f"{BASE}/policies")
            page.reload()
            page.locator("main h1").wait_for(state="visible")
            page.go_back()
            assert "/cart" in page.url, "browser back did not restore Cart"
            page.go_forward()
            assert "/policies" in page.url, "browser forward did not restore Policies"
            page.goto(f"{BASE}/not-a-demo-page")
            page.locator("main h1").wait_for(state="visible")
            assert "Không tìm thấy" in page.locator("main h1").inner_text(), "unknown route did not show review 404"
            context.close()
            context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
            page = context.new_page()
            page.goto(f"{BASE}/")
            page.keyboard.press("Tab")
            assert page.evaluate("document.activeElement?.classList.contains('skip-link')"), "keyboard skip link unavailable"
            page.locator(".menu-toggle").click()
            assert page.locator(".menu-toggle").get_attribute("aria-expanded") == "true", "mobile menu did not open"
            page.keyboard.press("Escape")
            assert page.locator(".menu-toggle").get_attribute("aria-expanded") == "false", "mobile menu did not close"
            context.close()
            context = browser.new_context(viewport={"width": 320, "height": 640}, reduced_motion="reduce")
            page = context.new_page()
            page.goto(f"{BASE}/")
            page.locator(".menu-toggle").click()
            menu_bottom = page.locator(".mobile-menu").evaluate("element => element.getBoundingClientRect().bottom")
            assert menu_bottom <= 641, f"short-viewport menu extends past screen: {menu_bottom}"
            page.locator(".mobile-menu").evaluate("element => { element.scrollTop = element.scrollHeight; }")
            last_link_bottom = page.locator(".mobile-menu__chapters a").last.evaluate("element => element.getBoundingClientRect().bottom")
            assert last_link_bottom <= 640, f"last mobile navigation link is unreachable: {last_link_bottom}"
            context.close()
            assert not backend, f"Review Mode contacted Supabase/Order backend: {backend[:3]}"
            assert not mutations, f"Review Mode sent mutation-capable requests: {mutations[:3]}"
            assert not errors, f"Browser JS errors: {errors[:3]}"
            assert not broken, f"Broken images: {broken[:5]}"
            print(f"Review Mode PASS: {checked} route/locale/viewport checks; cart and KO checkout simulation; no backend requests; no image failures")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
