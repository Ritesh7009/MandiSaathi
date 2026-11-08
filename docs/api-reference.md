# MandiSaathi — REST API Reference Specification

All endpoints are hosted under the base URI path `/api/v1`.  
Unless otherwise stated, endpoints consume and produce `application/json`.

---

## 1. System Health & Diagnostics

### `GET /api/v1/health`
Retrieves granular health and operational status for all internal subsystems and external integrations.

- **Purpose**: System telemetry and live connection status.
- **Authentication**: None.
- **Parameters**: None.
- **Success Response** (`200 OK` or `503 Service Unavailable`):
```json
{
  "status": "UP",
  "timestamp": "2026-11-08T06:27:09.979Z",
  "version": "0.1.0-phase1",
  "environment": "dev",
  "services": {
    "database": {
      "status": "UP",
      "type": "PostgreSQL",
      "connectionStatus": "CONNECTED"
    },
    "gnaniPrismaStt": {
      "status": "CONNECTED",
      "model": "prisma-v2.5",
      "endpoint": "https://api.vachana.ai/stt/v3"
    },
    "gnaniTimbreTts": {
      "status": "CONNECTED",
      "model": "timbre-v2.5",
      "endpoint": "https://api.vachana.ai/api/v1/tts/inference",
      "voiceHindi": "Nalini",
      "voicePunjabi": "Nalini",
      "voiceEnglish": "Kaveri"
    },
    "mandiDataSource": {
      "status": "STUBBED",
      "source": "Agmarknet / data.gov.in (OGD)",
      "catalog": "current-daily-price-various-commodities-various-markets-mandi"
    },
    "gnaniVoice": {
      "status": "CONFIGURED",
      "prismaStt": "prisma-v2.5",
      "timbreTts": "timbre-v2.5"
    }
  }
}
```

---

## 2. Voice Assistant & Natural Language Processing

### `POST /api/v1/voice/query`
Processes vernacular text queries, extracts agricultural entities, retrieves price records, and synthesizes speech audio.

- **Purpose**: Text-mode conversational query execution.
- **Request Headers**: `Content-Type: application/json`
- **Request Body** (`VoiceQueryRequest`):
```json
{
  "queryText": "आज पंजाब में गेहूं का भाव क्या चल रहा है?",
  "language": "hi"
}
```
- **Response Body** (`VoiceQueryResponse`):
```json
{
  "query": "आज पंजाब में गेहूं का भाव क्या चल रहा है?",
  "detectedLanguage": "hi-IN",
  "intent": "MANDI_PRICE_LOOKUP",
  "extractedEntities": {
    "commodity": "WHEAT",
    "state": "Punjab"
  },
  "priceRecords": [
    {
      "id": 1,
      "commodityCode": "WHEAT",
      "commodityNameEn": "Wheat",
      "commodityNameHi": "गेहूं",
      "commodityNamePa": "ਕਣਕ",
      "mandiCode": "KHANNA_PB",
      "mandiNameEn": "Khanna Mandi",
      "mandiNameHi": "खन्ना मंडी",
      "mandiNamePa": "ਖੰਨਾ ਮੰਡੀ",
      "state": "Punjab",
      "district": "Ludhiana",
      "minPrice": 2275.00,
      "maxPrice": 2380.00,
      "modalPrice": 2320.00,
      "priceDate": "2026-11-07",
      "arrivalQuantity": 850.00,
      "unit": "QUINTAL",
      "dataSource": "Agmarknet (DAC&FW)",
      "verified": true
    }
  ],
  "responseText": "खन्ना मंडी में गेहूं का प्रमाणित मॉडल भाव ₹2320.00 प्रति क्विंटल है (न्यूनतम: ₹2275.00, अधिकतम: ₹2380.00, दिनांक: 2026-11-07)।",
  "responseTextHi": "खन्ना मंडी में गेहूं का प्रमाणित मॉडल भाव ₹2320.00 प्रति क्विंटल है (न्यूनतम: ₹2275.00, अधिकतम: ₹2380.00, दिनांक: 2026-11-07)।",
  "responseTextPa": "ਖੰਨਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਪ੍ਰਮਾਣਿਤ ਮਾਡਲ ਭਾਅ ₹2320.00 ਪ੍ਰਤੀ ਕੁਇੰਟਲ ਹੈ (ਘੱਟੋ-ਘੱਟ: ₹2275.00, ਵੱਧ ਤੋਂ ਵੱਧ: ₹2380.00, ਮਿਤੀ: 2026-11-07)।",
  "audioBase64": "UklGRv....(Base64-encoded 16kHz WAV)",
  "source": "Agmarknet (DAC&FW)",
  "reportingDate": "2026-11-07",
  "aiServiceStatus": "CONNECTED",
  "isLiveGnaniConnected": true,
  "engineNotice": "Live Gnani Prisma v2.5 STT & Timbre v2.5 TTS voice pipeline active.",
  "relatedQueries": [
    "आज पंजाब में गेहूं का भाव क्या चल रहा है?",
    "ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?",
    "Compare wheat prices in nearby mandis",
    "What documents are needed for PM-KISAN?"
  ]
}
```

