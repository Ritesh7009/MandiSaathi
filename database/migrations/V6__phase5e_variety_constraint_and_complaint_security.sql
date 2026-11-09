-- MandiSaathi Phase 5E Migration: Variety-aware Unique Constraint & Complaint Tracking Security (Flyway V6)

-- 1. Upgrade price_records unique constraint to include variety
ALTER TABLE price_records
DROP CONSTRAINT IF EXISTS uk_price_commodity_mandi_date;

ALTER TABLE price_records
ADD CONSTRAINT uk_price_commodity_mandi_date_variety
UNIQUE (commodity_code, mandi_code, price_date, variety);

-- 2. Add secure unguessable tracking token to complaints table
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64);

-- Ensure all existing complaints have a secure tracking token
UPDATE complaints
SET tracking_token = MD5(RANDOM()::TEXT || reference_number || CLOCK_TIMESTAMP()::TEXT)
WHERE tracking_token IS NULL OR tracking_token = '';

ALTER TABLE complaints
ALTER COLUMN tracking_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_tracking_token
ON complaints(tracking_token);

