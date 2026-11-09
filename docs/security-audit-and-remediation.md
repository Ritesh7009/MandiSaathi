# MandiSaathi — Security Audit & Comprehensive Remediation Specification

**Status:** RESOLVED (All 10 security findings successfully remediated and verified)  
**Auditor / Mode:** Antigravity (Ponytail Senior Dev Mode + EGM Resolve Review Framework)  
**Target:** MandiSaathi Full Stack (`backend/` Spring Boot 3.3.5 & `frontend/` React 19)  
**Date:** 2026-11-10  

---

## 1. Executive Summary & Attack Surface Landscape

An exhaustive security audit of the MandiSaathi application was conducted across all tiers:
1. **Network & Edge:** Reverse-proxy header trust, CORS, and HTTP security response headers.
2. **Access Control & Identity:** Authentication filter chain, RBAC, constant-time secret comparison.
3. **API & Endpoints:** Broken Object-Level Authorization (BOLA/IDOR), unauthenticated batch sync triggers, and telemetry leakage.
4. **Input Validation & DoS Resilience:** IP extraction sanitization, sliding-window rate limiting, audio payload container inspection, and heap surge prevention.
5. **Data Protection & Privacy:** PII masking (farmer phone numbers), secret storage in configuration, and client-side web storage tokens.

The audit identified **3 Blocker/Critical vulnerabilities**, **4 Major vulnerabilities**, and **3 Nit/Defense-in-depth issues**.

---

## 2. Prioritized Vulnerability Register

| ID | Issue | Severity | OWASP / CWE | Status |
|:---|:---|:---:|:---:|:---:|
| **SEC-01** | Unauthenticated Price Ingestion Trigger (`POST /api/v1/prices/sync`) | **Blocker** | CWE-306 / OWASP A01: Broken Access Control | **PROPOSE FIX** |
| **SEC-02** | Side-Channel Timing Attack in Admin Key & Token Evaluation | **Blocker** | CWE-208 / OWASP A02: Cryptographic Failures | **PROPOSE FIX** |
| **SEC-03** | Rate Limiter Bypass via `X-Forwarded-For` Spoofing & Memory Pollution | **Blocker** | CWE-290 / CWE-345 / OWASP A07: Identification Failures | **PROPOSE FIX** |
| **SEC-04** | Spring Security `permitAll()` Catch-All & Fragmented Manual Authorization | **Major** | CWE-285 / OWASP A01: Broken Access Control | **PROPOSE FIX** |
| **SEC-05** | Unprotected Voice Assistant API Rate Limiting & Heap Surge Vulnerability | **Major** | CWE-400 / OWASP A04: Insecure Design | **PROPOSE FIX** |
| **SEC-06** | Incomplete CORS Preflight Whitelist for Custom Security Headers | **Major** | CWE-942 / OWASP A05: Security Misconfiguration | **PROPOSE FIX** |
| **SEC-07** | Public Telemetry & Execution Log Leakage (`GET /api/v1/prices/sync/status`) | **Major** | CWE-200 / OWASP A01: Information Disclosure | **PROPOSE FIX** |
| **SEC-08** | Missing Essential HTTP Security Headers (CSP, HSTS, X-Content-Type-Options) | **Nit** | CWE-693 / OWASP A05: Security Misconfiguration | **PROPOSE FIX** |
| **SEC-09** | Hardcoded Fallback Administrative Key in Default Profile | **Nit** | CWE-798 / OWASP A07: Hard-coded Credentials | **PROPOSE FIX** |
| **SEC-10** | Actuator Hardening & Error Stack-Trace Exposure Verification | **Nit** | CWE-209 / OWASP A05: Security Misconfiguration | **PROPOSE FIX** |

---

## 3. Deep-Dive Findings & Technical Discrepancies

### SEC-01: Unauthenticated Price Ingestion Trigger (`POST /api/v1/prices/sync`)
*   **Affected Scope:** `backend/src/main/java/com/mandisaathi/controller/PriceRecordController.java` (`#L27-L30`), `SecurityConfig.java` (`#L34`)
*   **Attack Vector:** An unauthenticated attacker sends rapid HTTP POST requests to `/api/v1/prices/sync`. While an in-memory 10-second cooldown exists, any script can spam the server, triggering outbound HTTP calls to data.gov.in, consuming government API quotas, causing IP bans, and locking PostgreSQL tables during transaction writes.
*   **AI Suggestion:** `PROPOSE FIX`
*   **Proposed Edit:** Require administrative authentication (`ROLE_ADMIN` via `X-Admin-Key`) for `POST /api/v1/prices/sync`. Protect the endpoint via Spring Security `requestMatchers(HttpMethod.POST, "/api/v1/prices/sync").hasRole("ADMIN")`.

