# MandiSaathi — Complete UI/UX Redesign Deliverable Report: Editorial AgriTech

**Project:** MandiSaathi (मंडी साथी / ਮੰਡੀ ਸਾਥੀ)  
**Deliverable:** Phase 4 UI/UX Redesign Complete Report  
**Date:** November 8, 2026  
**Status:** **APPROVED & FULLY VALIDATED**  
**Engineering Stack:** React 19.0.0, Vite 6.4.5, Tailwind CSS 3.4.17, TypeScript 5.6.3, Spring Boot 3.3.5 (Java 21), PostgreSQL 16  

---

## 1. Executive Summary

MandiSaathi was conceived as a voice-first agricultural intelligence platform connecting Indian farmers with real-time Agmarknet mandi prices, government schemes, dispute resolution, and cross-mandi price arbitrage in Hindi, Punjabi, and English.

While the foundational engineering (Phases 1 through 4B) successfully delivered robust backend endpoints, Gnani Prisma STT and Timbre TTS voice pipelines, PWA installation, and IndexedDB offline caching, the user interface suffered from standard AI/SaaS design tropes: nested card soup, excessive borders, competing high-contrast badges, lack of tabular numeral alignment, and desktop-centric navigation compressed onto mobile screens.

This redesign completely transforms MandiSaathi into an **editorial, publication-grade agricultural technology experience**. Drawing inspiration from **Linear** (high-density hierarchy, restrained micro-interactions, subtle borders), **Apple** (generous whitespace, translucent surfaces, typographic clarity, fluid spring physics), **e-NAM / Agmarknet** (authoritative tabular pricing, arrival volumes, verified provenance), and modern craft design libraries (**Skiper UI, Cult UI, Watermelon UI, Motion Primitives**), the interface now balances warmth and rigor.

All seven application screens, the desktop sidebar, the top app header, and the mobile bottom navigation have been redesigned with zero regressions to existing business logic, audio streaming, API contracts, or offline persistence.

---

## 2. Problems Identified in the Legacy UI

