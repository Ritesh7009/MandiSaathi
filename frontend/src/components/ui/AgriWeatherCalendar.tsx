import React, { useState, useMemo } from 'react';
import {
  CloudSun,
  Drop,
  Wind,
  Thermometer,
  Plant,
  WarningCircle,
  CheckCircle,
} from '@phosphor-icons/react';
import { useLanguage } from '../../context/LanguageContext';

interface CropStageConfig {
  nameEn: string;
  nameHi: string;
  namePa: string;
  minDas: number;
  maxDas: number;
  criticalActionEn: string;
  criticalActionHi: string;
  criticalActionPa: string;
  irrigationNeeded: boolean;
}

const WHEAT_STAGES: CropStageConfig[] = [
  {
    nameEn: "Germination & Seedling",
    nameHi: "अंकुरण एवं प्रारंभिक वृद्धि",
    namePa: "ਉੱਗਣ ਅਤੇ ਮੁੱਢਲਾ ਵਾਧਾ",
    minDas: 0,
    maxDas: 18,
    criticalActionEn: "Maintain light soil moisture. Avoid crust formation on soil surface.",
    criticalActionHi: "खेत में हल्की नमी बनाए रखें। जमीन पर पपड़ी न जमने दें।",
    criticalActionPa: "ਖੇਤ ਵਿੱਚ ਹਲਕੀ ਨਮੀ ਰੱਖੋ। ਜ਼ਮੀਨ ਉੱਤੇ ਪੇਪੜੀ ਨਾ ਬਣਨ ਦਿਓ।",
    irrigationNeeded: false,
  },
  {
    nameEn: "Crown Root Initiation (CRI)",
    nameHi: "ताज मूल अवस्था (CRI)",
    namePa: "ਤਾਜ ਜੜ੍ਹ ਅਵਸਥਾ (CRI)",
    minDas: 19,
    maxDas: 30,
    criticalActionEn: "First irrigation is MANDATORY at 20-25 DAS. Broadcast 1/3 dose of Urea (35 kg/acre) before watering.",
    criticalActionHi: "बुवाई के 20-25 दिन बाद पहली सिंचाई अति आवश्यक है। सिंचाई से पहले 1/3 यूरिया (35 किग्रा/एकड़) डालें।",
    criticalActionPa: "ਬਿਜਾਈ ਤੋਂ 20-25 ਦਿਨ ਬਾਅਦ ਪਹਿਲਾ ਪਾਣੀ ਲਾਉਣਾ ਅਤਿ ਜ਼ਰੂਰੀ ਹੈ। ਪਾਣੀ ਲਾਉਣ ਤੋਂ ਪਹਿਲਾਂ 35 ਕਿਲੋ ਯੂਰੀਆ ਪਾਓ।",
    irrigationNeeded: true,
  },
  {
    nameEn: "Tillering Stage",
    nameHi: "कल्ले फूटने की अवस्था",
    namePa: "ਫੁਟਾਰਾ ਅਵਸਥਾ",
    minDas: 31,
    maxDas: 55,
    criticalActionEn: "Second irrigation at 40-45 DAS. Apply balance nitrogen. Scout field for early yellow rust stripes on leaf blades.",
    criticalActionHi: "40-45 दिन पर दूसरी सिंचाई करें। बची हुई यूरिया दें। पत्तियों पर पीले रतुए के लक्षणों की निगरानी करें।",
    criticalActionPa: "40-45 ਦਿਨਾਂ ਵਿੱਚ ਦੂਜਾ ਪਾਣੀ ਲਾਓ। ਪੀਲੀ ਕੁੰਗੀ ਦੇ ਲੱਛਣਾਂ ਦੀ ਜਾਂਚ ਕਰੋ।",
    irrigationNeeded: true,
  },
  {
    nameEn: "Jointing & Stem Elongation",
    nameHi: "गांठ बनने की अवस्था",
    namePa: "ਗੰਢਾਂ ਬਣਨ ਦੀ ਅਵਸਥਾ",
    minDas: 56,
    maxDas: 75,
    criticalActionEn: "Third irrigation at 65-70 DAS. Spray Zinc Sulphate 0.5% + Urea 2% if micronutrient deficiency appears.",
    criticalActionHi: "65-70 दिन पर तीसरी सिंचाई करें। जिंक की कमी दिखने पर 0.5% जिंक सल्फेट + 2% यूरिया का छिड़काव करें।",
    criticalActionPa: "65-70 ਦਿਨਾਂ ਵਿੱਚ ਤੀਜਾ ਪਾਣੀ ਲਾਓ। ਜ਼ਿੰਕ ਸਲਫੇਟ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।",
    irrigationNeeded: true,
  },
  {
    nameEn: "Flowering & Ear Emergence",
    nameHi: "फूल व बाली निकलने की अवस्था",
    namePa: "ਨਿਸਾਰਾ ਤੇ ਫੁੱਲ ਪੈਣ ਦੀ ਅਵਸਥਾ",
    minDas: 76,
    maxDas: 95,
    criticalActionEn: "Fourth irrigation at 85-90 DAS. Do NOT irrigate on windy days (>15 km/h) to prevent crop lodging.",
    criticalActionHi: "85-90 दिन पर चौथी सिंचाई करें। तेज हवा चलने पर सिंचाई बिल्कुल न करें ताकि फसल गिरे नहीं।",
    criticalActionPa: "85-90 ਦਿਨਾਂ ਵਿੱਚ ਚੌਥਾ ਪਾਣੀ ਲਾਓ। ਤੇਜ਼ ਹਵਾ ਵੇਲੇ ਪਾਣੀ ਨਾ ਲਾਓ।",
    irrigationNeeded: true,
  },
  {
    nameEn: "Grain Filling (Milking & Dough)",
    nameHi: "दाना भरने की अवस्था",
    namePa: "ਦਾਣਾ ਭਰਨ ਦੀ ਅਵਸਥਾ",
    minDas: 96,
    maxDas: 115,
    criticalActionEn: "Light final irrigation at milking stage (100-105 DAS). Protects crop against sudden terminal heat spikes.",
    criticalActionHi: "दूधिया अवस्था में हल्का पानी दें। यह दाने को समय से पहले सूखने और गर्मी से बचाता है।",
    criticalActionPa: "ਦੁੱਧਾ ਅਵਸਥਾ ਵਿੱਚ ਹਲਕਾ ਪਾਣੀ ਲਾਓ ਤਾਂ ਜੋ ਦਾਣਾ ਪਤਲਾ ਨਾ ਰਹੇ।",
    irrigationNeeded: true,
  },
  {
    nameEn: "Maturity & Harvest",
    nameHi: "परिपक्वता एवं कटाई",
    namePa: "ਪੱਕਣ ਅਤੇ ਵਾਢੀ ਦੀ ਅਵਸਥਾ",
    minDas: 116,
    maxDas: 145,
    criticalActionEn: "Stop all irrigation 15 days before harvest. Harvest when grain moisture falls below 14% for safe storage.",
    criticalActionHi: "कटाई से 15 दिन पहले सिंचाई बंद करें। दाने में नमी 14% से कम होने पर कंबाइन से कटाई करें।",
    criticalActionPa: "ਵਾਢੀ ਤੋਂ 15 ਦਿਨ ਪਹਿਲਾਂ ਪਾਣੀ ਬੰਦ ਕਰੋ। ਨਮੀ 14% ਤੋਂ ਘੱਟ ਹੋਣ ਤੇ ਵਾਢੀ ਕਰੋ।",
    irrigationNeeded: false,
  },
];

