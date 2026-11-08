# MandiSaathi — 3-4 Minute Internship Demonstration Script

This script provides a structured guide for presenting MandiSaathi during evaluative technical reviews and internship project submissions.

---

## ⏱️ Demonstration Timeline Summary

| Time | Segment | Focus Area |
| :---: | :--- | :--- |
| **0:00 – 0:25** | Introduction & Problem Context | Rural market information gap & digital divide |
| **0:25 – 1:00** | Live Hindi Voice Interaction | Prisma STT, verified modal rate, Timbre TTS audio |
| **1:00 – 1:35** | Punjabi Voice Interaction & District Resolution | Non-silent Ludhiana resolution & native Punjabi speech |
| **1:35 – 2:00** | English Voice Interaction | Cross-lingual versatility & price breakdown |
| **2:00 – 2:30** | Data Integrity & Ambiguity Handling | Refusal to invent prices & clarification questions |
| **2:30 – 3:00** | Market Comparison & Comparison Guard | Date-consistent spread calculation & data sufficiency checks |
| **3:00 – 3:30** | Technical Architecture & Security | Server-side Gnani integration & Flyway persistence |
| **3:30 – 4:00** | Conclusion & Future Roadmap | Offline-first PWA, e-NAM integration & impact |

---

## 🎬 Step-by-Step Presentation Script

### Segment 1: Introduction (0:00 – 0:25)
- **On-Screen Action**: Display the MandiSaathi Dashboard (`http://localhost:5173/`). Point out the clean agricultural UI, active telemetry banner, and regional language selector in the top bar.
- **Spoken Script**:
  > *"Respected evaluators, today over 86% of smallholder farmers in India face severe information asymmetry when selling their crops at local APMC mandis. Existing government portals are text-heavy, desktop-centric, and available primarily in English or formal Hindi, creating a significant barrier for rural producers.  
  > To solve this, we built **MandiSaathi** — a voice-first, multilingual agricultural intelligence platform powered by Spring Boot, PostgreSQL, React 19, and Gnani.ai's Prisma STT and Timbre TTS engines. Let me demonstrate how a farmer interacts with the platform using their native voice."*

---

### Segment 2: Hindi Voice Query (0:25 – 1:00)
- **On-Screen Action**: Navigate to **Voice Assistant** (`/assistant`). Click the large microphone button (or enter the query in the input box). Speak or submit:  
  **`"आज पंजाब में गेहूं का भाव क्या चल रहा है?"`**  
  Show the audio visualizer reacting, followed by the appearance of the response card.
- **Spoken Script**:
  > *"A farmer in Punjab asks in Hindi: 'What is the wheat price in Punjab today?'  
  > Notice the sequence: the browser streams the audio directly to our Spring Boot backend. Spring Boot forwards it securely to Gnani Prisma STT, which transcribes it as 'आज पंजाब में गेहूँ का भाव क्या चल रहा है' with detected language `hi-IN`.  
  > Our NLP engine extracts the commodity 'Wheat' and state 'Punjab'. Instead of generating a hallucinated AI answer, the backend retrieves the verified Agmarknet record for Khanna Mandi — the largest grain market in Punjab — showing a modal price of ₹2320.00 per quintal reported on November 7th.  
  > Listen to Gnani Timbre synthesize the response in natural, fluent Hindi."*
- **On-Screen Action**: Click **"उत्तर सुनें" (Listen Response)** to play the synthesized audio. Point out the badge: `● Live Gnani AI Connected`.

---

### Segment 3: Punjabi Voice Query & District Resolution (1:00 – 1:35)
- **On-Screen Action**: Click **"ਪੰਜਾਬੀ"** in the top navigation to switch the UI dialect to Punjabi. Submit the Punjabi voice query:  
  **`"ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?"`**
- **Spoken Script**:
  > *"Now let's switch to Punjabi. The farmer asks: 'ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?'  
  > Here we solve an important domain problem: Ludhiana is a district name, but the official registered APMC yard is Khanna Mandi. A naive system would either return an error or silently substitute Khanna without telling the farmer.  
  > MandiSaathi extracts `district: Ludhiana`, recognizes that Khanna Mandi is the registered APMC yard in Ludhiana district, quotes the verified rate of ₹2320.00 per quintal, and politely prompts the farmer whether they want to proceed with Khanna Mandi or select another market.  
  > Listen to the authentic Punjabi pronunciation generated live by Gnani Timbre."*
