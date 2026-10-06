import json
import os
from datetime import date
from pathlib import Path
from tempfile import gettempdir

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright


BASE_URL = os.environ.get("LUMEA_BASE_URL", "http://127.0.0.1:4173/lumea-flower-studio")
CREATE_REAL_ORDER = os.environ.get("LUMEA_CHECKOUT_CREATE_ORDER") == "1"
ARTIFACT_DIR = Path(gettempdir()) / "lumea-step12-qa"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
QA_AREA_ID = "77777777-7777-4777-8777-777777777777"
QA_WINDOW_ID = "88888888-8888-4888-8888-888888888888"


def checkout_options(route):
    locale = "ko" if '"requested_locale":"ko"' in (route.request.post_data or "") else "vi"
    route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({
            "delivery_enabled": True,
            "pickup_enabled": True,
            "same_day_enabled": True,
            "same_day_cutoff": "23:59:00",
            "delivery_help": "QA delivery configuration",
            "pickup": {"name": "Luméa QA Studio", "address": "QA only", "hours": "09:00–18:00"},
            "zones": [{
                "id": "99999999-9999-4999-8999-999999999999",
                "code": "qa-central",
                "name": "QA 중심" if locale == "ko" else "QA nội thành",
                "help": None,
                "fee_amount": 30000,
                "same_day_eligible": True,
                "areas": [{"id": QA_AREA_ID, "code": "qa-area", "name": "QA 지역" if locale == "ko" else "Khu vực QA"}],
            }],
            "windows": [{
                "id": QA_WINDOW_ID,
                "code": "qa-window",
                "label": "QA 시간" if locale == "ko" else "Khung giờ QA",
                "help": None,
                "start_time": "09:00:00",
                "end_time": "18:00:00",
                "same_day_eligible": True,
            }],
            "payment_methods": {"bank_transfer": True, "cash": True, "cash_delivery": True, "cash_pickup": True},
        }),
    )


def turnstile_script(route):
    route.fulfill(
        status=200,
        content_type="application/javascript",
        body="""
window.__lumeaTurnstileQa = {
  sequence: 0,
  widget: null,
  issue() {
    this.sequence += 1;
    const token = `XXXX.DUMMY.TOKEN.${this.sequence}`;
    setTimeout(() => this.widget?.callback(token), 0);
  },
  expire() { this.widget?.['expired-callback'](); },
};
window.turnstile = {
  render(container, options) {
    window.__lumeaTurnstileQa.widget = options;
    container.dataset.qaTurnstile = 'ready';
    window.__lumeaTurnstileQa.issue();
    return 'qa-turnstile-widget';
  },
  reset() { window.__lumeaTurnstileQa.issue(); },
  remove() { window.__lumeaTurnstileQa.widget = null; },
};
""",
    )


def wait_for_checkout(page):
    page.locator(".checkout-page").wait_for(state="visible", timeout=20_000)
    page.wait_for_function("!document.querySelector('.checkout-cart-status')", timeout=20_000)


def assert_no_overflow(page, label):
    result = page.evaluate("""() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('body *')]
        .map((element) => ({ selector: String(element.className || element.tagName), right: element.getBoundingClientRect().right, width: element.scrollWidth }))
        .filter((item) => item.right > window.innerWidth + 1 || item.width > window.innerWidth + 1)
        .slice(0, 12),
    })""")
    assert result["documentWidth"] <= result["viewport"], f"{label} overflow: {result}"


def add_ready_made(page):
    page.goto(f"{BASE_URL}/flowers", wait_until="networkidle")
    product_links = page.locator(".product-card .product-image")
    product_links.first.wait_for(state="visible", timeout=20_000)
    added = False
    for index in range(product_links.count()):
        product_links.nth(index).click()
        page.wait_for_load_state("networkidle")
        page.locator(".product-detail h1").wait_for(state="visible", timeout=20_000)
        add_button = page.get_by_role("button", name="Thêm vào giỏ")
        if add_button.count() and add_button.is_enabled():
            add_button.click()
            added = True
            break
        page.locator(".product-detail__back").click()
        page.wait_for_load_state("networkidle")
        product_links = page.locator(".product-card .product-image")
    assert added, "live catalog needs one currently available product"


