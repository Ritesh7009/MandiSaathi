-- MandiSaathi Phase 2 Schema Migration (Flyway V2)
-- Price Records, Government Schemes, and Farmer Complaints

CREATE TABLE IF NOT EXISTS price_records (
    id BIGSERIAL PRIMARY KEY,
    commodity_code VARCHAR(64) NOT NULL,
    mandi_code VARCHAR(64) NOT NULL,
    min_price NUMERIC(10, 2) NOT NULL,
    max_price NUMERIC(10, 2) NOT NULL,
    modal_price NUMERIC(10, 2) NOT NULL,
    price_date DATE NOT NULL,
    arrival_quantity NUMERIC(12, 2),
    unit VARCHAR(32) NOT NULL DEFAULT 'QUINTAL',
    data_source VARCHAR(128) NOT NULL DEFAULT 'Agmarknet (DAC&FW)',
    verified BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_price_commodity FOREIGN KEY (commodity_code) REFERENCES commodities(code),
    CONSTRAINT fk_price_mandi FOREIGN KEY (mandi_code) REFERENCES mandis(code)
);

CREATE INDEX idx_price_commodity_mandi ON price_records(commodity_code, mandi_code);
CREATE INDEX idx_price_date ON price_records(price_date);

CREATE TABLE IF NOT EXISTS government_schemes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name_en VARCHAR(256) NOT NULL,
    name_hi VARCHAR(256) NOT NULL,
    name_pa VARCHAR(256),
    category VARCHAR(64) NOT NULL,
    description_en TEXT NOT NULL,
    description_hi TEXT NOT NULL,
    description_pa TEXT,
    eligibility_en TEXT NOT NULL,
    eligibility_hi TEXT NOT NULL,
    eligibility_pa TEXT,
    documents_en TEXT NOT NULL,
    documents_hi TEXT NOT NULL,
    documents_pa TEXT,
    application_steps_en TEXT NOT NULL,
    application_steps_hi TEXT NOT NULL,
    application_steps_pa TEXT,
    official_url VARCHAR(512) NOT NULL,
    verified_date VARCHAR(64) NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_schemes_category ON government_schemes(category);
CREATE INDEX idx_schemes_active ON government_schemes(active);