const CUMIN_STAGES: CropStageConfig[] = [
  {
    nameEn: "Germination & Establishment",
    nameHi: "अंकुरण एवं प्रारंभिक जमाव",
    namePa: "ਉੱਗਣ ਅਵਸਥਾ",
    minDas: 0,
    maxDas: 20,
    criticalActionEn: "Keep light sprinkle moisture until full emergence. Avoid soil encrusting.",
    criticalActionHi: "पूरा जमाव होने तक हल्की नमी बनाए रखें। भारी पानी न दें।",
    criticalActionPa: "ਪੂਰਾ ਉੱਗਣ ਤੱਕ ਹਲਕੀ ਨਮੀ ਰੱਖੋ।",
    irrigationNeeded: false,
  },
  {
    nameEn: "Branching & Vegetative",
    nameHi: "शाखाएं निकलने की अवस्था",
    namePa: "ਸ਼ਾਖਾਂ ਨਿਕਲਣ ਦੀ ਅਵਸਥਾ",
    minDas: 21,
    maxDas: 50,
    criticalActionEn: "First light irrigation at 30-35 DAS. Hand weeding or herbicide application. Avoid excess water.",
    criticalActionHi: "30-35 दिन पर पहली हल्की सिंचाई करें। खरपतवार नियंत्रण करें।",
    criticalActionPa: "30-35 ਦਿਨਾਂ ਵਿੱਚ ਹਲਕਾ ਪਾਣੀ ਲਾਓ।",
    irrigationNeeded: true,
  },
  {
    nameEn: "Flowering & Umbel Formation",
    nameHi: "फूल व छत्रक बनने की अवस्था",
    namePa: "ਫੁੱਲ ਤੇ ਛਤਰੀਆਂ ਬਣਨ ਦੀ ਅਵਸਥਾ",
    minDas: 51,
    maxDas: 75,
    criticalActionEn: "Extremely sensitive to cloudy weather and blight. Spray Mancozeb 75 WP (2g/L) preventively.",
    criticalActionHi: "बादल वाले मौसम में झुलसा रोग से बचाव के लिए मैंकोजेब (2 ग्राम/लीटर) का छिड़काव करें।",
    criticalActionPa: "ਬੱਦਲਵਾਈ ਵੇਲੇ ਉੱਲੀਨਾਸ਼ਕ ਦਾ ਸਪਰੇਅ ਕਰੋ।",
    irrigationNeeded: false,
  },
  {
    nameEn: "Seed Hardening & Harvest",
    nameHi: "दाना पकने व कटाई की अवस्था",
    namePa: "ਦਾਣਾ ਪੱਕਣ ਅਤੇ ਵਾਢੀ",
    minDas: 76,
    maxDas: 110,
    criticalActionEn: "Harvest in morning hours when plants turn grayish-brown to prevent seed shattering.",
    criticalActionHi: "पौधे भूरे होने पर सुबह के समय कटाई करें ताकि दाने झड़े नहीं।",
    criticalActionPa: "ਸਵੇਰ ਵੇਲੇ ਵਾਢੀ ਕਰੋ ਤਾਂ ਜੋ ਦਾਣੇ ਨਾ ਕਿਰਨ।",
    irrigationNeeded: false,
  },
];

