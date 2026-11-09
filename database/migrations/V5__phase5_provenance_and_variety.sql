-- MandiSaathi Phase 5 Migration: Provenance Tracking and Crop Variety (Flyway V5)

-- 1. Add variety and provenance_type columns to price_records
ALTER TABLE price_records
ADD COLUMN IF NOT EXISTS variety VARCHAR(64) DEFAULT 'Standard / FAQ' NOT NULL;

ALTER TABLE price_records
ADD COLUMN IF NOT EXISTS provenance_type VARCHAR(32) DEFAULT 'SEEDED_BASELINE' NOT NULL;

-- 2. Ensure all baseline records carry explicit provenance
UPDATE price_records
SET provenance_type = 'SEEDED_BASELINE'
WHERE provenance_type IS NULL OR provenance_type = '';

-- 3. Add index on provenance_type for audit telemetry
CREATE INDEX IF NOT EXISTS idx_price_records_provenance
ON price_records (provenance_type);

