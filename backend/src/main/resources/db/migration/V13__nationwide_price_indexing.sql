-- ============================================================================
-- MandiSaathi - Phase 6 Migration: Nationwide Price Query Indexing (Flyway V13)
-- ============================================================================

-- 1. Index for fast mandi-centric price lookups (viewing prices for a specific mandi)
CREATE INDEX IF NOT EXISTS idx_price_records_mandi_date
ON price_records (mandi_code, price_date DESC);

-- 2. Composite index for variety-specific commodity lookups and comparison alignment
CREATE INDEX IF NOT EXISTS idx_price_records_commodity_variety_date
ON price_records (commodity_code, variety, price_date DESC);

-- 3. Expression index for case-insensitive state and district filtering on mandis
CREATE INDEX IF NOT EXISTS idx_mandis_state_district_lower
ON mandis (lower(state), lower(district));