def add_custom_bouquet(page):
    page.goto(f"{BASE_URL}/create-bouquet", wait_until="networkidle")
    available_stem = page.locator('.stem-card:not([data-unavailable="true"])').first
    available_stem.wait_for(state="visible", timeout=20_000)
    available_stem.locator(".quantity-control button").nth(1).click()
    page.get_by_role("button", name="Hoàn thành bó hoa").click()
    page.get_by_role("button", name="Thêm bó hoa vào giỏ").click()
    page.get_by_role("link", name="Xem giỏ hàng").wait_for(state="visible")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    if not CREATE_REAL_ORDER:
        page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", turnstile_script)
        page.route("**/rest/v1/site_profile*", lambda route: route.fulfill(
            status=200, content_type="application/json", body=json.dumps([{
                "business_name": "Luméa Flower Studio", "phone": "", "email": "",
                "instagram_url": "", "instagram_handle": "",
            }]),
        ))
        page.route("**/rest/v1/budget_ranges*", lambda route: route.fulfill(status=200, content_type="application/json", body="[]"))
        page.route("**/rest/v1/rpc/get_checkout_options", checkout_options)
    console_errors = []
    page_errors = []
    page.on("console", lambda message: console_errors.append(f"{message.text} @ {message.location}") if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))

    page.goto(f"{BASE_URL}/", wait_until="networkidle")
    page.evaluate("""() => {
      localStorage.removeItem('lumea.cart.v1');
      localStorage.removeItem('lumea.order-receipt.v1');
      sessionStorage.removeItem('lumea.checkout.attempt.v1');
    }""")
    add_ready_made(page)
    add_custom_bouquet(page)
    assert page.locator(".cart-count").inner_text() == "2"

    page.locator(".cart-button").click()
    page.wait_for_load_state("networkidle")
    page.locator('.cart-line[data-valid="true"]').first.wait_for(state="visible", timeout=20_000)
    page.get_by_role("link", name="Tiếp tục điền thông tin").click()
    page.wait_for_load_state("networkidle")
    wait_for_checkout(page)
    assert page.locator(".checkout-summary-line").count() == 2
    assert page.get_by_text("Bó hoa tự tạo", exact=True).count() >= 1
    assert_no_overflow(page, "checkout desktop")

    page.reload(wait_until="networkidle")
    wait_for_checkout(page)
    assert page.locator(".checkout-summary-line").count() == 2, "Cart did not persist across Checkout refresh"

    # A stale local price must be replaced by the live catalog and explicitly acknowledged.
    page.evaluate("""() => {
      const cart = JSON.parse(localStorage.getItem('lumea.cart.v1'));
      cart.items[0].unitPriceSnapshot = Math.max(0, cart.items[0].unitPriceSnapshot - 1);
      localStorage.setItem('lumea.cart.v1', JSON.stringify(cart));
    }""")
    page.reload(wait_until="networkidle")
    wait_for_checkout(page)
    page.get_by_text("Giá trong giỏ vừa được cập nhật.", exact=True).wait_for(state="visible")
    valid_cart = page.evaluate("localStorage.getItem('lumea.cart.v1')")

    # A missing source item blocks Checkout without deleting the saved Cart.
    page.evaluate("""() => {
      const cart = JSON.parse(localStorage.getItem('lumea.cart.v1'));
      const ready = cart.items.find((item) => item.type === 'READY_MADE_PRODUCT');
      ready.productId = '00000000-0000-4000-8000-000000000001';
      ready.productCode = 'missing-qa-product';
      ready.productSlug = 'missing-qa-product';
      localStorage.setItem('lumea.cart.v1', JSON.stringify(cart));
    }""")
    page.reload(wait_until="networkidle")
    page.locator(".checkout-cart-blocked").wait_for(state="visible", timeout=20_000)
    assert page.get_by_role("link", name="Xem lại giỏ hàng").is_visible()
    page.evaluate("cart => localStorage.setItem('lumea.cart.v1', cart)", valid_cart)
    page.reload(wait_until="networkidle")
    wait_for_checkout(page)

    desktop_shot = ARTIFACT_DIR / "checkout-1440-vi.png"
    page.screenshot(path=str(desktop_shot), full_page=True)

    page.get_by_role("link", name="Chuyển sang tiếng Hàn").click()
    page.wait_for_load_state("networkidle")
    wait_for_checkout(page)
    assert "/ko/checkout" in page.url
    assert page.get_by_role("heading", name="소중한 분께, 원하는 날에 꽃을 전해요.").is_visible()
    page.set_viewport_size({"width": 768, "height": 1024})
    assert_no_overflow(page, "checkout tablet")
    page.set_viewport_size({"width": 390, "height": 844})
    assert_no_overflow(page, "checkout mobile")
    mobile_shot = ARTIFACT_DIR / "checkout-390-ko.png"
    page.screenshot(path=str(mobile_shot), full_page=True)
    assert_no_overflow(page, "checkout Korean mobile")

    page.goto(f"{BASE_URL}/checkout", wait_until="networkidle")
    wait_for_checkout(page)
    page.set_viewport_size({"width": 1440, "height": 1000})

    if not CREATE_REAL_ORDER:
        # A missing/expired challenge is rejected before any checkout request, then reset for retry.
        token_sequence = page.evaluate("window.__lumeaTurnstileQa.sequence")
        page.evaluate("window.__lumeaTurnstileQa.expire()")
        page.get_by_role("button", name="Ghi nhận đơn hàng").click()
        page.get_by_text("Hoàn tất bước xác minh an toàn", exact=False).wait_for(state="visible")
        page.wait_for_function("sequence => window.__lumeaTurnstileQa.sequence > sequence", arg=token_sequence)

    # Submit-time validation exposes inline errors and a focused error summary.
    page.get_by_role("button", name="Ghi nhận đơn hàng").click()
    summary = page.locator(".checkout-error-summary")
    summary.wait_for(state="visible")
    assert summary.evaluate("node => document.activeElement === node")
    assert page.locator('#buyerName[aria-invalid="true"]').count() == 1

    page.locator("#buyerName").fill("LUMEA QA STEP 12 - DO NOT FULFILL")
    page.locator("#buyerPhone").fill("0900000012")
    page.locator("#buyerEmail").fill("qa-step12@example.invalid")
    page.locator("#buyer-is-recipient").check()
    assert page.locator("#recipientName").count() == 0
    assert page.locator("#is-surprise").is_disabled()
    page.locator("#buyer-is-recipient").uncheck()
    page.locator("#recipientName").fill("LUMEA QA RECIPIENT - DO NOT FULFILL")
    page.locator("#recipientPhone").fill("0900000013")
    page.locator("#is-surprise").check()
    page.locator("#deliveryAreaId").select_option(QA_AREA_ID)
    page.locator("#deliveryWindowId").select_option(QA_WINDOW_ID)
    page.locator("#deliveryAddress").fill("QA ONLY - KHÔNG GIAO - 12 Test Street, Ho Chi Minh City")
    page.locator("#deliveryDate").fill(date.today().isoformat())
    page.locator("#deliveryNotes").fill("STEP 12 QA ORDER - DO NOT FULFILL OR CONTACT")
    page.locator("#cardMessage").fill("STEP 12 QA")
    if page.locator("#price-reviewed").count():
        page.locator("#price-reviewed").check()

    if not CREATE_REAL_ORDER:
        # Simulated network failure must leave Cart and entered fields intact.
        first_token_sequence = page.evaluate("window.__lumeaTurnstileQa.sequence")
        page.route("**/functions/v1/create-checkout-order", lambda route: route.abort("failed"))
        page.get_by_role("button", name="Ghi nhận đơn hàng").click()
        page.get_by_text("Chưa thể kết nối để ghi nhận đơn.", exact=False).wait_for(state="visible", timeout=20_000)
        assert page.locator(".cart-count").inner_text() == "2"
        assert page.locator("#buyerName").input_value().startswith("LUMEA QA")
        page.wait_for_function("sequence => window.__lumeaTurnstileQa.sequence > sequence", arg=first_token_sequence)
        page.unroute("**/functions/v1/create-checkout-order")
        console_errors[:] = [message for message in console_errors if "net::ERR_FAILED" not in message]

    created_order_number = None
    if CREATE_REAL_ORDER:
        rpc_requests = []
        rpc_responses = []
        page.on("request", lambda request: rpc_requests.append(request.url) if "/functions/v1/create-checkout-order" in request.url else None)
        page.on("response", lambda response: rpc_responses.append({
            "status": response.status,
            "body": response.text()[:1_000],
        }) if "/functions/v1/create-checkout-order" in response.url else None)
        submit_button = page.get_by_role("button", name="Ghi nhận đơn hàng")
        submit_button.evaluate("button => { button.click(); button.click(); }")
        try:
            page.locator(".confirmation-page").wait_for(state="visible", timeout=30_000)
        except PlaywrightTimeoutError as error:
            customer_error = page.locator(".checkout-server-error").inner_text() if page.locator(".checkout-server-error").count() else "none"
            raise AssertionError(f"Order creation did not reach Confirmation; customer_error={customer_error}; rpc_requests={rpc_requests}; rpc_responses={rpc_responses}") from error
        assert page.locator(".cart-count").inner_text() == "0"
        created_order_number = page.locator(".confirmation-reference strong").inner_text()
        assert created_order_number.startswith("LUM-")
        assert len(rpc_requests) == 1, f"double submit produced {len(rpc_requests)} RPC requests"
        assert "qa-step12" not in page.url.lower() and "090000" not in page.url
        receipt_before_refresh = created_order_number
        page.reload(wait_until="networkidle")
        assert page.locator(".confirmation-reference strong").inner_text() == receipt_before_refresh
        page.get_by_role("link", name="Chuyển sang tiếng Hàn").click()
        page.wait_for_load_state("networkidle")
        assert page.get_by_role("heading", name="Luméa가 꽃 주문 요청을 받았습니다.").is_visible()
        assert page.locator(".confirmation-reference strong").inner_text() == receipt_before_refresh
        page.goto(f"{BASE_URL}/checkout", wait_until="networkidle")
        assert page.locator(".checkout-empty").is_visible()
    else:
        page.evaluate("""receipt => localStorage.setItem('lumea.order-receipt.v1', JSON.stringify({ savedAt: Date.now(), receipt }))""", {
            "version": 2,
            "orderId": "66666666-6666-4666-8666-666666666666",
            "orderNumber": "LUM-0123456789ABCDEF",
            "subtotalAmount": 120_045_000,
            "deliveryFeeAmount": 30000,
            "totalAmount": 120075000,
            "orderStatus": "PENDING",
            "paymentStatus": "UNPAID",
            "paymentMethod": "BANK_TRANSFER",
            "fulfillmentType": "DELIVERY",
            "fulfillmentName": "QA nội thành",
            "deliveryAreaName": "Khu vực QA",
            "deliveryWindowLabel": "Khung giờ QA",
            "paymentReference": "LUMEA LUM0123456789ABCDEF",
            "bankId": "970436",
            "bankName": "Vietcombank",
            "accountNumber": "123456789",
            "accountHolder": "LUMEA FLOWER STUDIO",
            "vietqrTemplate": "compact2",
            "paymentInstruction": "QA only — không chuyển khoản.",
            "paymentDeadlineAt": "2026-10-05T12:00:00.000Z",
            "placedAt": "2026-10-04T00:00:00.000Z",
            "locale": "vi",
        })
        page.goto(f"{BASE_URL}/order-confirmation", wait_until="networkidle")
        page.locator(".confirmation-page").wait_for(state="visible")
        assert_no_overflow(page, "confirmation desktop")
        confirmation_shot = ARTIFACT_DIR / "confirmation-1440-vi.png"
        page.screenshot(path=str(confirmation_shot), full_page=True)

    assert not page_errors, f"page errors: {page_errors}"
    assert not console_errors, f"console errors: {console_errors}"
    print("Checkout browser QA passed: mixed Cart, refresh, stale price acknowledgement, unavailable source, validation focus, buyer=self/other, network retention, VI/KO, and 1440/768/390.")
    if created_order_number:
        print(f"Controlled QA order: {created_order_number}")
    else:
        print("Order creation skipped (set LUMEA_CHECKOUT_CREATE_ORDER=1 after migration verification).")
        print(f"Confirmation screenshot: {confirmation_shot}")
    print(f"Screenshots: {desktop_shot}; {mobile_shot}")
    browser.close()
