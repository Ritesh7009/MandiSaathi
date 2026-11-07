-- ============================================================================
-- MandiSaathi - Phase 3 Schema Migration: Verified Mandi Data Pipeline
-- ============================================================================

-- Ensure unique constraint on (commodity_code, mandi_code, price_date)
-- to prevent duplicate price records during ingestion.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_price_commodity_mandi_date'
    ) THEN
        ALTER TABLE price_records
        ADD CONSTRAINT uk_price_commodity_mandi_date
        UNIQUE (commodity_code, mandi_code, price_date);
    END IF;
END $$;

-- Add index on price_records for fast lookup by commodity, state, and price date
CREATE INDEX IF NOT EXISTS idx_price_records_lookup
ON price_records (commodity_code, price_date DESC);
