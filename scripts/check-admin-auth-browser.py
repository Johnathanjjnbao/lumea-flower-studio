import base64
import json
import os
import time
from pathlib import Path
from tempfile import gettempdir
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright


BASE_URL = os.environ.get("LUMEA_BASE_URL", "http://127.0.0.1:4173/lumea-flower-studio")
ARTIFACT_DIR = Path(gettempdir()) / "lumea-admin-auth-qa"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def assert_no_overflow(page, label):
    result = page.evaluate("""() => ({
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth
    })""")
    assert result["documentWidth"] <= result["viewport"], f"{label} overflow: {result}"


def b64url(value):
    return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).decode().rstrip("=")


def fake_access_token():
    now = int(time.time())
    header = b64url({"alg": "HS256", "typ": "JWT"})
    payload = b64url({
        "aud": "authenticated",
        "exp": now + 3600,
        "iat": now,
        "sub": "11111111-1111-4111-8111-111111111111",
        "email": "admin.qa@example.test",
        "role": "authenticated",
        "aal": "aal1",
        "session_id": "22222222-2222-4222-8222-222222222222",
    })
    return f"{header}.{payload}.test-signature"


USER = {
    "id": "11111111-1111-4111-8111-111111111111",
    "aud": "authenticated",
    "role": "authenticated",
    "email": "admin.qa@example.test",
    "email_confirmed_at": "2026-10-04T00:00:00Z",
    "phone": "",
    "confirmed_at": "2026-10-04T00:00:00Z",
    "last_sign_in_at": "2026-10-04T00:00:00Z",
    "app_metadata": {"provider": "email", "providers": ["email"]},
    "user_metadata": {},
    "identities": [],
    "created_at": "2026-10-04T00:00:00Z",
    "updated_at": "2026-10-04T00:00:00Z",
    "is_anonymous": False,
}

PROFILE = {
    "id": "33333333-3333-4333-8333-333333333333",
    "auth_user_id": USER["id"],
    "display_name": "Luméa QA",
    "role": "ADMIN",
    "active": True,
}


