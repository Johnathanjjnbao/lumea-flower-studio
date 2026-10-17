import base64
import json
import os
import time
from pathlib import Path
from urllib.parse import unquote

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("LUMEA_BASE_URL", "http://127.0.0.1:4173/lumea-flower-studio").rstrip("/")
SCREENSHOT_DIR = os.environ.get("LUMEA_QA_SCREENSHOT_DIR")
PRODUCT_ID = "55000000-0000-4500-8500-000000000001"
CATEGORY_ID = "55000000-0000-4500-8500-000000000002"
VARIANT_ID = "55000000-0000-4500-8500-000000000003"
VALID_IMAGE = Path(__file__).parent / "fixtures" / "pdp-qa-bouquet.svg"
# Run the reported 768 px regression immediately after mobile, then the breakpoint edges.
PDP_WIDTHS = (390, 768, 759, 760, 820, 1024, 1100, 1440)


def b64url(value):
    return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).decode().rstrip("=")


def fake_access_token():
    now = int(time.time())
    return f'{b64url({"alg": "HS256", "typ": "JWT"})}.{b64url({"aud": "authenticated", "exp": now + 3600, "iat": now, "sub": "55000000-0000-4500-8500-000000000004", "role": "authenticated"})}.qa'


def no_overflow(page, label):
    size = page.evaluate("() => ({client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth})")
    assert size["scroll"] <= size["client"], f"{label} overflow: {size}"


def assert_pdp_geometry(page, label, available=True):
    geometry = page.evaluate("""() => {
      const rect = (selector) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box && { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width };
      };
      return {
        layout: rect('.product-detail__layout'),
        gallery: rect('.product-gallery'),
        image: rect('.product-gallery__main'),
        info: rect('.product-detail__info'),
        heading: rect('.product-detail__heading'),
        stacked: getComputedStyle(document.querySelector('.product-detail__info')).display === 'contents',
      };
    }""")
    layout, gallery, image = geometry["layout"], geometry["gallery"], geometry["image"]
    assert image["width"] <= gallery["width"] + 1, f"{label} image exceeds gallery cell: {geometry}"
    assert image["right"] <= layout["right"] + 1, f"{label} image exceeds layout: {geometry}"
    if geometry["stacked"]:
        assert image["top"] >= geometry["heading"]["bottom"] - 1, f"{label} gallery overlaps heading: {geometry}"
    else:
        assert image["right"] <= geometry["info"]["left"] + 1, f"{label} gallery overlaps info: {geometry}"
    no_overflow(page, label)
    assert page.locator(".product-detail__heading h1").is_visible(), f"{label} heading hidden"
    assert page.locator(".product-detail__commerce-head strong").is_visible(), f"{label} price hidden"
    page.locator(".size-option").first.click(trial=True)
    button = page.locator(".product-purchase__button")
    if available:
        button.click(trial=True)
    else:
        assert button.is_disabled(), f"{label} seasonal purchase was enabled"
    return {"gallery_width": round(image["width"], 1), "cell_width": round(gallery["width"], 1)}


USER = {
    "id": "55000000-0000-4500-8500-000000000004", "aud": "authenticated", "role": "authenticated",
    "email": "admin.v22@example.test", "email_confirmed_at": "2026-10-16T00:00:00Z", "phone": "",
    "confirmed_at": "2026-10-16T00:00:00Z", "last_sign_in_at": "2026-10-16T00:00:00Z",
    "app_metadata": {"provider": "email", "providers": ["email"]}, "user_metadata": {}, "identities": [],
    "created_at": "2026-10-16T00:00:00Z", "updated_at": "2026-10-16T00:00:00Z", "is_anonymous": False,
}
PROFILE = {"id": "55000000-0000-4500-8500-000000000005", "auth_user_id": USER["id"], "display_name": "Luméa V2.2 QA", "role": "ADMIN", "active": True}


def translations(vi, ko, **extra):
    return [
        {"locale": "vi", "name": vi, **{key: value[0] for key, value in extra.items()}},
        {"locale": "ko", "name": ko, **{key: value[1] for key, value in extra.items()}},
    ]


