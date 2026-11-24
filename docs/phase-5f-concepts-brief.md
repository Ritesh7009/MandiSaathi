# MandiSaathi Phase 5F Production Hardening — Concepts Brief

* **Author:** MandiSaathi Developer
* **Date:** 2026-11-10

## Overview

MandiSaathi is an agricultural price discovery and farmer grievance platform built with Spring Boot 3.3.5, PostgreSQL 16, and React 19. Phase 5F transitions the platform from development prototypes to a secured, privacy-preserving, and provably correct production system ready for deployment on Render. This hardening covers 10 architectural domains: centralized administration, hashed tracking tokens, forward-only migrations, trusted proxy IP resolution, variety-aligned price comparisons, verified provenance boundaries, sanitized voice pipelines, strict production profiles, and PWA cache safety.

## Analysis & Stress-Testing

Across the 10 domains under Phase 5F, several technical contradictions and subtle architectural risks require rigorous resolution:

### 1. Price Comparison Variety Contradiction
*   **The Trap:** Previous logic attempted to find a common reporting date across mandis, but when multiple crop varieties were present on that date, it took the record with the highest modal price (`(r1, r2) -> r1.getModalPrice().compareTo(r2.getModalPrice()) >= 0 ? r1 : r2`).
*   **The Flaw:** In agricultural economics, comparing disparate varieties (for example, Basmati vs. Sharbati paddy, or Desi vs. Hybrid wheat) generates an artificial price spread. A farmer might travel 50km believing Mandi B pays Rs 1,500/quintal more, only to discover they brought a lower-tier variety that trades at parity.
*   **The Resolution:** The comparison engine must normalize by `(commodity_code, variety)` as well as `price_date`. If a user queries a commodity without specifying a variety, the engine must either match on the common dominant variety present across all selected mandis on that date or report insufficient data. It must never blend modal prices across distinct varieties.

### 2. Grievance Tracking Token Storage & Privacy
*   **The Trap:** V6 stored raw tracking tokens directly in `complaints.tracking_token` with a unique index. Furthermore, tracking accepted the token via a GET query parameter (`?trackingToken=...`).
*   **The Flaw:** Raw tokens in GET URLs leak into web server access logs, browser history, reverse-proxy buffers, and HTTP Referer headers. If the database is compromised, an attacker can enumerate all tracking tokens and read all farmer complaints.
*   **The Resolution:**
    1. Strip all query-parameter tracking token support; require `X-Tracking-Token` request header exclusively.
    2. Store a cryptographic hash (`SHA-256`) of the token in the database (`tracking_token_hash`).
    3. Return the raw high-entropy token to the client exactly once upon complaint creation.
    4. Provide clear user messaging on the frontend that grievances are recorded locally and are not submitted to government portals like CPGRAMS.

### 3. Flyway Migration Immutability & Token Backfill
*   **The Trap:** V6 used PostgreSQL's `MD5(RANDOM()::TEXT || reference_number || CLOCK_TIMESTAMP()::TEXT)` to backfill existing records.
*   **The Flaw:** `MD5` and `RANDOM()` are cryptographically weak. However, V6 has already been applied in local and staging environments. Modifying `V6__...sql` in-place would invalidate Flyway checksums and break production deployments.
*   **The Resolution:** Follow strict forward-only migration practices (`V7__phase5f_token_hash_and_variety_hardening.sql`). Upgrade existing tracking tokens by generating cryptographic hashes or migrating to a dedicated `tracking_token_hash` column.

### 4. Trusted Proxy & Rate Limiting (Redis vs. In-Memory)
*   **The Trap:** Blindly trusting `X-Forwarded-For` enables trivial IP spoofing. Requiring a hard Redis dependency breaks zero-dependency local runs and low-cost single-instance deployments on Render.
*   **The Flaw:** Hard dependencies cause startup failures when infrastructure is minimal; naive in-memory rate limiting does not scale across multiple container instances.
*   **The Resolution:**
    1. Inspect the peer IP (`request.getRemoteAddr()`). Only parse `X-Forwarded-For` if the peer is a trusted reverse proxy (Render loopback/internal CIDRs).
    2. Provide a unified `RateLimiter` interface with dual implementations: Redis-backed (when Redis is available) and in-memory sliding-window fallback (when Redis is unreachable or unconfigured), logging warnings without dropping service.

