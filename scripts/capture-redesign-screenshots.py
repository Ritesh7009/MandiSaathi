#!/usr/bin/env python3
"""
MandiSaathi Redesign - Automated High-Fidelity Screenshot Capture Script
Captures desktop (1440x900) and mobile (412x915) screenshots for all 7 screens.
"""
import os
import sys
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = "/home/ritesh/Desktop/mandisaathi/docs/screenshots"
BASE_URL = "http://localhost:5173"

SCREENS = [
    ("home", "/", "01_desktop_home.png", "09_mobile_home.png"),
    ("assistant", "/assistant", "02_desktop_voice_assistant.png", "10_mobile_voice_assistant.png"),
    ("prices", "/prices", "03_desktop_price_intelligence.png", "11_mobile_price_intelligence.png"),
    ("compare", "/compare", "04_desktop_mandi_comparison.png", "12_mobile_mandi_comparison.png"),
    ("more", "/more", "05_desktop_more_hub.png", "13_mobile_more_hub.png"),
    ("schemes", "/schemes", "06_desktop_government_schemes.png", "14_mobile_government_schemes.png"),
    ("complaints", "/complaints", "07_desktop_complaints.png", "15_mobile_complaints.png"),
    ("settings", "/settings", "08_desktop_settings.png", "16_mobile_settings.png"),
]

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Capturing screenshots to: {OUTPUT_DIR}")

    with sync_playwright() as p:
        # 1. Desktop Viewport (1440x900)
        print("\n--- Capturing Desktop Screens (1440x900) ---")
        browser = p.chromium.launch(headless=True)
        desktop_context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5,
            permissions=["microphone"]
        )
        desktop_page = desktop_context.new_page()

        for name, route, desktop_file, _ in SCREENS:
            url = f"{BASE_URL}{route}"
            print(f"Navigating to {url} ({name})...")
            desktop_page.goto(url, wait_until="networkidle")
            desktop_page.wait_for_timeout(1000)

            # If voice assistant, submit a sample query to show rich card state
            if name == "assistant":
                try:
                    input_box = desktop_page.locator("input[type='text']")
                    if input_box.is_visible():
                        input_box.fill("आज पंजाब में गेहूं का भाव क्या चल रहा है?")
                        desktop_page.keyboard.press("Enter")
                        desktop_page.wait_for_timeout(3500)
                except Exception as e:
                    print(f"  Note on assistant interaction: {e}")

            out_path = os.path.join(OUTPUT_DIR, desktop_file)
            desktop_page.screenshot(path=out_path, full_page=False)
            print(f"  Saved desktop screenshot: {out_path}")

        desktop_context.close()

        # 2. Mobile Viewport (Android Pixel 7: 412x915)
        print("\n--- Capturing Mobile Screens (412x915) ---")
        mobile_device = p.devices["Pixel 7"]
        mobile_context = browser.new_context(
            **mobile_device,
            permissions=["microphone"]
        )
        mobile_page = mobile_context.new_page()

        for name, route, _, mobile_file in SCREENS:
            url = f"{BASE_URL}{route}"
            print(f"Navigating mobile to {url} ({name})...")
            mobile_page.goto(url, wait_until="networkidle")
            mobile_page.wait_for_timeout(1000)

            # If voice assistant, submit a sample query to show rich response card
            if name == "assistant":
                try:
                    input_box = mobile_page.locator("input[type='text']")
                    if input_box.is_visible():
                        input_box.fill("लੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?")
                        mobile_page.keyboard.press("Enter")
                        mobile_page.wait_for_timeout(3500)
                except Exception as e:
                    print(f"  Note on mobile assistant interaction: {e}")

            out_path = os.path.join(OUTPUT_DIR, mobile_file)
            mobile_page.screenshot(path=out_path, full_page=False)
            print(f"  Saved mobile screenshot: {out_path}")

        mobile_context.close()
        browser.close()

    print("\nAll 14 redesign screenshots captured successfully.")

if __name__ == "__main__":
    main()

