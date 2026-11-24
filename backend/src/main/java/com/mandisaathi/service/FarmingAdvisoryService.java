package com.mandisaathi.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Farming Advisory Service providing trusted agronomic answers based on ICAR, PAU, HAU,
 * IMD, and Ministry of Agriculture guidelines.
 *
 * Covers:
 * - Crop planning, sowing & harvest timing
 * - Irrigation & water management
 * - Soil health, nutrition & fertilizer scheduling
 * - Pest & disease symptom diagnosis with disclaimer & IPM protocols
 * - Weather & Agromet precautions
 * - Safe storage, moisture limits & warehousing
 * - Farm transport & logistics
 */
@Service
public class FarmingAdvisoryService {

    private static final ZoneId MARKET_ZONE = ZoneId.of("Asia/Kolkata");

    public record AdvisoryResult(
            String domain,
            String responseEn,
            String responseHi,
            String responsePa,
            String sourceAuthority,
            String followUpQuestionEn,
            String followUpQuestionHi,
            String followUpQuestionPa,
            String regionRelevance,
            boolean requiresFollowUp
    ) {}

    private static final Pattern SOWING_PATTERN = Pattern.compile("(?iuU)\\b(?:sow|sowing|planting|plant|harvest|harvesting|bijaai|bijai|katei|bavani|bavavani|बुवाई|बोने|कटाई|ਬਿਜਾਈ|ਵਾਢੀ)\\b");
    private static final Pattern IRRIGATION_PATTERN = Pattern.compile("(?iuU)\\b(?:irrigate|irrigation|water|watering|sinchai|paani|pani|सिंचाई|पानी|ਸਿੰਚਾਈ|ਪਾਣੀ)\\b");
    private static final Pattern FERTILIZER_PATTERN = Pattern.compile("(?iuU)\\b(?:fertilizer|urea|dap|npk|potash|zinc|khad|khat|soil|nutrient|खाद|यूरिया|उर्वरक|मिट्टी|ਖਾਦ|ਯੂਰੀਆ|ਮਿੱਟੀ)\\b");
    private static final Pattern PEST_DISEASE_PATTERN = Pattern.compile("(?iuU)\\b(?:pest|disease|fungus|fungal|blight|rust|borer|worm|caterpillar|insect|yellow|pila|peela|sukha|keeda|keede|रोग|कीट|कीड़ा|पीला|फफूंद|ਸੁੰਡੀ|ਕੀੜਾ|ਰੋਗ|ਪੀਲਾ|ਕੁੰਗੀ)\\b");
    private static final Pattern WEATHER_PATTERN = Pattern.compile("(?iuU)\\b(?:weather|rain|frost|temperature|wind|storm|mausam|barish|barsat|kohra|pala|hawa|मौसम|बारिश|पाला|कोहरा|ਤਾਪਮਾਨ|ਮੀਂਹ|ਮੌਸਮ|ਪਾਲਾ)\\b");
    private static final Pattern STORAGE_PATTERN = Pattern.compile("(?iuU)\\b(?:storage|store|warehouse|silo|moisture|godown|bhandaran|bhandar|anaj|भंडारण|गोदाम|नमी|ਭੰਡਾਰਨ|ਗੋਦਾਮ|ਨਮੀ)\\b");
    private static final Pattern TRANSPORT_PATTERN = Pattern.compile("(?iuU)\\b(?:transport|truck|freight|distance|loading|kiraya|bhada|kiraya|dhulai|किराया|भाड़ा|परिवहन|ढुलाई|ਕਿਰਾਇਆ|ਭਾੜਾ|ਢੋਆ-ਢੁਆਈ)\\b");

    private static final Pattern CROP_INFO_PATTERN = Pattern.compile("(?iuU)\\b(?:about|details|info|information|guide|grow|cultivation|cultivate|farming|variety|varieties|seed|kheti|jaankari|jankari|bare|बारे|जानकारी|खेती|किस्म|ਕਿਵੇਂ|ਜਾਣਕਾਰੀ|ਖੇਤੀ|ਕਿਸਮ)\\b");

    private record CropProfileSummary(
            String code,
            String nameEn,
            String nameHi,
            String namePa,
            String season,
            String sowing,
            String varieties,
            String states,
            String keyTipEn,
            String keyTipHi,
            String keyTipPa
    ) {}

