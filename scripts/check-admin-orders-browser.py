import base64
import json
import os
import time
from pathlib import Path
from tempfile import gettempdir

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("LUMEA_BASE_URL", "http://127.0.0.1:4173/lumea-flower-studio")
ARTIFACT_DIR = Path(gettempdir()) / "lumea-admin-orders-qa"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def b64url(value):
    return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).decode().rstrip("=")


def fake_access_token():
    now = int(time.time())
    return f'{b64url({"alg": "HS256", "typ": "JWT"})}.{b64url({"aud": "authenticated", "exp": now + 3600, "iat": now, "sub": "11111111-1111-4111-8111-111111111111", "email": "admin.qa@example.test", "role": "authenticated"})}.test-signature'


def assert_no_overflow(page, label):
    dimensions = page.evaluate("() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })")
    assert dimensions["scroll"] <= dimensions["width"], f"{label} overflow: {dimensions}"


USER = {
    "id": "11111111-1111-4111-8111-111111111111", "aud": "authenticated", "role": "authenticated",
    "email": "admin.qa@example.test", "email_confirmed_at": "2026-10-05T00:00:00Z", "phone": "",
    "confirmed_at": "2026-10-05T00:00:00Z", "last_sign_in_at": "2026-10-05T00:00:00Z",
    "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {}, "identities": [],
    "created_at": "2026-10-05T00:00:00Z", "updated_at": "2026-10-05T00:00:00Z", "is_anonymous": False,
}
PROFILE = {"id": "33333333-3333-4333-8333-333333333333", "auth_user_id": USER["id"], "display_name": "Luméa QA", "role": "ADMIN", "active": True}
ORDER_ID = "24a77a42-8599-498d-a876-05c9264c92af"
OTHER_ID = "44444444-4444-4444-8444-444444444444"
PAGE_ONE_SECOND_ID = "22222222-2222-4222-8222-222222222222"
PAGE_TWO_ID = "77777777-7777-4777-8777-777777777777"


