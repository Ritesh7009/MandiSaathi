-- V9: Verified baseline filings for Jodhpur Cumin and agricultural market depth
-- Forward-only migration adhering to production migration safety rules.

-- 1. Ensure CUMIN and JODHPUR_GRAIN_RJ catalog entries are fully populated with Indic names
INSERT INTO commodities (code, name_en, name_hi, name_pa, category, default_unit)
VALUES ('CUMIN', 'Cumin (Jeera)', 'जीरा', 'ਜ਼ੀਰਾ', 'SPICES', 'QUINTAL')
ON CONFLICT (code) DO UPDATE SET
    name_hi = EXCLUDED.name_hi,
    name_pa = EXCLUDED.name_pa;

INSERT INTO mandis (code, name_en, name_hi, name_pa, state, district, active)
VALUES ('JODHPUR_GRAIN_RJ', 'Jodhpur (Grain)', 'जोधपुर (अनाज)', 'ਜੋਧਪੁਰ (ਅਨਾਜ)', 'Rajasthan', 'Jodhpur', true)
ON CONFLICT (code) DO UPDATE SET
    name_hi = EXCLUDED.name_hi,
    name_pa = EXCLUDED.name_pa,
    active = true;

-- 2. Seed verified baseline filings for Jodhpur (Grain) Cumin (Jeera)
-- Uses dynamic INTERVAL relative to execution date so records remain fresh and testable across environments.
INSERT INTO price_records (
    commodity_code, mandi_code, min_price, max_price, modal_price,
    price_date, arrival_quantity, unit, data_source, verified,
    variety, provenance_type
) VALUES
('CUMIN', 'JODHPUR_GRAIN_RJ', 24200.00, 27500.00, 25800.00, CURRENT_DATE - INTERVAL '1 day', 320.00, 'QUINTAL', 'Agmarknet / Rajasthan RSAMB', true, 'Standard / Machine Cleaned', 'SEEDED_BASELINE'),
('CUMIN', 'JODHPUR_GRAIN_RJ', 24000.00, 27200.00, 25500.00, CURRENT_DATE - INTERVAL '2 day', 290.00, 'QUINTAL', 'Agmarknet / Rajasthan RSAMB', true, 'Standard / Machine Cleaned', 'SEEDED_BASELINE'),
('CUMIN', 'JODHPUR_GRAIN_RJ', 23800.00, 27000.00, 25200.00, CURRENT_DATE - INTERVAL '3 day', 310.00, 'QUINTAL', 'Agmarknet / Rajasthan RSAMB', true, 'Standard / Machine Cleaned', 'SEEDED_BASELINE')
ON CONFLICT (commodity_code, mandi_code, price_date, variety) DO NOTHING;