    private static final java.util.Map<String, CropProfileSummary> CROP_CATALOG = java.util.Map.ofEntries(
            java.util.Map.entry("WHEAT", new CropProfileSummary("WHEAT", "Wheat", "गेहूं", "ਕਣਕ", "Rabi", "Nov 1–25", "HD-3086, DBW-187, PBW-826", "UP, Punjab, Haryana, MP, Rajasthan", "Mandatory 1st irrigation at CRI (20–25 DAS); store <12% moisture.", "पहली सिंचाई 20–25 दिन (CRI) पर करें; नमी <12% रखें।", "ਪਹਿਲਾ ਪਾਣੀ 20–25 ਦਿਨਾਂ 'ਤੇ ਲਾਓ; ਨਮੀ <12% ਰੱਖੋ।")),
            java.util.Map.entry("PADDY", new CropProfileSummary("PADDY", "Paddy (Rice)", "धान", "ਝੋਨਾ", "Kharif", "May 15–July 10", "PR-126, Pusa Basmati 1121, Swarna", "WB, UP, Punjab, Odisha, AP", "Alternate wetting & drying saves water; watch for BPH & Blast.", "भूरे फुदके (BPH) से बचाव हेतु पानी निकालें; नमी <14%।", "ਤੇਲੇ (BPH) ਤੋਂ ਬਚਾਅ ਲਈ ਪਾਣੀ ਸੁਕਾਓ; ਨਮੀ <14%।")),
            java.util.Map.entry("MAIZE", new CropProfileSummary("MAIZE", "Maize (Corn)", "मक्का", "ਮੱਕੀ", "Kharif/Rabi", "June 15–July 15", "PMH-1, PMH-13, HQPM-1", "Karnataka, MP, Bihar, Maharashtra", "Ensure zero waterlogging; monitor whorl for Fall Armyworm.", "जलभराव न होने दें; फॉल आर्मीवर्म की निगरानी रखें।", "ਪਾਣੀ ਨਾ ਖੜ੍ਹਨ ਦਿਓ; ਫਾਲ ਆਰਮੀਵਰਮ ਤੋਂ ਬਚਾਅ ਕਰੋ।")),
            java.util.Map.entry("BARLEY", new CropProfileSummary("BARLEY", "Barley (Jau)", "जौ", "ਜੌਂ", "Rabi", "Oct 25–Nov 25", "DWRB-137, DWRB-182 (Malt), RD-2794", "Rajasthan, UP, MP, Haryana", "Tolerates saline/alkaline soil; 2–3 light irrigations suffice.", "लवणीय मिट्टी के लिए उत्तम; 2–3 हल्की सिंचाई पर्याप्त।", "ਖਾਰੀ ਜ਼ਮੀਨ ਲਈ ਵਧੀਆ; 2–3 ਹਲਕੇ ਪਾਣੀ ਕਾਫੀ ਹਨ।")),
            java.util.Map.entry("BAJRA", new CropProfileSummary("BAJRA", "Pearl Millet (Bajra)", "बाजरा", "ਬਾਜਰਾ", "Kharif", "June 20–July 25", "HHB-67 Improved, GHB-558, Dhanashakti", "Rajasthan, UP, Haryana, Gujarat", "Drought-hardy Shri Anna millet; use Downy Mildew resistant hybrids.", "सूखा सहनशील श्री अन्न; रोगरोधी संकर किस्म बोएं।", "ਸੋਕਾ ਸਹਿਣਸ਼ੀਲ ਸ਼੍ਰੀ ਅੰਨ; ਰੋਗ ਰਹਿਤ ਕਿਸਮ ਬੀਜੋ।")),
            java.util.Map.entry("JOWAR", new CropProfileSummary("JOWAR", "Sorghum (Jowar)", "ज्वार", "ਜਵਾਰ", "Kharif/Rabi", "June 15–July 15", "CSH-16, Maldandi (M 35-1), CSV-15", "Maharashtra, Karnataka, Rajasthan", "Early sowing avoids Shoot Fly; Rabi Maldandi commands food premium.", "जल्दी बुवाई से शूट फ्लाई से बचाव होता है।", "ਸਮੇਂ ਸਿਰ ਬਿਜਾਈ ਨਾਲ ਸ਼ੂਟ ਫਲਾਈ ਤੋਂ ਬਚਾਅ ਹੁੰਦਾ ਹੈ।")),
            java.util.Map.entry("RAGI", new CropProfileSummary("RAGI", "Finger Millet (Ragi)", "रागी (मडुआ)", "ਰਾਗੀ", "Kharif", "June–July", "GPU-28, GPU-48, VL Mandua 376", "Karnataka, Uttarakhand, Tamil Nadu", "Calcium-rich millet; stores safely 3+ years below 12% moisture.", "कैल्शियम युक्त श्री अन्न; <12% नमी पर वर्षों सुरक्षित।", "ਕੈਲਸ਼ੀਅਮ ਭਰਪੂਰ ਫ਼ਸਲ; <12% ਨਮੀ 'ਤੇ ਲੰਮਾ ਸਮਾਂ ਸੁਰੱਖਿਅਤ।")),
            java.util.Map.entry("CHANA", new CropProfileSummary("CHANA", "Chickpea (Chana)", "चना", "ਛੋਲੇ", "Rabi", "Oct 15–Nov 20", "JG-11, PBG-7, GNG-1958, KAK-2", "MP, Maharashtra, Rajasthan, UP", "1–2 light irrigations; use pheromone traps for Pod Borer.", "1–2 हल्की सिंचाई; फली छेदक हेतु फेरोमोन ट्रैप लगाएं।", "1–2 ਹਲਕੇ ਪਾਣੀ; ਸੁੰਡੀ ਲਈ ਫੇਰੋਮੋਨ ਟ੍ਰੈਪ ਵਰਤੋ।")),
            java.util.Map.entry("TUR", new CropProfileSummary("TUR", "Pigeon Pea (Tur/Arhar)", "अरहर (तूर)", "ਅਰਹਰ", "Kharif", "June 10–July 15", "ICPL-87119 (Asha), BSMR-736, PAU-881", "Maharashtra, Karnataka, MP, UP", "Deep-rooted pulse; store below 10% moisture to prevent bruchids.", "गहरी जड़ वाली दलहन; भंडारण में नमी <10% रखें।", "ਡੂੰਘੀ ਜੜ੍ਹ ਵਾਲੀ ਦਾਲ; ਸਟੋਰੇਜ ਨਮੀ <10% ਰੱਖੋ।")),
            java.util.Map.entry("MOONG", new CropProfileSummary("MOONG", "Green Gram (Moong)", "मूंग", "ਮੂੰਗੀ", "Zaid/Kharif", "March 15–April 15", "SML-668, SML-832, MH-421, Virat", "Rajasthan, MP, Maharashtra, Punjab", "Ideal 60–70 day Zaid catch crop; fixes atmospheric nitrogen.", "60–70 दिन की जायद फसल; मिट्टी की उर्वरता बढ़ाती है।", "60–70 ਦਿਨਾਂ ਦੀ ਜ਼ਾਇਦ ਫ਼ਸਲ; ਜ਼ਮੀਨ ਦੀ ਤਾਕਤ ਵਧਾਉਂਦੀ ਹੈ।")),
            java.util.Map.entry("URAD", new CropProfileSummary("URAD", "Black Gram (Urad)", "उड़द", "ਮਾਂਹ", "Kharif", "June 20–July 20", "Mash-114, PU-31, Uttara", "MP, UP, Andhra Pradesh, Tamil Nadu", "Control Whitefly early to prevent Yellow Mosaic Virus.", "पीला मोजेक वायरस से बचाव हेतु सफेद मक्खी नियंत्रित करें।", "ਪੀਲੇ ਮੋਜ਼ੇਕ ਤੋਂ ਬਚਾਅ ਲਈ ਚਿੱਟੀ ਮੱਖੀ ਰੋਕੋ।")),
            java.util.Map.entry("MASOOR", new CropProfileSummary("MASOOR", "Lentil (Masoor)", "मसूर", "ਮਸਰ", "Rabi", "Oct 20–Nov 20", "IPL-316, IPL-526, LL-931", "MP, UP, Bihar, West Bengal", "Add 8 kg Sulphur/acre; 1–2 light irrigations.", "8 किग्रा सल्फर/एकड़ दें; 1–2 हल्की सिंचाई।", "8 ਕਿਲੋ ਸਲਫਰ ਪ੍ਰਤੀ ਏਕੜ ਪਾਓ।")),
            java.util.Map.entry("MUSTARD", new CropProfileSummary("MUSTARD", "Mustard (Sarson)", "सरसों", "ਸਰ੍ਹੋਂ", "Rabi", "Oct 10–Nov 10", "RH-749, RH-725, Giriraj, RLC-3", "Rajasthan, MP, Haryana, UP, Punjab", "Sulphur boosts oil %; store strictly below 8% moisture.", "सल्फर से तेल की मात्रा बढ़ती है; नमी <8% रखें।", "ਸਲਫਰ ਤੇਲ ਵਧਾਉਂਦਾ ਹੈ; ਨਮੀ <8% ਰੱਖੋ।")),
            java.util.Map.entry("SOYBEAN", new CropProfileSummary("SOYBEAN", "Soybean", "सोयाबीन", "ਸੋਇਆਬੀਨ", "Kharif", "June 15–July 10", "JS-95-60, JS-20-69, NRC-138", "MP, Maharashtra, Rajasthan", "Pod-filling irrigation boosts seed weight; watch Girdle Beetle.", "फली भरते समय नमी जरूरी; गर्डल बीटल पर नजर रखें।", "ਫਲੀ ਭਰਨ ਵੇਲੇ ਨਮੀ ਜ਼ਰੂਰੀ ਹੈ।")),
            java.util.Map.entry("GROUNDNUT", new CropProfileSummary("GROUNDNUT", "Groundnut (Peanut)", "मूंगफली", "ਮੂੰਗਫਲੀ", "Kharif/Summer", "June 15–July 15", "GG-20, GNH-804, Girnar-4", "Gujarat, Rajasthan, TN, AP", "Apply 200 kg Gypsum/acre at flowering; store <8% moisture.", "फूल आने पर 200 किग्रा जिप्सम/एकड़ डालें।", "ਫੁੱਲ ਆਉਣ 'ਤੇ 200 ਕਿਲੋ ਜਿਪਸਮ ਪ੍ਰਤੀ ਏਕੜ ਪਾਓ।")),
            java.util.Map.entry("SUNFLOWER", new CropProfileSummary("SUNFLOWER", "Sunflower", "सूरजमुखी", "ਸੂਰਜਮੁਖੀ", "Zaid/Spring", "Jan 15–Feb 20", "PSH-1962, PSH-2080, KBSH-44", "Karnataka, Haryana, Punjab", "Boron 0.2% spray at ray-floret stage improves seed setting.", "बोरॉन 0.2% छिड़काव से दाना अच्छा भरता है।", "ਬੋਰਾਨ 0.2% ਸਪਰੇਅ ਨਾਲ ਦਾਣਾ ਵਧੀਆ ਭਰਦਾ ਹੈ।")),
            java.util.Map.entry("COTTON", new CropProfileSummary("COTTON", "Cotton (Kapas)", "कपास", "ਕਪਾਹ", "Kharif", "April 15–May 20", "RCH-773 BG-II, PAU Bt-2, Suraj", "Gujarat, Maharashtra, Telangana, Punjab, Haryana", "Install pheromone traps for Pink Bollworm; pick clean dry lint.", "गुलाबी सुंडी हेतु फेरोमोन ट्रैप लगाएं।", "ਗੁਲਾਬੀ ਸੁੰਡੀ ਲਈ ਫੇਰੋਮੋਨ ਟ੍ਰੈਪ ਲਗਾਓ।")),
            java.util.Map.entry("SUGARCANE", new CropProfileSummary("SUGARCANE", "Sugarcane (Ganna)", "गन्ना", "ਗੰਨਾ", "Perennial", "Feb–March / Oct–Nov", "Co-0238, Co-0118, CoPb-91, Co-86032", "UP, Maharashtra, Karnataka, Punjab", "Use disease-free seed setts to avoid Red Rot; crush within 24h.", "लाल सड़न से बचाव हेतु स्वस्थ बीज गन्ना चुनें।", "ਲਾਲ ਸੜਨ ਤੋਂ ਬਚਾਅ ਲਈ ਸਿਹਤਮੰਦ ਬੀਜ ਵਰਤੋ।")),
            java.util.Map.entry("JUTE", new CropProfileSummary("JUTE", "Jute (Patsan)", "जूट (पटसन)", "ਪਟਸਨ", "Kharif", "March 15–May 15", "JRO-204 (Suren), JRO-524 (Navin)", "West Bengal, Bihar, Assam, Odisha", "Harvest at small-pod stage and ret in clean slow-moving water.", "छोटी फली अवस्था में कटाई व साफ पानी में सड़ाई करें।", "ਛੋਟੀ ਫਲੀ ਵੇਲੇ ਕਟਾਈ ਕਰੋ।")),
            java.util.Map.entry("CUMIN", new CropProfileSummary("CUMIN", "Cumin (Jeera)", "जीरा", "ਜ਼ੀਰਾ", "Rabi", "Nov 1–20", "GC-4, RZ-209, RZ-19", "Gujarat, Rajasthan (Unjha, Jodhpur)", "Avoid irrigation during cloudy weather to prevent Alternaria Blight.", "बादल छाए रहने पर सिंचाई न करें ताकि झुलसा रोग न लगे।", "ਬੱਦਲਵਾਈ ਵੇਲੇ ਪਾਣੀ ਨਾ ਲਾਓ।")),
            java.util.Map.entry("TURMERIC", new CropProfileSummary("TURMERIC", "Turmeric (Haldi)", "हल्दी", "ਹਲਦੀ", "Kharif", "May–June", "Prathibha, Salem, Erode, Punjab Haldi-1", "Maharashtra, Telangana, TN, Odisha", "Ensure ridge drainage to prevent Rhizome Rot; dry <10% moisture.", "प्रकंद सड़न रोकने हेतु जल निकासी रखें।", "ਪਾਣੀ ਦੇ ਨਿਕਾਸ ਦਾ ਪੂਰਾ ਪ੍ਰਬੰਧ ਰੱਖੋ।")),
            java.util.Map.entry("CORIANDER", new CropProfileSummary("CORIANDER", "Coriander (Dhania)", "धनिया", "ਧਨੀਆ", "Rabi", "Oct 20–Nov 20", "RCR-41, RCR-435, ACr-1", "MP, Rajasthan (Kota/Baran), Gujarat", "3–4 light irrigations; shade-dry to retain green seed colour.", "3–4 हल्की सिंचाई; हरा रंग बनाए रखने को छाया में सुखाएं।", "ਹਰਾ ਰੰਗ ਬਚਾਉਣ ਲਈ ਛਾਂ ਵਿੱਚ ਸੁਕਾਓ।")),
            java.util.Map.entry("CHILLI", new CropProfileSummary("CHILLI", "Red Chilli (Mirch)", "मिर्च", "ਮਿਰਚ", "Kharif/Rabi", "June–July / Sept–Oct", "Teja (S-17), Byadgi Kaddi, CH-27", "Andhra Pradesh, Telangana, MP, Karnataka", "Control Thrips & Mites early to prevent Leaf Curl; dry <10%.", "थ्रिप्स व माइट से बचाव हेतु समय पर निगरानी करें।", "ਥ੍ਰਿਪਸ ਤੋਂ ਬਚਾਅ ਲਈ ਸਮੇਂ ਸਿਰ ਜਾਂਚ ਕਰੋ।")),
            java.util.Map.entry("ONION", new CropProfileSummary("ONION", "Onion (Pyaz)", "प्याज़", "ਪਿਆਜ਼", "Rabi/Kharif", "Oct–Nov (Rabi)", "Bhima Shakti, Bhima Kiran, NHRDF Red", "Maharashtra, MP, Karnataka, Gujarat", "Stop irrigation 15 days before harvest; cure bulbs 10–15 days.", "कटाई से 15 दिन पहले सिंचाई बंद करें और 10–15 दिन सुखाएं।", "ਕਟਾਈ ਤੋਂ 15 ਦਿਨ ਪਹਿਲਾਂ ਪਾਣੀ ਬੰਦ ਕਰੋ।")),
            java.util.Map.entry("POTATO", new CropProfileSummary("POTATO", "Potato (Aloo)", "आलू", "ਆਲੂ", "Rabi", "Oct 1–Nov 15", "Kufri Jyoti, Kufri Pukhraj, Chipsona-1", "UP, West Bengal, Bihar, Punjab, Gujarat", "Earthing up at 25–30 DAP; monitor humidity for Late Blight.", "25–30 दिन पर मिट्टी चढ़ाएं; पछेती झुलसा से बचाव रखें।", "25–30 ਦਿਨਾਂ 'ਤੇ ਮਿੱਟੀ ਚੜ੍ਹਾਓ; ਝੁਲਸ ਰੋਗ ਤੋਂ ਬਚਾਅ ਰੱਖੋ।")),
            java.util.Map.entry("TOMATO", new CropProfileSummary("TOMATO", "Tomato (Tamatar)", "टमाटर", "ਟਮਾਟਰ", "All Seasons", "Sept–Oct / Jan–Feb", "Arka Rakshak, Pusa Rohini, Punjab Ratta", "MP, AP, Karnataka, Maharashtra", "Regular drip moisture prevents Blossom End Rot; watch Leaf Curl.", "नियमित ड्रिप सिंचाई से फल सड़न रुकती है।", "ਨਿਯਮਤ ਡ੍ਰਿਪ ਸਿੰਚਾਈ ਲਾਭਦਾਇਕ ਹੈ।")),
            java.util.Map.entry("BRINJAL", new CropProfileSummary("BRINJAL", "Brinjal (Baingan)", "बैंगन", "ਬੈਂਗਣ", "All Seasons", "Feb–March / June–July", "Pusa Purple Long, Arka Keshav, Punjab Sadabahar", "WB, Odisha, Gujarat, Bihar", "Clip shoots affected by Shoot & Fruit Borer and use pheromone traps.", "तना व फल छेदक प्रभावित टहनियां काटकर नष्ट करें।", "ਗੜੂੰਏਂ ਤੋਂ ਪ੍ਰਭਾਵਿਤ ਟਹਿਣੀਆਂ ਕੱਟ ਦਿਓ।")),
            java.util.Map.entry("OKRA", new CropProfileSummary("OKRA", "Okra (Bhindi)", "भिंडी", "ਭਿੰਡੀ", "Zaid/Kharif", "Feb–March / June–July", "Arka Anamika, Pusa A-4, Punjab-8", "Gujarat, WB, Bihar, MP", "Use YVMV-resistant varieties; harvest tender pods every 2 days.", "पीला शिरा मोजेक रोधी किस्म बोएं; हर 2 दिन पर तुड़ाई करें।", "ਰੋਗ ਰਹਿਤ ਕਿਸਮ ਬੀਜੋ ਅਤੇ ਹਰ 2 ਦਿਨਾਂ ਬਾਅਦ ਤੁੜਾਈ ਕਰੋ।")),
            java.util.Map.entry("MANGO", new CropProfileSummary("MANGO", "Mango (Aam)", "आम", "ਅੰਬ", "Perennial", "July–August (Planting)", "Alphonso, Kesar, Dasheri, Langra, Amrapali", "UP, AP, Karnataka, Bihar, Gujarat, MH", "Use Methyl Eugenol traps for Fruit Fly; avoid carbide ripening.", "फल मक्खी हेतु मिथाइल यूजेनॉल ट्रैप लगाएं।", "ਫਲ ਮੱਖੀ ਲਈ ਟ੍ਰੈਪ ਵਰਤੋ।")),
            java.util.Map.entry("BANANA", new CropProfileSummary("BANANA", "Banana (Kela)", "केला", "ਕੇਲਾ", "Perennial", "Feb–March / June–July", "Grand Naine (G-9), Robusta, Nendran", "AP, Maharashtra, Gujarat, TN", "Plant disease-free tissue-culture G-9 with drip fertigation.", "टिश्यू कल्चर जी-9 पौधे और ड्रिप फर्टिगेशन अपनाएं।", "ਟਿਸ਼ੂ ਕਲਚਰ ਜੀ-9 ਬੂਟੇ ਲਗਾਓ।")),
            java.util.Map.entry("APPLE", new CropProfileSummary("APPLE", "Apple (Seb)", "सेब", "ਸੇਬ", "Perennial", "Dec–Feb (Dormant)", "Royal Delicious, Gala, Fuji, HRMN-99", "J&K, Himachal Pradesh, Uttarakhand", "Requires 800–1,200 chilling hours; store at 0–1°C in CA chambers.", "800–1,200 चिलिंग घंटे आवश्यक; 0–1°C पर भंडारण करें।", "0–1°C 'ਤੇ ਕੋਲਡ ਸਟੋਰੇਜ ਵਿੱਚ ਰੱਖੋ।")),
            java.util.Map.entry("COCONUT", new CropProfileSummary("COCONUT", "Coconut (Nariyal)", "नारियल", "ਨਾਰੀਅਲ", "Perennial", "May–June", "West Coast Tall, Chowghat Dwarf, TxD", "Kerala, Tamil Nadu, Karnataka, AP", "Irrigate 40–60 L/palm/day in summer; dry copra <6% moisture.", "गर्मियों में 40–60 लीटर पानी प्रति वृक्ष दें।", "ਗਰਮੀਆਂ ਵਿੱਚ ਨਿਯਮਤ ਪਾਣੀ ਦਿਓ।")),
            java.util.Map.entry("OATS", new CropProfileSummary("OATS", "Oats (Jai)", "जई", "ਜਵੀ", "Rabi", "Oct 15–Nov 30", "OL-10, Kent, OS-6, JHO-822", "Punjab, Haryana, UP, Uttarakhand", "Dual-purpose winter fodder and grain; top-dress N after 1st cut.", "पहली चारा कटाई के बाद यूरिया दें।", "ਪਹਿਲੀ ਕਟਾਈ ਤੋਂ ਬਾਅਦ ਯੂਰੀਆ ਪਾਓ।")),
            java.util.Map.entry("FOXTAIL_MILLET", new CropProfileSummary("FOXTAIL_MILLET", "Foxtail Millet (Kangni)", "कंगनी", "ਕੰਗਣੀ", "Kharif", "June–July", "SiA-3085, SiA-3156, Suryanandi", "AP, Karnataka, Telangana, Rajasthan", "Drought-hardy low-GI Shri Anna millet; 75–90 days duration.", "कम पानी में 75–90 दिन की श्री अन्न फसल।", "ਘੱਟ ਪਾਣੀ ਵਿੱਚ ਤਿਆਰ ਹੋਣ ਵਾਲਾ ਸ਼੍ਰੀ ਅੰਨ।")),
            java.util.Map.entry("KODO_MILLET", new CropProfileSummary("KODO_MILLET", "Kodo Millet (Kodon)", "कोदो", "ਕੋਦੋ", "Kharif", "June 15–July 15", "JK-48, JK-137, RK-390-25", "MP, Chhattisgarh, Maharashtra", "Thrives on shallow upland soils; avoid wet harvesting.", "उथली भूमि में उपयुक्त; गीले मौसम में कटाई से बचें।", "ਘੱਟ ਉਪਜਾਊ ਜ਼ਮੀਨ ਲਈ ਵਧੀਆ ਫ਼ਸਲ।")),
            java.util.Map.entry("SESAME", new CropProfileSummary("SESAME", "Sesame (Til)", "तिल", "ਤਿਲ", "Kharif/Summer", "July / Feb–March", "RT-351, GT-4, Punjab Til No. 2", "WB, MP, Rajasthan, UP, Gujarat", "Store strictly <7% moisture; watch for Phyllody.", "भंडारण में नमी <7% रखें; फाइलोडी रोग से बचाव करें।", "ਸਟੋਰੇਜ ਨਮੀ <7% ਰੱਖੋ।")),
            java.util.Map.entry("GUAR", new CropProfileSummary("GUAR", "Cluster Bean (Guar)", "ग्वार", "ਗੁਆਰ", "Kharif", "July 1–25", "HG-365, HG-563, RGC-1038", "Rajasthan, Haryana, Gujarat, Punjab", "Arid-zone legume; 1 irrigation at pod-filling boosts gum %.", "फली भरते समय सिंचाई से ग्वार गम की गुणवत्ता बढ़ती है।", "ਫਲੀ ਭਰਨ ਵੇਲੇ ਪਾਣੀ ਲਾਓ।")),
            java.util.Map.entry("FENUGREEK", new CropProfileSummary("FENUGREEK", "Fenugreek (Methi)", "मेथी", "ਮੇਥੀ", "Rabi", "Oct 15–Nov 20", "RMT-1, RMT-143, Kasuri Selection", "Rajasthan, MP, Gujarat, Haryana", "Control Powdery Mildew with Wettable Sulphur; store <9% moisture.", "चूर्णिल आसिता हेतु घुलनशील सल्फर का उपयोग करें।", "ਨਮੀ <9% ਰੱਖ ਕੇ ਸਟੋਰ ਕਰੋ।"))
    );