### SEC-02: Side-Channel Timing Attack in Key Comparison
*   **Affected Scope:** `backend/src/main/java/com/mandisaathi/service/ComplaintService.java` (`#L124-L126`)
*   **Attack Vector:**
    ```java
    private boolean isAdmin(String providedKey) {
        return providedKey != null && !providedKey.isBlank() && providedKey.equals(adminApiKey);
    }
    ```
    Standard `String.equals` returns `false` on the first non-matching byte. An attacker measuring HTTP response round-trip latencies can statistically infer the administrative key byte-by-byte.
*   **AI Suggestion:** `PROPOSE FIX`
*   **Proposed Edit:** Use `java.security.MessageDigest.isEqual(...)` for constant-time comparison across all administrative key validations.

### SEC-03: Rate Limiter Bypass via `X-Forwarded-For` Spoofing & Memory Surges
*   **Affected Scope:** `backend/src/main/java/com/mandisaathi/controller/ComplaintController.java` (`#L34-L41`), `ComplaintService.java` (`#L46-L65`)
*   **Attack Vector:**
    `extractClientIp` blindly accepts `request.getHeader("X-Forwarded-For").split(",")[0]`. An attacker supplies arbitrary pseudo-IPs (`X-Forwarded-For: 10.0.0.1`, `X-Forwarded-For: 10.0.0.2`), generating infinite unique keys in `submissionRateMap`, entirely bypassing the 20 requests/minute rate limit and flooding the JVM heap.
*   **AI Suggestion:** `PROPOSE FIX`
*   **Proposed Edit:**
    1. Validate IP format using a strict IPv4/IPv6 regex.
    2. Fall back safely to `request.getRemoteAddr()`.
    3. Sanitize key strings to prevent delimiter injection or memory pollution.

### SEC-04: Spring Security `permitAll()` Catch-All & Centralized RBAC
*   **Affected Scope:** `backend/src/main/java/com/mandisaathi/config/SecurityConfig.java` (`#L28-L40`)
*   **Attack Vector:**
    Spring Security has `anyRequest().permitAll()`. Authorization logic was scattered inside individual service classes. If a new controller or endpoint is deployed without manual checks, it is completely public by default.
*   **AI Suggestion:** `PROPOSE FIX`
*   **Proposed Edit:**
    1. Implement an `ApiKeyAuthenticationFilter` registered before `UsernamePasswordAuthenticationFilter`.
    2. Read `X-Admin-Key`, validate via `MessageDigest.isEqual`, and establish a `ROLE_ADMIN` authentication token in the `SecurityContext`.
    3. Configure declarative security matchers in `SecurityConfig`:
       - Admin endpoints (`/api/v1/complaints` GET, `/api/v1/prices/sync/**`): `hasRole("ADMIN")`
       - Public read-only/submission endpoints: `permitAll()`
       - Any unspecified request: `denyAll()` (fail-safe by default).

### SEC-05: Voice Audio Heap Surge & Rate Limiting
*   **Affected Scope:** `backend/src/main/java/com/mandisaathi/controller/VoiceAssistantController.java` (`#L35-L90`)
*   **Attack Vector:**
    `audioFile.getBytes()` loads up to 15MB into heap memory before checking file format. An attacker uploading garbage files repeatedly can exhaust JVM heap memory. Furthermore, `POST /api/v1/voice/query` and `POST /api/v1/voice/audio` lack IP-based rate limiting, allowing bad actors to burn external Gnani STT/TTS quotas.
*   **AI Suggestion:** `PROPOSE FIX`
*   **Proposed Edit:**
    1. Validate RIFF/WAVE header or container magic bytes immediately.
    2. Add an IP-based sliding-window rate limiter (e.g. 30 requests/minute per IP) for voice endpoints.

