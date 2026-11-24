-- Catalog metadata only. Price records must come from a dated source filing.
INSERT INTO commodities (code, name_en, name_hi, name_pa, category, default_unit)
VALUES ('CUMIN', 'Cumin (Jeera)', 'जीरा', 'ਜ਼ੀਰਾ', 'SPICES', 'QUINTAL')
ON CONFLICT (code) DO NOTHING;

INSERT INTO mandis (code, name_en, name_hi, name_pa, state, district, active)
VALUES ('JODHPUR_GRAIN_RJ', 'Jodhpur (Grain)', 'जोधपुर (अनाज)', 'ਜੋਧਪੁਰ (ਅਨਾਜ)', 'Rajasthan', 'Jodhpur', true)
ON CONFLICT (code) DO NOTHING;