    public boolean canHandle(String query) {
        if (query == null || query.isBlank()) return false;
        String lower = query.toLowerCase(Locale.ROOT);
        if (SOWING_PATTERN.matcher(lower).find()
                || IRRIGATION_PATTERN.matcher(lower).find()
                || FERTILIZER_PATTERN.matcher(lower).find()
                || PEST_DISEASE_PATTERN.matcher(lower).find()
                || WEATHER_PATTERN.matcher(lower).find()
                || STORAGE_PATTERN.matcher(lower).find()
                || TRANSPORT_PATTERN.matcher(lower).find()) {
            return true;
        }
        String detected = detectCropFromQuery(lower);
        return !"GENERAL".equals(detected) && CROP_INFO_PATTERN.matcher(lower).find();
    }

    public AdvisoryResult resolveAdvisory(String query, String detectedCrop, String detectedDistrict, String detectedState) {
        String lower = query.toLowerCase(Locale.ROOT);
        String crop = detectedCrop != null ? detectedCrop.toUpperCase(Locale.ROOT) : detectCropFromQuery(lower);
        String region = detectedDistrict != null ? detectedDistrict : (detectedState != null ? detectedState : "Punjab & Haryana (Indo-Gangetic Plains)");

        // 1. Pest and Disease Diagnostics
        if (PEST_DISEASE_PATTERN.matcher(lower).find()) {
            return buildPestDiseaseAdvisory(crop, lower, region);
        }

        // 2. Irrigation Scheduling
        if (IRRIGATION_PATTERN.matcher(lower).find()) {
            return buildIrrigationAdvisory(crop, lower, region);
        }

        // 3. Soil Nutrition & Fertilizer Management
        if (FERTILIZER_PATTERN.matcher(lower).find()) {
            return buildFertilizerAdvisory(crop, lower, region);
        }

        // 4. Sowing, Crop Planning & Harvest Timing
        if (SOWING_PATTERN.matcher(lower).find()) {
            return buildSowingHarvestAdvisory(crop, lower, region);
        }

        // 5. Weather & Agromet Precautions
        if (WEATHER_PATTERN.matcher(lower).find()) {
            return buildWeatherAdvisory(crop, lower, region);
        }

        // 6. Safe Storage & Moisture
        if (STORAGE_PATTERN.matcher(lower).find()) {
            return buildStorageAdvisory(crop, region);
        }

        // 7. Transport & Logistics
        if (TRANSPORT_PATTERN.matcher(lower).find()) {
            return buildTransportAdvisory(crop, region);
        }

        // 8. Full Indian Crop Encyclopedia Dossier
        if (CROP_CATALOG.containsKey(crop)) {
            return buildCropProfileAdvisory(crop, region);
        }

        return buildGeneralAgriAdvisory(region);
    }

