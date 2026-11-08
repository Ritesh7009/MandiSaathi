# MandiSaathi — 3-4 Minute Internship Demonstration Script

This script provides an executive, highly structured guide for presenting MandiSaathi during evaluative technical reviews, internship demo days, and viva presentations.

---

## ⏱️ Demonstration Timeline Summary

| Time | Segment | Focus Area | Key Visual / Action |
| :---: | :--- | :--- | :--- |
| **0:00 – 0:25** | Introduction & Problem Context | Rural information asymmetry & digital divide | Home dashboard, telemetry badge, language selector |
| **0:25 – 0:55** | Hindi Voice Query & Timbre Synthesis | Prisma STT, verified modal price, Timbre TTS audio | Voice Assistant (`/assistant`), Hindi query, live audio playback |
| **0:55 – 1:25** | Punjabi Voice & Non-Silent Resolution | District vs. APMC yard resolution without silent swap | Switch to Punjabi, ask for Ludhiana district, prompt for Khanna Mandi |
| **1:25 – 1:55** | Data Grounding & Zero Fabrication | Refusal to hallucinate unrecorded commodity rates | Ask for Onion in Sirsa APMC, observe verified "No data recorded" notice |
| **1:55 – 2:25** | Mandi Comparison & Arbitrage Intelligence | Cross-mandi differential, consistent date guard | Compare page (`/compare`), inter-mandi spread of ₹50/Qtl, Recharts visual |
| **2:25 – 2:55** | Offline-First PWA & Field Resilience | Zero-connectivity field access via IndexedDB + SW | DevTools offline toggle, offline badge, cached rates, stale warning |
| **2:55 – 3:30** | Technical Architecture & Scheduled Ingestion | Server-side security, Flyway V1-V4, `@Scheduled` cron | Health probe, sync status (`/api/v1/prices/sync/status`), test suite |
| **3:30 – 4:00** | Conclusion & Impact | Scalability, e-NAM integration, rural empowerment | Schemes (`/schemes`), Grievance tracking (`/complaints`), Q&A |

---

## 🎬 Step-by-Step Presentation Script

### Segment 1: Introduction (0:00 – 0:25)
- **On-Screen Action**: Open the MandiSaathi Home Dashboard (`http://localhost:5173/`). Point to the agricultural design system, active telemetry banner, and regional language toggles.
- **Spoken Script**:
  > *"Respected evaluators, over 86% of smallholder farmers in India face severe information asymmetry when selling their produce at local APMC mandis. Existing government portals are text-heavy, desktop-centric, and available primarily in English or formal Hindi, leaving rural producers at the mercy of middlemen.  
  > To solve this, we built **MandiSaathi** — a voice-first, multilingual agricultural intelligence platform powered by Spring Boot 3.3.5, PostgreSQL 16, React 19, and Gnani.ai's Prisma STT and Timbre TTS engines. Let me demonstrate how a farmer interacts with the platform using their native voice."*

---

### Segment 2: Hindi Voice Query & Timbre Synthesis (0:25 – 0:55)
- **On-Screen Action**: Navigate to **Voice Assistant** (`/assistant`). Click the large microphone button or submit the query:  
  **`"आज पंजाब में गेहूं का भाव क्या चल रहा है?"`**  
  Show the waveform visualizer reacting, followed by the response card with the green `● Live Gnani AI Connected` badge.
- **Spoken Script**:
  > *"A farmer in Punjab asks in Hindi: 'What is the wheat price in Punjab today?'  
  > The browser streams the audio directly to our Spring Boot backend. Spring Boot securely dispatches it to Gnani Prisma STT, which accurately transcribes it in Hindi (`hi-IN`).  
  > Our NLP engine extracts the commodity 'Wheat' and state 'Punjab'. Instead of generating a hallucinated LLM response, the backend queries our verified Agmarknet database for Khanna Mandi — the largest grain market in Punjab — returning a verified modal price of ₹2320 per quintal.  
  > Listen to Gnani Timbre synthesize the response in natural, fluent Hindi."*
- **On-Screen Action**: Click **"उत्तर सुनें" (Listen Response)** to play the synthesized audio.

---

### Segment 3: Punjabi Voice Query & District Resolution (0:55 – 1:25)
- **On-Screen Action**: Click **"ਪੰਜਾਬੀ"** in the top navigation bar to switch the entire UI to Punjabi. Submit:  
  **`"ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?"`**
- **Spoken Script**:
  > *"Now let's switch to Punjabi. The farmer asks: 'ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?' (What is the wheat price in Ludhiana?)  
  > Here we address a critical real-world domain challenge: Ludhiana is a revenue district, but the official registered APMC yard is Khanna Mandi. A naive system would either fail or silently substitute Khanna without explaining the relationship.  
  > MandiSaathi extracts `district: Ludhiana`, recognizes that Khanna Mandi is the registered APMC yard in Ludhiana district, quotes the verified rate of ₹2320 per quintal, and politely prompts the farmer whether they want to proceed with Khanna Mandi or select another market.  
  > Listen to the authentic Punjabi pronunciation generated live by Gnani Timbre."*
