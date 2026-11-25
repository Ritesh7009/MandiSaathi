-- MandiSaathi Flyway Migration V12: Agricultural Market Data Integrity, Provenance Separation, and Supersession
-- Forward-only migration adhering to production safety rules.

-- 1. Anchor verified historical Jodhpur Grain Cumin benchmarks to genuine fixed historical dates
UPDATE price_records
SET price_date = DATE '2024-11-20',
    provenance_type = 'HISTORICAL_VERIFIED',
    verified = true,
    data_source = 'Agmarknet Official Archive (DES/MoAFW)'
WHERE commodity_code = 'CUMIN'
  AND mandi_code = 'JODHPUR_GRAIN_RJ'
  AND modal_price = 25800.00;

UPDATE price_records
SET price_date = DATE '2024-11-19',
    provenance_type = 'HISTORICAL_VERIFIED',
    verified = true,
    data_source = 'Agmarknet Official Archive (DES/MoAFW)'
WHERE commodity_code = 'CUMIN'
  AND mandi_code = 'JODHPUR_GRAIN_RJ'
  AND modal_price = 25500.00;

UPDATE price_records
SET price_date = DATE '2024-11-18',
    provenance_type = 'HISTORICAL_VERIFIED',
    verified = true,
    data_source = 'Agmarknet Official Archive (DES/MoAFW)'
WHERE commodity_code = 'CUMIN'
  AND mandi_code = 'JODHPUR_GRAIN_RJ'
  AND modal_price = 25200.00;

-- 2. Differentiate legacy verified historical baseline filings (Punjab/Haryana/Western Mandis)
UPDATE price_records
SET provenance_type = 'HISTORICAL_VERIFIED',
    verified = true,
    data_source = 'Agmarknet Official Archive (DES/MoAFW)'
WHERE id <= 15
  AND (provenance_type = 'SEEDED_BASELINE' OR provenance_type IS NULL);

-- 3. Transition unverified demonstration baseline records to DEMO_BENCHMARK with fixed anchor date
-- Ensures mock prices never dynamically drift to "yesterday" on fresh database initialization.
UPDATE price_records
SET price_date = DATE '2024-11-20',
    provenance_type = 'DEMO_BENCHMARK',
    verified = false,
    data_source = 'MandiSaathi Demonstration Benchmark'
WHERE provenance_type = 'SEEDED_BASELINE'
   OR provenance_type IS NULL;

-- 4. Map existing live ingested records to standard OFFICIAL_INGESTION
UPDATE price_records
SET provenance_type = 'OFFICIAL_INGESTION',
    verified = true
WHERE provenance_type = 'LIVE_INGESTED';

-- 5. Set safe production defaults for future records
ALTER TABLE price_records
ALTER COLUMN provenance_type SET DEFAULT 'DEMO_BENCHMARK';

ALTER TABLE price_records
ALTER COLUMN verified SET DEFAULT false;

-- 6. Enforce provenance integrity check constraint
ALTER TABLE price_records
DROP CONSTRAINT IF EXISTS chk_price_records_provenance;

ALTER TABLE price_records
ADD CONSTRAINT chk_price_records_provenance
CHECK (provenance_type IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED', 'DEMO_BENCHMARK'));

