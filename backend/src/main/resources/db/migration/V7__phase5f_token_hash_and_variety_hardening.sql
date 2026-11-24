-- MandiSaathi Phase 5F Migration: Cryptographic Token Hashing & Variety Hardening (Flyway V7)

-- 1. Ensure variety column is strictly populated and NOT NULL
UPDATE price_records
SET variety = 'Common'
WHERE variety IS NULL OR TRIM(variety) = '';

ALTER TABLE price_records
ALTER COLUMN variety SET NOT NULL;

-- 2. Add secure cryptographic tracking token hash column to complaints
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS tracking_token_hash VARCHAR(64);

-- 3. Backfill tracking_token_hash using native PostgreSQL SHA-256
UPDATE complaints
SET tracking_token_hash = encode(sha256(tracking_token::bytea), 'hex')
WHERE tracking_token_hash IS NULL AND tracking_token IS NOT NULL;

-- Fallback for any record with missing token
UPDATE complaints
SET tracking_token_hash = encode(sha256((reference_number || clock_timestamp()::text || random()::text)::bytea), 'hex')
WHERE tracking_token_hash IS NULL;

ALTER TABLE complaints
ALTER COLUMN tracking_token_hash SET NOT NULL;

-- 4. Create unique index on the token hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_token_hash
ON complaints(tracking_token_hash);

-- 5. Drop the legacy plaintext tracking_token column and its index
DROP INDEX IF EXISTS idx_complaints_tracking_token;

ALTER TABLE complaints
DROP COLUMN IF EXISTS tracking_token;