---

### `POST /api/v1/voice/audio`
Accepts a binary audio stream, forwards it to Gnani Prisma STT, passes the transcript to `VoiceAssistantService`, and synthesizes a spoken audio response via Gnani Timbre TTS.

- **Purpose**: Voice-mode multipart query upload.
- **Request Headers**: `Content-Type: multipart/form-data`
- **Form Data Parameters**:
  - `audio` (required, `MultipartFile`): Binary audio in WAV, WebM, or MP4 container (max 15MB).
  - `language` (optional, string): Dialect hint (`hi`, `pa`, `en`).
- **Success Response** (`200 OK`): Identical structure to `VoiceQueryResponse` above, with `transcript` populated with the raw STT output.
- **Error Response** (`400 Bad Request`): Returned when audio file is empty or missing:
```json
{
  "transcript": "",
  "detectedLanguage": "hi-IN",
  "intent": "UNKNOWN",
  "extractedEntities": {},
  "priceRecords": [],
  "responseText": "कोई ऑडियो प्राप्त नहीं हुआ। कृपया दोबारा बोलें।",
  "audioBase64": null,
  "aiServiceStatus": "FAILED",
  "isLiveGnaniConnected": false,
  "engineNotice": "Audio payload is empty."
}
```

---

## 3. Mandi Prices & Comparison

### `GET /api/v1/prices`
Retrieves daily verified market price records with optional filtering.

- **Query Parameters**:
  - `commodityCode` (optional, string): e.g. `WHEAT`, `MUSTARD`, `ONION`.
  - `mandiCode` (optional, string): e.g. `KHANNA_PB`, `SIRSA_HR`.
- **Success Response** (`200 OK`): Array of `PriceRecordDto`:
```json
[
  {
    "id": 1,
    "commodityCode": "WHEAT",
    "commodityNameEn": "Wheat",
    "commodityNameHi": "गेहूं",
    "commodityNamePa": "ਕਣਕ",
    "mandiCode": "KHANNA_PB",
    "mandiNameEn": "Khanna Mandi",
    "mandiNameHi": "खन्ना मंडी",
    "mandiNamePa": "ਖੰਨਾ ਮੰਡੀ",
    "state": "Punjab",
    "district": "Ludhiana",
    "minPrice": 2275.00,
    "maxPrice": 2380.00,
    "modalPrice": 2320.00,
    "priceDate": "2026-11-07",
    "arrivalQuantity": 850.00,
    "unit": "QUINTAL",
    "dataSource": "Agmarknet (DAC&FW)",
    "verified": true
  }
]
```

---

### `POST /api/v1/prices/compare`
Calculates price arbitrage and spread across multiple mandis for a given crop.

- **Request Body** (`PriceComparisonRequest`):
```json
{
  "commodityCode": "WHEAT",
  "mandiCodes": ["KHANNA_PB", "SIRSA_HR", "KARNAL_HR", "KOTA_RJ"]
}
```
- **Success Response** (`200 OK`): `PriceComparisonDto`:
```json
{
  "commodityCode": "WHEAT",
  "commodityNameEn": "Wheat",
  "commodityNameHi": "गेहूं",
  "commodityNamePa": "ਕਣਕ",
  "highestModalPrice": 2345.00,
  "lowestModalPrice": 2295.00,
  "spread": 50.00,
  "bestMandiCode": "KARNAL_HR",
  "bestMandiName": "Karnal Mandi",
  "records": [ ... ],
  "comparisonDate": "2026-11-07"
}
```

---

### `POST /api/v1/prices/sync`
Triggers synchronization with the official `data.gov.in` Agmarknet feed.

- **Success Response** (`200 OK`): `IngestionSummaryDto`:
```json
{
  "totalFetched": 100,
  "insertedCount": 12,
  "updatedCount": 84,
  "skippedCount": 4,
  "status": "CONNECTED",
  "message": "Ingested 12 new price records, updated 84, skipped 4 from official Agmarknet feed.",
  "timestamp": "2026-11-08T07:15:00Z"
}
```

---

### `GET /api/v1/prices/sync/status`
Retrieves the automated cron ingestion schedule configuration, execution lock state, and recent ingestion execution runs stored in the `ingestion_runs` table.

