import base64
import json
import os
import time

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("LUMEA_BASE_URL", "http://127.0.0.1:4173/lumea-flower-studio").rstrip("/")


def b64url(value):
    return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).decode().rstrip("=")


def fake_access_token():
    now = int(time.time())
    return f'{b64url({"alg": "HS256", "typ": "JWT"})}.{b64url({"aud": "authenticated", "exp": now + 3600, "iat": now, "sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"})}.qa'


def no_overflow(page, label):
    size = page.evaluate("() => ({client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth})")
    assert size["scroll"] <= size["client"], f"{label} overflow: {size}"


USER = {
    "id": "11111111-1111-4111-8111-111111111111", "aud": "authenticated", "role": "authenticated",
    "email": "admin.qa@example.test", "email_confirmed_at": "2026-10-08T00:00:00Z", "phone": "",
    "confirmed_at": "2026-10-08T00:00:00Z", "last_sign_in_at": "2026-10-08T00:00:00Z",
    "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {}, "identities": [],
    "created_at": "2026-10-08T00:00:00Z", "updated_at": "2026-10-08T00:00:00Z", "is_anonymous": False,
}
PROFILE = {"id": "33333333-3333-4333-8333-333333333333", "auth_user_id": USER["id"], "display_name": "Luméa QA", "role": "ADMIN", "active": True}
CATEGORY_ID = "44444444-4444-4444-8444-444444444444"
PRODUCT_ID = "55555555-5555-4555-8555-555555555555"
VARIANT_ID = "66666666-6666-4666-8666-666666666666"


def translations(vi, ko, description_vi=None, description_ko=None):
    return [
        {"locale": "vi", "name": vi, "description": description_vi},
        {"locale": "ko", "name": ko, "description": description_ko},
    ]