interface WeatherRecord {
  tempMin: number;
  tempMax: number;
  humidity: number;
  windKmph: number;
  rainProb: number;
  conditionEn: string;
  conditionHi: string;
  conditionPa: string;
}

const DISTRICT_WEATHER_MOCK: Record<string, WeatherRecord> = {
  Ludhiana: { tempMin: 13, tempMax: 25, humidity: 64, windKmph: 8, rainProb: 5, conditionEn: "Clear Sky & Favorable", conditionHi: "साफ मौसम एवं अनुकूल", conditionPa: "ਸਾਫ ਮੌਸਮ ਅਤੇ ਅਨੁਕੂਲ" },
  Sirsa: { tempMin: 12, tempMax: 26, humidity: 58, windKmph: 9, rainProb: 0, conditionEn: "Dry & Sunny", conditionHi: "शुष्क एवं धूप", conditionPa: "ਖੁਸ਼ਕ ਅਤੇ ਧੁੱਪ" },
  Karnal: { tempMin: 13, tempMax: 25, humidity: 66, windKmph: 7, rainProb: 10, conditionEn: "Mild Mist in Morning", conditionHi: "सुबह हल्का कोहरा, बाद में साफ", conditionPa: "ਸਵੇਰੇ ਹਲਕੀ ਧੁੰਦ, ਬਾਅਦ ਵਿੱਚ ਸਾਫ" },
  Jodhpur: { tempMin: 15, tempMax: 29, humidity: 42, windKmph: 11, rainProb: 0, conditionEn: "Dry & Warm Afternoon", conditionHi: "शुष्क एवं धूप, जीरा हेतु अनुकूल", conditionPa: "ਖੁਸ਼ਕ ਅਤੇ ਨਿੱਘੀ ਧੁੱਪ" },
  Bathinda: { tempMin: 12, tempMax: 25, humidity: 60, windKmph: 9, rainProb: 5, conditionEn: "Clear Winter Sky", conditionHi: "शीतकालीन साफ आसमान", conditionPa: "ਸਰਦੀਆਂ ਦਾ ਸਾਫ ਅਸਮਾਨ" },
};