- **On-Screen Action**: Click to play the authentic Punjabi audio response.

---

### Segment 4: Data Grounding & Zero Price Fabrication (1:25 – 1:55)
- **On-Screen Action**: Switch to Hindi. Submit a query for a commodity unrecorded in a specific mandi:  
  **`"आज सिरसा में प्याज का क्या भाव है?"`**
- **Spoken Script**:
  > *"A common failure mode of AI assistants is inventing believable figures when data is missing. In agriculture, an invented price can ruin a farmer's negotiation.  
  > When we ask for Onion prices in Sirsa APMC — where no onion auctions took place today — MandiSaathi's verification guard steps in. It does not fabricate a number. Instead, it honestly states: 'सिरसा मंडी में प्याज़ के लिए आज कोई आधिकारिक भाव दर्ज नहीं है। कृपया मंडी नीलामी समाप्त होने के बाद जांचें।'  
  > Every price displayed by MandiSaathi is strictly grounded in verified APMC auction records."*

---

### Segment 5: Mandi Price Comparison & Arbitrage Safeguard (1:55 – 2:25)
- **On-Screen Action**: Navigate to **Mandi Comparison** (`/compare`). Show the multi-market dashboard comparing Khanna, Sirsa, and Karnal mandis for Wheat.
- **Spoken Script**:
  > *"Farmers frequently want to know where to sell for the highest profit. On the Mandi Comparison screen, our multi-market arbitrage engine compares verified rates across neighboring markets.  
  > For Wheat on November 7th, Khanna Mandi offers ₹2320/quintal while Sirsa offers ₹2270/quintal — revealing an inter-mandi spread of ₹50 per quintal.  
  > Crucially, our comparison guard enforces that comparisons are strictly made on consistent reporting dates. If a market has outdated records or fewer than two mandis have reported, the system warns the farmer rather than giving a distorted recommendation."*

---

### Segment 6: Offline-First PWA & Field Resilience (2:25 – 2:55)
- **On-Screen Action**: Navigate to **Price Intelligence** (`/prices`). Open Chrome DevTools (`F12`), switch the Network throttling dropdown to **Offline**. Show the UI transition.
- **Spoken Script**:
  > *"In rural areas, 4G connectivity is often intermittent. To ensure farmers never lose access to crucial market intelligence in the field, we engineered MandiSaathi as an offline-first Progressive Web App.  
  > Watch as I disconnect the network in DevTools. Instantly:  
  > 1. The header badge switches to amber 'Offline (ऑफ़लाइन)'.  
  > 2. The price table switches to 'Offline Cached Mode' powered by IndexedDB.  
  > 3. We clearly separate the original APMC auction date from the client synchronization timestamp, and display an explicit Stale Data Warning if cached records are over 24 hours old.  
  > 4. As soon as connectivity returns, the app seamlessly recovers without reloading or interrupting the farmer's session."*
- **On-Screen Action**: Restore network to **Online**; show the badge turn green `● Online`.

---

### Segment 7: Technical Architecture & Scheduled Ingestion (2:55 – 3:30)
- **On-Screen Action**: Open the terminal and display `./scripts/test-farmer-journeys.py` (all 5 passing), or curl `http://localhost:8080/api/v1/prices/sync/status`.
- **Spoken Script**:
  > *"Behind the scenes, MandiSaathi is built with enterprise engineering standards:  
  > 1. Security: Zero API keys are stored in client bundles. All Gnani credentials and data.gov.in tokens reside strictly server-side on Spring Boot.  
  > 2. Scheduled Ingestion: An automated `@Scheduled` cron job runs nightly at 19:00 IST to ingest and validate daily Agmarknet closed auction prices, maintaining complete sync audit logs in PostgreSQL.  
  > 3. Database Integrity: Flyway migrations V1 through V4 manage PostgreSQL schemas with strict composite unique constraints preventing duplicate records.  
  > 4. Automated Testing: 39 Spring Boot tests and comprehensive Playwright suites validate PWA caching, mobile viewports, and all five core farmer workflows."*

---

### Segment 8: Conclusion & Rural Impact (3:30 – 4:00)
- **On-Screen Action**: Briefly show the **Government Schemes** page (`/schemes`) and the **Grievance Registration** screen (`/complaints`).
- **Spoken Script**:
  > *"Beyond daily prices, MandiSaathi democratizes access to schemes like PM-KISAN and provides a voice-assisted grievance registration workflow that generates verifiable tracking IDs for dispute resolution.  
  > By combining Gnani's Indic conversational AI with strict APMC data grounding and offline resilience, MandiSaathi bridges the digital divide for millions of Indian farmers.  
  > Thank you for your time and guidance. We look forward to your questions."*
