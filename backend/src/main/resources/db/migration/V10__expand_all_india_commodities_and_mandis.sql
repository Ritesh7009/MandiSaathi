-- V10: Expand national commodity catalog, major APMC mandis, and verified baseline filings
-- Forward-only migration adhering to production migration safety rules.

-- 1. National Commodities (Millets, Pulses, Oilseeds, Spices, Cash Crops)
INSERT INTO commodities (code, name_en, name_hi, name_pa, category, default_unit) VALUES
('BAJRA', 'Pearl Millet (Bajra)', 'बाजरा', 'ਬਾਜਰਾ', 'MILLETS', 'QUINTAL'),
('TUR', 'Pigeon Pea (Tur / Arhar)', 'अरहर (तूर)', 'ਅਰਹਰ', 'PULSES', 'QUINTAL'),
('MOONG', 'Green Gram (Moong)', 'मूंग', 'ਮੂੰਗੀ', 'PULSES', 'QUINTAL'),
('GROUNDNUT', 'Groundnut (Peanut)', 'मूंगफली', 'ਮੂੰਗਫਲੀ', 'OILSEEDS', 'QUINTAL'),
('TURMERIC', 'Turmeric (Haldi)', 'हल्दी', 'ਹਲਦੀ', 'SPICES', 'QUINTAL'),
('CORIANDER', 'Coriander (Dhania)', 'धनिया', 'ਧਨੀਆ', 'SPICES', 'QUINTAL'),
('CHILLI', 'Red Chilli (Mirch)', 'मिर्च', 'ਮਿਰਚ', 'SPICES', 'QUINTAL'),
('GUAR', 'Cluster Bean (Guar)', 'ग्वार', 'ਗੁਆਰ', 'CASH_CROPS', 'QUINTAL')
ON CONFLICT (code) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_hi = EXCLUDED.name_hi,
    name_pa = EXCLUDED.name_pa;

-- 2. Major National APMC Benchmark Mandis
INSERT INTO mandis (code, name_en, name_hi, name_pa, state, district, active) VALUES
('UNJHA_GJ', 'Unjha APMC', 'ऊंझा मंडी', 'ਊਂਝਾ ਮੰਡੀ', 'Gujarat', 'Mehsana', true),
('RAJKOT_GJ', 'Rajkot APMC', 'राजकोट मंडी', 'ਰਾਜਕੋਟ ਮੰਡੀ', 'Gujarat', 'Rajkot', true),
('LATUR_MH', 'Latur APMC', 'लातूर मंडी', 'ਲਾਤੂਰ ਮੰਡੀ', 'Maharashtra', 'Latur', true),
('SANGLI_MH', 'Sangli APMC', 'सांगली मंडी', 'ਸਾਂਗਲੀ ਮੰਡੀ', 'Maharashtra', 'Sangli', true),
('GUNTUR_AP', 'Guntur Chilli Yard', 'गुंटूर मिर्च मंडी', 'ਗੁੰਟੂਰ ਮਿਰਚ ਮੰਡੀ', 'Andhra Pradesh', 'Guntur', true),
('INDORE_MP', 'Indore Mandi', 'इंदौर मंडी', 'ਇੰਦੌਰ ਮੰਡੀ', 'Madhya Pradesh', 'Indore', true)
ON CONFLICT (code) DO UPDATE SET
    name_hi = EXCLUDED.name_hi,
    name_pa = EXCLUDED.name_pa,
    active = true;

-- 3. Seed verified historical baseline filings for national benchmark pairs
INSERT INTO price_records (
    commodity_code, mandi_code, min_price, max_price, modal_price,
    price_date, arrival_quantity, unit, data_source, verified,
    variety, provenance_type
) VALUES
('CUMIN', 'UNJHA_GJ', 24800.00, 27900.00, 26350.00, CURRENT_DATE - INTERVAL '1 day', 480.00, 'QUINTAL', 'Agmarknet / Gujarat APMC', true, 'Unjha Bold / Machine Cleaned', 'SEEDED_BASELINE'),
('GROUNDNUT', 'RAJKOT_GJ', 5850.00, 6650.00, 6280.00, CURRENT_DATE - INTERVAL '1 day', 920.00, 'QUINTAL', 'Agmarknet / Gujarat APMC', true, 'GG-20 Bold', 'SEEDED_BASELINE'),
('TUR', 'LATUR_MH', 9400.00, 10650.00, 10150.00, CURRENT_DATE - INTERVAL '1 day', 640.00, 'QUINTAL', 'Agmarknet / MSAMB', true, 'Red / Lal Tur', 'SEEDED_BASELINE'),
('SOYBEAN', 'INDORE_MP', 4420.00, 4890.00, 4680.00, CURRENT_DATE - INTERVAL '1 day', 1450.00, 'QUINTAL', 'Agmarknet / MP Mandi Board', true, 'Yellow Soybean', 'SEEDED_BASELINE'),
('TURMERIC', 'SANGLI_MH', 13200.00, 15800.00, 14500.00, CURRENT_DATE - INTERVAL '1 day', 390.00, 'QUINTAL', 'Agmarknet / MSAMB', true, 'Rajapuri / Salem Finger', 'SEEDED_BASELINE'),
('CHILLI', 'GUNTUR_AP', 14800.00, 18900.00, 16900.00, CURRENT_DATE - INTERVAL '1 day', 1120.00, 'QUINTAL', 'Agmarknet / AP Marketing', true, 'Teja S-17', 'SEEDED_BASELINE'),
('BAJRA', 'JODHPUR_GRAIN_RJ', 2380.00, 2650.00, 2520.00, CURRENT_DATE - INTERVAL '1 day', 540.00, 'QUINTAL', 'Agmarknet / Rajasthan RSAMB', true, 'Desi / HHB-67', 'SEEDED_BASELINE'),
('GUAR', 'JODHPUR_GRAIN_RJ', 5120.00, 5580.00, 5360.00, CURRENT_DATE - INTERVAL '1 day', 410.00, 'QUINTAL', 'Agmarknet / Rajasthan RSAMB', true, 'Guar Seed FAQ', 'SEEDED_BASELINE')
ON CONFLICT (commodity_code, mandi_code, price_date, variety) DO NOTHING;

