import os
from datetime import date, timedelta

from playwright.sync_api import expect, sync_playwright


BASE_URL = os.environ.get(
    "LUMEA_BASE_URL",
    "http://127.0.0.1:5173/lumea-flower-studio",
).rstrip("/")
ADMIN_EMAIL = os.environ["LUMEA_QA_ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["LUMEA_QA_ADMIN_PASSWORD"]


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
    same_origin_failures = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on(
        "response",
        lambda response: same_origin_failures.append(
            {"status": response.status, "url": response.url}
        )
        if response.status >= 400 and response.url.startswith(BASE_URL)
        else None,
    )

    for width, height in [(390, 844), (768, 1024), (1440, 1000)]:
        page.set_viewport_size({"width": width, "height": height})
        page.goto(f"{BASE_URL}/flowers", wait_until="domcontentloaded")
        page.locator(".catalog-page").wait_for(state="visible", timeout=20_000)
        expect(page.get_by_text("Bó hoa QA sẵn sàng", exact=True)).to_be_visible()
        expect(page.get_by_text("Bó hoa QA theo mùa", exact=True)).to_be_visible()
        assert_no_overflow(page, f"catalog-{width}")

    page.goto(f"{BASE_URL}/ko/flowers", wait_until="domcontentloaded")
    expect(page.get_by_text("QA 준비 꽃다발", exact=True)).to_be_visible()
    expect(page.get_by_text("QA 시즌 꽃다발", exact=True)).to_be_visible()

    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(f"{BASE_URL}/flowers/qa-ready-bouquet", wait_until="domcontentloaded")
    expect(page.get_by_role("heading", name="Bó hoa QA sẵn sàng", exact=True)).to_be_visible()
    size_options = page.locator('input[name="size"]')
    assert size_options.count() >= 2, "Product detail did not expose multiple SKUs."
    size_options.nth(1).check()
    page.get_by_role("button", name="Thêm vào giỏ", exact=True).click()
    expect(page.locator('[role="status"]').filter(has_text="Thiết kế đã có")).to_be_visible()

    page.goto(f"{BASE_URL}/cart", wait_until="domcontentloaded")
    expect(page.get_by_text("Bó hoa QA sẵn sàng", exact=True)).to_be_visible()
    page.get_by_role("link", name="Tiếp tục điền thông tin", exact=True).click()
    page.locator(".checkout-form").wait_for(state="visible", timeout=20_000)
    page.locator("#buyerName").fill("LUMEA BROWSER QA")
    page.locator("#buyerPhone").fill("0900000000")
    page.locator("#buyer-is-recipient").check()
    page.locator('input[name="fulfillmentType"][value="PICKUP"]').check()
    page.locator("#deliveryDate").fill((date.today() + timedelta(days=1)).isoformat())
    page.locator('input[name="paymentMethod"][value="CASH"]').check()
    page.wait_for_function(
        """() => {
          const input = document.querySelector('[name="cf-turnstile-response"]');
          return Boolean(input && input.value);
        }""",
        timeout=20_000,
    )
    page.get_by_role("button", name="Ghi nhận đơn hàng", exact=True).click()
    expect(page.get_by_role("heading", name="Luméa đã nhận yêu cầu đặt hoa của bạn.", exact=True)).to_be_visible(timeout=20_000)
    assert_no_overflow(page, "checkout-confirmation-mobile")

    page.goto(f"{BASE_URL}/create-bouquet", wait_until="domcontentloaded")
    expect(page.get_by_text("Hoa hồng QA", exact=True)).to_be_visible()
    expect(page.get_by_text("Gói cổ điển QA", exact=True)).to_be_visible()
    assert_no_overflow(page, "builder-mobile")

    page.goto(f"{BASE_URL}/admin/login", wait_until="domcontentloaded")
    page.locator("#admin-login-email").fill(ADMIN_EMAIL)
    page.locator("#admin-login-password").fill(ADMIN_PASSWORD)
    page.locator('button[type="submit"]').click()
    page.wait_for_url(f"{BASE_URL}/admin/products", timeout=20_000)
    expect(page.get_by_role("heading", name="Sản phẩm", exact=True)).to_be_visible()

    for route, heading in [
        ("/admin/categories", "Categories"),
        ("/admin/navigation", "Navigation"),
        ("/admin/orders", "Đơn hàng"),
    ]:
        page.goto(f"{BASE_URL}{route}", wait_until="domcontentloaded")
        expect(page.get_by_role("heading", name=heading, exact=True)).to_be_visible(timeout=20_000)
        assert_no_overflow(page, route)

    page.goto(f"{BASE_URL}/admin/orders", wait_until="domcontentloaded")
    newest_order = page.locator("article").filter(has_text="LUMEA BROWSER QA").first
    expect(newest_order).to_be_visible(timeout=20_000)
    order_link = newest_order.locator('a[href*="/admin/orders/"]')
    order_link.click()
    page.locator(".admin-order-detail").wait_for(state="visible", timeout=20_000)
    assert "QA-READY" in page.locator("body").inner_text(), "Admin Order Detail did not show the ready-made SKU snapshot."

    page.goto(f"{BASE_URL}/admin/products/new", wait_until="domcontentloaded")
    slug = page.locator('input[placeholder="rose-nocturne"]')
    slug.wait_for(state="visible", timeout=20_000)
    slug.fill("qa-browser-product")
    category = page.locator(".admin-editor-section").first.locator("select").nth(1)
    page.wait_for_function("select => select.options.length > 1", arg=category.element_handle())
    category.select_option(index=1)
    page.get_by_label("Tên sản phẩm VI", exact=True).fill("Sản phẩm QA trình duyệt")
    page.get_by_role("tab", name="한국어").click()
    page.get_by_label("Tên sản phẩm KO", exact=True).fill("브라우저 QA 상품")
    page.get_by_role("button", name="+ Thêm biến thể", exact=True).click()
    variant = page.locator(".admin-variant").last
    variant.locator('input[placeholder="standard"]').fill("standard")
    sku = variant.locator('input[placeholder="LUM-ROSE-STANDARD"]')
    sku.fill("bad sku")
    variant.locator('input[type="number"]').first.fill("190000")
    variant.get_by_label("Tên VI", exact=True).fill("Tiêu chuẩn")
    variant.get_by_label("Tên KO", exact=True).fill("스탠다드")
    page.get_by_role("button", name="Lưu bản nháp", exact=True).click()
    expect(page.locator(".admin-alert--error")).to_contain_text("Hãy sửa các trường chưa hợp lệ")
    assert page.url.endswith("/admin/products/new"), "Invalid Product draft created partial state."

    sku.fill("QA-BROWSER-001")
    page.get_by_role("button", name="Lưu bản nháp", exact=True).click()
    expect(page.locator(".admin-alert--success")).to_contain_text("Đã lưu bản nháp", timeout=20_000)
    assert "/admin/products/" in page.url and not page.url.endswith("/new"), "Atomic Product save did not return an editor id."
    variant = page.locator(".admin-variant").last
    assert variant.locator('input[placeholder="LUM-ROSE-STANDARD"]').is_disabled(), "Persisted SKU should be immutable in Admin."
    variant.locator('input[type="number"]').first.fill("195000")
    page.get_by_role("button", name="Lưu bản nháp", exact=True).click()
    expect(page.locator(".admin-alert--success")).to_contain_text("Đã lưu bản nháp", timeout=20_000)
    page.once("dialog", lambda dialog: dialog.accept())
    page.get_by_role("button", name="Lưu trữ sản phẩm", exact=True).click()
    expect(page.locator(".admin-alert--success")).to_contain_text("Đã lưu trữ sản phẩm", timeout=20_000)

    assert not page_errors, f"page errors: {page_errors}"
    assert not same_origin_failures, f"same-origin failures: {same_origin_failures}"
    browser.close()

print("V2.1 staging browser QA passed: VI/KO storefront, responsive catalog, multi-SKU cart, Turnstile checkout, Builder, Admin login/pages, Order SKU snapshot, and atomic Product create/edit/archive.")
