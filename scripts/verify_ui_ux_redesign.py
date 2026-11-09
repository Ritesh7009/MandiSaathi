import time
import os
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = "/home/ritesh/.gemini/antigravity/brain/f483ec88-9b8c-4ecd-93f1-3f46a0302781"
BASE_URL = "http://localhost:5173"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. Desktop Viewport (1280x820)
        context_desktop = browser.new_context(viewport={"width": 1280, "height": 820})
        page = context_desktop.new_page()
        
        print("Navigating to Home...")
        page.goto(BASE_URL, wait_until="networkidle")
        time.sleep(2)
        
        # Check AgriContourBackdrop canvas exists
        canvas = page.query_selector("canvas")
        print(f"Canvas detected: {canvas is not None}")
        
        # Test click a prompt chip
        chips = page.query_selector_all("button[type='button']")
        prompt_chip = None
        for c in chips:
            txt = c.inner_text()
            if "गेहूं" in txt or "ਕਣਕ" in txt or "भाव" in txt:
                prompt_chip = c
                break
        
        if prompt_chip:
            print(f"Clicking prompt chip: {prompt_chip.inner_text()}")
            prompt_chip.click()
            time.sleep(3)
        
        desktop_home_path = os.path.join(ARTIFACT_DIR, "pw_redesign_home_desktop.png")
        page.screenshot(path=desktop_home_path, full_page=False)
        print(f"Saved: {desktop_home_path}")
        
        # 2. Mandi Comparison Page
        print("Navigating to Compare...")
        page.goto(f"{BASE_URL}/compare", wait_until="networkidle")
        time.sleep(2)
        compare_desktop_path = os.path.join(ARTIFACT_DIR, "pw_redesign_compare_desktop.png")
        page.screenshot(path=compare_desktop_path, full_page=False)
        print(f"Saved: {compare_desktop_path}")
        
        # 3. Price Intelligence Page
        print("Navigating to Prices...")
        page.goto(f"{BASE_URL}/prices", wait_until="networkidle")
        time.sleep(2)
        prices_desktop_path = os.path.join(ARTIFACT_DIR, "pw_redesign_prices_desktop.png")
        page.screenshot(path=prices_desktop_path, full_page=False)
        print(f"Saved: {prices_desktop_path}")
        
        # 4. Mobile Viewport (390x844 - iPhone / Modern Android)
        context_mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        )
        mobile_page = context_mobile.new_page()
        
        print("Navigating to Mobile Home...")
        mobile_page.goto(BASE_URL, wait_until="networkidle")
        time.sleep(2)
        mobile_home_path = os.path.join(ARTIFACT_DIR, "pw_redesign_home_mobile.png")
        mobile_page.screenshot(path=mobile_home_path, full_page=False)
        print(f"Saved: {mobile_home_path}")
        
        print("Navigating to Mobile Compare...")
        mobile_page.goto(f"{BASE_URL}/compare", wait_until="networkidle")
        time.sleep(2)
        mobile_compare_path = os.path.join(ARTIFACT_DIR, "pw_redesign_compare_mobile.png")
        mobile_page.screenshot(path=mobile_compare_path, full_page=False)
        print(f"Saved: {mobile_compare_path}")

        browser.close()
        print("Playwright redesign verification completed successfully!")

if __name__ == "__main__":
    main()

