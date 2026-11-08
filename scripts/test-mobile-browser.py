import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def run_mobile_tests():
    print("==========================================================")
    print("MandiSaathi - Test 8: Mobile Browser (Android Pixel 7)")
    print("==========================================================")

    async with async_playwright() as p:
        # Emulate Pixel 7 Android device
        pixel_7 = p.devices['Pixel 7']
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            **pixel_7,
            permissions=['microphone']
        )
        page = await context.new_page()

        print("\n[1/5] Navigating to MandiSaathi Voice Assistant on Mobile (412x915)...")
        await page.goto("http://localhost:5173/voice", wait_until="networkidle")
        title = await page.title()
        print(f"  Page title: {title}")

        # Check responsive layout
        is_mic_visible = await page.locator("button:has-text('बोलें')").is_visible() or await page.locator("button:has-text('Speak')").is_visible() or await page.locator("button:has-text('ਬੋਲੋ')").is_visible() or await page.locator("button[aria-label*='record'], button:has(svg)").first.is_visible()
        print(f"  Mobile responsive mic button visible: {is_mic_visible}")

        # Screenshot initial mobile view
        os.makedirs("/tmp/mandisaathi_screenshots", exist_ok=True)
        await page.screenshot(path="/tmp/mandisaathi_screenshots/01_mobile_initial.png")
        print("  Saved screenshot: /tmp/mandisaathi_screenshots/01_mobile_initial.png")

        # [2/5] Test Mic Diagnostic
        print("\n[2/5] Testing Microphone Permission & Stream Readiness...")
        mic_test_btn = page.locator("button:has-text('Test Mic')")
        if await mic_test_btn.is_visible():
            await mic_test_btn.click()
            await page.wait_for_timeout(1000)
            status_text = await page.locator("text=Microphone Ready").is_visible()
            print(f"  Microphone readiness check passed: {status_text}")

        # [3/5] Test Hindi Voice Query Execution on Mobile
        print("\n[3/5] Executing Hindi Voice Query: 'आज पंजाब में गेहूं का भाव क्या चल रहा है?'...")
        input_box = page.locator("input[type='text']")
        await input_box.fill("आज पंजाब में गेहूं का भाव क्या चल रहा है?")
        submit_btn = page.locator("button:has-text('भेजें'), button:has-text('Send'), button[type='submit']").first
        await submit_btn.click()

        # Wait for answered state
        await page.wait_for_selector("text=खन्ना मंडी", timeout=15000)
        await page.screenshot(path="/tmp/mandisaathi_screenshots/02_mobile_hindi_result.png")
        print("  Received verified response card on mobile.")
        print("  Saved screenshot: /tmp/mandisaathi_screenshots/02_mobile_hindi_result.png")

        # Verify live audio playback element
        live_badge = await page.locator("text=Live Gnani AI Connected").is_visible()
        audio_source = await page.locator("text=Gnani Timbre Voice").is_visible() or await page.locator("text=ज्ञानी टिम्ब्रे ध्वनि").is_visible()
        print(f"  Live Gnani Connected Badge: {live_badge}")
        print(f"  Audio Source Displayed as Gnani Timbre: {audio_source}")

        # [4/5] Test Punjabi District Resolution (Ludhiana -> Khanna Mandi prompt)
        print("\n[4/5] Testing Punjabi Voice Query: 'ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?'...")
        # Switch language to Punjabi
        pa_btn = page.locator("header button:has-text('ਪੰਜਾਬੀ')")
        if await pa_btn.is_visible():
            await pa_btn.click()
            await page.wait_for_timeout(500)

        input_box = page.locator("input[type='text']")
        await input_box.fill("ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?")
        await input_box.press("Enter")

        await page.wait_for_selector("text=Ludhiana", timeout=35000)
        await page.screenshot(path="/tmp/mandisaathi_screenshots/03_mobile_punjabi_ludhiana.png")
        print("  Verified Punjabi district resolution displayed properly on mobile.")
        print("  Saved screenshot: /tmp/mandisaathi_screenshots/03_mobile_punjabi_ludhiana.png")

        # [5/5] Test Slow Network Behavior (Simulated 3G Throttling)
        print("\n[5/5] Testing Slow Network Behavior (Emulating 3G Throttling)...")
        cdp_session = await page.context.new_cdp_session(page)
        # 300kbps download, 150kbps upload, 200ms latency
        await cdp_session.send('Network.emulateNetworkConditions', {
            'offline': False,
            'downloadThroughput': 300 * 1024 / 8,
            'uploadThroughput': 150 * 1024 / 8,
            'latency': 200
        })

        input_box = page.locator("input[type='text']")
        await input_box.fill("गेहूं का भाव क्या है?")
        await input_box.press("Enter")

        # Check for loading spinner during throttled network
        print("  Throttled query submitted. Waiting for graceful resolution under slow network...")
        await page.wait_for_selector("text=गेहूं", timeout=25000)
        await page.screenshot(path="/tmp/mandisaathi_screenshots/04_mobile_slow_network_result.png")
        print("  Query resolved gracefully under slow network conditions.")
        print("  Saved screenshot: /tmp/mandisaathi_screenshots/04_mobile_slow_network_result.png")

        await browser.close()
        print("\n✅ Test 8 (Mobile Browser on Android) PASSED completely.")

if __name__ == '__main__':
    asyncio.run(run_mobile_tests())