POLICY_DEFINITIONS = [
    ("DELIVERY", 10, "PUBLISHED"),
    ("RETURNS_REFUNDS", 20, "DRAFT"),
    ("PAYMENT", 30, "PUBLISHED"),
    ("CONTACT_INQUIRY", 40, "PUBLISHED"),
    ("FLOWER_CARE_DEFAULT", 50, "PUBLISHED"),
    ("FRESHNESS_SUBSTITUTION_DEFAULT", 60, "PUBLISHED"),
]


def make_state():
    sections = [{
        "id": f"55000000-0000-4500-8500-{index:012d}",
        "code": code,
        "visibility": visibility,
        "sort_order": sort_order,
        "created_at": "2026-10-16T00:00:00Z",
        "updated_at": "2026-10-16T00:00:00Z",
    } for index, (code, sort_order, visibility) in enumerate(POLICY_DEFINITIONS, start=10)]
    translations_by_code = {}
    for code, _, visibility in POLICY_DEFINITIONS:
        if visibility != "PUBLISHED":
            continue
        translations_by_code[code] = {
            "vi": {"title": f"{code} owner VI", "summary": f"Owner {code.lower()} summary VI", "body": f"Owner {code.lower()} body VI."},
            "ko": {"title": f"{code} 소유자 KO", "summary": f"소유자 {code.lower()} 요약 KO", "body": f"소유자 {code.lower()} 본문 KO."},
        }
    return {
        "sections": sections,
        "translations": translations_by_code,
        "policy_saves": [],
        "product_saves": 0,
        "last_product_payload": None,
        "availability": "AVAILABLE",
        "guidance": {
            "vi": {"care_instructions": "Chăm hoa riêng cho sản phẩm.", "freshness_seasonality_note": "Ghi chú mùa vụ riêng.", "substitution_note": "Ghi chú thay thế riêng.", "fulfillment_note": "Ghi chú giao nhận riêng."},
            "ko": {"care_instructions": None, "freshness_seasonality_note": None, "substitution_note": None, "fulfillment_note": None},
        },
        "image_broken": False,
    }


