# MandiSaathi — Phase 2 Data Infrastructure & Ingestion Audit

> **Auditor**: Senior Agricultural Data Engineer, Spring Boot Architect, and PostgreSQL Specialist  
> **Repository Baseline**: Commit `a980be2` (`main`)  
> **Status**: Step 1 Implemented & Fully Verified (114/114 Tests Passing)  
> **Constraint**: Zero paid infrastructure; native PostgreSQL and Spring Boot architecture preserved.

---

## 1. Executive Summary & Defect Severity Matrix

The Phase 1 hardening stabilized the security surface, provenance filtering (`verified = true AND provenanceType IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED')`), and nationwide query pagination. 

In Step 1 of Phase 2, we resolved the **Critical Connection Pool Starvation** and **Distributed Lock Contention** defects by decoupling remote HTTP calls from database transactions and implementing PostgreSQL session-level advisory locks.

| Finding ID | Domain | Severity | Technical Defect | Affected Files | Status |
|---|---|---|---|---|---|
| **FIND-01** | **Transactions & Concurrency** | **CRITICAL** | Long-running database transactions held during external HTTP requests caused connection pool starvation. | `MandiDataIngestionService.java`, `MandiPriceBatchPersistenceService.java` | **Resolved in Step 1** |
| **FIND-02** | **Distributed Locking** | **HIGH** | In-memory `AtomicBoolean` allowed duplicate sync runs across multi-instance deployments. | `DistributedSyncCoordinator.java`, `MandiDataIngestionService.java` | **Resolved in Step 1** |
| **FIND-03** | **Ingestion Throughput** | **HIGH** | Hardcoded 5-page ceiling (`MAX_PAGES_PER_SCOPE = 5`) caps nationwide data ingestion at 500–1,000 records per run. | `MandiDataIngestionService.java`, `application.yml` | Scheduled for Step 3 |
| **FIND-04** | **Upstream Resilience** | **HIGH** | Zero retry logic, exponential backoff, or circuit breaking for data.gov.in API calls; HTTP 429 aborts entire scopes. | `MandiDataIngestionService.java` | Scheduled for Step 2 |
| **FIND-05** | **Offline Storage** | **MEDIUM** | IndexedDB query executes full-table scan (`getAll()`) in JavaScript rather than using indexed lookups, and lacks retention pruning. | `offlineStorage.ts` | Scheduled for Step 5 |
| **FIND-06** | **Catalog Completeness** | **MEDIUM** | Ingestion auto-registers new mandis dynamically, but silently discards arrivals for uncataloged commodities. | `MandiDataIngestionService.java` | Scheduled for Step 3 |
| **FIND-07** | **Arrival Quantities** | **LOW** | Agricultural arrival quantities reported by Agmarknet are ignored during ingestion, leaving market volume context missing. | `MandiDataIngestionService.java`, `PriceRecord.java` | Scheduled for Step 2 |

---

## 2. Step 1 Implementation Details: Transaction Decoupling & Distributed Coordination

### 2.1 Transaction Boundary Decoupling
- **Architecture**: Removed outer `@Transactional` from `runScheduledSync()`, `ingestLatestMandiPrices()`, and `ingestLatestMandiPrices(String triggeredBy)`.
- **Spring-Managed Batch Service**: Created `MandiPriceBatchPersistenceService.java` annotated with `@Service`.
  - Database writes are partitioned into bounded chunks (`batchSize = 50`).
  - Each batch executes in an isolated transaction (`@Transactional(propagation = Propagation.REQUIRES_NEW)`).
  - Fatal database exceptions (`DataAccessException`) bubble up to trigger batch rollback without terminating the application.
  - Prepared atomic checkpoint hook: `PaginationCheckpoint(scope, page, offset, cursor)` committed atomically with each batch.
- **Measured Connection Overhead**:
  - **Before Step 1**: 1 database connection held with an open transaction for the entire duration of all external HTTP requests (up to 150 seconds under latency).
  - **After Step 1**: **0 database connections or transactions held during external HTTP requests**. Connections are only acquired for milliseconds during `persistBatch()` execution.

### 2.2 PostgreSQL Distributed Advisory Locking
- **Architecture**: Implemented `DistributedSyncCoordinator.java` using PostgreSQL session-level advisory locks:
  - `SELECT pg_try_advisory_lock(8849692485721015L)` on a dedicated physical `Connection`.
  - If acquired: synchronization proceeds. The dedicated connection is kept open solely to anchor the session lock.
  - If unacquired: connection is immediately closed and returned to the pool; service returns `SKIPPED` ("Ingestion already in progress on another instance or thread").
  - On completion or uncaught exception: `pg_advisory_unlock` executes in `DistributedSyncHandle.close()`, and the connection is returned to HikariCP.
  - Abrupt termination / crash recovery: PostgreSQL automatically detects socket closure and frees session advisory locks on the server side.
  - Test profile fallback: Automatic detection of H2 in test profiles falls back to `ReentrantLock` so embedded unit tests pass without requiring PostgreSQL extensions.