def install_auth_mocks(page, state):
    token = fake_access_token()

    def auth_user(route, request):
        state["auth_user_methods"].append(request.method)
        if request.method == "PUT":
            body = request.post_data_json
            state["password_updates"] += 1
            state["updated_password_length"] = len(body.get("password", ""))
        route.fulfill(status=200, content_type="application/json", body=json.dumps(USER))

    def token_exchange(route, request):
        body = request.post_data_json
        state["login_attempts"].append(body.get("password"))
        if body.get("password") != "new-password-qa":
            route.fulfill(status=400, content_type="application/json", body=json.dumps({
                "code": "invalid_credentials",
                "message": "Invalid login credentials",
            }))
            return
        route.fulfill(status=200, content_type="application/json", body=json.dumps({
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 3600,
            "expires_at": int(time.time()) + 3600,
            "refresh_token": "qa-refresh-token",
            "user": USER,
        }))

    def rest(route, request):
        if "/admin_profiles" in request.url:
            state["profile_requests"] += 1
            route.fulfill(status=200, content_type="application/json", body=json.dumps(PROFILE))
        else:
            route.fulfill(status=200, content_type="application/json", body="[]")

    page.route("**/auth/v1/user", auth_user)
    page.route("**/auth/v1/token**", token_exchange)
    page.route("**/auth/v1/logout**", lambda route: route.fulfill(status=204, body=""))
    page.route("**/rest/v1/**", rest)
    return token


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=os.environ.get(
            "LUMEA_BROWSER_EXECUTABLE",
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        ),
    )

    request_context = browser.new_context(viewport={"width": 1440, "height": 1000})
    request_page = request_context.new_page()
    request_errors = []
    request_console_errors = []
    request_failures = []
    request_page.on("pageerror", lambda error: request_errors.append(str(error)))
    request_page.on("console", lambda message: request_console_errors.append(message.text) if message.type == "error" else None)
    request_page.on("requestfailed", lambda request: request_failures.append({
        "url": request.url,
        "failure": request.failure,
    }))
    recovery_requests = []

    def recover(route, request):
        query = parse_qs(urlparse(request.url).query)
        recovery_requests.append({
            "body": request.post_data_json,
            "redirect_to": query.get("redirect_to", [None])[0],
        })
        route.fulfill(status=200, content_type="application/json", body="{}")

    request_page.route("**/auth/v1/recover**", recover)
    request_page.goto(f"{BASE_URL}/admin/login", wait_until="networkidle")
    assert request_page.get_by_role("heading", name="Đăng nhập quản trị").is_visible()
    assert request_page.locator("#admin-login-email").get_attribute("autocomplete") == "username"
    assert request_page.locator("#admin-login-password").get_attribute("autocomplete") == "current-password"
    request_page.get_by_role("link", name="Quên mật khẩu?").click()
    request_page.get_by_role("button", name="Gửi liên kết đặt lại").click()
    assert request_page.locator("[role=alert]").inner_text() == "Nhập email Admin."
    assert request_page.locator("[role=alert]").evaluate("node => document.activeElement === node")
    request_page.locator("#admin-recovery-email").fill("broken-email")
    request_page.get_by_role("button", name="Gửi liên kết đặt lại").click()
    assert "Email chưa đúng định dạng" in request_page.locator("[role=alert]").inner_text()
    request_page.locator("#admin-recovery-email").fill("admin.qa@example.test")
    request_page.get_by_role("button", name="Gửi liên kết đặt lại").click()
    request_page.get_by_role("heading", name="Kiểm tra hộp thư của bạn.").wait_for(state="visible")
    assert len(recovery_requests) == 1, f"unexpected recovery request count: {len(recovery_requests)}"
    assert recovery_requests[0]["redirect_to"] == f"{BASE_URL}/admin/reset-password"
    assert "password" not in recovery_requests[0]["body"]
    request_page.get_by_role("button", name="Gửi lại").click()
    request_page.locator("#admin-recovery-email").fill("unknown@example.test")
    request_page.get_by_role("button", name="Gửi liên kết đặt lại").click()
    request_page.get_by_role("heading", name="Kiểm tra hộp thư của bạn.").wait_for(state="visible")
    assert len(recovery_requests) == 2
    assert_no_overflow(request_page, "forgot password desktop")
    request_page.screenshot(path=ARTIFACT_DIR / "forgot-password-1440-vi.png", full_page=True)

    request_page.goto(f"{BASE_URL}/ko/admin/login", wait_until="networkidle")
    assert request_page.get_by_role("heading", name="관리자 로그인").is_visible()
    request_page.get_by_role("link", name="비밀번호를 잊으셨나요?").click()
    request_page.locator("#admin-recovery-email").fill("admin.qa@example.test")
    request_page.get_by_role("button", name="재설정 링크 보내기").click()
    request_page.get_by_role("heading", name="이메일을 확인해 주세요.").wait_for(state="visible")
    assert recovery_requests[-1]["redirect_to"] == f"{BASE_URL}/ko/admin/reset-password"
    request_page.set_viewport_size({"width": 768, "height": 1024})
    assert_no_overflow(request_page, "forgot password tablet")
    request_page.set_viewport_size({"width": 390, "height": 844})
    assert_no_overflow(request_page, "forgot password mobile")
    request_page.screenshot(path=ARTIFACT_DIR / "forgot-password-390-ko.png", full_page=True)
    assert not request_errors, f"forgot-password page errors: {request_errors}"
    assert not request_failures, f"forgot-password failed requests: {request_failures}"
    assert not request_console_errors, (
        f"forgot-password console errors: {request_console_errors}; failed requests: {request_failures}"
    )
    request_context.close()

    reset_context = browser.new_context(viewport={"width": 1440, "height": 1000})
    reset_page = reset_context.new_page()
    reset_errors = []
    reset_console_errors = []
    reset_response_errors = []
    reset_failures = []
    reset_page.on("pageerror", lambda error: reset_errors.append(str(error)))
    reset_page.on("console", lambda message: reset_console_errors.append(message.text) if message.type == "error" else None)
    reset_page.on("requestfailed", lambda request: reset_failures.append({
        "url": request.url,
        "failure": request.failure,
    }))
    reset_page.on("response", lambda response: reset_response_errors.append({
        "status": response.status,
        "url": response.url,
        "resource_type": response.request.resource_type,
    }) if response.status >= 400 else None)
    state = {"password_updates": 0, "updated_password_length": 0, "login_attempts": [], "auth_user_methods": [], "profile_requests": 0}
    token = install_auth_mocks(reset_page, state)

    reset_page.goto(f"{BASE_URL}/admin/reset-password", wait_until="networkidle")
    assert reset_page.get_by_role("heading", name="Liên kết không còn dùng được.").is_visible()
    reset_page.goto(f"{BASE_URL}/admin/reset-password#error=access_denied&error_code=otp_expired", wait_until="networkidle")
    assert reset_page.get_by_role("heading", name="Liên kết không còn dùng được.").is_visible()

    # A recovery email normally opens a fresh document. Use a fresh page so the
    # Supabase client initializes from the callback URL exactly as it does then.
    reset_page.close()
    reset_page = reset_context.new_page()
    reset_page.on("pageerror", lambda error: reset_errors.append(str(error)))
    reset_page.on("console", lambda message: reset_console_errors.append(message.text) if message.type == "error" else None)
    reset_page.on("requestfailed", lambda request: reset_failures.append({
        "url": request.url,
        "failure": request.failure,
    }))
    reset_page.on("response", lambda response: reset_response_errors.append({
        "status": response.status,
        "url": response.url,
        "resource_type": response.request.resource_type,
    }) if response.status >= 400 else None)
    token = install_auth_mocks(reset_page, state)

    expires_at = int(time.time()) + 3600
    recovery_url = (
        f"{BASE_URL}/admin/reset-password#access_token={token}&expires_in=3600"
        f"&expires_at={expires_at}&refresh_token=qa-recovery-refresh&token_type=bearer&type=recovery"
    )
    reset_page.goto(recovery_url, wait_until="networkidle")
    try:
        reset_page.locator("#admin-new-password").wait_for(state="visible", timeout=20_000)
    except PlaywrightTimeoutError as error:
        raise AssertionError(
            "Recovery form did not open. "
            f"auth state={state}; token_in_url={'access_token' in reset_page.url}; "
            f"console={reset_console_errors}; page={reset_page.locator('body').inner_text()}"
        ) from error
    assert "access_token" not in reset_page.url, "Supabase recovery token remained in the URL"
    reset_page.reload(wait_until="networkidle")
    reset_page.locator("#admin-new-password").wait_for(state="visible", timeout=20_000)
    reset_page.get_by_role("button", name="Lưu mật khẩu mới").click()
    assert reset_page.locator("[role=alert]").inner_text() == "Nhập mật khẩu mới."
    assert reset_page.locator("[role=alert]").evaluate("node => document.activeElement === node")
    reset_page.locator("#admin-new-password").fill("12345")
    reset_page.locator("#admin-confirm-password").fill("12345")
    reset_page.get_by_role("button", name="Lưu mật khẩu mới").click()
    assert reset_page.locator("[role=alert]").inner_text() == "Mật khẩu cần có ít nhất 15 ký tự."
    reset_page.locator("#admin-new-password").fill("new-password-qa")
    reset_page.locator("#admin-confirm-password").fill("different-password")
    reset_page.get_by_role("button", name="Lưu mật khẩu mới").click()
    assert reset_page.locator("[role=alert]").inner_text() == "Hai mật khẩu chưa khớp."
    reset_page.locator("#admin-confirm-password").fill("new-password-qa")
    reset_page.get_by_role("button", name="Lưu mật khẩu mới").click()
    try:
        reset_page.get_by_role("heading", name="Đăng nhập quản trị").wait_for(state="visible", timeout=20_000)
    except PlaywrightTimeoutError as error:
        raise AssertionError(
            f"Password update did not return to login. state={state}; console={reset_console_errors}; "
            f"page={reset_page.locator('body').inner_text()}"
        ) from error
    assert reset_page.get_by_role("status").inner_text() == "Mật khẩu đã được cập nhật. Đăng nhập bằng mật khẩu mới."
    assert state["password_updates"] == 1
    assert state["updated_password_length"] == len("new-password-qa")

    reset_page.locator("#admin-login-email").fill("admin.qa@example.test")
    reset_page.locator("#admin-login-password").fill("old-password-qa")
    console_count_before_invalid_login = len(reset_console_errors)
    response_count_before_invalid_login = len(reset_response_errors)
    reset_page.get_by_role("button", name="Đăng nhập").click()
    assert reset_page.get_by_role("alert").inner_text() == "Email hoặc mật khẩu không đúng."
    expected_login_errors = reset_console_errors[console_count_before_invalid_login:]
    assert expected_login_errors and all(
        "Failed to load resource" in message and "400" in message
        for message in expected_login_errors
    ), f"unexpected invalid-login console errors: {expected_login_errors}"
    del reset_console_errors[console_count_before_invalid_login:]
    expected_login_responses = reset_response_errors[response_count_before_invalid_login:]
    assert expected_login_responses and all(
        response["status"] == 400 and "/auth/v1/token" in response["url"]
        for response in expected_login_responses
    ), f"unexpected invalid-login responses: {expected_login_responses}"
    del reset_response_errors[response_count_before_invalid_login:]
    reset_page.locator("#admin-login-password").fill("new-password-qa")
    reset_page.get_by_role("button", name="Đăng nhập").click()
    reset_page.locator(".admin-app").wait_for(state="visible", timeout=20_000)
    assert reset_page.get_by_role("heading", name="Sản phẩm", exact=True).is_visible()
    reset_page.reload(wait_until="networkidle")
    assert reset_page.locator(".admin-app").is_visible(), "Admin session did not restore after refresh"

    for route, heading in [
        ("/admin/homepage", "Homepage"),
        ("/admin/builder/flowers", "Hoa theo cành"),
        ("/admin/builder/wrappings", "Giấy gói"),
        ("/admin/products/new", "Sản phẩm mới"),
    ]:
        reset_page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
        assert reset_page.get_by_role("heading", name=heading, exact=True).is_visible(), route

    reset_page.goto(f"{BASE_URL}/admin/products", wait_until="networkidle")
    reset_page.set_viewport_size({"width": 768, "height": 1024})
    assert_no_overflow(reset_page, "Admin representative tablet")
    reset_page.set_viewport_size({"width": 390, "height": 844})
    assert_no_overflow(reset_page, "Admin representative mobile")
    reset_page.screenshot(path=ARTIFACT_DIR / "admin-products-390.png", full_page=True)
    reset_page.get_by_role("button", name="Menu").click()
    reset_page.get_by_role("button", name="Đăng xuất").click()
    reset_page.get_by_role("heading", name="Đăng nhập quản trị").wait_for(state="visible", timeout=20_000)
    reset_page.goto(f"{BASE_URL}/admin/products", wait_until="networkidle")
    assert reset_page.get_by_role("heading", name="Đăng nhập quản trị").is_visible(), "protected route bypassed after logout"
    reset_page.go_back(wait_until="networkidle")
    assert reset_page.get_by_role("heading", name="Đăng nhập quản trị").is_visible(), "browser back bypassed Admin guard"

    reset_page.goto(f"{BASE_URL}/ko/admin/homepage", wait_until="networkidle")
    assert reset_page.get_by_role("heading", name="관리자 로그인").is_visible()
    reset_page.locator("#admin-login-email").fill("admin.qa@example.test")
    reset_page.locator("#admin-login-password").fill("new-password-qa")
    reset_page.get_by_role("button", name="로그인").click()
    reset_page.get_by_role("heading", name="Homepage", exact=True).wait_for(state="visible", timeout=20_000)
    assert reset_page.url.endswith("/ko/admin/homepage"), "Korean Admin return path lost its locale"
    reset_page.get_by_role("button", name="Menu").click()
    reset_page.get_by_role("button", name="Đăng xuất").click()
    reset_page.get_by_role("heading", name="관리자 로그인").wait_for(state="visible", timeout=20_000)

    assert state["login_attempts"] == ["old-password-qa", "new-password-qa", "new-password-qa"]
    assert not reset_errors, f"reset/Admin page errors: {reset_errors}"
    expected_admin_fallback_routes = {
        "/admin/products",
        "/admin/homepage",
        "/admin/builder/flowers",
        "/admin/builder/wrappings",
        "/admin/products/new",
        "/ko/admin/homepage",
    }
    admin_document_fallbacks = [
        response for response in reset_response_errors
        if response["status"] == 404
        and response["resource_type"] == "document"
        and any(response["url"].endswith(route) for route in expected_admin_fallback_routes)
    ]
    assert reset_response_errors == admin_document_fallbacks, (
        f"unexpected reset/Admin failed responses: {reset_response_errors}"
    )
    if admin_document_fallbacks:
        fallback_console_errors = [
            message for message in reset_console_errors
            if "Failed to load resource" in message and "404" in message
        ]
        assert len(fallback_console_errors) == len(admin_document_fallbacks), (
            f"Admin fallback console/response mismatch: console={fallback_console_errors}; "
            f"responses={admin_document_fallbacks}"
        )
        reset_console_errors = [
            message for message in reset_console_errors
            if message not in fallback_console_errors
        ]
    expected_mock_logout_aborts = [
        failure for failure in reset_failures
        if failure["url"].endswith("/auth/v1/logout?scope=global")
        and failure["failure"] == "net::ERR_ABORTED"
    ]
    assert reset_failures == expected_mock_logout_aborts and len(expected_mock_logout_aborts) <= 3, (
        f"reset/Admin failed requests: {reset_failures}"
    )
    assert not reset_console_errors, (
        f"reset/Admin console errors: {reset_console_errors}; failed requests: {reset_failures}"
    )
    reset_context.close()
    browser.close()

print("Admin auth browser QA passed: VI/KO, forgot request parity, callback validation, password update, login, session restore, Admin pages, logout, guard, and 1440/768/390.")
print(f"Screenshots: {ARTIFACT_DIR}")