def install_mocks(page, state):
    token = fake_access_token()
    page.route("**/auth/v1/user", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(USER)))
    page.route("**/auth/v1/logout**", lambda route: route.fulfill(status=204, body=""))
    page.route("**/auth/v1/token**", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps({
        "access_token": token, "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600,
        "refresh_token": "v22-browser-qa", "user": USER,
    })))
    page.route("https://challenges.cloudflare.com/**", lambda route: route.fulfill(status=200, content_type="application/javascript", body=""))
    def serve_image(route):
        if state["image_broken"]:
            route.fulfill(status=404, body="QA image intentionally missing")
        else:
            route.fulfill(status=200, content_type="image/svg+xml", path=str(VALID_IMAGE))

    page.route("**/storage/v1/object/public/**", serve_image)

    category = {
        "id": CATEGORY_ID, "stable_code": "bouquets", "slug": "hoa-bo", "visibility": "PUBLISHED", "sort_order": 10,
        "category_translations": translations("Hoa bó", "꽃다발", description=("Hoa bó Luméa", "Luméa 꽃다발")),
    }

    def product_row():
        product_translations = []
        for locale, name, short, description, composition in [
            ("vi", "Pink Garden", "Vườn hồng dịu dàng", "Một bó hoa thử nghiệm V2.2.", ["Hồng"]),
            ("ko", "핑크 가든", "부드러운 장미 정원", "V2.2 테스트 꽃다발입니다.", ["장미"]),
        ]:
            product_translations.append({
                "locale": locale, "name": name, "short_description": short, "description": description,
                "composition": composition, "seo_title": None, "seo_description": None,
                **state["guidance"][locale],
            })
        return {
            "id": PRODUCT_ID, "stable_code": "pink-garden", "slug": "pink-garden", "product_type": "READY_MADE_BOUQUET",
            "category_id": CATEGORY_ID, "visibility": "PUBLISHED", "availability": state["availability"], "same_day_eligible": True,
            "featured": True, "bestseller": True, "sort_order": 10, "updated_at": "2026-10-16T00:00:00Z",
            "categories": category,
            "product_translations": product_translations,
            "product_variants": [{
                "id": VARIANT_ID, "stable_code": "standard", "sku": "LUM-PINK-GARDEN-STANDARD", "price_amount": 550000,
                "active": True, "sort_order": 10,
                "product_variant_translations": translations("Tiêu chuẩn", "스탠다드", description=("Cỡ tiêu chuẩn", "스탠다드 사이즈")),
            }],
            "product_images": [{
                "id": "55000000-0000-4500-8500-000000000006", "media_asset_id": "55000000-0000-4500-8500-000000000007",
                "role": "PRIMARY", "active": True, "sort_order": 10,
                "media_assets": {"id": "55000000-0000-4500-8500-000000000007", "storage_bucket": "public-media", "storage_path": "qa/pink-garden.svg", "access": "PUBLIC", "status": "ACTIVE", "media_asset_translations": [{"locale": "vi", "alt_text": "Pink Garden", "caption": None}, {"locale": "ko", "alt_text": "핑크 가든", "caption": None}]},
            }],
            "product_occasions": [],
            "product_tones": [{
                "tone_id": "55000000-0000-4500-8500-000000000008", "active": True, "sort_order": 10,
                "tones": {"stable_code": "pastel", "swatch_value": "#e8cfd2", "visibility": "PUBLISHED", "archived_at": None,
                          "tone_translations": translations("Pastel", "파스텔", description=(None, None))},
            }],
        }

    def translation_rows(decoded_url):
        locale = "ko" if "locale=eq.ko" in decoded_url else "vi" if "locale=eq.vi" in decoded_url else None
        rows = []
        for section in state["sections"]:
            for item_locale, copy in state["translations"].get(section["code"], {}).items():
                if locale and item_locale != locale:
                    continue
                rows.append({
                    "commercial_content_section_id": section["id"], "locale": item_locale,
                    "title": copy["title"], "summary": copy["summary"], "body": copy["body"],
                    "created_at": "2026-10-16T00:00:00Z", "updated_at": "2026-10-16T00:00:00Z",
                })
        return rows

    def rest(route, request):
        url = request.url
        decoded_url = unquote(url)
        payload = request.post_data_json or {}
        if "/admin_profiles" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps(PROFILE)); return
        if "/rpc/get_checkout_options" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({
                "delivery_enabled": True, "pickup_enabled": True, "same_day_enabled": True, "same_day_cutoff": "23:59",
                "delivery_help": "Khu vực và phí được xác nhận tại Checkout.",
                "pickup": {"name": "Luméa Studio", "address": "TP.HCM", "hours": "09:00–18:00"},
                "zones": [{"id": "zone", "code": "central", "name": "Trung tâm", "help": None, "fee_amount": 30000, "same_day_eligible": True, "areas": [{"id": "area", "code": "district-1", "name": "Quận 1"}]}],
                "windows": [{"id": "window", "code": "morning", "label": "Buổi sáng", "help": None, "start_time": "09:00", "end_time": "12:00", "same_day_eligible": True}],
                "payment_methods": {"bank_transfer": True, "cash": True, "cash_delivery": True, "cash_pickup": True},
            })); return
        if "/rpc/admin_save_commercial_content" in url:
            code = payload["target_code"]
            section = next(item for item in state["sections"] if item["code"] == code)
            section["visibility"] = payload["target_visibility"]
            state["translations"][code] = {
                "vi": {"title": payload["target_title_vi"], "summary": payload["target_summary_vi"], "body": payload["target_body_vi"]},
                "ko": {"title": payload["target_title_ko"], "summary": payload["target_summary_ko"], "body": payload["target_body_ko"]},
            }
            state["policy_saves"].append(payload)
            route.fulfill(status=200, content_type="application/json", body=json.dumps(section["id"])); return
        if "/rpc/admin_save_product_atomic" in url:
            state["product_saves"] += 1
            state["last_product_payload"] = payload["product_payload"]
            for locale in ("vi", "ko"):
                state["guidance"][locale] = {
                    "care_instructions": payload["product_payload"][locale].get("care_instructions") or None,
                    "freshness_seasonality_note": payload["product_payload"][locale].get("freshness_seasonality_note") or None,
                    "substitution_note": payload["product_payload"][locale].get("substitution_note") or None,
                    "fulfillment_note": payload["product_payload"][locale].get("fulfillment_note") or None,
                }
            route.fulfill(status=200, content_type="application/json", body=json.dumps(PRODUCT_ID)); return
        if "/commercial_content_sections" in url:
            rows = state["sections"]
            if "visibility=eq.PUBLISHED" in decoded_url:
                rows = [item for item in rows if item["visibility"] == "PUBLISHED"]
            route.fulfill(status=200, content_type="application/json", body=json.dumps(rows)); return
        if "/commercial_content_translations" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps(translation_rows(decoded_url))); return
        if "/site_profile" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({
                "business_name": "Luméa QA", "phone": "+84 909 111 222", "email": "studio@example.com",
                "instagram_url": "https://www.instagram.com/lumea.studio/", "instagram_handle": "@lumea.studio",
            })); return
        if "/navigation_items" in url:
            route.fulfill(status=200, content_type="application/json", body="[]"); return
        if "/products" in url:
            body = product_row() if "id=eq." in decoded_url else [product_row()]
            route.fulfill(status=200, content_type="application/json", body=json.dumps(body)); return
        if "/categories" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps([category])); return
        if "/occasions" in url or "/tones" in url:
            route.fulfill(status=200, content_type="application/json", body="[]"); return
        route.fulfill(status=200, content_type="application/json", body="[]")

    page.route("**/rest/v1/**", rest)


