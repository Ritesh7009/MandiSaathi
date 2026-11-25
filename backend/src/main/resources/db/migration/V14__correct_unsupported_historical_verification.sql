-- ============================================================================
-- MandiSaathi Flyway Migration V14: Correct Unsupported Historical Verification
-- Forward-only migration adhering to production safety rules.
-- ============================================================================

-- 1. Reclassify seeded demo records previously given synthetic HISTORICAL_VERIFIED status
-- without repository source evidence back to DEMO_BENCHMARK.
UPDATE price_records
SET provenance_type = 'DEMO_BENCHMARK',
    verified = false,
    data_source = 'MandiSaathi Demonstration Benchmark'
WHERE provenance_type = 'HISTORICAL_VERIFIED'
  AND (data_source = 'Agmarknet Official Archive (DES/MoAFW)' OR data_source LIKE '%Demonstration%');

-- 2. Preserve authentic live ingested records as OFFICIAL_INGESTION and verified
UPDATE price_records
SET provenance_type = 'OFFICIAL_INGESTION',
    verified = true
WHERE data_source = 'Agmarknet (DAC&FW)'
  AND provenance_type <> 'OFFICIAL_INGESTION';