    private String detectCropFromQuery(String text) {
        if (CommodityAliases.isCumin(text)) return "CUMIN";
        if (text.contains("wheat") || text.contains("gehu") || text.contains("गेहूं") || text.contains("ਕਣਕ")) return "WHEAT";
        if (text.contains("mustard") || text.contains("sarson") || text.contains("सरसों") || text.contains("ਸਰ੍ਹੋਂ")) return "MUSTARD";
        if (text.contains("paddy") || text.contains("rice") || text.contains("dhan") || text.contains("धान") || text.contains("ਝੋਨਾ")) return "PADDY";
        if (text.contains("maize") || text.contains("corn") || text.contains("makka") || text.contains("मक्का") || text.contains("ਮੱਕੀ")) return "MAIZE";
        if (text.contains("barley") || text.contains("jau") || text.contains("जौ") || text.contains("ਜੌਂ")) return "BARLEY";
        if (text.contains("bajra") || text.contains("pearl millet") || text.contains("बाजरा") || text.contains("ਬਾਜਰਾ")) return "BAJRA";
        if (text.contains("jowar") || text.contains("sorghum") || text.contains("ज्वार") || text.contains("ਜਵਾਰ")) return "JOWAR";
        if (text.contains("ragi") || text.contains("finger millet") || text.contains("mandua") || text.contains("रागी") || text.contains("ਰਾਗੀ")) return "RAGI";
        if (text.contains("turmeric") || text.contains("haldi") || text.contains("हल्दी") || text.contains("ਹਲਦੀ")) return "TURMERIC";
        if (text.contains("chana") || text.contains("chickpea") || text.contains("gram") || text.contains("चना") || text.contains("ਛੋਲੇ")) return "CHANA";
        if (text.matches(".*\\btur\\b.*") || text.contains("arhar") || text.contains("pigeon pea") || text.contains("अरहर") || text.contains("तूर") || text.contains("ਅਰਹਰ")) return "TUR";
        if (text.contains("moong") || text.contains("mung") || text.contains("green gram") || text.contains("मूंग") || text.contains("ਮੂੰਗੀ")) return "MOONG";
        if (text.contains("urad") || text.contains("black gram") || text.contains("उड़द") || text.contains("ਮਾਂਹ")) return "URAD";
        if (text.contains("masoor") || text.contains("lentil") || text.contains("मसूर") || text.contains("ਮਸਰ")) return "MASOOR";
        if (text.contains("soybean") || text.contains("soya") || text.contains("सोयाबीन") || text.contains("ਸੋਇਆਬੀਨ")) return "SOYBEAN";
        if (text.contains("groundnut") || text.contains("peanut") || text.contains("mungfali") || text.contains("मूंगफली") || text.contains("ਮੂੰਗਫਲੀ")) return "GROUNDNUT";
        if (text.contains("sunflower") || text.contains("surajmukhi") || text.contains("सूरजमुखी") || text.contains("ਸੂਰਜਮੁਖੀ")) return "SUNFLOWER";
        if (text.contains("cotton") || text.contains("kapas") || text.contains("narma") || text.contains("कपास") || text.contains("ਕਪਾਹ")) return "COTTON";
        if (text.contains("sugarcane") || text.contains("ganna") || text.contains("गन्ना") || text.contains("ਗੰਨਾ")) return "SUGARCANE";
        if (text.contains("jute") || text.contains("patsan") || text.contains("जूट") || text.contains("ਪਟਸਨ")) return "JUTE";
        if (text.contains("coriander") || text.contains("dhania") || text.contains("धनिया") || text.contains("ਧਨੀਆ")) return "CORIANDER";
        if (text.contains("chilli") || text.contains("mirch") || text.contains("मिर्च") || text.contains("ਮਿਰਚ")) return "CHILLI";
        if (text.contains("tomato") || text.contains("tamatar") || text.contains("टमाटर") || text.contains("ਟਮਾਟਰ")) return "TOMATO";
        if (text.contains("potato") || text.contains("aloo") || text.contains("आलू") || text.contains("ਆਲੂ")) return "POTATO";
        if (text.contains("onion") || text.contains("pyaz") || text.contains("प्याज़") || text.contains("ਪਿਆਜ਼")) return "ONION";
        if (text.contains("brinjal") || text.contains("eggplant") || text.contains("baingan") || text.contains("बैंगन") || text.contains("ਬੈਂਗਣ")) return "BRINJAL";
        if (text.contains("okra") || text.contains("ladyfinger") || text.contains("bhindi") || text.contains("भिंडी") || text.contains("ਭਿੰਡੀ")) return "OKRA";
        if (text.contains("mango") || text.contains("aam") || text.contains("आम") || text.contains("ਅੰਬ")) return "MANGO";
        if (text.contains("banana") || text.contains("kela") || text.contains("केला") || text.contains("ਕੇਲਾ")) return "BANANA";
        if (text.contains("apple") || text.contains("seb") || text.contains("सेब") || text.contains("ਸੇਬ")) return "APPLE";
        if (text.contains("coconut") || text.contains("nariyal") || text.contains("नारियल") || text.contains("ਨਾਰੀਅਲ")) return "COCONUT";
        if (text.contains("oats") || text.contains("jai") || text.contains("जई") || text.contains("ਜਵੀ")) return "OATS";
        if (text.contains("foxtail") || text.contains("kangni") || text.contains("कंगनी") || text.contains("ਕੰਗਣੀ")) return "FOXTAIL_MILLET";
        if (text.contains("kodo") || text.contains("kodon") || text.contains("कोदो") || text.contains("ਕੋਦੋ")) return "KODO_MILLET";
        if (text.contains("sesame") || text.matches(".*\\btil\\b.*") || text.contains("तिल") || text.contains("ਤਿਲ")) return "SESAME";
        if (text.contains("guar") || text.contains("cluster bean") || text.contains("ग्वार") || text.contains("ਗੁਆਰ")) return "GUAR";
        if (text.contains("fenugreek") || text.contains("methi") || text.contains("मेथी") || text.contains("ਮੇਥੀ")) return "FENUGREEK";
        return "GENERAL";
    }