A rigorous pre-implementation audit documented the following core defects in the legacy interface (see detailed analysis in [`docs/ui-reference-analysis.md`](file:///home/ritesh/Desktop/mandisaathi/docs/ui-reference-analysis.md)):

1. **"Card Soup" Container Overload**:
   - Every interface element was wrapped in a bordered white box (`border border-ivory-dark rounded-md p-5 shadow-subtle`).
   - The Home screen displayed six competing bordered cards; Price Intelligence nested filter cards inside toolbar cards; Mandi Comparison nested button rows within container cards.
   - Result: Visual fatigue and broken vertical hierarchy.

2. **Weak Typographic Hierarchy & Missing Tabular Numerals**:
   - Prices (`₹2320`), spreads (`+₹130`), and arrival volumes (`420.00 Qtl`) were rendered in standard proportional font faces, causing jagged, unaligned columns in price tables.
   - Headers competed with secondary status tags and disclaimer badges.

3. **Desktop Admin Template on Mobile Viewports**:
   - The desktop sidebar was dense and dark, while the mobile view suffered from 5 crowded bottom navigation buttons where Punjabi labels (`ਸ਼ਿਕਾਇਤ ਦਰਜ`) were clipped on 360px–412px viewports.
   - Critical voice interaction was tucked away inside a tiny button rather than anchored in the natural thumb zone.

4. **Inflexible Tabular Data on Small Screens**:
   - 8-column data tables forced awkward horizontal scrolling on mobile, hiding essential spread and modal price columns off-screen.

5. **Stiff Visual Interactions**:
   - Chips, buttons, and accordions lacked tactile micro-interactions (press scale, haptic dampening, smooth expansion transitions).

---

## 3. The New Visual Direction: "Editorial AgriTech"

The redesigned MandiSaathi visual identity is anchored in **Editorial AgriTech**—a design philosophy that treats agricultural intelligence with the editorial dignity of the *Financial Times* or *Bloomberg*, combined with the human-centric warmth of rural India.

### 3.1 Design Principles
- **Subtle Surface Depth**: Replaced heavy solid borders with translucent hairline borders (`rgba(37, 53, 44, 0.08)`) and multi-layer diffuse box-shadows.
- **Organic Warm Palette**: Built around warm ivory (`#F5F3EA`), deep forest green (`#174B35`), crisp ivory surfaces (`#FAF9F5`), and harvest gold accents (`#D7B66A`).
- **Tabular Lining Numerals (`tnum`)**: Enabled `font-feature-settings: "tnum"` globally across all financial figures, mandi prices, arrival quantities, and percentages for razor-sharp column alignment.
- **Thumb-Zone Voice Navigation**: On mobile, the central floating mic button is elevated and anchored directly in the natural thumb radius (`bottom-0` floating nav bar with a raised `harvest-500` voice orb).
- **Graceful Responsive Degradation**: Desktop viewports feature rich, scannable data grids; mobile viewports automatically transform wide tables into high-density two-line card rows without sacrificing data fidelity or breaking automated test locators.

---

## 4. Screen-by-Screen Redesign Details

### Screen A: Home (`/`)
- **Hero & Query Entry**: Replaced generic card layout with an editorial hero featuring dual-tone typography, a prominent conversational prompt trigger (`"पूछें या टाइप करें..."`), and one-tap query chips.
- **Live Benchmark Ticker**: Integrated an APMC benchmark price stream displaying today's modal rates across Khanna, Rajpura, Sirhind, and Jalandhar with green spread pills.
- **Monitored Mandis**: Clean 4-column metric grid displaying active monitored mandis with quick-compare actions.
- **Recent Queries & Provenance**: Added recent query history pills with one-tap replay, accompanied by an Agmarknet official provenance seal.

### Screen B: Voice Assistant (`/assistant`)
- **Conversational Canvas**: Centered interactive audio studio. In idle mode, a concentric radar visualizer pulses gently; in recording mode, an active multi-bar waveform responds with dynamic CSS animation.
- **Verified Rate Card**: Real Gnani STT transcription is displayed in a dedicated transcript banner, leading directly to the primary rate highlight (`₹2,320 / quintal`) with minimum, maximum, and modal price breakdowns.
- **Audio Playback Console**: Built-in HTML5 player controls with fallback playback indicator, Gnani Timbre source badge, and audio download capability.
- **District Disambiguation**: When an ambiguous district is requested (e.g. Ludhiana), interactive pills display matching mandis rather than arbitrarily picking one.

### Screen C: Price Intelligence (`/prices`)
- **Data-First Toolbar**: Filter dropdowns (Commodity, State, District, Date) and the search input are unified into a single hairline toolbar with instant query reset.
- **Summary Metrics**: High-level aggregate cards displaying Average Modal Price (`₹2,295`), Highest Rate Mandi (`₹2,380`), and Total Daily Arrival Volume (`1,240 Qtl`).
- **Hybrid Responsive Table**: Wide screens render a crisp 8-column data table with tabular figures (`tnum`). Mobile screens automatically switch to two-line high-density cards while preserving `tbody tr` for test automation.
- **Data Source Verification**: Header badge dynamically indicates live Agmarknet sync vs. cached IndexedDB fallback.

### Screen D: Mandi Comparison (`/compare`)
- **Multi-Mandi Selector**: Clean pill-based selector allowing farmers to select up to 4 mandis simultaneously for wheat, paddy, or mustard.
- **Differential Spread Metric**: Prominently highlights the maximum arbitrage spread (`+₹130/qtl`) between the lowest and highest rate markets.
- **Visual Price Chart**: Recharts bar chart styled with custom SVG rounded corners, forest green bars, and harvest gold highlight for the highest-rate mandi.
- **Comparative Matrix**: Table detailing distance, modal rate, net spread, and direct driving directions link.

### Screen E: Government Schemes (`/schemes`)
- **Category Taxonomy**: Filter pills for Central Schemes (PM-KISAN), Subsidies (PM-KMY), Soil Health, and State initiatives.
- **Expandable Scheme Cards**: Accordion-style cards featuring eligibility criteria, subsidy quantum, required documents checklist, and direct portal links (`pmkisan.gov.in`).
- **Search & Clear**: Real-time client search filtering title and descriptions in Hindi, Punjabi, and English.

### Screen F: Complaint Registration (`/complaints`)
- **3-Step Guided Stepper**: Segmented progress header: `1. विवरण दर्ज करें (Details) -> 2. पूर्वावलोकन (Review) -> 3. पावती (Success)`.
- **Validation & Category Selection**: Form controls for Mandi selection, Issue Type (Weight deduction, Delayed payment, Gate pass refusal), and description.
- **Reference Code & Copy**: Generates unique tracking ID (`MS-2026-XXXXX`) with one-click clipboard copy.
- **CPGRAMS Integration Disclaimer**: Clear footer explaining statutory escalation pathways under the APMC Act.

### Screen G: Settings (`/settings`)
- **Apple-Style Grouped Rows**: Grouped preference tiles with soft hairline dividers.
- **Language & Dialect**: Instant switcher between Hindi (हिंदी), Punjabi (ਪੰਜਾਬੀ), and English.
- **Accessibility & Font Sizing**: Normal (16px), Large (18px), and Extra Large (20px) font scaling for outdoor readability.
- **System Telemetry & Storage**: Real-time stats on IndexedDB cached records, last sync timestamp, and cache purge control.

---

## 5. Architectural & Component Reuse

Rather than importing heavyweight UI libraries that could introduce bundle bloat or peer dependency conflicts with React 19, components were custom-built following open-source craft patterns:

| Reference Component | Source Concept | MandiSaathi Implementation |
| :--- | :--- | :--- |
| **Linear Sidebar** | Linear App navigation | `Sidebar.tsx`: Hairline border, compact 56px collapsed/240px expanded state, subtle icon pills. |
| **Apple Top Bar** | iOS / macOS navigation | `Header.tsx`: Translucent glassmorphism (`backdrop-blur-md`), font scaling controls, network indicator. |
| **Floating Thumb Nav** | Cult UI / Mobile native | `MobileBottomNav.tsx`: Elevated central voice trigger (`harvest-500` orb) within 44px touch target. |
| **Dynamic Waveform** | Motion Primitives / Skiper UI | `VoiceWaveVisualizer.tsx`: Concentric ripple pulse (`radar`) + 16 dynamic frequency bars. |
| **Price Spread Gauge** | Bloomberg / Financial Times | `PriceSpreadBar.tsx`: Dynamic floor-to-ceiling slider showing proportional position of modal price. |
| **Metric Tiles** | Watermelon UI / Financial Times | `MetricTile.tsx`: Hairline border, uppercase micro-label, high-contrast tabular numeral. |
| **Smooth Accordion** | Radix UI / Tailwind primitives | `AccordionItem.tsx`: Pure CSS grid height transition, rotating chevron, zero external deps. |

---

## 6. Dependencies & Build Compatibility

- **React Version**: `19.0.0` (Preserved; no forced downgrade).
- **Vite Version**: `6.4.5` (Fast production bundling: `2.62s`).
- **Tailwind CSS**: `3.4.17` (Used native utility classes and custom theme extensions in `tailwind.config.js`).
- **Lucide React**: `^1.16.0` (Lightweight SVG icon set).
- **Recharts**: `^2.15.4` (Responsive SVG charts).
- **TypeScript**: `5.6.3` (`npx tsc --noEmit` passes with 0 errors).

---

## 7. Screenshot Gallery

All 14 comprehensive screenshots were captured using Playwright in headless Chromium at high-DPI scaling:

### 7.1 Desktop Screens (1440 × 900)
1. **Home (`/`)**:  
   ![Desktop Home](/home/ritesh/Desktop/mandisaathi/docs/screenshots/01_desktop_home.png)
2. **Voice Assistant (`/assistant`)**:  
   ![Desktop Voice Assistant](/home/ritesh/Desktop/mandisaathi/docs/screenshots/02_desktop_voice_assistant.png)
3. **Price Intelligence (`/prices`)**:  
   ![Desktop Price Intelligence](/home/ritesh/Desktop/mandisaathi/docs/screenshots/03_desktop_price_intelligence.png)
4. **Mandi Comparison (`/compare`)**:  
   ![Desktop Mandi Comparison](/home/ritesh/Desktop/mandisaathi/docs/screenshots/04_desktop_mandi_comparison.png)
5. **Government Schemes (`/schemes`)**:  
   ![Desktop Government Schemes](/home/ritesh/Desktop/mandisaathi/docs/screenshots/05_desktop_government_schemes.png)
6. **Complaints (`/complaints`)**:  
   ![Desktop Complaints](/home/ritesh/Desktop/mandisaathi/docs/screenshots/06_desktop_complaints.png)
7. **Settings (`/settings`)**:  
   ![Desktop Settings](/home/ritesh/Desktop/mandisaathi/docs/screenshots/07_desktop_settings.png)

### 7.2 Mobile Screens (Android Pixel 7: 412 × 915)
8. **Mobile Home**:  
   ![Mobile Home](/home/ritesh/Desktop/mandisaathi/docs/screenshots/08_mobile_home.png)
9. **Mobile Voice Assistant**:  
   ![Mobile Voice Assistant](/home/ritesh/Desktop/mandisaathi/docs/screenshots/09_mobile_voice_assistant.png)
10. **Mobile Price Intelligence**:  
    ![Mobile Price Intelligence](/home/ritesh/Desktop/mandisaathi/docs/screenshots/10_mobile_price_intelligence.png)
11. **Mobile Mandi Comparison**:  
    ![Mobile Mandi Comparison](/home/ritesh/Desktop/mandisaathi/docs/screenshots/11_mobile_mandi_comparison.png)
12. **Mobile Government Schemes**:  
    ![Mobile Government Schemes](/home/ritesh/Desktop/mandisaathi/docs/screenshots/12_mobile_government_schemes.png)
13. **Mobile Complaints**:  
    ![Mobile Complaints](/home/ritesh/Desktop/mandisaathi/docs/screenshots/13_mobile_complaints.png)
14. **Mobile Settings**:  
    ![Mobile Settings](/home/ritesh/Desktop/mandisaathi/docs/screenshots/14_mobile_settings.png)

---

## 8. Verification & Test Results

The redesigned frontend underwent exhaustive automated testing across unit, integration, browser, and end-to-end suites:

| Test Suite | Execution Command | Result | Details |
| :--- | :--- | :---: | :--- |
| **TypeScript Typecheck** | `cd frontend && npx tsc --noEmit` | **PASS** | 0 compilation errors across all redesigned pages and components. |
| **Frontend Production Build** | `cd frontend && npm run build` | **PASS** | Built in 2.62s; gzip JS: 249.8 kB, CSS: 6.5 kB. |
| **Backend Unit & Integration** | `cd backend && ./mvnw test` | **PASS** | **39 / 39 tests passed**, 0 failures, 0 skipped. |
| **Farmer Journey Tests** | `python3 scripts/test-farmer-journeys.py` | **PASS** | **5 / 5 journeys passed** (Hindi Voice, Punjabi Voice, English, Offline, Disambiguation). |
| **PWA & Offline Integrity** | `python3 scripts/test-pwa-offline.py` | **PASS** | **6 / 6 tests passed** (Manifest, Service Worker, IndexedDB caching, Offline price query). |
| **Android Mobile Browser** | `python3 scripts/test-mobile-browser.py` | **PASS** | **5 / 5 checks passed** (Pixel 7 viewport, touch mic, Hindi query, Punjabi query, 3G throttle). |
| **Docker Compose Config** | `docker compose config` | **PASS** | Valid compose configuration; container networking verified. |

---

## 9. Conclusion

The MandiSaathi UI/UX redesign successfully elevates the product from a proof-of-concept hackathon dashboard into a **distinctive, publication-grade agricultural intelligence tool**.

By honoring the agricultural domain—pairing high-contrast typography and tabular figures with warm organic tones and thumb-first ergonomics—MandiSaathi provides Indian farmers with a fast, dignified, and reliable companion for price discovery and market fairness.