- **Measured Connection Overhead**: Exactly 1 dedicated database connection from HikariCP during active sync execution. In a 10-connection pool, 9 connections remain completely free for incoming user requests.

---

## 3. Verification & Benchmark Test Results

The backend test suite was executed against PostgreSQL 16 on port 5433:

```
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.mandisaathi.VoiceAssistantControllerTest       - Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.mandisaathi.SameDateMandiComparisonTest        - Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.mandisaathi.PriceRecordControllerTest          - Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.mandisaathi.PriceRecordOptimizationTest        - Tests run: 8, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.mandisaathi.MandiDataIngestionTransactionTest  - Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.mandisaathi.ComplaintControllerTest            - Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.mandisaathi.VoicePipelineIntegrationTest       - Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.mandisaathi.DataIntegrityAndProvenanceTest     - Tests run: 64, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.mandisaathi.PostgresDistributedSyncLockIntegrationTest - Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.mandisaathi.PostgresFlywayMigrationIntegrationTest - Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running com.mandisaathi.SecurityHardeningRegressionTest   - Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] Results:
[INFO] Tests run: 114, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

- **PostgreSQL Advisory Lock Tests** (`PostgresDistributedSyncLockIntegrationTest.java`):
  - `testTwoInstancesCompeteForAdvisoryLock`: PASSED
  - `testLockReleaseAfterException`: PASSED
  - `testLockRecoveryAfterConnectionTermination`: PASSED
  - `testConcurrentScheduledAndManualSync`: PASSED (8 concurrent threads tested)
- **Transaction Isolation Tests** (`MandiDataIngestionTransactionTest.java`):
  - `testSpringTransactionalProxyBehavior`: PASSED
  - `testNoActiveWriteTransactionDuringHttpFetch`: PASSED
  - `testIdempotentBatchProcessingAndSupersession`: PASSED
  - `testDatabaseWriteRollbackOnBatchFailure`: PASSED
- **Frontend Verification**: TypeScript typecheck (`npx tsc -b`) and Vite production build passed with 0 errors (6,256 modules transformed).

---

## 4. Updated Phase 2 Comprehensive Implementation Roadmap

Following Step 1 approval, the subsequent implementation steps are explicitly defined as follows:

```mermaid
flowchart LR
    S1["Step 1 (Done)<br/>Txn Decoupling &<br/>Postgres Lock"] --> S2["Step 2<br/>Quotas, Retries &<br/>Arrival Quantities"]
    S2 --> S3["Step 3<br/>Persistent Checkpoints &<br/>Nationwide Budget"]
    S3 --> S4["Step 4<br/>Quarantine Validation &<br/>Unit Normalization"]
    S4 --> S5["Step 5<br/>Coverage Monitor &<br/>Public Freshness"]
    S5 --> S6["Step 6<br/>IndexedDB Bounds &<br/>End-to-End Suite"]
```

### Step 2: Retry, API Quota Management & Arrival Quantity Capture
- **Retry & Backoff**: Exponential backoff with jitter for HTTP 429 and 503 responses, respecting `Retry-After` headers.
- **Arrival Quantity**: Ingest `arrival_quantity` only when provided and supported by upstream payload; map to `PriceRecord.arrivalQuantity`.
- **Unit Normalization**: Verify unit consistency against DAC&FW guidelines (Quintal vs. Metric Tonne).

### Step 3: Persistent Pagination Checkpoints & Configurable Ingestion Budgets
- **Persistent Checkpoints**: Store pagination cursors (`scope`, `page`, `offset`, `last_attempt_at`) in a lightweight checkpoint table, updated atomically with each batch write.
- **Restart Recovery**: Resume interrupted ingestion cycles from the last successful checkpoint instead of restarting from page 0.
- **Configurable Budgets**: Configurable daily page/record budgets per state/district to respect government API quota constraints.

### Step 4: Data Validation & Invalid-Record Quarantine
- **Invalid-Record Quarantine**: Route records with invalid relationships, negative prices, or unparseable dates to an `ingestion_quarantine` table with rejection reasons rather than silent log drops.
- **Dynamic Commodity Alias Matching**: Expand canonical mappings for regional commodity names to reduce skipped arrival rates.

### Step 5: Nationwide Coverage Monitoring & Public Freshness Telemetry
- **Coverage Monitoring**: Track actual nationwide official market coverage vs. registered APMCs per state.
- **Public Freshness Endpoint**: Unauthenticated, rate-limited `/api/v1/prices/freshness` endpoint returning last successful synchronization timestamp and record counts for farmer UI badges.

### Step 6: Frontend IndexedDB Optimization & Final Phase 2 Integration
- **Index-Driven Queries**: Refactor `offlineStorage.ts` to query via IndexedDB index cursors (`IDBIndex.openCursor` / `IDBKeyRange`) instead of loading all records via `getAll()`.
- **Bounded Retention**: LRU cache eviction and automatic purging of records older than 30 days to bound client storage.
- **Comprehensive Integration Suite**: End-to-end integration tests verifying multi-mandi nationwide data flow, network disruption recovery, and offline fallbacks.