- **On-Screen Action**: Play the Punjabi audio response (`ਪ੍ਰਮਾਣਿਤ ਮਾਡਲ ਭਾਅ ₹2320.00 ਪ੍ਰਤੀ ਕੁਇੰਟਲ...`).

---

### Segment 4: English Voice Query (1:35 – 2:00)
- **On-Screen Action**: Switch language to **English**. Submit query:  
  **`"What is the wheat price in Punjab today?"`**
- **Spoken Script**:
  > *"For extension officers, FPO leaders, and English-speaking users, MandiSaathi operates seamlessly in Indian English.  
  > The engine transcribes the query, detects `en-IN`, retrieves the verified rate, and Timbre synthesizes the response using the Kaveri voice. The response displays the full breakdown: minimum ₹2275, maximum ₹2380, and modal ₹2320 per quintal."*

---

### Segment 5: Missing-Data Handling & Ambiguity Clarification (2:00 – 2:30)
- **On-Screen Action**: Submit an ambiguous query without a location:  
  **`"गेहूं का भाव क्या है?"`**
- **Spoken Script**:
  > *"What happens if a farmer asks an incomplete question without naming a mandi or state?  
  > Rather than picking an arbitrary market or generating a nationwide average, MandiSaathi identifies that the market was omitted, lists the top active mandis currently tracking wheat (Sirsa, Khanna, Karnal), and asks the farmer to specify their location.  
  > Similarly, if a farmer asks about a crop that is unlisted or has no daily filings, such as Onion in Khanna Mandi, the system truthfully states that no official record exists for today rather than inventing a price."*

---

### Segment 6: Market Comparison & Arbitrage Safeguard (2:30 – 3:00)
- **On-Screen Action**: Navigate to **Mandi Comparison** (`/compare`) or submit in voice:  
  **`"पंजाब में किस मंडी में गेहूं का सबसे अच्छा भाव मिल रहा है?"`**
- **Spoken Script**:
  > *"Farmers frequently want to know where to sell for the highest profit. However, comparing prices across different dates or recommending a market when only one mandi has filed reports is misleading.  
  > When we ask for the best wheat market in Punjab, our comparison guard detects that only Khanna Mandi has filed reports for November 7th. It explicitly warns that comparative data is insufficient and requires filings from at least two mandis on the same date.  
  > Conversely, when comparing multiple markets like Karnal, Sirsa, and Kota on the same reporting date, it immediately computes the inter-mandi spread of ₹50 per quintal, helping the farmer make an informed logistical decision."*

---

### Segment 7: Technical Architecture & Security (3:00 – 3:30)
- **On-Screen Action**: Open the terminal and display `./scripts/verify-gnani.sh` passing, or show `http://localhost:8080/api/v1/health`.
- **Spoken Script**:
  > *"Architecturally, MandiSaathi is designed with production rigor:  
  > 1. All Gnani API keys and data.gov.in credentials are guarded strictly server-side on Spring Boot. Zero secrets are exposed in browser bundles.  
  > 2. Database schemas are versioned with Flyway migrations V1 through V3 on PostgreSQL 16, enforcing unique constraints on commodity, mandi, and auction date to prevent duplicates.  
  > 3. Automated unit and integration tests achieve 34 out of 34 passing tests, and Playwright emulates real Android browser viewports under 3G throttling to guarantee responsive performance."*

---

### Segment 8: Conclusion & Future Scope (3:30 – 4:00)
- **On-Screen Action**: Show the **Government Schemes** page (`/schemes`) and the **Grievance Registration** screen (`/complaints`).
- **Spoken Script**:
  > *"Beyond price discovery, MandiSaathi integrates a directory of schemes like PM-KISAN and an accessible grievance logging workflow that issues structured tracking numbers for collective advocacy.  
  > For Phase 4B, our roadmap includes offline-first Progressive Web App (PWA) caching for zero-connectivity field use and integration with e-NAM digital trading APIs.  
  > Thank you for your time. We are now open for technical questions."*

