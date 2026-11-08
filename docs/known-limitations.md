# MandiSaathi — Known Limitations & Operational Boundaries

To ensure complete transparency and engineering integrity, this document enumerates the operational boundaries and known constraints of the MandiSaathi platform.

---

## 1. Agricultural Market Data Scope

### A. Reporting Dates vs. Real-Time Auction Bidding
- **Daily Batch Filings**: Mandi prices in MandiSaathi originate from official APMC market committee filings submitted to the Directorate of Marketing & Inspection (DMI) via Agmarknet (`data.gov.in`).
- **Timing**: Physical auctions occur during morning and afternoon sessions. Daily filings are officially collated and published after auction closure (typically between 4:00 PM and 7:00 PM IST).
- **Not a Stock Ticker**: Mandi prices represent modal, minimum, and maximum rates from closed auction sessions on recorded reporting dates. They do **not** represent instantaneous tick-by-tick bid streams.

### B. Commodity & Geographic Coverage
- **Benchmark Markets**: The baseline verified seed dataset comprises 8 primary benchmark APMC yards across Punjab (`KHANNA_PB`), Haryana (`SIRSA_HR`, `KARNAL_HR`), Rajasthan (`KOTA_RJ`), Madhya Pradesh (`NEEMUCH_MP`), Maharashtra (`LASALGAON_MH`), Uttar Pradesh (`HAPUR_UP`), and Delhi (`AZADPUR_DL`).
- **Dynamic Ingestion Scope**: Additional mandis are provisioned dynamically upon ingestion from `data.gov.in`. However, markets that fail to submit digital records to Agmarknet will display an honest missing-data notice.
- **Crop Seasonality**: Off-season commodities with zero auction arrivals will show no active filings. MandiSaathi explicitly informs the farmer that records are unavailable rather than interpolating historical data.

---

## 2. Speech & Dialect Boundaries

### A. Supported Language Locales
- MandiSaathi supports **Hindi** (`hi-IN`), **Punjabi** (`pa-IN`), and **English** (`en-IN`).
- While Gnani Prisma v2.5 generalizes effectively across sub-regional accents, farmers speaking localized vernacular dialects (such as Malwai, Majhi, Doabi, Haryanvi, Bagri, or Bundeli) with heavy colloquial vocabulary may occasionally experience transcription variance.

### B. Acoustic Environment & Background Noise
- Mandi environments and open fields frequently exceed 75 dB of ambient acoustic noise (tractors, threshers, crowd vocalizations).
- In low signal-to-noise ratio (SNR) conditions, browser WebRTC noise cancellation helps, but audio quality may degrade. If transcription fails, the system provides an accessible text input alternative with clickable prompt chips.

---

## 3. Administrative & Governance Boundaries

### A. Grievance Tracking vs. Official CPGRAMS Filing
- **Internal Reference Number**: Upon registering a complaint (e.g., regarding weighing inaccuracies or unauthorized commission deductions), MandiSaathi issues a structured tracking reference (`MS-2026-XXXXX`).
- **Legal Clarification**: This tracking identifier is internal to MandiSaathi for community transparency, farmer advocacy, and direct presentation to the local APMC Mandi Secretary. It is **not** an official Government of India CPGRAMS (Centralized Public Grievance Redress and Monitoring System) docket acknowledgement.

### B. Price Advisory Disclaimer
- Modal prices reported by MandiSaathi are government-reported statistical medians for fair average quality (FAQ) produce.
- Actual transaction prices at physical mandis vary depending on moisture content, foreign matter percentage, grain luster, and prevailing trader competition during live open outcry or e-NAM bidding.