    private AdvisoryResult buildCropProfileAdvisory(String cropCode, String region) {
        CropProfileSummary c = CROP_CATALOG.get(cropCode);
        String authority = "ICAR Crop Science Division & State Agricultural Universities (SAUs)";
        String en = String.format(
                "%s (%s Season) — Sowing: %s. Top Varieties: %s. Major States: %s. Key Guidance: %s",
                c.nameEn(), c.season(), c.sowing(), c.varieties(), c.states(), c.keyTipEn());
        String hi = String.format(
                "%s (%s सीजन) — बुवाई: %s। प्रमुख किस्में: %s। मुख्य राज्य: %s। सलाह: %s",
                c.nameHi(), c.season(), c.sowing(), c.varieties(), c.states(), c.keyTipHi());
        String pa = String.format(
                "%s (%s ਸੀਜ਼ਨ) — ਬਿਜਾਈ: %s। ਪ੍ਰਮੁੱਖ ਕਿਸਮਾਂ: %s। ਸਲਾਹ: %s",
                c.namePa(), c.season(), c.sowing(), c.varieties(), c.keyTipPa());
        return new AdvisoryResult(
                "CROP_ENCYCLOPEDIA",
                en,
                hi,
                pa,
                authority,
                "Would you like pest management, irrigation schedule, or live mandi prices for " + c.nameEn() + "?",
                "क्या आप " + c.nameHi() + " के कीट प्रबंधन, सिंचाई या लाइव मंडी भाव देखना चाहेंगे?",
                "ਕੀ ਤੁਸੀਂ " + c.namePa() + " ਦੇ ਮੰਡੀ ਭਾਅ ਜਾਂ ਸਿੰਚਾਈ ਬਾਰੇ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
                region,
                false
        );
    }

    private AdvisoryResult buildPestDiseaseAdvisory(String crop, String query, String region) {
        String authority = "ICAR - Indian Institute of Wheat and Barley Research (IIWBR) & PAU Ludhiana";
        boolean isYellowRust = query.contains("yellow") || query.contains("पीला") || query.contains("ਪੀਲਾ") || query.contains("rust") || query.contains("कंगी") || query.contains("ਕੁੰਗੀ");

        if ("WHEAT".equals(crop) && isYellowRust) {
            String en = "Possible Cause: Yellow Stripe Rust (Puccinia striiformis) or Nitrogen deficiency. Yellow rust appears as bright yellow powdery pustules arranged in linear stripes on upper leaf blades. Advisory: If pustules are confirmed by tissue inspection, apply Propiconazole 25% EC @ 200 ml in 200 L water per acre during clear weather per PAU Package of Practices. Notice: This is an advisory assessment based on symptoms, not a laboratory diagnosis. Please consult your local Krishi Vigyan Kendra (KVK) and strictly follow registered product labels.";
            String hi = "संभावित कारण: पीला रतुआ (येलो रस्ट) या नाइट्रोजन की कमी। पीले रतुए में पत्तियों पर पीले पाउडर की धारियां दिखाई देती हैं। सलाह: लक्षण की पुष्टि होने पर साफ मौसम में प्रोपिकोनाजोल 25% EC (200 मिली प्रति 200 लीटर पानी प्रति एकड़) का छिड़काव करें। सूचना: यह लक्षणों पर आधारित सलाह है, औपचारिक प्रयोगशाला निदान नहीं। नजदीकी कृषि विज्ञान केंद्र (KVK) से संपर्क करें और कीटनाशक लेबल का पालन करें।";
            String pa = "ਸੰਭਾਵਿਤ ਕਾਰਨ: ਪੀਲੀ ਕੁੰਗੀ (Yellow Rust) ਜਾਂ ਨਾਈਟ੍ਰੋਜਨ ਦੀ ਘਾਟ। ਪੱਤਿਆਂ 'ਤੇ ਪੀਲੇ ਪਾਊਡਰ ਦੀਆਂ ਧਾਰੀਆਂ ਬਣ ਜਾਂਦੀਆਂ ਹਨ। ਸਲਾਹ: ਪੁਸ਼ਟੀ ਹੋਣ 'ਤੇ ਪੀਏਯੂ ਸਿਫਾਰਸ਼ ਅਨੁਸਾਰ ਪ੍ਰੋਪੀਕੋਨਾਜ਼ੋਲ 25% ਈਸੀ (200 ਮਿ.ਲੀ. ਪ੍ਰਤੀ 200 ਲੀਟਰ ਪਾਣੀ ਪ੍ਰਤੀ ਏਕੜ) ਦਾ ਛਿੜਕਾਅ ਕਰੋ। ਸੂਚਨਾ: ਇਹ ਲੱਛਣ ਆਧਾਰਿਤ ਸਲਾਹ ਹੈ, ਪ੍ਰਯੋਗਸ਼ਾਲਾ ਜਾਂਚ ਨਹੀਂ। ਸਥਾਨਕ ਕੇਵੀਕੇ ਦੀ ਸਲਾਹ ਜ਼ਰੂਰ ਲਵੋ।";

            String fEn = "What is the current growth stage of your wheat crop (CRI, tillering, jointing, or grain filling)?";
            String fHi = "आपकी गेहूं की फसल वर्तमान में किस अवस्था में है (ताज मूल, कल्ले निकलने, गांठ बनने या दाना भरने)?";
            String fPa = "ਤੁਹਾਡੀ ਕਣਕ ਦੀ ਫਸਲ ਇਸ ਵੇਲੇ ਕਿਹੜੀ ਅਵਸਥਾ ਵਿੱਚ ਹੈ?";

            return new AdvisoryResult("PEST_DISEASE", en, hi, pa, authority, fEn, fHi, fPa, region, true);
        }

        if ("CUMIN".equals(crop)) {
            String en = "Possible Cause: Alternaria Blight or Fusarium Wilt in Cumin. Blight shows dark necrotic spots on leaves and stems during cloudy/humid weather. Advisory: Avoid excess field moisture. Spray Mancozeb 75 WP @ 2g/litre or Azoxystrobin + Difenoconazole as per Rajasthan Agricultural University guidelines. Notice: Distinguish possible causes from formal diagnosis; verify with local KVK before chemical spraying.";
            String hi = "संभावित कारण: जीरे में झुलसा (ब्लाइट) या उकठा (विल्ट) रोग। नम और बादल वाले मौसम में पत्तियों पर भूरे-काले धब्बे बनते हैं। सलाह: खेत में नमी नियंत्रित रखें। मैंकोजेब 75 WP (2 ग्राम प्रति लीटर पानी) का छिड़काव कृषि विश्वविद्यालय दिशा-निर्देश अनुसार करें। रासायनिक छिड़काव से पहले केवीके से पुष्टि करें।";
            String pa = "ਸੰਭਾਵਿਤ ਕਾਰਨ: ਜ਼ੀਰੇ ਵਿੱਚ ਝੁਲਸਾ ਜਾਂ ਉਖੜਾ ਰੋਗ। ਬੱਦਲਵਾਈ ਵਾਲੇ ਮੌਸਮ ਵਿੱਚ ਪੱਤਿਆਂ ਉੱਤੇ ਕਾਲੇ ਧੱਬੇ ਆਉਂਦੇ ਹਨ। ਸਲਾਹ: ਖੇਤ ਵਿੱਚ ਵਾਧੂ ਪਾਣੀ ਨਾ ਖੜ੍ਹਨ ਦਿਓ। ਮਾਹਿਰਾਂ ਦੀ ਸਲਾਹ ਨਾਲ ਸਿਫਾਰਸ਼ਸ਼ੁਦਾ ਉੱਲੀਨਾਸ਼ਕ ਵਰਤੋ।";

            return new AdvisoryResult("PEST_DISEASE", en, hi, pa, "ICAR-NRC on Seed Spices, Ajmer & SKNAU", "Are you observing black spots on leaves or sudden plant wilting at the root zone?", "क्या पत्तियों पर काले धब्बे दिख रहे हैं या जड़ से पूरा पौधा सूख रहा है?", "ਕੀ ਪੱਤਿਆਂ 'ਤੇ ਕਾਲੇ ਧੱਬੇ ਹਨ ਜਾਂ ਜੜ੍ਹ ਤੋਂ ਪੌਦਾ ਸੁੱਕ ਰਿਹਾ ਹੈ?", region, true);
        }

        // Generic Pest/Disease fallback
        String en = "Possible Crop Stress / Pathogen: Fungal foliar infection or sap-sucking pests. Advisory: Inspect underside of leaves for aphids or powdery sporulation. Avoid overhead irrigation that spreads spore inoculants. Always use CIBRC registered formulations and follow harvest waiting periods (PHI). Consult your district KVK or state agriculture officer.";
        String hi = "संभावित कारण: फफूंद जनित पत्ती रोग या रस चूसक कीट। सलाह: पत्तियों के नीचे माहू/सफेद मक्खी या फफूंद की जांच करें। खेत में जलनिकासी सुनिश्चित करें और कृषि विभाग द्वारा प्रमाणित दवा का ही छिड़काव करें।";
        String pa = "ਸੰਭਾਵਿਤ ਕਾਰਨ: ਉੱਲੀ ਰੋਗ ਜਾਂ ਰਸ ਚੂਸਣ ਵਾਲੇ ਕੀੜੇ। ਸਲਾਹ: ਪੱਤਿਆਂ ਦੇ ਹੇਠਲੇ ਹਿੱਸੇ ਦੀ ਜਾਂਚ ਕਰੋ। ਖੇਤ ਵਿੱਚ ਪਾਣੀ ਖੜ੍ਹਾ ਨਾ ਹੋਣ ਦਿਓ ਅਤੇ ਖੇਤੀਬਾੜੀ ਅਧਿਕਾਰੀ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।";

        return new AdvisoryResult("PEST_DISEASE", en, hi, pa, authority, "Which crop and district are you observing this in, and do you see curling, spots, or chewing damage?", "यह समस्या किस फसल और जिले में है, और क्या पत्तियां मुड़ रही हैं या धब्बे हैं?", "ਇਹ ਸਮੱਸਿਆ ਕਿਹੜੀ ਫਸਲ ਵਿੱਚ ਹੈ ਅਤੇ ਕੀ ਲੱਛਣ ਦਿਖ ਰਹੇ ਹਨ?", region, true);
    }

