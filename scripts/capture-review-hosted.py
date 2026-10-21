"""Capture only the hosted reviewer views changed by the independent preview."""

import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE = os.environ.get("LUMEA_REVIEW_URL", "https://johnathanjjnbao.github.io/lumea-review-preview").rstrip("/")
OUTPUT = Path(os.environ.get("LUMEA_REVIEW_SCREENSHOTS", str(Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir())) / "LumeaOps/reviewer-preview/screenshots")))


def capture(page, name):
    for y in range(0, page.evaluate("document.documentElement.scrollHeight"), 650):
        page.evaluate("y => window.scrollTo(0, y)", y)
        page.wait_for_timeout(85)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUTPUT / f"hosted-{name}.png"), full_page=True)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel=os.environ.get("LUMEA_BROWSER_CHANNEL", "msedge"))
        try:
            for name, route, width in (
                ("vi-home-1440", "/", 1440),
                ("vi-home-390", "/", 390),
                ("ko-home-390", "/ko", 390),
                ("vi-catalog-1440", "/flowers", 1440),
                ("vi-pdp-1440", "/flowers/pink-garden", 1440),
            ):
                page = browser.new_page(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                response = page.goto(f"{BASE}{route}")
                assert response and response.status == 200, f"{name}: route unavailable"
                page.locator("main h1").first.wait_for(state="visible")
                capture(page, name)
                page.close()

            page = browser.new_page(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
            page.goto(f"{BASE}/flowers/pink-garden")
            page.locator(".product-purchase__button").click()
            page.goto(f"{BASE}/cart")
            page.locator(".cart-line[data-valid='true']").wait_for(state="visible")
            capture(page, "vi-cart-390")
            page.goto(f"{BASE}/ko/checkout")
            page.locator(".checkout-form").wait_for(state="visible")
            capture(page, "ko-checkout-390")
            page.close()
        finally:
            browser.close()
    print(f"Seven hosted reviewer screenshots saved in {OUTPUT}")


if __name__ == "__main__":
    main()
