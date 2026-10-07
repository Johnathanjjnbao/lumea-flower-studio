import os

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get(
    "LUMEA_BASE_URL",
    "http://127.0.0.1:4173/lumea-flower-studio",
).rstrip("/")


def assert_no_overflow(page, label):
    dimensions = page.evaluate(
        """() => ({
          viewport: document.documentElement.clientWidth,
          documentWidth: document.documentElement.scrollWidth,
        })"""
    )
    assert dimensions["documentWidth"] <= dimensions["viewport"], (
        f"{label} overflow: {dimensions}"
    )


with sync_playwright() as playwright:
    launch_options = {"headless": True}
    executable = os.environ.get("LUMEA_BROWSER_EXECUTABLE")
    if executable:
        launch_options["executable_path"] = executable
    browser = playwright.chromium.launch(**launch_options)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page_errors = []
    console_errors = []
    same_origin_failures = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error"
        else None,
    )
    page.on(
        "response",
        lambda response: same_origin_failures.append(
            {"status": response.status, "url": response.url}
        )
        if response.status >= 400 and response.url.startswith(BASE_URL)
        else None,
    )

    routes = [
        ("/", "main#main-content"),
        ("/flowers", ".catalog-page"),
        ("/cart", ".cart-empty"),
        ("/checkout", ".checkout-empty"),
        ("/admin/login", ".admin-login"),
    ]
    for path, selector in routes:
        page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
        page.locator(selector).wait_for(state="visible", timeout=20_000)
        assert_no_overflow(page, path)
        if path == "/checkout":
            assert page.locator(".checkout-empty").is_visible(), (
                "CI smoke must not create or submit an order"
            )

    assert not page_errors, f"page errors: {page_errors}"
    assert not same_origin_failures, f"same-origin failures: {same_origin_failures}"
    assert not console_errors, f"console errors: {console_errors}"
    browser.close()

print("Core-route browser smoke passed: Home, Catalog, Cart, empty Checkout, Admin login, mobile overflow, no order creation.")