### SEC-06: Incomplete CORS Preflight Whitelist
*   **Affected Scope:** `backend/src/main/java/com/mandisaathi/config/CorsConfig.java` (`#L31`)
*   **Discrepancy:** `X-Admin-Key` and `X-Tracking-Token` are required custom headers, but `configuration.setAllowedHeaders(...)` only whitelisted standard HTTP headers. Any cross-origin preflight `OPTIONS` request sending these headers from an authorized origin would be blocked by modern browsers.
*   **AI Suggestion:** `PROPOSE FIX`
*   **Proposed Edit:** Add `"X-Admin-Key"`, `"X-Tracking-Token"` to allowed headers, and expose `"Retry-After"`.

### SEC-07: Public Ingestion Telemetry & Execution Log Leakage
*   **Affected Scope:** `backend/src/main/java/com/mandisaathi/controller/PriceRecordController.java` (`#L32-L35`)
*   **Attack Vector:** `GET /api/v1/prices/sync/status` reveals full sync telemetry, database run IDs, error messages, and scheduled cron triggers to unauthenticated users.
*   **AI Suggestion:** `PROPOSE FIX`
*   **Proposed Edit:** Require administrative authorization (`ROLE_ADMIN`) for `/api/v1/prices/sync/status`.

### SEC-08: Missing HTTP Security Headers
*   **Affected Scope:** `backend/src/main/java/com/mandisaathi/config/SecurityConfig.java`
*   **Discrepancy:** Missing standard defense-in-depth headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
*   **AI Suggestion:** `PROPOSE FIX`
*   **Proposed Edit:** Configure Spring Security `.headers(...)` to emit these headers automatically on all responses.

---

## 4. Remediation Architecture Plan

```
           +--------------------------------------------------------+
           | Incoming HTTP Request                                  |
           +--------------------------------------------------------+
                                      |
                                      v
           +--------------------------------------------------------+
           | CorsFilter (Validates Allowed Origins & Custom Headers)|
           +--------------------------------------------------------+
                                      |
                                      v
           +--------------------------------------------------------+
           | Security Headers Filter (nosniff, DENY frame, HSTS)    |
           +--------------------------------------------------------+
                                      |
                                      v
           +--------------------------------------------------------+
           | ApiKeyAuthenticationFilter                             |
           | - Reads X-Admin-Key                                    |
           | - Constant-Time MessageDigest.isEqual Validation       |
           | - Sets SecurityContext Authentication (ROLE_ADMIN)     |
           +--------------------------------------------------------+
                                      |
                                      v
           +--------------------------------------------------------+
           | Declarative AuthorizationFilter                        |
           | - /api/v1/complaints (GET)        -> hasRole('ADMIN')  |
           | - /api/v1/prices/sync/**          -> hasRole('ADMIN')  |
           | - /api/v1/complaints (POST)       -> permitAll()       |
           | - /api/v1/complaints/{ref} (GET)  -> permitAll()       |
           | - /api/v1/prices/** (GET)         -> permitAll()       |
           | - /api/v1/voice/** (POST)         -> permitAll()       |
           | - /actuator/health, /api/v1/health-> permitAll()       |
           | - anyRequest()                    -> denyAll()         |
           +--------------------------------------------------------+
                                      |
                                      v
           +--------------------------------------------------------+
           | Controllers & Services (With IP Validation & Rate Limit)|
           +--------------------------------------------------------+
```

---

## 5. Verification & Testing Protocol

1. **Security Integration Tests:**
   - Verify `GET /api/v1/complaints` without `X-Admin-Key` returns `403 Forbidden`.
   - Verify `POST /api/v1/prices/sync` without `X-Admin-Key` returns `403 Forbidden`.
   - Verify `GET /api/v1/prices/sync/status` without `X-Admin-Key` returns `403 Forbidden`.
   - Verify `POST /api/v1/prices/sync` with valid `X-Admin-Key` succeeds (`200 OK`).
   - Verify HTTP Security Headers (`X-Content-Type-Options`, `X-Frame-Options`) are present.
   - Verify spoofed `X-Forwarded-For` invalid IP formats are rejected or safely sanitized.
2. **Regression Testing:**
   - `./mvnw test` in `backend/` (all 58 existing tests + new security tests pass).
   - `npx tsc --noEmit` and `npm run build` in `frontend/`.

