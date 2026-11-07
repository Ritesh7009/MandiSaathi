-- MandiSaathi Initial Schema Migration (Flyway V1)
-- Agricultural Intelligence Platform

CREATE TABLE IF NOT EXISTS commodities (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name_en VARCHAR(128) NOT NULL,
    name_hi VARCHAR(128) NOT NULL,
    name_pa VARCHAR(128),
    category VARCHAR(64) NOT NULL,
    default_unit VARCHAR(32) NOT NULL DEFAULT 'QUINTAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_commodities_category ON commodities(category);
CREATE INDEX idx_commodities_code ON commodities(code);

CREATE TABLE IF NOT EXISTS mandis (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name_en VARCHAR(128) NOT NULL,
    name_hi VARCHAR(128) NOT NULL,
    name_pa VARCHAR(128),
    state VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_mandis_state ON mandis(state);
CREATE INDEX idx_mandis_active ON mandis(active);
CREATE INDEX idx_mandis_code ON mandis(code);

-- Seed Fundamental Agricultural Commodities
INSERT INTO commodities (code, name_en, name_hi, name_pa, category, default_unit) VALUES
('WHEAT', 'Wheat', 'गेहूं', 'ਕਣਕ', 'CEREALS', 'QUINTAL'),
('PADDY', 'Paddy (Dhan)', 'धान', 'ਝੋਨਾ', 'CEREALS', 'QUINTAL'),
('MUSTARD', 'Mustard', 'सरसों', 'ਸਰ੍ਹੋਂ', 'OILSEEDS', 'QUINTAL'),
('COTTON', 'Cotton', 'कपास', 'ਕਪਾਹ', 'FIBRES', 'QUINTAL'),
('CHANA', 'Bengal Gram (Chana)', 'चना', 'ਛੋਲੇ', 'PULSES', 'QUINTAL'),
('SOYBEAN', 'Soybean', 'सोयाबीन', 'ਸੋਇਆਬੀਨ', 'OILSEEDS', 'QUINTAL'),
('MAIZE', 'Maize (Makka)', 'मक्का', 'ਮੱਕੀ', 'CEREALS', 'QUINTAL'),
('ONION', 'Onion', 'प्याज़', 'ਪਿਆਜ਼', 'VEGETABLES', 'QUINTAL'),
('POTATO', 'Potato', 'आलू', 'ਆਲੂ', 'VEGETABLES', 'QUINTAL'),
('TOMATO', 'Tomato', 'टमाटर', 'ਟਮਾਟਰ', 'VEGETABLES', 'QUINTAL')
ON CONFLICT (code) DO NOTHING;

-- Seed Principal Agricultural Mandis
INSERT INTO mandis (code, name_en, name_hi, name_pa, state, district, latitude, longitude, active) VALUES
('KHANNA_PB', 'Khanna Mandi', 'खन्ना मंडी', 'ਖੰਨਾ ਮੰਡੀ', 'Punjab', 'Ludhiana', 30.7071, 76.2166, true),
('SIRSA_HR', 'Sirsa Mandi', 'सिरसा मंडी', 'ਸਿਰਸਾ ਮੰਡੀ', 'Haryana', 'Sirsa', 29.5349, 75.0289, true),
('KARNAL_HR', 'Karnal Mandi', 'करनाल मंडी', 'ਕਰਨਾਲ ਮੰਡੀ', 'Haryana', 'Karnal', 29.6857, 76.9905, true),
('KOTA_RJ', 'Kota Mandi', 'कोटा मंडी', 'ਕੋਟਾ ਮੰਡੀ', 'Rajasthan', 'Kota', 25.2138, 75.8648, true),
('NEEMUCH_MP', 'Neemuch Mandi', 'नीमच मंडी', 'ਨੀਮਚ ਮੰਡੀ', 'Madhya Pradesh', 'Neemuch', 24.4746, 74.8711, true),
('LASALGAON_MH', 'Lasalgaon Mandi', 'लासलगांव मंडी', 'ਲਾਸਲਗਾਓਂ ਮੰਡੀ', 'Maharashtra', 'Nashik', 20.1472, 74.2269, true),
('AZADPUR_DL', 'Azadpur Mandi', 'आजादपुर मंडी', 'ਆਜ਼ਾਦਪੁਰ ਮੰਡੀ', 'Delhi', 'North Delhi', 28.7095, 77.1772, true),
('HAPUR_UP', 'Hapur Mandi', 'हापुड़ मंडी', 'ਹਾਪੁੜ ਮੰਡੀ', 'Uttar Pradesh', 'Hapur', 28.7306, 77.7806, true)
ON CONFLICT (code) DO NOTHING;