export const AgriWeatherCalendar: React.FC = () => {
  const { language } = useLanguage();
  const [selectedDistrict, setSelectedDistrict] = useState<string>("Ludhiana");
  const [selectedCrop, setSelectedCrop] = useState<string>("WHEAT");

  // Default sowing date: 24 days ago (puts wheat squarely into the critical CRI stage!)
  const [sowingDate, setSowingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 24);
    return d.toISOString().split("T")[0] || "2026-11-01";
  });

  const das = useMemo(() => {
    const sown = new Date(sowingDate).getTime();
    const now = Date.now();
    const diffDays = Math.max(0, Math.floor((now - sown) / (1000 * 60 * 60 * 24)));
    return diffDays;
  }, [sowingDate]);

  const stages = selectedCrop === "CUMIN" ? CUMIN_STAGES : WHEAT_STAGES;

  const currentStage: CropStageConfig = useMemo(() => {
    return (
      stages.find((s) => das >= s.minDas && das <= s.maxDas) ||
      stages[stages.length - 1] ||
      WHEAT_STAGES[0]!
    );
  }, [stages, das]);

  const weather: WeatherRecord = DISTRICT_WEATHER_MOCK[selectedDistrict] || DISTRICT_WEATHER_MOCK["Ludhiana"]!;

  return (
    <section
      aria-label="Agri-Weather and Crop Stage Calendar"
      className="bg-surface rounded-3xl border border-line p-5 sm:p-7 shadow-subtle space-y-6 ms-card-interactive"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-canopy-soft text-canopy dark:text-canopy-bright rounded-2xl border border-canopy/20 flex items-center justify-center shrink-0">
            <CloudSun weight="duotone" className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-ink">
              {language === "hi"
                ? "कृषि मौसम एवं फसल कैलेंडर"
                : language === "pa"
                ? "ਖੇਤੀ ਮੌਸਮ ਅਤੇ ਫਸਲ ਕੈਲੰਡਰ"
                : "Agri-Weather & Crop Stage Calendar"}
            </h2>
            <p className="text-xs text-ink-muted">
              {language === "hi"
                ? "आईएमडी एवं पीएयू पैकेज ऑफ प्रैक्टिसेज पर आधारित सटीक दैनिक सलाह"
                : language === "pa"
                ? "ਮੌਸਮ ਵਿਭਾਗ ਅਤੇ ਪੀਏਯੂ ਸਿਫਾਰਸ਼ਾਂ ਤੇ ਆਧਾਰਿਤ ਰੋਜ਼ਾਨਾ ਖੇਤੀ ਸਲਾਹ"
                : "Stage-specific agronomic advisories from IMD Agromet & PAU Package of Practices"}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold bg-canopy-soft text-canopy dark:text-canopy-bright px-3 py-1 rounded-full border border-canopy/20">
          <span className="w-1.5 h-1.5 rounded-full bg-canopy-bright animate-pulse" />
          IMD Bulletin: Today
        </span>
      </div>

      {/* Control Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            {language === "hi" ? "जिला चुनें:" : language === "pa" ? "ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ:" : "District:"}
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full min-h-[44px] text-xs font-semibold px-3 py-2.5 rounded-xl border border-line bg-surface-subtle text-ink cursor-pointer focus:border-canopy focus:ring-2 focus:ring-canopy/20 focus:outline-none"
          >
            <option value="Ludhiana">Ludhiana (Ludhiana Mandi / PAU)</option>
            <option value="Sirsa">Sirsa (Sirsa Mandi / HSAMB)</option>
            <option value="Karnal">Karnal (Karnal Mandi / CSSRI)</option>
            <option value="Bathinda">Bathinda (Malwa Region)</option>
            <option value="Jodhpur">Jodhpur (Jeera Mandi / Western RJ)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            {language === "hi" ? "फसल चुनें:" : language === "pa" ? "ਫ਼ਸਲ ਚੁਣੋ:" : "Crop:"}
          </label>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="w-full min-h-[44px] text-xs font-semibold px-3 py-2.5 rounded-xl border border-line bg-surface-subtle text-ink cursor-pointer focus:border-canopy focus:ring-2 focus:ring-canopy/20 focus:outline-none"
          >
            <option value="WHEAT">Wheat (गेहूं / ਕਣਕ)</option>
            <option value="CUMIN">Cumin (जीरा / ਜ਼ੀਰਾ)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            {language === "hi" ? "बुवाई तिथि (Sowing Date):" : language === "pa" ? "ਬਿਜਾਈ ਦੀ ਤਾਰੀਖ:" : "Sowing Date:"}
          </label>
          <input
            type="date"
            value={sowingDate}
            onChange={(e) => setSowingDate(e.target.value)}
            className="w-full min-h-[44px] text-xs font-semibold px-3 py-2.5 rounded-xl border border-line bg-surface-subtle text-ink cursor-pointer focus:border-canopy focus:ring-2 focus:ring-canopy/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Weather Telemetry Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-subtle/80 p-3.5 rounded-2xl border border-line flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-saffron-soft flex items-center justify-center shrink-0">
            <Thermometer weight="duotone" className="w-5 h-5 text-saffron" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Temp Range</div>
            <div className="text-xs sm:text-sm font-bold font-mono tnum text-ink">
              {weather.tempMin}°C – {weather.tempMax}°C
            </div>
          </div>
        </div>

        <div className="bg-surface-subtle/80 p-3.5 rounded-2xl border border-line flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-canopy-soft flex items-center justify-center shrink-0">
            <Drop weight="duotone" className="w-5 h-5 text-canopy dark:text-canopy-bright" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Humidity</div>
            <div className="text-xs sm:text-sm font-bold font-mono tnum text-ink">{weather.humidity}% RH</div>
          </div>
        </div>

        <div className="bg-surface-subtle/80 p-3.5 rounded-2xl border border-line flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Wind weight="duotone" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Wind Speed</div>
            <div className="text-xs sm:text-sm font-bold font-mono tnum text-ink">{weather.windKmph} km/h</div>
          </div>
        </div>

        <div className="bg-surface-subtle/80 p-3.5 rounded-2xl border border-line flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-canopy-soft flex items-center justify-center shrink-0">
            <CloudSun weight="duotone" className="w-5 h-5 text-canopy dark:text-canopy-bright" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Sky</div>
            <div className="text-xs sm:text-sm font-bold text-ink truncate">
              {language === "hi" ? weather.conditionHi : language === "pa" ? weather.conditionPa : weather.conditionEn}
            </div>
          </div>
        </div>
      </div>

      {/* Growth Stage Progression Card */}
      <div className="bg-canopy-soft/45 border border-canopy/25 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-canopy text-white flex items-center justify-center shadow-subtle">
              <Plant weight="duotone" className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-canopy dark:text-canopy-bright font-semibold">
                {language === "hi" ? "वर्तमान फसल अवस्था" : language === "pa" ? "ਮੌਜੂਦਾ ਫਸਲ ਅਵਸਥਾ" : "Active Growth Stage"}
              </div>
              <div className="font-display font-bold text-sm sm:text-base text-ink">
                {language === "hi" ? currentStage.nameHi : language === "pa" ? currentStage.namePa : currentStage.nameEn}
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold tnum bg-canopy text-white px-3.5 py-1.5 rounded-full shadow-subtle">
            {das} {language === "hi" ? "दिन (DAS)" : language === "pa" ? "ਦਿਨ (DAS)" : "Days After Sowing"}
          </span>
        </div>

        {/* Segmented Progress Bar of Stages */}
        <div className="space-y-1.5">
          <div className="w-full bg-surface h-3 rounded-full overflow-hidden border border-line flex p-0.5 gap-0.5">
            {stages.map((st, i) => {
              const isPast = das > st.maxDas;
              const isCurrent = das >= st.minDas && das <= st.maxDas;
              return (
                <div
                  key={i}
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCurrent
                      ? "bg-canopy-bright w-full shadow-emeraldGlow"
                      : isPast
                      ? "bg-canopy/65 w-full"
                      : "bg-surface-subtle w-full opacity-50"
                  }`}
                  title={`${st.nameEn} (${st.minDas}-${st.maxDas} DAS)`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-ink-muted pt-0.5">
            <span>Sowing (Day 0)</span>
            <span>Harvest ({stages[stages.length - 1]?.maxDas ?? 140} DAS)</span>
          </div>
        </div>

        {/* Action Callout */}
        <div className="p-3.5 bg-surface rounded-xl border border-line flex items-start gap-3 text-xs sm:text-sm shadow-subtle">
          {currentStage.irrigationNeeded ? (
            <WarningCircle weight="fill" className="w-5 h-5 text-saffron shrink-0 mt-0.5" />
          ) : (
            <CheckCircle weight="fill" className="w-5 h-5 text-canopy dark:text-canopy-bright shrink-0 mt-0.5" />
          )}
          <div className="leading-relaxed text-ink font-medium">
            <strong className="text-canopy dark:text-canopy-bright mr-1.5">
              {language === "hi" ? "आज की मुख्य सलाह:" : language === "pa" ? "ਅੱਜ ਦੀ ਮੁੱਖ ਸਲਾਹ:" : "Today's Critical Advisory:"}
            </strong>
            {language === "hi"
              ? currentStage.criticalActionHi
              : language === "pa"
              ? currentStage.criticalActionPa
              : currentStage.criticalActionEn}
          </div>
        </div>
      </div>
    </section>
  );
};