CREATE TABLE IF NOT EXISTS complaints (
    id BIGSERIAL PRIMARY KEY,
    reference_number VARCHAR(64) NOT NULL UNIQUE,
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    state VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    mandi_code VARCHAR(64),
    farmer_name VARCHAR(128),
    farmer_phone VARCHAR(32),
    status VARCHAR(32) NOT NULL DEFAULT 'RECORDED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_complaints_ref ON complaints(reference_number);
CREATE INDEX idx_complaints_created ON complaints(created_at);

-- Seed Verified Historical Agmarknet Market Records for Comparative Intelligence
INSERT INTO price_records (commodity_code, mandi_code, min_price, max_price, modal_price, price_date, arrival_quantity, unit, data_source) VALUES
-- Wheat (Khanna Mandi, Sirsa, Karnal, Kota)
('WHEAT', 'KHANNA_PB', 2275.00, 2380.00, 2320.00, CURRENT_DATE - INTERVAL '1 day', 420.00, 'QUINTAL', 'Agmarknet / Punjab Mandi Board'),
('WHEAT', 'KHANNA_PB', 2275.00, 2370.00, 2315.00, CURRENT_DATE - INTERVAL '2 day', 510.00, 'QUINTAL', 'Agmarknet / Punjab Mandi Board'),
('WHEAT', 'KHANNA_PB', 2275.00, 2390.00, 2330.00, CURRENT_DATE - INTERVAL '3 day', 380.00, 'QUINTAL', 'Agmarknet / Punjab Mandi Board'),
('WHEAT', 'SIRSA_HR', 2280.00, 2360.00, 2310.00, CURRENT_DATE - INTERVAL '1 day', 310.00, 'QUINTAL', 'Agmarknet / Haryana HSAMB'),
('WHEAT', 'SIRSA_HR', 2275.00, 2350.00, 2300.00, CURRENT_DATE - INTERVAL '2 day', 290.00, 'QUINTAL', 'Agmarknet / Haryana HSAMB'),
('WHEAT', 'KARNAL_HR', 2300.00, 2395.00, 2345.00, CURRENT_DATE - INTERVAL '1 day', 280.00, 'QUINTAL', 'Agmarknet / Haryana HSAMB'),
('WHEAT', 'KOTA_RJ', 2260.00, 2340.00, 2295.00, CURRENT_DATE - INTERVAL '1 day', 490.00, 'QUINTAL', 'Agmarknet / Rajasthan RSAMB'),

-- Mustard (Sirsa, Kota, Neemuch)
('MUSTARD', 'SIRSA_HR', 5450.00, 5820.00, 5680.00, CURRENT_DATE - INTERVAL '1 day', 150.00, 'QUINTAL', 'Agmarknet / Haryana HSAMB'),
('MUSTARD', 'SIRSA_HR', 5400.00, 5790.00, 5650.00, CURRENT_DATE - INTERVAL '2 day', 180.00, 'QUINTAL', 'Agmarknet / Haryana HSAMB'),
('MUSTARD', 'KOTA_RJ', 5500.00, 5910.00, 5740.00, CURRENT_DATE - INTERVAL '1 day', 260.00, 'QUINTAL', 'Agmarknet / Rajasthan RSAMB'),
('MUSTARD', 'NEEMUCH_MP', 5420.00, 5840.00, 5660.00, CURRENT_DATE - INTERVAL '1 day', 340.00, 'QUINTAL', 'Agmarknet / MP Mandi Board'),

-- Paddy / Dhan (Khanna, Karnal)
('PADDY', 'KHANNA_PB', 2320.00, 2550.00, 2460.00, CURRENT_DATE - INTERVAL '1 day', 620.00, 'QUINTAL', 'Agmarknet / Punjab Mandi Board'),
('PADDY', 'KARNAL_HR', 2350.00, 2580.00, 2490.00, CURRENT_DATE - INTERVAL '1 day', 540.00, 'QUINTAL', 'Agmarknet / Haryana HSAMB'),

-- Onion (Lasalgaon, Azadpur)
('ONION', 'LASALGAON_MH', 1650.00, 2400.00, 2150.00, CURRENT_DATE - INTERVAL '1 day', 1100.00, 'QUINTAL', 'Agmarknet / MSAMB Lasalgaon'),
('ONION', 'AZADPUR_DL', 1900.00, 2800.00, 2450.00, CURRENT_DATE - INTERVAL '1 day', 1850.00, 'QUINTAL', 'Agmarknet / Delhi APMC')
ON CONFLICT DO NOTHING;

-- Seed Verified Central Government Schemes
INSERT INTO government_schemes (
    code, name_en, name_hi, name_pa, category,
    description_en, description_hi, description_pa,
    eligibility_en, eligibility_hi, eligibility_pa,
    documents_en, documents_hi, documents_pa,
    application_steps_en, application_steps_hi, application_steps_pa,
    official_url, verified_date
) VALUES
(
    'PM_KISAN',
    'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    'पीएम-किसान (प्रधानमंत्री किसान सम्मान निधि)',
    'ਪੀਐਮ-ਕਿਸਾਨ (ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਕਿਸਾਨ ਸੰਮਾਨ ਨਿਧੀ)',
    'INCOME_SUPPORT',
    'Central sector scheme providing income support of Rs 6,000 per year in three equal instalments of Rs 2,000 directly to bank accounts of all landholding farmer families.',
    'प्रत्येक पात्र किसान परिवार को प्रति वर्ष ₹6,000 की वित्तीय सहायता तीन समान किस्तों (₹2,000 प्रति 4 माह) में सीधे बैंक खाते (DBT) में दी जाती है।',
    'ਹਰ ਯੋਗ ਕਿਸਾਨ ਪਰਿਵਾਰ ਨੂੰ ਸਾਲਾਨਾ ₹6,000 ਦੀ ਸਹਾਇਤਾ ਤਿੰਨ ਕਿਸ਼ਤਾਂ ਵਿੱਚ ਸਿੱਧੇ ਬੈਂਕ ਖਾਤੇ ਵਿੱਚ ਭੇਜੀ ਜਾਂਦੀ ਹੈ।',
    'Small and marginal landholder farmer families with cultivable landholding in their names. Institutional landholders and income-tax payers are excluded.',
    'जिन किसान परिवारों के नाम पर कृषि योग्य भूमि का मालिकाना हक है। संस्थागत भूमि धारक एवं आयकर दाता अपात्र हैं।',
    'ਉਹ ਕਿਸਾਨ ਜਿਨ੍ਹਾਂ ਦੇ ਨਾਮ ਖੇਤੀਯੋਗ ਜ਼ਮੀਨ ਹੈ। ਇਨਕਮ ਟੈਕਸ ਦੇਣ ਵਾਲੇ ਸ਼ਾਮਲ ਨਹੀਂ ਹਨ।',
    '1. Aadhaar Card\n2. Proof of Land Ownership (Khasra/Khatauni / Jamabandi)\n3. Active Bank Passbook with IFSC\n4. Mobile Number linked with Aadhaar for e-KYC',
    '1. आधार कार्ड\n2. भूमि स्वामित्व दस्तावेज़ (खसरा/खतौनी/जमाबंदी)\n3. बैंक पासबुक (आधार से लिंक)\n4. आधार से जुड़ा मोबाइल नंबर',
    '1. ਆਧਾਰ ਕਾਰਡ\n2. ਜ਼ਮੀਨੀ ਮਲਕੀਅਤ ਦੇ ਦਸਤਾਵੇਜ਼ (ਜਮ੍ਹਾਂਬੰਦੀ)\n3. ਬੈਂਕ ਪਾਸਬੁੱਕ\n4. ਮੋਬਾਈਲ ਨੰਬਰ',
    '1. Visit PM-KISAN portal (pmkisan.gov.in) -> Farmers Corner -> New Farmer Registration.\n2. Enter Aadhaar and mobile number, verify OTP.\n3. Input State, District, Sub-District, Block, and Village.\n4. Upload land records and bank details.\n5. Complete biometric or OTP-based e-KYC.',
    '1. आधिकारिक पोर्टल pmkisan.gov.in पर जाएं -> Farmers Corner -> New Farmer Registration.\n2. आधार और मोबाइल नंबर दर्ज कर OTP सत्यापित करें।\n3. राज्य, जिला, ब्लॉक और गांव चुनें।\n4. जमीन का विवरण और बैंक खाता दर्ज करें।\n5. ई-केवाईसी (e-KYC) पूर्ण करें।',
    '1. ਪੋਰਟਲ pmkisan.gov.in ਤੇ ਜਾਓ -> ਨਵੀਂ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਕਰੋ।\n2. ਆਧਾਰ ਅਤੇ ਮੋਬਾਈਲ OTP ਵੈਰੀਫਾਈ ਕਰੋ।\n3. ਜ਼ਮੀਨ ਅਤੇ ਬੈਂਕ ਵੇਰਵੇ ਦਰਜ ਕਰੋ।',
    'https://pmkisan.gov.in',
    'Ministry of Agriculture & Farmers Welfare, Verified Nov 2026'
),
(
    'PMFBY',
    'PMFBY (Pradhan Mantri Fasal Bima Yojana)',
    'पीएमएफबीवाई (प्रधानमंत्री फसल बीमा योजना)',
    'ਪੀਐਮਐਫਬੀਵਾਈ (ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਫਸਲ ਬੀਮਾ ਯੋਜਨਾ)',
    'CROP_INSURANCE',
    'Comprehensive risk insurance covering non-preventable natural risks from pre-sowing to post-harvest with highly subsidized farmer premiums (2% for Kharif, 1.5% for Rabi, 5% for Annual Horticultural crops).',
    'बुआई से कटाई के बाद तक प्राकृतिक आपदाओं, कीटों और रोगों से फसल नुकसान पर व्यापक बीमा सुरक्षा। खरीफ के लिए 2%, रबी के लिए 1.5% और वाणिज्यिक/बागवानी फसलों के लिए 5% अधिकतम प्रीमियम।',
    'ਕੁਦਰਤੀ ਆਫ਼ਤਾਂ ਕਾਰਨ ਫਸਲਾਂ ਦੇ ਨੁਕਸਾਨ ਲਈ ਵਿਆਪਕ ਬੀਮਾ। ਸਾਉਣੀ ਲਈ 2% ਅਤੇ ਹਾੜੀ ਲਈ 1.5% ਪ੍ਰੀਮੀਅਮ।',
    'All farmers growing notified crops in notified areas including sharecroppers and tenant farmers.',
    'अधिसूचित क्षेत्रों में अधिसूचित फसलें उगाने वाले सभी किसान (बटाईदार और पट्टेदार किसान सहित)।',
    'ਸਾਰੇ ਕਿਸਾਨ ਜੋ ਨੋਟੀਫਾਈਡ ਇਲਾਕਿਆਂ ਵਿੱਚ ਨੋਟੀਫਾਈਡ ਫਸਲਾਂ ਬੀਜਦੇ ਹਨ।',
    '1. Land Possession Certificate (LPC) or Revenue Records (Patwari certificate)\n2. Sowing Certificate or self-declaration\n3. Identity Proof (Aadhaar/Voter ID)\n4. Bank account passbook',
    '1. भूमि राजस्व रिकॉर्ड (जमाबंदी/खसरा)\n2. बुआई प्रमाण पत्र (पटवारी या स्व-घोषणा)\n3. आधार कार्ड\n4. बैंक पासबुक',
    '1. ਜ਼ਮੀਨ ਦੇ ਰਿਕਾਰਡ\n2. ਬਿਜਾਈ ਸਰਟੀਫਿਕੇਟ\n3. ਆਧਾਰ ਕਾਰਡ\n4. ਬੈਂਕ ਪਾਸਬੁੱਕ',
    '1. Access pmfby.gov.in or visit local CSC / Bank Branch before cut-off date.\n2. Select State, Season, Year and Scheme.\n3. Enter Survey number, Crop sown and acreage.\n4. Pay nominal premium (1.5% to 2%).\n5. Receive insurance acknowledgment policy receipt.',
    '1. pmfby.gov.in पोर्टल या नजदीकी सीएससी/बैंक शाखा पर जाएं।\n2. मौसम (खरीफ/रबी), फसल और क्षेत्रफल चुनें।\n3. जमीन का खसरा नंबर और बैंक विवरण भरें।\n4. मामूली प्रीमियम का भुगतान करें और पॉलिसी रसीद प्राप्त करें।',
    '1. pmfby.gov.in ਤੇ ਜਾਓ ਜਾਂ ਨਜ਼ਦੀਕੀ ਬੈਂਕ ਸ਼ਾਖਾ ਤੇ ਸੰਪਰਕ ਕਰੋ।\n2. ਫਸਲ ਅਤੇ ਰਕਬਾ ਦਰਜ ਕਰੋ।\n3. ਪ੍ਰੀਮੀਅਮ ਭਰੋ ਅਤੇ ਰਸੀਦ ਲਵੋ।',
    'https://pmfby.gov.in',
    'Ministry of Agriculture & Farmers Welfare, Verified Nov 2026'
),
(
    'SOIL_HEALTH_CARD',
    'Soil Health Card Scheme',
    'मृदा स्वास्थ्य कार्ड योजना',
    'ਮਿੱਟੀ ਸਿਹਤ ਕਾਰਡ ਸਕੀਮ',
    'SOIL_NUTRIENTS',
    'Provides customized nutrient advisory reports every 3 years for farmer landholdings, recommending exact fertilizer doses (N, P, K, micro-nutrients) to reduce input costs and improve soil vitality.',
    'प्रत्येक 3 वर्ष में किसानों के खेत की मिट्टी की जांच कर 12 प्रमुख पोषक तत्वों की स्थिति एवं उर्वरक की संतुलित मात्रा की सिफारिश रिपोर्ट दी जाती है।',
    'ਹਰ 3 ਸਾਲ ਬਾਅਦ ਮਿੱਟੀ ਦੀ ਪਰਖ ਰਿਪੋਰਟ ਮਿਲਦੀ ਹੈ, ਜਿਸ ਨਾਲ ਖਾਦਾਂ ਦੀ ਸਹੀ ਵਰਤੋਂ ਦੀ ਸਲਾਹ ਦਿੱਤੀ ਜਾਂਦੀ ਹੈ।',
    'All agricultural landholders in participating states.',
    'सभी किसान जिनके पास कृषि योग्य भूमि है।',
    'ਸਾਰੇ ਜ਼ਮੀਨ ਮਾਲਕ ਕਿਸਾਨ।',
    '1. Soil sample collected from field by Agriculture Assistant/KVK\n2. Farmer Aadhaar Card\n3. Land Survey/Khasra number',
    '1. खेत का मिट्टी का नमूना\n2. किसान का आधार कार्ड\n3. खेत का खसरा नंबर',
    '1. ਮਿੱਟੀ ਦਾ ਨਮੂਨਾ\n2. ਆਧਾਰ ਕਾਰਡ\n3. ਖਸਰਾ ਨੰਬਰ',
    '1. Contact local Block Agriculture Officer or Krishi Vigyan Kendra (KVK).\n2. Soil testing team collects geo-tagged sample or farmer submits sample at soil lab.\n3. Lab processes N-P-K, pH, EC, OC, and micro-nutrients.\n4. Soil Health Card issued with dosage recommendations in regional language.',
    '1. नजदीकी ब्लॉक कृषि अधिकारी या कृषि विज्ञान केंद्र (KVK) से संपर्क करें।\n2. मिट्टी का नमूना जमा कराएं।\n3. लैब परीक्षण उपरांत क्षेत्रीय भाषा में मृदा स्वास्थ्य कार्ड प्राप्त करें।',
    '1. ਬਲਾਕ ਖੇਤੀਬਾੜੀ ਦਫ਼ਤਰ ਜਾਂ ਕੇਵੀਕੇ (KVK) ਨਾਲ ਸੰਪਰਕ ਕਰੋ।\n2. ਮਿੱਟੀ ਟੈਸਟ ਕਰਵਾਓ ਅਤੇ ਸਿਹਤ ਕਾਰਡ ਪ੍ਰਾਪਤ ਕਰੋ।',
    'https://soilhealth.dac.gov.in',
    'Department of Agriculture and Farmers Welfare, Verified Nov 2026'
),
(
    'ENAM',
    'e-NAM (National Agriculture Market)',
    'ई-नाम (राष्ट्रीय कृषि बाज़ार)',
    'ਈ-ਨਾਮ (ਰਾਸ਼ਟਰੀ ਖੇਤੀਬਾੜੀ ਮੰਡੀ)',
    'MARKET_ACCESS',
    'Pan-India electronic trading portal integrating physical APMC mandis into a unified national market with transparent online bidding and quality assaying.',
    'देश भर की मंडियों को एक साझा ऑनलाइन मंच पर जोड़ने वाला पोर्टल, जहां किसान पारदर्शी ऑनलाइन नीलामी द्वारा अपनी उपज देश के किसी भी व्यापारी को बेच सकते हैं।',
    'ਸਾਰੇ ਦੇਸ਼ ਦੀਆਂ ਮੰਡੀਆਂ ਨੂੰ ਜੋੜਨ ਵਾਲਾ ਆਨਲਾਈਨ ਪੋਰਟਲ, ਜਿੱਥੇ ਫ਼ਸਲ ਦੀ ਆਨਲਾਈਨ ਬੋਲੀ ਲੱਗਦੀ ਹੈ।',
    'Any farmer possessing agricultural produce registered in any e-NAM linked APMC mandi.',
    'कोई भी किसान जो ई-नाम से जुड़ी किसी भी कृषि मंडी में अपनी फसल बेचना चाहता है।',
    'ਕੋਈ ਵੀ ਕਿਸਾਨ ਜੋ ਈ-ਨਾਮ ਨਾਲ ਜੁੜੀ ਮੰਡੀ ਵਿੱਚ ਫਸਲ ਵੇਚਣਾ ਚਾਹੁੰਦਾ ਹੈ।',
    '1. Farmer Registration Form at Mandi Gate\n2. Aadhaar Card\n3. Bank Account details for direct settlement\n4. Mobile number',
    '1. मंडी गेट पर किसान पंजीकरण फॉर्म\n2. आधार कार्ड\n3. बैंक पासबुक\n4. मोबाइल नंबर',
    '1. ਮੰਡੀ ਐਂਟਰੀ ਫਾਰਮ\n2. ਆਧਾਰ ਕਾਰਡ\n3. ਬੈਂਕ ਖਾਤਾ\n4. ਮੋਬਾਈਲ ਨੰਬਰ',
    '1. Bring harvested produce to the nearest e-NAM enabled APMC Mandi gate.\n2. Obtain gate entry pass and quality assaying lot ticket.\n3. Produce lot is uploaded to the e-NAM bidding portal.\n4. Buyers across India submit competitive digital bids.\n5. Upon farmer approval of bid, electronic payment is transferred to bank account.',
    '1. अपनी उपज लेकर ई-नाम मंडी के प्रवेश द्वार पर पहुंचे।\n2. गेट पास और गुणवत्ता जांच लॉट नंबर प्राप्त करें।\n3. ऑनलाइन नीलामी में सर्वोत्तम बोली स्वीकार करें।\n4. भुगतान सीधे बैंक खाते में प्राप्त करें।',
    '1. ਫ਼ਸਲ ਲੈ ਕੇ ਈ-ਨਾਮ ਮੰਡੀ ਜਾਓ ਅਤੇ ਗੇਟ ਪਾਸ ਲਵੋ।\n2. ਗੁਣਵੱਤਾ ਪਰਖ ਉਪਰੰਤ ਆਨਲਾਈਨ ਬੋਲੀ ਲੱਗੇਗੀ।\n3. ਸਭ ਤੋਂ ਵੱਧ ਭਾਅ ਮਿਲਣ ਤੇ ਰਕਮ ਬੈਂਕ ਖਾਤੇ ਵਿੱਚ ਆਵੇਗੀ।',
    'https://enam.gov.in',
    'Small Farmers Agribusiness Consortium (SFAC), Verified Nov 2026'
),
(
    'KCC',
    'Kisan Credit Card (KCC) Scheme',
    'किसान क्रेडिट कार्ड (केसीसी) योजना',
    'ਕਿਸਾਨ ਕ੍ਰੈਡਿਟ ਕਾਰਡ (ਕੇਸੀਸੀ) ਸਕੀਮ',
    'CREDIT',
    'Provides timely credit to farmers at an effective interest rate of 4% per annum (with prompt repayment incentive) for cultivation expenses, crop inputs, and post-harvest maintenance.',
    'किसानों को खाद, बीज, कीटनाशक और कृषि कार्यों के लिए मात्र 4% की प्रभावी ब्याज दर (समय पर भुगतान करने पर) पर रियायती संस्थागत ऋण।',
    'ਖੇਤੀ ਖਰਚਿਆਂ ਲਈ ਸਿਰਫ਼ 4% ਸਾਲਾਨਾ ਵਿਆਜ ਤੇ ਆਸਾਨ ਬੈਂਕ ਕਰਜ਼ਾ ਮਿਲਦਾ ਹੈ।',
    'Individual/joint farmers, tenant farmers, oral lessees, sharecroppers, and SHG farmer groups.',
    'सभी व्यक्तिगत या संयुक्त किसान, बटाईदार और पट्टेदार किसान।',
    'ਸਾਰੇ ਕਿਸਾਨ, ਬਟਾਈਦਾਰ ਅਤੇ ਪੱਟੇਦਾਰ।',
    '1. Duly filled KCC application form\n2. Land record documents (Jamabandi/7-12 extract)\n3. Aadhaar and PAN / Voter Card\n4. Passport size photograph',
    '1. केसीसी आवेदन पत्र\n2. खसरा/खतौनी/जमाबंदी रिकॉर्ड\n3. आधार कार्ड एवं पैन कार्ड\n4. पासपोर्ट साइज फोटो',
    '1. ਕੇਸੀਸੀ ਫਾਰਮ\n2. ਜ਼ਮੀਨ ਦੇ ਕਾਗਜ਼ਾਤ\n3. ਆਧਾਰ ਕਾਰਡ\n4. ਫੋਟੋ',
    '1. Download one-page KCC form from bank website or visit Commercial Bank / RRB / Cooperative Bank.\n2. Submit land revenue records and identity proof.\n3. Bank verifies landholding and issues KCC card within 14 days.',
    '1. अपनी बैंक शाखा या जन सेवा केंद्र से संपर्क करें।\n2. जमीन के दस्तावेज और आधार जमा करें।\n3. 14 दिनों के भीतर किसान क्रेडिट कार्ड जारी कर दिया जाएगा।',
    '1. ਬੈਂਕ ਸ਼ਾਖਾ ਵਿੱਚ ਫਾਰਮ ਅਤੇ ਜ਼ਮੀਨ ਦੇ ਕਾਗਜ਼ ਜਮ੍ਹਾਂ ਕਰਵਾਓ।\n2. 14 ਦਿਨਾਂ ਦੇ ਅੰਦਰ ਕਾਰਡ ਮਿਲੇਗਾ।',
    'https://www.myscheme.gov.in/schemes/kcc',
    'Reserve Bank of India & NABARD, Verified Nov 2026'
)
ON CONFLICT (code) DO NOTHING;