- **Success Response** (`200 OK`): `SyncStatusDto`:
```json
{
  "scheduleEnabled": false,
  "cron": "0 0 19 * * *",
  "zone": "Asia/Kolkata",
  "isRunning": false,
  "upstreamStatus": "STUBBED",
  "latestRun": {
    "id": 1,
    "startedAt": "2026-11-08T07:40:38.495Z",
    "completedAt": "2026-11-08T07:40:38.517Z",
    "status": "SKIPPED",
    "totalFetched": 0,
    "insertedCount": 0,
    "updatedCount": 0,
    "skippedCount": 0,
    "message": "data.gov.in Agmarknet API key not configured. Retaining verified Agmarknet baseline telemetry.",
    "errorDetails": null,
    "triggeredBy": "MANUAL_SYNC"
  },
  "recentRuns": [
    {
      "id": 1,
      "startedAt": "2026-11-08T07:40:38.495Z",
      "completedAt": "2026-11-08T07:40:38.517Z",
      "status": "SKIPPED",
      "totalFetched": 0,
      "insertedCount": 0,
      "updatedCount": 0,
      "skippedCount": 0,
      "message": "data.gov.in Agmarknet API key not configured. Retaining verified Agmarknet baseline telemetry.",
      "errorDetails": null,
      "triggeredBy": "MANUAL_SYNC"
    }
  ]
}
```

---

## 4. Commodity & Mandi Reference Catalogs

### `GET /api/v1/commodities`
Lists tracked agricultural crops. Optional filter: `?category=CEREALS` or `OILSEEDS`.

### `GET /api/v1/commodities/{code}`
Retrieves a single commodity by code (e.g., `WHEAT`). Returns `404 Not Found` if code does not exist.

### `GET /api/v1/mandis`
Lists active APMC market yards. Optional filter: `?state=Punjab`.

### `GET /api/v1/mandis/{code}`
Retrieves a single mandi by code (e.g., `KHANNA_PB`). Returns `404 Not Found` if code does not exist.

---

## 5. Government Schemes

### `GET /api/v1/schemes`
Lists central and state agricultural support schemes.
- **Query Parameters**:
  - `category` (optional, string): e.g. `FINANCIAL_DIRECT`, `INSURANCE`, `INFRASTRUCTURE`.
  - `search` (optional, string): Keyword match against title, code, or description.
- **Success Response** (`200 OK`): Array of `SchemeDto`:
```json
[
  {
    "code": "PM_KISAN",
    "nameEn": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
    "nameHi": "प्रधानमंत्री किसान सम्मान निधि (पीएम-किसान)",
    "namePa": "ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਕਿਸਾਨ ਸਨਮਾਨ ਨਿਧੀ (ਪੀਐਮ-ਕਿਸਾਨ)",
    "category": "FINANCIAL_DIRECT",
    "shortDescription": "Direct income support of ₹6,000 per year in three equal installments to landholding farmer families.",
    "benefitAmount": "₹6,000 / year",
    "eligibilityCriteria": "Small and marginal landholder farmer families with cultivable land holdings.",
    "documentsRequired": "1. Aadhaar Card, 2. Land Ownership Records (Khasra/Khatauni), 3. Aadhaar-linked Bank Account",
    "officialPortalUrl": "https://pmkisan.gov.in"
  }
]
```

### `GET /api/v1/schemes/{code}`
Retrieves scheme details by code (e.g., `PM_KISAN`, `PMFBY`, `KCC`).

---

## 6. Farmer Grievance / Complaint Registration

### `POST /api/v1/complaints`
Registers a farmer grievance and issues a tracking reference number.

- **Request Body** (`ComplaintRequest`):
```json
{
  "farmerName": "Gurpreet Singh",
  "phoneNumber": "9876543210",
  "mandiCode": "KHANNA_PB",
  "category": "UNAUTHORIZED_DEDUCTIONS",
  "description": "Trader deducted 2% extra weighing fees contrary to APMC guidelines."
}
```
- **Validation Rules**:
  - `farmerName`: Required, non-blank.
  - `phoneNumber`: Required, 10-digit Indian mobile format (`^[6-9]\\d{9}$`).
  - `category`: Valid enum (`WEIGHING_IRREGULARITY`, `PAYMENT_DELAY`, `UNAUTHORIZED_DEDUCTIONS`, `INFRASTRUCTURE_ISSUE`, `OTHER`).
  - `description`: Minimum 10 characters.
- **Success Response** (`201 Created`): `ComplaintDto`:
```json
{
  "referenceNumber": "MS-2026-89412",
  "farmerName": "Gurpreet Singh",
  "phoneNumber": "9876543210",
  "mandiCode": "KHANNA_PB",
  "mandiName": "Khanna Mandi",
  "category": "UNAUTHORIZED_DEDUCTIONS",
  "description": "Trader deducted 2% extra weighing fees contrary to APMC guidelines.",
  "status": "SUBMITTED",
  "createdAt": "2026-11-08T07:20:00Z"
}
```

### `GET /api/v1/complaints`
Lists all submitted grievances.

### `GET /api/v1/complaints/{referenceNumber}`
Retrieves status and filing details of a specific complaint by reference number (e.g., `MS-2026-89412`).

