-- ============================================================================
-- MandiSaathi Flyway Migration V15: Strict Verification Safeguard
-- Forward-only migration adhering to production safety rules.
-- Corrects overly broad source-label updates from V14:
-- 1. Unverified seeded records must never be promoted to verified status.
-- 2. Preserves authentic official ingestion ('Agmarknet (data.gov.in API)')
--    and genuinely verified historical records.
-- ============================================================================

-- 1. Revert any records erroneously classified as OFFICIAL_INGESTION without
-- authentic API ingestion provenance back to DEMO_BENCHMARK.
UPDATE price_records
SET provenance_type = 'DEMO_BENCHMARK',
    verified = false,
    data_source = 'MandiSaathi Demonstration Benchmark'
WHERE data_source = 'Agmarknet (DAC&FW)'
  AND provenance_type = 'OFFICIAL_INGESTION';

-- 2. Ensure authentic data.gov.in API ingestion records retain official verified status
UPDATE price_records
SET provenance_type = 'OFFICIAL_INGESTION',
    verified = true
WHERE data_source = 'Agmarknet (data.gov.in API)'
  AND (provenance_type <> 'OFFICIAL_INGESTION' OR verified = false);

-- 3. Validate provenance check constraint is intact
ALTER TABLE price_records
DROP CONSTRAINT IF EXISTS chk_price_records_provenance;

ALTER TABLE price_records
ADD CONSTRAINT chk_price_records_provenance
CHECK (provenance_type IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED', 'DEMO_BENCHMARK'));