def install_mocks(page, state):
    token = fake_access_token()
    page.route("**/auth/v1/user", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(USER)))
    page.route("**/auth/v1/logout**", lambda route: route.fulfill(status=204, body=""))
    page.route("**/auth/v1/token**", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps({
        "access_token": token, "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600,
        "refresh_token": "v2-commerce-qa", "user": USER,
    })))
    page.route("https://challenges.cloudflare.com/**", lambda route: route.fulfill(status=200, content_type="application/javascript", body=""))

    def category_row(category):
        return {
            "id": category["id"], "stable_code": category["stable_code"], "slug": category["slug"],
            "visibility": "PUBLISHED" if category["active"] else "HIDDEN", "sort_order": category["sort_order"],
            "category_translations": translations(category["vi"], category["ko"]), "products": [{"count": category["count"]}],
        }

    def product_row():
        return {
            "id": PRODUCT_ID, "stable_code": "pink-garden", "slug": "pink-garden", "product_type": "READY_MADE_BOUQUET",
            "category_id": CATEGORY_ID, "visibility": "PUBLISHED", "availability": "AVAILABLE", "same_day_eligible": True,
            "featured": True, "bestseller": True, "sort_order": 10, "updated_at": "2026-10-08T00:00:00Z",
            "categories": category_row(state["categories"][0]),
            "product_translations": [
                {"locale": "vi", "name": "Pink Garden", "short_description": "Vườn hồng dịu dàng", "description": "Một bó hoa thử nghiệm.", "composition": ["Hồng"], "seo_title": None, "seo_description": None},
                {"locale": "ko", "name": "핑크 가든", "short_description": "부드러운 장미 정원", "description": "테스트 꽃다발입니다.", "composition": ["장미"], "seo_title": None, "seo_description": None},
            ],
            "product_variants": [{
                "id": VARIANT_ID, "stable_code": "standard", "sku": "LUM-PINK-GARDEN-STANDARD", "price_amount": 550000,
                "active": True, "sort_order": 10,
                "product_variant_translations": translations("Tiêu chuẩn", "스탠다드"),
            }],
            "product_images": [{
                "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "role": "PRIMARY", "active": True, "sort_order": 10,
                "media_assets": {"id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "storage_bucket": "public-media", "storage_path": "qa/pink-garden.svg", "access": "PUBLIC", "status": "ACTIVE", "media_asset_translations": [{"locale": "vi", "alt_text": "Pink Garden", "caption": None}, {"locale": "ko", "alt_text": "핑크 가든", "caption": None}]},
            }], "product_occasions": [], "product_tones": [],
        }

    def navigation_rows():
        rows = []
        for item in state["navigation"]:
            rows.append({
                "id": item["id"], "stable_code": item["stable_code"], "destination_type": item["destination_type"],
                "category_id": item.get("category_id"), "external_url": item.get("external_url"), "active": item["active"],
                "sort_order": item["sort_order"], "categories": {"slug": "hoa-bo"} if item["destination_type"] == "CATEGORY" else None,
                "navigation_item_translations": [{"locale": "vi", "label": item["vi"]}, {"locale": "ko", "label": item["ko"]}],
            })
        return rows

    def rest(route, request):
        url = request.url
        payload = request.post_data_json or {}
        if "/admin_profiles" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps(PROFILE)); return
        if "/rpc/admin_save_category" in url:
            item_id = payload.get("target_id") or "77777777-7777-4777-8777-777777777777"
            existing = next((item for item in state["categories"] if item["id"] == item_id), None)
            value = {"id": item_id, "stable_code": payload["target_stable_code"], "slug": payload["target_slug"], "active": payload["target_active"], "sort_order": payload["target_sort_order"], "vi": payload["target_name_vi"], "ko": payload["target_name_ko"], "count": existing["count"] if existing else 0}
            if existing: state["categories"][state["categories"].index(existing)] = value
            else: state["categories"].append(value)
            state["category_saves"] += 1
            route.fulfill(status=200, content_type="application/json", body=json.dumps(item_id)); return
        if "/rpc/admin_reorder_categories" in url:
            state["category_reorders"] += 1
            route.fulfill(status=204, body=""); return
        if "/rpc/admin_archive_category" in url:
            state["categories"] = [item for item in state["categories"] if item["id"] != payload["target_id"]]
            route.fulfill(status=204, body=""); return
        if "/rpc/admin_save_navigation_item" in url:
            item_id = payload.get("target_id") or "88888888-8888-4888-8888-888888888888"
            value = {"id": item_id, "stable_code": payload["target_stable_code"], "destination_type": payload["target_destination_type"], "category_id": payload.get("target_category_id"), "external_url": payload.get("target_external_url"), "active": payload["target_active"], "sort_order": payload["target_sort_order"], "vi": payload["target_label_vi"], "ko": payload["target_label_ko"]}
            existing = next((item for item in state["navigation"] if item["id"] == item_id), None)
            if existing: state["navigation"][state["navigation"].index(existing)] = value
            else: state["navigation"].append(value)
            state["navigation_saves"] += 1
            route.fulfill(status=200, content_type="application/json", body=json.dumps(item_id)); return
        if "/rpc/admin_reorder_navigation" in url:
            state["navigation_reorders"] += 1
            route.fulfill(status=204, body=""); return
        if "/rpc/admin_delete_navigation_item" in url:
            state["navigation"] = [item for item in state["navigation"] if item["id"] != payload["target_id"]]
            route.fulfill(status=204, body=""); return
        if "/rpc/admin_save_product_atomic" in url:
            state["product_saves"] += 1
            state["last_product_payload"] = payload["product_payload"]
            route.fulfill(status=200, content_type="application/json", body=json.dumps(PRODUCT_ID)); return
        if "/rpc/get_checkout_options" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"delivery_enabled": False, "pickup_enabled": True, "same_day_enabled": False, "same_day_cutoff": None, "delivery_help": None, "pickup": {"name": "Luméa Studio", "address": "TP.HCM", "hours": "09:00–18:00"}, "zones": [], "windows": [], "payment_methods": {"bank_transfer": False, "cash": True, "cash_delivery": False, "cash_pickup": True}})); return
        if "/categories" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps([category_row(item) for item in state["categories"]])); return
        if "/navigation_items" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps(navigation_rows())); return
        if "/products" in url:
            if request.method != "GET":
                state["direct_product_mutations"] += 1
            body = product_row() if "id=eq." in url and "category_id" in url else [product_row()]
            route.fulfill(status=200, content_type="application/json", body=json.dumps(body)); return
        if any(marker in url for marker in ["/occasions", "/tones", "/flower_stems", "/wrapping_options", "/wrapping_variants", "/wrapping_option_variants", "/homepage_sections", "/discovery_"]):
            route.fulfill(status=200, content_type="application/json", body="[]"); return
        route.fulfill(status=200, content_type="application/json", body="[]")

    page.route("**/rest/v1/**", rest)