### 5. Gnani STT/TTS Sanitization & Concurrency
*   **The Trap:** Returning upstream error messages or status payloads directly to the frontend risks leaking Gnani API details, model endpoints, or API key validation failures.
*   **The Flaw:** Leaking internal upstream responses aids reconnaissance and creates fragile client couplings.
*   **The Resolution:** Enforce strict error translation into localized, safe client messages; ensure all `Semaphore.acquire()` calls release permits inside guaranteed `try ... finally` blocks; validate audio container bytes (RIFF/WAVE, WebM/EBML) before memory allocation.

## Goals vs. Non-Goals

### In-Scope Goals
*   **Eliminate Default Secrets:** Fail startup in `prod` profile if `ADMIN_API_KEY` is missing or shorter than 32 characters.
*   **Single Authorization Filter:** Eliminate duplicate admin checks in controllers/services; use declarative Spring Security filter chain.
*   **Secure Grievance Tracking:** Forward migration V7 for `tracking_token_hash`, header-only `X-Tracking-Token`, and explicit local-recording disclaimer.
*   **Variety-Aligned Comparisons:** Require identical normalized variety and identical reporting date across compared mandis.
*   **Proxy-Aware IP Resolution:** Trust forwarding headers only when received from verified reverse-proxy addresses.
*   **Gnani Reliability:** Strict `try ... finally` semaphore release, RFC-compliant `Retry-After` parsing, and audio format validation.
*   **Strict Production Configuration:** Create `application-prod.yml` and GitHub Actions CI workflow (`.github/workflows/ci.yml`).

### Out-of-Scope Non-Goals
*   No OAuth2/OIDC identity provider setup (API key RBAC is sufficient and minimal).
*   No modification of applied Flyway migrations V1–V6.
*   No live Agmarknet scraping or mock fabrication of live prices.
*   No UI visual redesign or disruption of existing React design tokens.

## Alternatives Weighed

1. **JWT Authentication vs. Constant-Time Admin Key Filter:**
   *   *Alternative:* Issue JWTs upon login for administrators.
   *   *Rejected:* Requires token storage, refresh token rotation, expiry handling, and stateful/stateless key stores. For server-to-server and admin maintenance actions, an `X-Admin-Key` header with `MessageDigest.isEqual` provides equivalent entropy without bloat.
2. **Rewriting V6 vs. Forward Migration V7:**
   *   *Alternative:* Edit `V6__...sql` to fix the MD5 backfill and add token hashing directly.
   *   *Rejected:* Violates Flyway migration immutability. If deployed where V6 ran, Flyway fails with checksum validation errors. Forward-only migration V7 is mandatory.
3. **Strict Redis Dependency vs. Resilient Dual-Mode Limiter:**
   *   *Alternative:* Mandate Redis for rate limiting and crash if Redis is absent.
   *   *Rejected:* Prevents standalone testing, increases deployment cost on Render, and introduces a single point of failure for lightweight agricultural deployments. A resilient fallback ensures continuous availability.

## Key Decisions & Staging for Next Steps

*   **Decision 1:** Create `V7__phase5f_token_hash_and_variety_hardening.sql` adding `tracking_token_hash` and dropping raw `tracking_token` lookup.
*   **Decision 2:** Modify `PriceRecordService.comparePrices` to group and filter strictly by `(commodityCode, variety, priceDate)`.
*   **Decision 3:** Add `ClientIpResolver` trusted proxy CIDR checking (supporting Render's proxy setup).
*   **Decision 4:** Add `application-prod.yml` with strict validation that refuses to boot on weak secrets.