def install_mocks(page, state):
    token = fake_access_token()

    page.route("**/auth/v1/user", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(USER)))
    page.route("**/auth/v1/logout**", lambda route: route.fulfill(status=204, body=""))

    def token_exchange(route, request):
        route.fulfill(status=200, content_type="application/json", body=json.dumps({
            "access_token": token, "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600,
            "refresh_token": "orders-qa-refresh", "user": USER,
        }))

    page.route("**/auth/v1/token**", token_exchange)

    def list_row(order_id=ORDER_ID, order_number="LUM-26935E75CB064623", buyer_name="Nguyễn An", total_count=21):
        return {
            "order_id": order_id, "order_number": order_number, "placed_at": "2026-10-04T05:22:00Z",
            "order_status": state["status"], "buyer_name": buyer_name, "buyer_phone": "0909 111 222",
            "recipient_name": "Trần Bình", "recipient_phone": "0909 333 444", "requested_date": "2026-10-08",
            "subtotal_amount": 120045000, "payment_method": "BANK_TRANSFER", "payment_status": "UNPAID",
            "item_count": 2, "item_summary": "Pink Garden × 1 · Bó hoa của bạn × 1", "total_count": total_count,
        }

    order = {
        "id": ORDER_ID, "order_number": "LUM-26935E75CB064623", "locale": "vi", "status": "PENDING", "fulfillment_type": "DELIVERY",
        "buyer_name": "Nguyễn An", "buyer_phone": "0909 111 222", "buyer_email": "an@example.test", "buyer_is_recipient": False,
        "is_surprise": True, "card_message": "Chúc mừng sinh nhật", "currency": "VND", "subtotal_amount": 120045000,
        "delivery_fee_amount": None, "total_amount": None, "idempotency_key_hash": "a" * 32, "request_fingerprint": "b" * 32,
        "placed_at": "2026-10-04T05:22:00Z", "created_at": "2026-10-04T05:22:00Z", "updated_at": "2026-10-04T05:22:00Z",
    }
    ready = {
        "id": "55555555-5555-4555-8555-555555555555", "order_id": ORDER_ID, "item_type": "READY_MADE_PRODUCT", "quantity": 1,
        "unit_price_snapshot": 120000000, "line_total": 120000000, "source_product_id": "66666666-6666-4666-8666-666666666666",
        "source_variant_id": "77777777-7777-4777-8777-777777777777", "source_tone_id": None, "source_wrapping_option_id": None,
        "source_wrapping_variant_id": None, "product_code_snapshot": "pink-garden", "product_slug_snapshot": "pink-garden",
        "product_name_snapshot": "Pink Garden", "variant_code_snapshot": "standard", "variant_name_snapshot": "Standard",
        "tone_code_snapshot": "pink", "tone_name_snapshot": "Hồng", "primary_media_path_snapshot": None,
        "configuration_summary_snapshot": None, "created_at": "2026-10-04T05:22:01Z",
    }
    custom = {
        "id": "88888888-8888-4888-8888-888888888888", "order_id": ORDER_ID, "item_type": "CUSTOM_BOUQUET", "quantity": 1,
        "unit_price_snapshot": 45000, "line_total": 45000, "source_product_id": None, "source_variant_id": None, "source_tone_id": None,
        "source_wrapping_option_id": "99999999-9999-4999-8999-999999999999", "source_wrapping_variant_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "product_code_snapshot": None, "product_slug_snapshot": None, "product_name_snapshot": "Bó hoa của bạn", "variant_code_snapshot": None,
        "variant_name_snapshot": None, "tone_code_snapshot": None, "tone_name_snapshot": None, "primary_media_path_snapshot": None,
        "configuration_summary_snapshot": {"flowers": [{"flower_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "flower_code": "garden-rose", "name": "Hồng garden", "quantity": 1, "unit_price": 45000, "line_total": 45000}], "total_stems": 1, "wrapping": {"type_id": "99999999-9999-4999-8999-999999999999", "type_code": "classic-paper", "type_name": "Giấy cổ điển", "variant_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "variant_code": "ivory", "variant_name": "Ivory", "swatch": "#EEE8DE", "price": 0}},
        "created_at": "2026-10-04T05:22:02Z",
    }

    def rest(route, request):
        url = request.url
        if "/admin_profiles" in url:
            body = PROFILE if "auth_user_id=eq" in url else [{"id": PROFILE["id"], "display_name": PROFILE["display_name"]}]
            route.fulfill(status=200, content_type="application/json", body=json.dumps(body)); return
        if "/rpc/admin_list_orders" in url:
            payload = request.post_data_json or {}
            state["list_payloads"].append(payload)
            query = payload.get("search_query")
            if query == "fail" and state["list_failures_remaining"] > 0:
                state["list_failures_remaining"] -= 1
                route.fulfill(status=500, content_type="application/json", body=json.dumps({"code": "XX000", "message": "QA_LIST_FAILURE"})); return
            if query == "none" or payload.get("delivery_date_from") == "2030-01-01":
                rows = []
            elif payload.get("page_offset", 0) >= 20:
                rows = [list_row(PAGE_TWO_ID, "LUM-PAGE2-000000000001", "Page Two Buyer")]
            elif query:
                rows = [list_row(total_count=1)]
            else:
                rows = [list_row(), list_row(PAGE_ONE_SECOND_ID, "LUM-PAGE1-000000000002", "Second Buyer")]
            route.fulfill(status=200, content_type="application/json", body=json.dumps(rows)); return
        if "/rpc/admin_transition_order_status" in url:
            payload = request.post_data_json or {}
            state["transitions"].append(payload)
            if state["conflict_once"]:
                state["conflict_once"] = False
                state["status"] = "PREPARING"
                route.fulfill(status=409, content_type="application/json", body=json.dumps({"code": "40001", "message": "ORDER_STATUS_CONFLICT"})); return
            state["status"] = payload["next_status"]
            state["events"].append({"id": f'event-{len(state["events"])}', "order_id": ORDER_ID, "from_status": payload["expected_status"], "to_status": payload["next_status"], "actor_admin_id": PROFILE["id"], "reason": None, "created_at": "2026-10-05T01:00:00Z"})
            route.fulfill(status=200, content_type="application/json", body=json.dumps([{"order_id": ORDER_ID, "order_number": order["order_number"], "previous_status": payload["expected_status"], "order_status": payload["next_status"], "changed_at": "2026-10-05T01:00:00Z", "event_id": "event-new"}])); return
        if "/orders" in url:
            if OTHER_ID in url:
                route.fulfill(status=200, content_type="application/json", body="null"); return
            route.fulfill(status=200, content_type="application/json", body=json.dumps({**order, "status": state["status"]})); return
        table_data = {
            "/order_items": [ready, custom],
            "/order_recipients": {"id": "r1", "order_id": ORDER_ID, "name": "Trần Bình", "phone": "0909 333 444", "created_at": "2026-10-04T05:22:00Z"},
            "/order_addresses": {"id": "a1", "order_id": ORDER_ID, "address_text": "12 Nguyễn Huệ, Quận 1, TP.HCM", "created_at": "2026-10-04T05:22:00Z"},
            "/deliveries": {"id": "d1", "order_id": ORDER_ID, "status": "PENDING", "requested_date": "2026-10-08", "requested_window": None, "delivery_notes": "Gọi trước", "created_at": "2026-10-04T05:22:00Z", "updated_at": "2026-10-04T05:22:00Z"},
            "/payments": {"id": "p1", "order_id": ORDER_ID, "method": "BANK_TRANSFER", "status": "UNPAID", "amount": None, "currency": "VND", "created_at": "2026-10-04T05:22:00Z", "updated_at": "2026-10-04T05:22:00Z"},
            "/order_status_events": state["events"],
        }
        for marker, body in table_data.items():
            if marker in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps(body)); return
        route.fulfill(status=200, content_type="application/json", body="[]")

    page.route("**/rest/v1/**", rest)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("LUMEA_BROWSER_EXECUTABLE", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"))
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = context.new_page()
    page_errors, console_errors = [], []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" and "409" not in message.text and "500" not in message.text else None)
    state = {"status": "PENDING", "list_payloads": [], "list_failures_remaining": 1, "transitions": [], "conflict_once": False, "events": [{"id": "event-0", "order_id": ORDER_ID, "from_status": None, "to_status": "PENDING", "actor_admin_id": None, "reason": "ORDER_PLACED", "created_at": "2026-10-04T05:22:00Z"}]}
    install_mocks(page, state)

    page.goto(f"{BASE_URL}/admin/login", wait_until="networkidle")
    page.locator("#admin-login-email").fill("admin.qa@example.test")
    page.locator("#admin-login-password").fill("orders-password-qa")
    page.get_by_role("button", name="Đăng nhập").click()
    page.locator(".admin-app").wait_for(state="visible")
    page.get_by_role("link", name="Đơn hàng").click()
    page.get_by_role("heading", name="Đơn hàng", exact=True).wait_for(state="visible")
    assert page.get_by_text("LUM-26935E75CB064623").first.is_visible()
    assert page.get_by_role("columnheader", name="Mở đơn", exact=True).is_visible()
    assert page.get_by_text("Mở đơn {code}").count() == 0
    primary_open = page.get_by_role("link", name="Mở đơn LUM-26935E75CB064623").first
    secondary_open = page.get_by_role("link", name="Mở đơn LUM-PAGE1-000000000002").first
    assert primary_open.is_visible() and secondary_open.is_visible()
    primary_open.focus()
    assert page.evaluate("() => document.activeElement?.getAttribute('aria-label')") == "Mở đơn LUM-26935E75CB064623"
    assert_no_overflow(page, "orders list desktop")
    page.screenshot(path=ARTIFACT_DIR / "orders-list-1440-vi.png", full_page=True)

    page.get_by_label("Tìm đơn").fill("none")
    page.get_by_role("button", name="Áp dụng").click()
    page.get_by_role("heading", name="Không tìm thấy đơn phù hợp.").wait_for(state="visible")
    page.get_by_role("button", name="Xóa bộ lọc").first.click()
    page.get_by_text("LUM-26935E75CB064623").first.wait_for(state="visible")
    page.get_by_label("Tìm đơn").fill("fail")
    page.get_by_role("button", name="Áp dụng").click()
    page.get_by_role("alert").wait_for(state="visible")
    page.get_by_role("button", name="Thử lại").click()
    page.get_by_text("LUM-26935E75CB064623").first.wait_for(state="visible")
    assert state["list_failures_remaining"] == 0
    page.get_by_role("button", name="Xóa bộ lọc").first.click()
    page.get_by_text("LUM-26935E75CB064623").first.wait_for(state="visible")

    page.get_by_label("Trạng thái đơn").select_option("PENDING")
    page.get_by_label("Thanh toán").select_option("UNPAID")
    page.get_by_label("Giao từ ngày").fill("2026-10-08")
    page.get_by_label("Đến ngày").fill("2026-10-09")
    page.get_by_role("button", name="Áp dụng").click()
    page.get_by_text("LUM-26935E75CB064623").first.wait_for(state="visible")
    assert state["list_payloads"][-1]["status_filter"] == "PENDING"
    assert state["list_payloads"][-1]["payment_status_filter"] == "UNPAID"
    assert state["list_payloads"][-1]["delivery_date_from"] == "2026-10-08"
    assert state["list_payloads"][-1]["delivery_date_to"] == "2026-10-09"
    assert page.get_by_label("Giao từ ngày").input_value() == "2026-10-08"
    assert page.get_by_label("Đến ngày").input_value() == "2026-10-09"
    page.get_by_role("button", name="Xóa bộ lọc").first.click()
    page.get_by_text("LUM-26935E75CB064623").first.wait_for(state="visible")
    assert page.get_by_label("Giao từ ngày").input_value() == ""
    assert page.get_by_label("Đến ngày").input_value() == ""

    page.get_by_label("Giao từ ngày").fill("2030-01-01")
    page.get_by_label("Đến ngày").fill("2030-01-01")
    page.get_by_role("button", name="Áp dụng").click()
    page.get_by_role("heading", name="Không tìm thấy đơn phù hợp.").wait_for(state="visible")
    assert state["list_payloads"][-1]["delivery_date_from"] == "2030-01-01"
    assert state["list_payloads"][-1]["delivery_date_to"] == "2030-01-01"
    page.get_by_role("button", name="Xóa bộ lọc").first.click()
    page.get_by_text("LUM-26935E75CB064623").first.wait_for(state="visible")

    page.get_by_role("button", name="Trang sau").click()
    page.get_by_text("Trang 2 / 2", exact=True).wait_for(state="visible")
    assert state["list_payloads"][-1]["page_offset"] == 20
    page.get_by_text("LUM-PAGE2-000000000001").first.wait_for(state="visible")
    assert page.get_by_text("LUM-26935E75CB064623").count() == 0
    page.get_by_role("button", name="Trang trước").click()
    page.get_by_text("Trang 1 / 2", exact=True).wait_for(state="visible")
    page.get_by_text("LUM-26935E75CB064623").first.wait_for(state="visible")
    assert page.get_by_text("LUM-PAGE2-000000000001").count() == 0
    page.get_by_role("button", name="Trang sau").click()
    page.get_by_text("Trang 2 / 2", exact=True).wait_for(state="visible")
    page.get_by_text("LUM-PAGE2-000000000001").first.wait_for(state="visible")
    page.get_by_label("Tìm đơn").fill("LUM-26935E75CB064623")
    page.get_by_role("button", name="Áp dụng").click()
    page.get_by_text("Trang 1 / 1", exact=True).wait_for(state="visible")
    page.get_by_text("LUM-26935E75CB064623").first.wait_for(state="visible")
    assert state["list_payloads"][-1]["page_offset"] == 0

    page.get_by_role("link", name="Mở đơn LUM-26935E75CB064623").first.click()
    page.get_by_role("heading", name="LUM-26935E75CB064623").wait_for(state="visible")
    assert page.get_by_text("Pink Garden", exact=True).is_visible()
    assert page.get_by_text("Bó hoa của bạn", exact=True).is_visible()
    assert page.get_by_text("120.045.000đ").is_visible()
    assert page.get_by_text("Chưa xác định").is_visible()
    assert page.get_by_role("heading", name="Lịch sử trạng thái").is_visible()

    page.get_by_role("button", name="Xác nhận đơn").click()
    assert page.get_by_role("alertdialog").is_visible()
    page.get_by_role("button", name="Xác nhận thay đổi").click()
    page.get_by_role("status").wait_for(state="visible")
    assert state["transitions"][0]["expected_status"] == "PENDING"
    assert state["transitions"][0]["next_status"] == "CONFIRMED"
    page.get_by_text("Đã xác nhận", exact=True).first.wait_for(state="visible")

    state["conflict_once"] = True
    page.get_by_role("button", name="Bắt đầu chuẩn bị").click()
    page.get_by_role("button", name="Xác nhận thay đổi").click()
    page.get_by_role("alert").wait_for(state="visible")
    assert "một phiên khác" in page.get_by_role("alert").inner_text()
    page.get_by_text("Đang chuẩn bị", exact=True).first.wait_for(state="visible")

    page.set_viewport_size({"width": 390, "height": 844})
    assert_no_overflow(page, "order detail mobile")
    page.screenshot(path=ARTIFACT_DIR / "order-detail-390-vi.png", full_page=True)
    page.goto(f"{BASE_URL}/admin/orders", wait_until="networkidle")
    assert page.locator(".admin-order-card").first.is_visible()
    assert_no_overflow(page, "orders list mobile")
    page.set_viewport_size({"width": 768, "height": 1024})
    assert page.locator(".admin-order-card").first.is_visible()
    assert_no_overflow(page, "orders list tablet")

    page.set_viewport_size({"width": 1440, "height": 1000})
    page.goto(f"{BASE_URL}/ko/admin/orders", wait_until="networkidle")
    page.get_by_role("heading", name="주문 관리").wait_for(state="visible")
    assert page.get_by_role("link", name="Luméa Admin — 홈").is_visible()
    assert page.get_by_role("navigation", name="관리자 메뉴").is_visible()
    for label in ["대시보드", "Homepage", "주문", "상품", "꽃 관리", "포장지", "웹사이트 보기 ↗"]:
        assert page.get_by_role("link", name=label, exact=True).is_visible()
    assert page.get_by_role("button", name="로그아웃").first.is_visible()
    assert page.get_by_role("columnheader", name="주문 열기", exact=True).is_visible()
    assert page.get_by_text("주문 {code} 열기").count() == 0
    assert page.get_by_role("link", name="주문 LUM-26935E75CB064623 열기").first.is_visible()
    assert_no_overflow(page, "orders list Korean")
    page.set_viewport_size({"width": 390, "height": 844})
    page.get_by_role("button", name="메뉴", exact=True).click()
    assert page.get_by_role("button", name="닫기", exact=True).is_visible()
    assert page.get_by_role("button", name="로그아웃").first.is_visible()
    assert_no_overflow(page, "orders list Korean mobile menu")
    page.get_by_role("button", name="닫기", exact=True).click()
    page.get_by_role("link", name="주문 LUM-26935E75CB064623 열기").first.click()
    page.get_by_role("heading", name="상태 이력").wait_for(state="visible")
    page.get_by_role("button", name="메뉴", exact=True).click()
    assert page.get_by_role("button", name="로그아웃").first.is_visible()
    assert_no_overflow(page, "order detail Korean mobile")

    page.goto(f"{BASE_URL}/admin/orders/{OTHER_ID}", wait_until="networkidle")
    assert page.get_by_role("heading", name="Không tìm thấy đơn này.").is_visible()
    assert not page_errors, f"page errors: {page_errors}"
    assert not console_errors, f"console errors: {console_errors}"
    assert state["list_payloads"][-1]["page_size"] == 20
    context.close()
    browser.close()

print(f"Admin Orders browser QA passed. Artifacts: {ARTIFACT_DIR}")