state = make_state()
if SCREENSHOT_DIR:
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
with sync_playwright() as playwright:
    browser_executable = os.environ.get("LUMEA_BROWSER_EXECUTABLE")
    if not browser_executable and os.name == "nt":
        edge_executable = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        if os.path.exists(edge_executable):
            browser_executable = edge_executable
    launch_options = {"headless": True}
    if browser_executable:
        launch_options["executable_path"] = browser_executable
    browser = playwright.chromium.launch(**launch_options)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    console_errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("dialog", lambda dialog: dialog.accept())
    install_mocks(page, state)

    for width in PDP_WIDTHS:
        page.set_viewport_size({"width": width, "height": 1000})
        page.goto(f"{BASE_URL}/flowers/pink-garden", wait_until="networkidle")
        page.get_by_role("heading", name="Pink Garden").wait_for(state="visible")
        assert page.get_by_text("Owner delivery summary VI", exact=True).is_visible()
        assert "550.000" in page.locator(".product-detail__commerce-head strong").inner_text()
        care_disclosure = page.locator(".product-commercial-details details").nth(2)
        care_disclosure.locator("summary").click()
        assert care_disclosure.get_by_text("Chăm hoa riêng cho sản phẩm.", exact=True).is_visible()
        care_disclosure.locator("summary").focus()
        assert page.evaluate("() => document.activeElement?.tagName") == "SUMMARY"
        assert page.get_by_role("link", name="Gọi studio").get_attribute("href") == "tel:+84909111222"
        assert page.get_by_role("link", name="Gửi email").get_attribute("href") == "mailto:studio@example.com"
        assert page.get_by_text("Thông tin này chưa được studio công bố.", exact=False).count() >= 1
        page.wait_for_function("() => document.querySelector('.product-gallery__main img')?.naturalWidth > 0")
        if SCREENSHOT_DIR and width in (390, 768, 1440):
            page.evaluate("() => window.scrollTo(0, 0)")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, f"pdp-vi-{width}.png"), full_page=True)
        dimensions = assert_pdp_geometry(page, f"PDP VI {width}")
        print(f"PDP VI {width}: {dimensions}")

    page.get_by_label("Pastel").check()
    page.locator(".product-purchase__button").click()
    assert "LUM-PINK-GARDEN-STANDARD" in page.evaluate("() => JSON.stringify(localStorage)")
    page.locator(".product-add-status a").click()
    page.locator(".cart-page").wait_for(state="visible")
    page.goto(f"{BASE_URL}/checkout", wait_until="networkidle")
    page.locator(".checkout-page").wait_for(state="visible")

    for width in PDP_WIDTHS:
        page.set_viewport_size({"width": width, "height": 1000})
        page.goto(f"{BASE_URL}/ko/flowers/pink-garden", wait_until="networkidle")
        page.get_by_role("heading", name="핑크 가든").wait_for(state="visible")
        assert page.get_by_text("소유자 delivery 요약 KO", exact=True).is_visible()
        assert page.get_by_text("Owner delivery summary VI", exact=True).count() == 0
        ko_care = page.locator(".product-commercial-details details").nth(2)
        ko_care.locator("summary").click()
        assert ko_care.get_by_text("소유자 flower_care_default 본문 KO.", exact=True).is_visible()
        page.wait_for_function("() => document.querySelector('.product-gallery__main img')?.naturalWidth > 0")
        dimensions = assert_pdp_geometry(page, f"PDP KO {width}")
        print(f"PDP KO {width}: {dimensions}")

    state["availability"] = "SEASONAL"
    for width in PDP_WIDTHS:
        page.set_viewport_size({"width": width, "height": 1000})
        page.goto(f"{BASE_URL}/flowers/pink-garden", wait_until="networkidle")
        assert page.get_by_text("Hiện có thể yêu cầu giao trong ngày", exact=False).count() == 0
        seasonal_care = page.locator(".product-commercial-details details").nth(2)
        seasonal_care.locator("summary").click()
        assert seasonal_care.get_by_text("Chăm hoa riêng cho sản phẩm.", exact=True).is_visible()
        assert_pdp_geometry(page, f"PDP SEASONAL {width}", available=False)

    for width in PDP_WIDTHS:
        page.set_viewport_size({"width": width, "height": 1000})
        page.goto(f"{BASE_URL}/ko/flowers/pink-garden", wait_until="networkidle")
        page.get_by_role("heading", name="핑크 가든").wait_for(state="visible")
        assert_pdp_geometry(page, f"PDP KO SEASONAL {width}", available=False)
    state["availability"] = "AVAILABLE"

    assert not console_errors, f"browser console errors before invalid-image test: {console_errors}"
    state["image_broken"] = True
    page.set_viewport_size({"width": 768, "height": 1000})
    page.goto(f"{BASE_URL}/flowers/pink-garden", wait_until="networkidle")
    page.locator(".product-gallery__main.image-missing").wait_for(state="visible")
    assert page.locator(".product-gallery__main img").is_hidden()
    assert page.locator(".product-gallery__fallback").is_visible()
    assert page.locator(".product-gallery__fallback").text_content().strip() == "Hình ảnh đang được cập nhật"
    assert_pdp_geometry(page, "PDP missing image 768")
    page.goto(f"{BASE_URL}/ko/flowers/pink-garden", wait_until="networkidle")
    page.locator(".product-gallery__main.image-missing").wait_for(state="visible")
    assert page.locator(".product-gallery__main img").is_hidden()
    assert page.locator(".product-gallery__fallback").is_visible()
    assert page.locator(".product-gallery__fallback").text_content().strip() == "이미지를 준비 중입니다"
    assert_pdp_geometry(page, "PDP KO missing image 768")
    state["image_broken"] = False

    page.set_viewport_size({"width": 390, "height": 1000})
    page.goto(f"{BASE_URL}/policies", wait_until="networkidle")
    page.get_by_role("heading", name="DELIVERY owner VI").wait_for(state="visible")
    assert page.get_by_role("heading", name="RETURNS_REFUNDS owner VI").count() == 0
    no_overflow(page, "Policies VI 390")
    page.goto(f"{BASE_URL}/ko/policies", wait_until="networkidle")
    page.get_by_role("heading", name="DELIVERY 소유자 KO").wait_for(state="visible")
    assert page.get_by_text("Owner delivery body VI.", exact=True).count() == 0

    page.goto(f"{BASE_URL}/admin/login", wait_until="networkidle")
    page.locator("#admin-login-email").fill("admin.v22@example.test")
    page.locator("#admin-login-password").fill("v22-browser-qa")
    page.get_by_role("button", name="Đăng nhập").click()
    page.locator(".admin-app").wait_for(state="visible")

    page.goto(f"{BASE_URL}/admin/commercial-policies", wait_until="networkidle")
    page.get_by_role("heading", name="Chính sách thương mại").wait_for(state="visible")
    delivery_card = page.locator(".admin-policy-card").first
    delivery_card.get_by_label("Tiêu đề").fill("Giao nhận đã owner duyệt")
    delivery_card.get_by_label("Tóm tắt").fill("Tóm tắt giao nhận đã duyệt")
    delivery_card.get_by_label("Nội dung chi tiết").fill("Nội dung giao nhận đã duyệt")
    delivery_card.get_by_role("tab", name="한국어").click()
    delivery_card.get_by_label("Tiêu đề").fill("소유자 승인 배송")
    delivery_card.get_by_label("Tóm tắt").fill("승인된 배송 요약")
    delivery_card.get_by_label("Nội dung chi tiết").fill("승인된 배송 본문")
    assert delivery_card.get_by_role("heading", name="소유자 승인 배송").is_visible()
    delivery_card.get_by_role("button", name="Lưu nội dung đã xuất bản").click()
    page.get_by_text("Đã xuất bản nội dung VI/KO.").wait_for(state="visible")
    assert state["policy_saves"][-1]["target_code"] == "DELIVERY"
    assert state["policy_saves"][-1]["target_title_ko"] == "소유자 승인 배송"

    returns_card = page.locator(".admin-policy-card").nth(1)
    returns_card.locator("summary").click()
    returns_card.get_by_label("Tiêu đề").fill("Đổi trả đang soạn")
    returns_card.get_by_role("button", name="Xuất bản VI/KO").click()
    returns_card.get_by_text("Cần hoàn thiện cả VI và KO trước khi xuất bản.").wait_for(state="visible")
    returns_card.get_by_role("button", name="Lưu bản nháp").click()
    page.get_by_text("Đã lưu bản nháp. Nội dung chưa hiển thị công khai.").wait_for(state="visible")
    assert state["policy_saves"][-1]["target_code"] == "RETURNS_REFUNDS"
    assert state["policy_saves"][-1]["target_visibility"] == "DRAFT"
    no_overflow(page, "Admin policies 390")
    if SCREENSHOT_DIR:
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "admin-policies-390.png"), full_page=True)

    page.goto(f"{BASE_URL}/flowers/pink-garden", wait_until="networkidle")
    assert page.get_by_text("Tóm tắt giao nhận đã duyệt", exact=True).is_visible()

    page.goto(f"{BASE_URL}/admin/products/{PRODUCT_ID}", wait_until="networkidle")
    page.get_by_role("heading", name="Pink Garden").wait_for(state="visible")
    page.get_by_label("Hướng dẫn chăm hoa").fill("Care VI updated by owner")
    page.get_by_role("tab", name="한국어").click()
    page.get_by_label("Hướng dẫn chăm hoa").fill("소유자가 수정한 관리 안내")
    page.get_by_role("button", name="Lưu bản nháp").click()
    page.get_by_text("Đã lưu bản nháp vào Supabase.").wait_for(state="visible")
    assert state["product_saves"] == 1
    assert state["last_product_payload"]["vi"]["care_instructions"] == "Care VI updated by owner"
    assert state["last_product_payload"]["ko"]["care_instructions"] == "소유자가 수정한 관리 안내"
    assert state["last_product_payload"]["variants"][0]["sku"] == "LUM-PINK-GARDEN-STANDARD"
    no_overflow(page, "Admin Product guidance 390")

    page.goto(f"{BASE_URL}/flowers/pink-garden", wait_until="networkidle")
    updated_care = page.locator(".product-commercial-details details").nth(2)
    updated_care.locator("summary").click()
    assert updated_care.get_by_text("Care VI updated by owner", exact=True).is_visible()

    assert not errors, f"browser page errors: {errors}"
    browser.close()

print("V2.2 browser QA passed: VI/KO PDP, Draft fallback, published policies, safe contact links, seasonal lock, Admin policy editing, Product guidance, and 390/768/1440 layouts.")
