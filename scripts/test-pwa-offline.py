#!/usr/bin/env python3
"""
MandiSaathi — Phase 4B PWA, Offline-First & Data Reliability Verification Suite
Validates:
1. PWA Web App Manifest validity & asset availability.
2. Service Worker registration, activation & cache shell.
3. IndexedDB structured price storage & metadata.
4. Offline network transition & cached price display.
5. Stale data warning when cached entries exceed 24 hours.
6. Seamless online reconnection & status recovery.
"""

import sys
import json
import time
import urllib.request
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://localhost:5173"
BACKEND_URL = "http://localhost:8080"

def log_test(step_num, title, status, details=""):
    badge = "PASS" if status else "FAIL"
    symbol = "✓" if status else "✗"
    print(f"[{badge}] Step {step_num}: {title} {symbol}")
    if details:
        print(f"       Details: {details}")

def run_tests():
    print("=" * 65)
    print("MandiSaathi Phase 4B: PWA & Offline Experience Verification")
    print("=" * 65)
    all_passed = True

    # 1. PWA Web App Manifest
    print("\n--- Test 1: PWA Web App Manifest Validation ---")
    try:
        req = urllib.request.urlopen(f"{FRONTEND_URL}/manifest.webmanifest")
        assert req.status == 200, f"HTTP {req.status}"
        manifest = json.loads(req.read().decode('utf-8'))
        
        assert manifest.get("name") == "MandiSaathi — AI Mandi Intelligence"
        assert manifest.get("short_name") == "MandiSaathi"
        assert manifest.get("display") == "standalone"
        assert manifest.get("theme_color") == "#174B35"
        assert manifest.get("background_color") == "#F5F3EA"
        assert len(manifest.get("icons", [])) >= 2
        
        # Verify icons exist
        for icon in manifest["icons"]:
            src = icon["src"]
            icon_req = urllib.request.urlopen(f"{FRONTEND_URL}{src}")
            assert icon_req.status == 200, f"Icon {src} HTTP {icon_req.status}"
            
        log_test(1, "Web App Manifest & Icons", True, f"Name: {manifest['name']}, Display: {manifest['display']}, Icons: {len(manifest['icons'])}")
    except Exception as e:
        log_test(1, "Web App Manifest & Icons", False, str(e))
        all_passed = False

    # 2. Service Worker, IndexedDB & Offline Simulation via Playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            service_workers="allow"
        )
        page = context.new_page()

        # Step 2: Service Worker Registration & Cache Shell
        print("\n--- Test 2: Service Worker Registration & Pre-cache Shell ---")
        try:
            page.goto(f"{FRONTEND_URL}/", wait_until="networkidle")
            page.wait_for_timeout(2000)
            
            sw_data = page.evaluate("""async () => {
                if (!('serviceWorker' in navigator)) return { supported: false };
                const reg = await navigator.serviceWorker.getRegistration();
                if (!reg) return { supported: true, registered: false };
                
                let cachedUrls = [];
                try {
                    const cache = await caches.open('mandisaathi-core-v1');
                    const keys = await cache.keys();
                    cachedUrls = keys.map(k => k.url);
                } catch (e) {}
                
                return {
                    supported: true,
                    registered: true,
                    scope: reg.scope,
                    active: reg.active !== null,
                    cachedCount: cachedUrls.length
                };
            }""")
            
            assert sw_data["supported"] is True, "Service workers not supported"
            assert sw_data["registered"] is True, "Service worker registration not found"
            assert sw_data["cachedCount"] >= 5, f"Service worker precache contains {sw_data['cachedCount']} entries"
            
            log_test(2, "Service Worker Registration & Pre-cache", True, f"Scope: {sw_data.get('scope')}, Active: {sw_data.get('active')}, Precached Assets: {sw_data.get('cachedCount')}")
        except Exception as e:
            log_test(2, "Service Worker Registration & Pre-cache", False, str(e))
            all_passed = False

        # Step 3: Online Price Fetching & IndexedDB Caching
        print("\n--- Test 3: Online Price Fetch & Structured IndexedDB Persistence ---")
        try:
            page.goto(f"{FRONTEND_URL}/prices", wait_until="networkidle")
            page.wait_for_timeout(2000)
            
            # Verify live feed badge
            live_badge = page.locator("[data-testid='live-feed-badge']")
            assert live_badge.is_visible(), "Live feed badge should be visible online"
            
            # Inspect IndexedDB
            idb_data = page.evaluate("""async () => {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open('mandisaathi_offline_db', 1);
                    req.onsuccess = () => {
                        const db = req.result;
                        const tx = db.transaction(['price_records', 'metadata'], 'readonly');
                        const priceReq = tx.objectStore('price_records').getAll();
                        const metaReq = tx.objectStore('metadata').get('last_price_sync');
                        tx.oncomplete = () => {
                            resolve({
                                recordCount: (priceReq.result || []).length,
                                sampleRecord: priceReq.result && priceReq.result[0],
                                metadata: metaReq.result
                            });
                        };
                        tx.onerror = () => reject(tx.error);
                    };
                    req.onerror = () => reject(req.error);
                });
            }""")
            
            assert idb_data["recordCount"] > 0, "IndexedDB price_records store must contain cached records"
            assert idb_data["sampleRecord"]["cachedAt"] is not None, "Record must have cachedAt timestamp"
            assert idb_data["metadata"]["timestamp"] is not None, "Metadata store must have sync timestamp"
            
            log_test(3, "IndexedDB Structured Caching", True, f"Cached {idb_data['recordCount']} records. Sample: {idb_data['sampleRecord']['commodityCode']} in {idb_data['sampleRecord']['mandiCode']}")
        except Exception as e:
            log_test(3, "IndexedDB Structured Caching", False, str(e))
            all_passed = False

        # Step 4: Offline Mode Simulation
        print("\n--- Test 4: Offline Disconnection & Cached Mandi Rate Retrieval ---")
        try:
            # Trigger offline event
            page.evaluate("() => window.dispatchEvent(new Event('offline'))")
            page.wait_for_timeout(1000)
            
            # Verify Offline network status badge in Header
            offline_badge = page.locator("[data-testid='network-status-offline']")
            assert offline_badge.is_visible(), "Header offline badge should be visible"
            
            # Verify Offline alert banner on Price page
            offline_banner = page.locator("[data-testid='offline-alert-banner']")
            assert offline_banner.is_visible(), "Offline alert banner should be visible"
            
            # Verify Offline Cached Mode badge
            cached_badge = page.locator("[data-testid='offline-cached-badge']")
            assert cached_badge.is_visible(), "Offline Cached Mode badge should be displayed"
            
            # Verify table still renders cached prices with reporting dates
            table_rows = page.locator("tbody tr")
            count = table_rows.count()
            assert count > 0, "Offline table must render cached records from IndexedDB"
            
            sample_comm = table_rows.first.locator("td").first.inner_text()
            log_test(4, "Offline Cached Access", True, f"Displayed {count} cached records offline. Sample: {sample_comm.strip()}")
        except Exception as e:
            log_test(4, "Offline Cached Access", False, str(e))
            all_passed = False

        # Step 5: Stale Data Warning (>24 Hours)
        print("\n--- Test 5: Stale Data Warning (>24 Hours Threshold) ---")
        try:
            # Artificially age the cached timestamp by 26 hours in IndexedDB
            page.evaluate("""async () => {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open('mandisaathi_offline_db', 1);
                    req.onsuccess = () => {
                        const db = req.result;
                        const tx = db.transaction(['price_records', 'metadata'], 'readwrite');
                        const pastTime = Date.now() - (26 * 60 * 60 * 1000); // 26 hours ago
                        
                        tx.objectStore('metadata').put({
                            key: 'last_price_sync',
                            timestamp: pastTime,
                            iso: new Date(pastTime).toISOString(),
                            count: 10
                        });
                        
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => reject(tx.error);
                    };
                    req.onerror = () => reject(req.error);
                });
            }""")
            
            # Trigger filter selection to re-evaluate cached prices
            page.select_option("select >> nth=0", "WHEAT")
            page.wait_for_timeout(1000)
            
            stale_badge = page.locator("[data-testid='stale-data-badge']")
            assert stale_badge.is_visible(), "Stale data warning badge must be displayed when >24 hours old"
            
            log_test(5, "Stale Data Warning (>24 hrs)", True, "Stale warning badge displayed correctly for aged cache")
        except Exception as e:
            log_test(5, "Stale Data Warning (>24 hrs)", False, str(e))
            all_passed = False

        # Step 6: Online Recovery
        print("\n--- Test 6: Online Network Reconnection & State Recovery ---")
        try:
            # Reset filters
            page.select_option("select >> nth=0", "")
            page.wait_for_timeout(500)

            # Trigger online event
            page.evaluate("() => window.dispatchEvent(new Event('online'))")
            page.wait_for_timeout(1000)
            
            # Refetch prices
            page.goto(f"{FRONTEND_URL}/prices", wait_until="networkidle")
            page.wait_for_timeout(2000)
            
            online_badge = page.locator("[data-testid='network-status-online']")
            assert online_badge.is_visible(), "Header online badge should be restored"
            
            live_badge = page.locator("[data-testid='live-feed-badge']")
            assert live_badge.is_visible(), "Live APMC feed badge should be restored"
            
            log_test(6, "Online Recovery", True, "System smoothly recovered to live network connection")
        except Exception as e:
            log_test(6, "Online Recovery", False, str(e))
            all_passed = False

        browser.close()

    print("\n" + "=" * 65)
    if all_passed:
        print("ALL PHASE 4B VERIFICATION TESTS PASSED SUCCESSFULLY!")
    else:
        print("SOME TESTS FAILED — CHECK LOGS ABOVE")
    print("=" * 65)
    return all_passed

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