    private AdvisoryResult buildIrrigationAdvisory(String crop, String query, String region) {
        String authority = "ICAR - Central Soil Salinity Research Institute & PAU Package of Practices";
        if ("WHEAT".equals(crop)) {
            String en = "Critical Irrigation Schedule for Wheat: 1st irrigation at Crown Root Initiation (CRI) stage (20–25 days after sowing - most critical, never delay); 2nd at Tillering (40–45 DAS); 3rd at Late Jointing (65–70 DAS); 4th at Flowering (85–90 DAS); 5th at Milking (100–105 DAS). Avoid irrigation on days with wind speeds exceeding 15 km/h to prevent lodging. Source: PAU Ludhiana & ICAR-IIWBR.";
            String hi = "गेहूं में सिंचाई का समय: पहली सिंचाई ताज मूल अवस्था (CRI stage, बुवाई के 20-25 दिन बाद - सबसे महत्वपूर्ण, इसमें देरी न करें); दूसरी कल्ले फूटते समय (40-45 दिन); तीसरी गांठ बनते समय (65-70 दिन); चौथी फूल आने पर (85-90 दिन); पांचवीं दाना भरते समय (100-105 दिन)। तेज हवा (>15 किमी/घंटा) में सिंचाई न करें ताकि फसल गिरे नहीं।";
            String pa = "ਕਣਕ ਵਿੱਚ ਸਿੰਚਾਈ ਦਾ ਸਮਾਂ: ਪਹਿਲਾ ਪਾਣੀ ਬਿਜਾਈ ਤੋਂ 20-25 ਦਿਨ ਬਾਅਦ (CRI ਸਟੇਜ - ਸਭ ਤੋਂ ਅਹਿਮ); ਦੂਜਾ ਫੁਟਾਰੇ ਵੇਲੇ (40-45 ਦਿਨ); ਤੀਜਾ ਗੰਢਾਂ ਬਣਨ ਵੇਲੇ (65-70 ਦਿਨ); ਚੌਥਾ ਨਿਸਾਰੇ ਵੇਲੇ (85-90 ਦਿਨ)। ਤੇਜ਼ ਹਵਾ ਚੱਲਣ ਵੇਲੇ ਪਾਣੀ ਨਾ ਲਾਓ ਤਾਂ ਜੋ ਫਸਲ ਡਿੱਗੇ ਨਾ।";

            return new AdvisoryResult("IRRIGATION", en, hi, pa, authority, "How many days ago was your wheat crop sown?", "आपकी गेहूं की बुवाई को कितने दिन हो चुके हैं?", "ਤੁਹਾਡੀ ਕਣਕ ਦੀ ਬਿਜਾਈ ਨੂੰ ਕਿੰਨੇ ਦਿਨ ਹੋ ਗਏ ਹਨ?", region, false);
        }

        if ("MUSTARD".equals(crop)) {
            String en = "Mustard Irrigation: Requires 2-3 light irrigations. 1st irrigation at pre-flowering/branching stage (30–35 DAS); 2nd at pod development / siliqua stage (60–65 DAS). Avoid waterlogging as mustard roots are highly sensitive to standing water. Source: CCS HAU Hisar.";
            String hi = "सरसों में सिंचाई: 2-3 हल्की सिंचाइयों की आवश्यकता होती है। पहली सिंचाई शाखाएं निकलते समय (30-35 दिन); दूसरी फलियां बनते समय (60-65 दिन)। खेत में पानी न रुकने दें क्योंकि सरसों जलभराव के प्रति संवेदनशील है।";
            String pa = "ਸਰ੍ਹੋਂ ਵਿੱਚ ਸਿੰਚਾਈ: 2 ਤੋਂ 3 ਹਲਕੇ ਪਾਣੀ ਕਾਫੀ ਹਨ। ਪਹਿਲਾ ਪਾਣੀ ਸ਼ਾਖਾਂ ਨਿਕਲਣ ਵੇਲੇ (30-35 ਦਿਨ); ਦੂਜਾ ਫਲੀਆਂ ਬਣਨ ਵੇਲੇ (60-65 ਦਿਨ)। ਖੇਤ ਵਿੱਚ ਪਾਣੀ ਖੜ੍ਹਾ ਨਾ ਹੋਣ ਦਿਓ।";

            return new AdvisoryResult("IRRIGATION", en, hi, pa, "CCS HAU Hisar & ICAR-DRMR", "What is the soil type of your field (light sandy loam or heavy clay)?", "आपके खेत की मिट्टी किस प्रकार की है (रेतीली दोमट या भारी दोमट)?", "ਤੁਹਾਡੇ ਖੇਤ ਦੀ ਮਿੱਟੀ ਕਿਸ ਕਿਸਮ ਦੀ ਹੈ?", region, false);
        }

        String en = "General Irrigation Advisory: Schedule watering during early morning or late evening to minimize evapotranspiration losses. Critical moisture periods occur during root initiation, flowering, and grain/pod development. Utilize drip or micro-sprinkler systems where available under PMKSY subsidy (up to 55% grant).";
        String hi = "सिंचाई प्रबंधन: पानी सुबह या शाम के समय दें ताकि वाष्पीकरण कम हो। फूल आने और दाना भरने की अवस्था में नमी की कमी न होने दें। पीएम कृषि सिंचाई योजना (PMKSY) के तहत ड्रिप/फव्वारा संयंत्र पर 55% तक अनुदान उपलब्ध है।";
        String pa = "ਆਮ ਸਿੰਚਾਈ ਸਲਾਹ: ਪਾਣੀ ਸਵੇਰੇ ਜਾਂ ਸ਼ਾਮ ਨੂੰ ਲਾਓ ਤਾਂ ਜੋ ਪਾਣੀ ਦੀ ਬੱਚਤ ਹੋਵੇ। ਫੁੱਲ ਪੈਣ ਅਤੇ ਦਾਣੇ ਪੈਣ ਵੇਲੇ ਨਮੀ ਬਣਾਈ ਰੱਖੋ। ਤੁਪਕਾ ਸਿੰਚਾਈ ਪ੍ਰਣਾਲੀ 'ਤੇ ਸਰਕਾਰੀ ਸਬਸਿਡੀ ਉਪਲਬਧ ਹੈ।";

        return new AdvisoryResult("IRRIGATION", en, hi, pa, authority, "Which crop and growth stage require irrigation planning?", "किस फसल और किस अवस्था के लिए सिंचाई की योजना बनानी है?", "ਕਿਹੜੀ ਫਸਲ ਲਈ ਸਿੰਚਾਈ ਬਾਰੇ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?", region, false);
    }