state = {
    "categories": [{"id": CATEGORY_ID, "stable_code": "bouquets", "slug": "hoa-bo", "active": True, "sort_order": 10, "vi": "Hoa bó", "ko": "꽃다발", "count": 1}],
    "navigation": [
        {"id": "99999999-9999-4999-8999-999999999999", "stable_code": "flowers", "destination_type": "CATALOG", "category_id": None, "external_url": None, "active": True, "sort_order": 10, "vi": "Hoa", "ko": "꽃"},
        {"id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "stable_code": "bouquets", "destination_type": "CATEGORY", "category_id": CATEGORY_ID, "external_url": None, "active": True, "sort_order": 20, "vi": "Hoa bó", "ko": "꽃다발"},
    ],
    "category_saves": 0, "category_reorders": 0, "navigation_saves": 0, "navigation_reorders": 0,
    "product_saves": 0, "direct_product_mutations": 0, "last_product_payload": None,
}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("LUMEA_BROWSER_EXECUTABLE", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"))
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("dialog", lambda dialog: dialog.accept())
    install_mocks(page, state)

    for width in (1440, 768, 390):
        page.set_viewport_size({"width": width, "height": 900})
        page.goto(f"{BASE_URL}/flowers?category=hoa-bo", wait_until="networkidle")
        page.get_by_role("heading", name="Pink Garden").wait_for(state="visible")
        assert page.get_by_text("Hoa bó", exact=True).count() >= 1
        if width == 390:
            page.locator(".menu-toggle").click()
            assert page.locator(".mobile-menu__chapters a", has_text="Hoa bó").is_visible()
        no_overflow(page, f"catalog {width}")

    page.goto(f"{BASE_URL}/ko/flowers?category=hoa-bo", wait_until="networkidle")
    page.get_by_role("heading", name="핑크 가든").wait_for(state="visible")
    assert page.get_by_text("꽃다발", exact=True).count() >= 1

    page.goto(f"{BASE_URL}/flowers/pink-garden", wait_until="networkidle")
    page.locator(".product-purchase__button").click()
    page.locator(".product-add-status a").click()
    page.locator(".cart-page").wait_for(state="visible")
    page.goto(f"{BASE_URL}/checkout", wait_until="networkidle")
    page.locator(".checkout-page").wait_for(state="visible")
    no_overflow(page, "checkout mobile")

    page.goto(f"{BASE_URL}/admin/login", wait_until="networkidle")
    page.locator("#admin-login-email").fill("admin.qa@example.test")
    page.locator("#admin-login-password").fill("v2-commerce-qa")
    page.get_by_role("button", name="Đăng nhập").click()
    page.locator(".admin-app").wait_for(state="visible")

    page.goto(f"{BASE_URL}/admin/categories", wait_until="networkidle")
    page.get_by_role("heading", name="Categories").wait_for(state="visible")
    cards = page.locator(".admin-operation-card")
    cards.first.get_by_label("Mã ổn định").fill("wedding")
    cards.first.get_by_label("Slug").fill("hoa-cuoi")
    cards.first.get_by_label("Tên").nth(0).fill("Hoa cưới")
    cards.first.get_by_label("Tên").nth(1).fill("웨딩 꽃")
    cards.first.get_by_role("button", name="Lưu Category").click()
    page.get_by_text("Đã lưu Category và nội dung VI/KO.").wait_for(state="visible")
    assert state["category_saves"] == 1
    cards = page.locator(".admin-operation-card")
    assert cards.nth(1).get_by_role("button", name="Archive").is_disabled()
    cards.nth(2).get_by_label("Slug").fill("hoa-cuoi-moi")
    cards.nth(2).get_by_role("button", name="Lưu Category").click()
    page.get_by_text("Đã lưu Category và nội dung VI/KO.").wait_for(state="visible")
    assert state["category_saves"] == 2
    page.locator(".admin-row-actions").nth(1).get_by_role("button", name="↑").click()
    page.get_by_text("Đã lưu thứ tự Category.").wait_for(state="visible")
    assert state["category_reorders"] == 1
    page.locator(".admin-operation-card").nth(2).get_by_role("button", name="Archive").click()
    page.get_by_text("Đã archive Category.").wait_for(state="visible")
    assert not any(item["stable_code"] == "wedding" for item in state["categories"])
    no_overflow(page, "categories admin mobile")

    page.goto(f"{BASE_URL}/admin/navigation", wait_until="networkidle")
    page.get_by_role("heading", name="Navigation").wait_for(state="visible")
    nav_cards = page.locator(".admin-operation-card")
    nav_cards.first.get_by_label("Mã ổn định").fill("wedding")
    nav_cards.first.get_by_label("Đích đến").select_option("CATEGORY")
    nav_cards.first.locator("select").nth(1).select_option(CATEGORY_ID)
    nav_cards.first.get_by_label("Nhãn VI").fill("Hoa cưới")
    nav_cards.first.get_by_label("Nhãn KO").fill("웨딩 꽃")
    nav_cards.first.get_by_role("button", name="Lưu menu item").click()
    page.get_by_text("Đã lưu Navigation và nhãn VI/KO.").wait_for(state="visible")
    assert state["navigation_saves"] == 1
    nav_cards = page.locator(".admin-operation-card")
    nav_cards.nth(3).get_by_label("Nhãn VI").fill("Hoa cưới mới")
    nav_cards.nth(3).get_by_role("button", name="Lưu menu item").click()
    page.get_by_text("Đã lưu Navigation và nhãn VI/KO.").wait_for(state="visible")
    assert state["navigation_saves"] == 2
    page.locator(".admin-row-actions").nth(2).get_by_role("button", name="↑").click()
    page.get_by_text("Đã lưu thứ tự Navigation.").wait_for(state="visible")
    assert state["navigation_reorders"] == 1
    page.locator(".admin-operation-card").nth(3).get_by_role("button", name="Xoá").click()
    page.get_by_text("Đã xoá menu item.").wait_for(state="visible")
    assert not any(item["stable_code"] == "wedding" for item in state["navigation"])

    page.goto(f"{BASE_URL}/admin/products/{PRODUCT_ID}", wait_until="networkidle")
    page.get_by_role("heading", name="Pink Garden").wait_for(state="visible")
    assert page.get_by_label("Category").input_value() == CATEGORY_ID
    sku = page.get_by_label("SKU")
    assert sku.input_value() == "LUM-PINK-GARDEN-STANDARD" and sku.is_disabled()
    page.get_by_label("Giá VND").fill("560000")
    page.get_by_role("button", name="Lưu bản nháp").click()
    page.get_by_text("Đã lưu bản nháp vào Supabase.").wait_for(state="visible")
    assert state["product_saves"] == 1
    assert state["direct_product_mutations"] == 0
    assert state["last_product_payload"]["category_id"] == CATEGORY_ID
    assert state["last_product_payload"]["variants"][0]["sku"] == "LUM-PINK-GARDEN-STANDARD"
    assert state["last_product_payload"]["variants"][0]["price_amount"] == 560000
    no_overflow(page, "product editor mobile")

    assert not errors, f"browser page errors: {errors}"
    browser.close()

print("V2.1 browser QA passed: managed navigation/category/catalog/product/cart/checkout at 1440/768/390, VI/KO, Category and Navigation CRUD/reorder flows, and one atomic Product/Category/SKU save.")