    private AdvisoryResult buildFertilizerAdvisory(String crop, String query, String region) {
        String authority = "Department of Agriculture & Farmers Welfare (DAC&FW) & Soil Health Card Scheme";

        if ("WHEAT".equals(crop)) {
            String en = "Fertilizer Schedule for Wheat (Per Acre, Medium Soil): Urea: 110 kg (applied in 3 split doses: 1/3 at sowing, 1/3 at 1st irrigation, 1/3 before 2nd irrigation); DAP: 55 kg at sowing; MOP (Potash): 20 kg if soil is deficient; Zinc Sulphate 21%: 10 kg per acre once every 2-3 years. Avoid broadcasting urea in standing water; apply before evening irrigation. Source: PAU Package of Practices.";
            String hi = "गेहूं के लिए उर्वरक अनुशंसा (प्रति एकड़): यूरिया 110 किग्रा (तीन हिस्सों में: 1/3 बुवाई के समय, 1/3 पहली सिंचाई पर, 1/3 दूसरी सिंचाई से पहले); डीएपी 55 किग्रा बुवाई पर; जिंक सल्फेट 21%: 10 किग्रा प्रति एकड़। यूरिया का बुरकाव खड़े पानी में न करें, सिंचाई से ठीक पहले करें।";
            String pa = "ਕਣਕ ਲਈ ਖਾਦ ਦੀ ਸਿਫਾਰਸ਼ (ਪ੍ਰਤੀ ਏਕੜ): ਯੂਰੀਆ 110 ਕਿਲੋ (ਤਿੰਨ ਕਿਸ਼ਤਾਂ ਵਿੱਚ: 1/3 ਬਿਜਾਈ ਵੇਲੇ, 1/3 ਪਹਿਲੇ ਪਾਣੀ ਵੇਲੇ, 1/3 ਦੂਜੇ ਪਾਣੀ ਤੋਂ ਪਹਿਲਾਂ); ਡੀਏਪੀ 55 ਕਿਲੋ ਬਿਜਾਈ ਵੇਲੇ; ਜ਼ਿੰਕ ਸਲਫੇਟ 21%: 10 ਕਿਲੋ। ਯੂਰੀਆ ਖੜ੍ਹੇ ਪਾਣੀ ਵਿੱਚ ਨਾ ਪਾਓ।";

            return new AdvisoryResult("SOIL_FERTILIZER", en, hi, pa, authority, "Did you perform a Soil Health Card test for this plot in the last 2 years?", "क्या आपने पिछले 2 वर्षों में इस खेत का सॉइल हेल्थ कार्ड टेस्ट करवाया है?", "ਕੀ ਤੁਸੀਂ ਪਿਛਲੇ 2 ਸਾਲਾਂ ਵਿੱਚ ਮਿੱਟੀ ਪਰਖ ਕਰਵਾਈ ਹੈ?", region, false);
        }

        String en = "Balanced Soil Nutrition Guidelines: Test soil via the national Soil Health Card portal (soilhealth.dac.gov.in) before bulk fertilizer purchase. Balanced N:P:K application (ideal 4:2:1 for cereals) along with secondary nutrients (Sulphur, Zinc) boosts yields by 15-20% and prevents soil acidification.";
        String hi = "संतुलित उर्वरक प्रबंधन: खाद खरीदने से पहले सॉइल हेल्थ कार्ड पोर्टल पर मिट्टी जांच कराएं। अनाज फसलों के लिए N:P:K का 4:2:1 अनुपात और सूक्ष्म पोषक तत्व (जिंक, सल्फर) पैदावार 15-20% बढ़ाते हैं और जमीन को बंजर होने से बचाते हैं।";
        String pa = "ਸੰਤੁਲਿਤ ਖਾਦ ਪ੍ਰਬੰਧਨ: ਖਾਦ ਪਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਮਿੱਟੀ ਦੀ ਪਰਖ ਕਰਵਾਓ। ਨਾਈਟ੍ਰੋਜਨ, ਫਾਸਫੋਰਸ ਅਤੇ ਪੋਟਾਸ਼ ਦਾ ਸੰਤੁਲਿਤ ਉਪਯੋਗ ਜ਼ਮੀਨ ਦੀ ਸਿਹਤ ਅਤੇ ਝਾੜ ਦੋਵੇਂ ਵਧਾਉਂਦਾ ਹੈ।";

        return new AdvisoryResult("SOIL_FERTILIZER", en, hi, pa, authority, "Which crop and nutrient deficiency symptoms are you addressing?", "आप किस फसल और किस पोषक तत्व की कमी के लिए सलाह चाहते हैं?", "ਤੁਸੀਂ ਕਿਹੜੀ ਫਸਲ ਲਈ ਖਾਦ ਦੀ ਸਿਫਾਰਸ਼ ਚਾਹੁੰਦੇ ਹੋ?", region, false);
    }

    private AdvisoryResult buildSowingHarvestAdvisory(String crop, String query, String region) {
        String authority = "ICAR - Crop Science Division & Directorate of Wheat Development";

        if ("WHEAT".equals(crop)) {
            String en = "Wheat Sowing & Harvest Window (North-West Plains Zone): Optimal sowing window is November 1 to November 25. Certified high-yield varieties: HD-3086, DBW-187 (Karan Vandana), PBW-826, WH-1105. Seed rate: 40–45 kg/acre. Seed treatment with Trichoderma (5g/kg) or Carbendazim (2g/kg) is recommended. Harvest period: April 10 to May 5 when grain moisture falls below 14%.";
            String hi = "गेहूं बुवाई और कटाई का समय (पंजाब, हरियाणा, पश्चिमी उप्र): बुवाई का सर्वोत्तम समय 1 से 25 नवंबर है। उन्नत किस्में: HD-3086, DBW-187, PBW-826। बीज दर: 40-45 किग्रा/एकड़। बीज शोधन ट्राइकोडर्मा (5 ग्राम/किग्रा) या कार्बेन्डाजिम से अवश्य करें। कटाई का समय 10 अप्रैल से 5 मई (नमी 14% से कम होने पर)।";
            String pa = "ਕਣਕ ਦੀ ਬਿਜਾਈ ਅਤੇ ਵਾਢੀ ਦਾ ਸਮਾਂ: ਬਿਜਾਈ ਦਾ ਸਭ ਤੋਂ ਢੁੱਕਵਾਂ ਸਮਾਂ 1 ਤੋਂ 25 ਨਵੰਬਰ ਹੈ। ਉੱਨਤ ਕਿਸਮਾਂ: ਪੀਬੀਡਬਲਿਊ-826, ਐਚਡੀ-3086, ਡੀਬੀਡਬਲਿਊ-187। ਬੀਜ ਦੀ ਮਾਤਰਾ: 40-45 ਕਿਲੋ ਪ੍ਰਤੀ ਏਕੜ। ਬੀਜ ਸੋਧ ਜ਼ਰੂਰ ਕਰੋ। ਵਾਢੀ ਅਪ੍ਰੈਲ ਦੇ ਦੂਜੇ ਹਫਤੇ ਤੋਂ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ।";

            return new AdvisoryResult("CROP_PLANNING", en, hi, pa, authority, "Are you planting timely sown or late sown wheat (after basmati/potato)?", "क्या आप समय पर बुवाई कर रहे हैं या पछेती (बासमती/आलू के बाद)?", "ਕੀ ਤੁਸੀਂ ਸਮੇਂ ਸਿਰ ਬਿਜਾਈ ਕਰ ਰਹੇ ਹੋ ਜਾਂ ਪਿਛੇਤੀ?", region, false);
        }

        if ("CUMIN".equals(crop)) {
            String en = "Cumin (Jeera) Sowing & Harvest Window (Western Rajasthan & Gujarat): Optimal sowing window is November 1 to November 20. Certified varieties: RZ-209, RZ-223, GC-4. Seed rate: 5–6 kg/acre. Requires well-drained sandy loam soil with low humidity. Harvest: Late February to March when seeds turn grayish brown. Source: SKNAU Jobner & ICAR-NRCSS.";
            String hi = "जीरा बुवाई एवं कटाई (जोधपुर, नागौर, बाड़मेर, गुजरात): बुवाई का सर्वोत्तम समय 1 से 20 नवंबर है। प्रमाणित किस्में: RZ-209, RZ-223, GC-4। बीज दर: 5-6 किग्रा/एकड़। कटाई फरवरी अंत से मार्च तक होती है जब दाने भूरे हो जाएं।";
            String pa = "ਜ਼ੀਰੇ ਦੀ ਬਿਜਾਈ ਅਤੇ ਵਾਢੀ ਦਾ ਸਮਾਂ: ਬਿਜਾਈ ਨਵੰਬਰ ਦੇ ਪਹਿਲੇ ਪੰਦਰਵਾੜੇ ਵਿੱਚ ਹੁੰਦੀ ਹੈ। ਪ੍ਰਮਾਣਿਤ ਕਿਸਮਾਂ ਆਰਜ਼ੈਡ-209, ਜੀਸੀ-4 ਹਨ। ਵਾਢੀ ਫਰਵਰੀ ਅਖੀਰ ਤੋਂ ਮਾਰਚ ਵਿੱਚ ਕੀਤੀ ਜਾਂਦੀ ਹੈ।";

            return new AdvisoryResult("CROP_PLANNING", en, hi, pa, "SKNAU Jobner & ICAR-NRCSS", "Is your field leveled with drip irrigation or surface flood basins?", "क्या आपका खेत लेजर लेवल्ड है और ड्रिप सिंचाई की व्यवस्था है?", "ਕੀ ਖੇਤ ਵਿੱਚ ਤੁਪਕਾ ਸਿੰਚਾਈ ਦਾ ਪ੍ਰਬੰਧ ਹੈ?", region, false);
        }

        String en = "Crop Planning Advisory: Select certified seeds from National Seeds Corporation (NSC) or State Seed Corporation. Check seed certification tag and germination percentage (>85%). Synchronize sowing with regional temperature drops to avoid thermal injury.";
        String hi = "फसल योजना सलाह: राष्ट्रीय बीज निगम (NSC) या राज्य बीज निगम से ही प्रमाणित बीज खरीदें। बीज अंकुरण क्षमता (85% से अधिक) जांचें और मौसम के अनुसार सही समय पर बुवाई करें।";
        String pa = "ਫਸਲ ਯੋਜਨਾਬੰਦੀ: ਹਮੇਸ਼ਾ ਪ੍ਰਮਾਣਿਤ ਬੀਜ ਹੀ ਖਰੀਦੋ। ਬੀਜ ਦੀ ਉੱਗਣ ਸਮਰੱਥਾ ਦੀ ਜਾਂਚ ਕਰੋ ਅਤੇ ਸਮੇਂ ਸਿਰ ਬਿਜਾਈ ਕਰੋ।";

        return new AdvisoryResult("CROP_PLANNING", en, hi, pa, authority, "Which specific crop are you planning for the upcoming season?", "आप आगामी सीजन के लिए किस फसल की योजना बना रहे हैं?", "ਤੁਸੀਂ ਆਉਣ ਵਾਲੇ ਸੀਜ਼ਨ ਵਿੱਚ ਕਿਹੜੀ ਫਸਲ ਬੀਜਣਾ ਚਾਹੁੰਦੇ ਹੋ?", region, false);
    }

    private AdvisoryResult buildWeatherAdvisory(String crop, String query, String region) {
        String authority = "India Meteorological Department (IMD) - Gramin Krishi Mausam Sewa (GKMS)";
        String en = "Agromet Weather Advisory: Monitor daily district weather bulletins via mausam.imd.gov.in. If frost (Pala) is predicted in winter months, provide light irrigation during evening hours to maintain soil temperature. Do not carry out pesticide/fertilizer spraying if wind speeds exceed 12 km/h or if rainfall is expected within 24 hours.";
        String hi = "मौसम एवं कृषि परामर्श: शीतकाल में पाले (पाला) की आशंका होने पर शाम के समय हल्की सिंचाई करें ताकि जमीन का तापमान बना रहे। 12 किमी/घंटा से अधिक हवा या 24 घंटे में बारिश की संभावना होने पर कीटनाशक छिड़काव न करें। स्रोत: भारत मौसम विज्ञान विभाग (IMD)।";
        String pa = "ਮੌਸਮ ਆਧਾਰਿਤ ਖੇਤੀ ਸਲਾਹ: ਸਰਦੀਆਂ ਵਿੱਚ ਕੋਰਾ ਪੈਣ ਦੇ ਖਦਸ਼ੇ ਵੇਲੇ ਸ਼ਾਮ ਨੂੰ ਹਲਕਾ ਪਾਣੀ ਲਾਓ ਤਾਂ ਜੋ ਜ਼ਮੀਨ ਦਾ ਤਾਪਮਾਨ ਠੀਕ ਰਹੇ। ਮੀਂਹ ਜਾਂ ਤੇਜ਼ ਹਵਾ ਵੇਲੇ ਕੋਈ ਵੀ ਸਪਰੇਅ ਨਾ ਕਰੋ।";

        return new AdvisoryResult("WEATHER_AGROMET", en, hi, pa, authority, "Which district is your farm located in for precise local agromet bulletin?", "सटीक मौसम बुलेटिन के लिए आपका खेत किस जिले में स्थित है?", "ਤੁਹਾਡਾ ਖੇਤ ਕਿਹੜੇ ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਹੈ?", region, false);
    }

    private AdvisoryResult buildStorageAdvisory(String crop, String region) {
        String authority = "WDRA (Warehousing Development & Regulatory Authority) & FCI Quality Standards";
        String en = "Grain Storage & Moisture Guidelines: Ensure grain moisture is strictly below 12% for Wheat/Paddy and below 8% for Mustard before bagging. Clean and sun-dry grains for 2-3 days on tarpaulins. Store in moisture-proof Pusa bins or silpaulin-lined bags. Farmers can deposit produce in WDRA-accredited warehouses to obtain electronic Negotiable Warehouse Receipts (e-NWR) for bank pledge loans up to 75% value.";
        String hi = "सुरक्षित अनाज भंडारण: गेहूं और धान में नमी 12% से कम तथा सरसों में 8% से कम होने पर ही बोरों में भरें। अनाज को तिरपाल पर 2-3 दिन धूप में सुखाएं। किसान WDRA पंजीकृत गोदामों में उपज रखकर e-NWR रसीद प्राप्त कर सकते हैं और उस पर 75% तक बैंक ऋण ले सकते हैं।";
        String pa = "ਅਨਾਜ ਭੰਡਾਰਨ ਸਲਾਹ: ਕਣਕ ਵਿੱਚ ਨਮੀ 12% ਤੋਂ ਘੱਟ ਹੋਣੀ ਲਾਜ਼ਮੀ ਹੈ। ਅਨਾਜ ਨੂੰ ਚੰਗੀ ਤਰ੍ਹਾਂ ਧੁੱਪ ਵਿੱਚ ਸੁਕਾ ਕੇ ਹੀ ਸਟੋਰ ਕਰੋ। ਸਰਕਾਰੀ ਮਾਨਤਾ ਪ੍ਰਾਪਤ ਗੋਦਾਮਾਂ ਵਿੱਚ ਜਿਣਸ ਰੱਖ ਕੇ ਈ-ਐਨਡਬਲਿਊਆਰ ਰਸੀਦ 'ਤੇ ਬੈਂਕ ਕਰਜ਼ਾ ਲਿਆ ਜਾ ਸਕਦਾ ਹੈ।";

        return new AdvisoryResult("STORAGE_WAREHOUSING", en, hi, pa, authority, "Are you storing grain on the farm or seeking warehouse receipt finance?", "क्या आप घर पर भंडारण कर रहे हैं या गोदाम रसीद पर ऋण लेना चाहते हैं?", "ਕੀ ਤੁਸੀਂ ਘਰ ਵਿੱਚ ਸਟੋਰ ਕਰਨਾ ਹੈ ਜਾਂ ਗੋਦਾਮ ਵਿੱਚ ਰੱਖਣਾ ਹੈ?", region, false);
    }

    private AdvisoryResult buildTransportAdvisory(String crop, String region) {
        String authority = "Ministry of Agriculture - Agri-Logistics & Kisan Rail Scheme";
        String en = "Transport & Market Logistics: Ensure official APMC Mandi Gate Pass is generated prior to produce transit to avoid roadside inspection penalties. For inter-state perishables, 50% freight subsidy is available under Operation Greens / Kisan Rail. Calculate net realization: Mandi Modal Price minus freight & loading costs before dispatching to distant yards.";
        String hi = "परिवहन और मंडी लॉजिस्टिक्स: मंडी ले जाने से पहले वैध एपीएमसी गेट पास अवश्य बनवाएं। लंबी दूरी की मंडियों में भेजने से पहले मालभाड़ा (₹/क्विंटल) घटाकर शुद्ध बचत की गणना करें। ऑपरेशन ग्रीन्स के तहत किसान रेल पर 50% तक मालभाड़ा अनुदान उपलब्ध है।";
        String pa = "ਢੋਆ-ਢੁਆਈ ਅਤੇ ਮੰਡੀ ਸਲਾਹ: ਮੰਡੀ ਜਾਣ ਤੋਂ ਪਹਿਲਾਂ ਮੰਡੀ ਗੇਟ ਪਾਸ ਜ਼ਰੂਰ ਲਵੋ। ਦੂਰ ਦੀ ਮੰਡੀ ਜਾਣ ਤੋਂ ਪਹਿਲਾਂ ਟਰਾਂਸਪੋਰਟ ਖਰਚਾ ਕੱਢ ਕੇ ਸ਼ੁੱਧ ਮੁਨਾਫਾ ਜ਼ਰੂਰ ਦੇਖੋ।";

        return new AdvisoryResult("TRANSPORT_LOGISTICS", en, hi, pa, authority, "What is the distance in kilometers between your farm and the target APMC yard?", "आपके खेत से लक्षित मंडी की दूरी कितने किलोमीटर है?", "ਤੁਹਾਡੇ ਖੇਤ ਤੋਂ ਮੰਡੀ ਦੀ ਦੂਰੀ ਕਿੰਨੀ ਹੈ?", region, false);
    }

    private AdvisoryResult buildGeneralAgriAdvisory(String region) {
        String authority = "Kisan Call Centre (Toll-Free 1800-180-1551) & ICAR Advisory Portal";
        String en = "MandiSaathi Agricultural Advisory: For technical guidance on crop management, pest control, and government welfare programs, you can also connect with the Kisan Call Centre (Toll-Free 1800-180-1551) or visit your nearest Krishi Vigyan Kendra.";
        String hi = "मंडी साथी कृषि परामर्श: फसल प्रबंधन, कीट नियंत्रण और सरकारी योजनाओं की अधिक जानकारी के लिए किसान कॉल सेंटर (टोल-फ्री 1800-180-1551) या नजदीकी कृषि विज्ञान केंद्र से संपर्क करें।";
        String pa = "ਮੰਡੀ ਸਾਥੀ ਖੇਤੀਬਾੜੀ ਸਲਾਹ: ਖੇਤੀਬਾੜੀ ਸਬੰਧੀ ਕਿਸੇ ਵੀ ਜਾਣਕਾਰੀ ਲਈ ਕਿਸਾਨ ਕਾਲ ਸੈਂਟਰ (ਟੋਲ-ਫ੍ਰੀ 1800-180-1551) ਜਾਂ ਨੇੜਲੇ ਕੇਵੀਕੇ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।";

        return new AdvisoryResult("GENERAL_ADVISORY", en, hi, pa, authority, "Which crop or question would you like advice on?", "आप किस फसल या विषय पर सलाह चाहते हैं?", "ਤੁਸੀਂ ਕਿਸ ਫਸਲ ਬਾਰੇ ਜਾਣਕਾਰੀ ਚਾਹੁੰਦੇ ਹੋ?", region, false);
    }
}

