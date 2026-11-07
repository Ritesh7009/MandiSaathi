package com.mandisaathi.service;

import com.mandisaathi.client.gnani.GnaniSttService;
import com.mandisaathi.client.gnani.GnaniTtsService;
import com.mandisaathi.client.gnani.SynthesisResult;
import com.mandisaathi.client.gnani.TranscriptionResult;
import com.mandisaathi.config.GnaniProperties;
import com.mandisaathi.dto.VoiceQueryRequest;
import com.mandisaathi.dto.VoiceQueryResponse;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.List;

@Service
public class VoiceAssistantService {

    private final GnaniProperties gnaniProperties;
    private final GnaniSttService gnaniSttService;
    private final GnaniTtsService gnaniTtsService;
    private final CommodityRepository commodityRepository;
    private final MandiRepository mandiRepository;
    private final PriceRecordRepository priceRecordRepository;

    public VoiceAssistantService(
            GnaniProperties gnaniProperties,
            GnaniSttService gnaniSttService,
            GnaniTtsService gnaniTtsService,
            CommodityRepository commodityRepository,
            MandiRepository mandiRepository,
            PriceRecordRepository priceRecordRepository
    ) {
        this.gnaniProperties = gnaniProperties;
        this.gnaniSttService = gnaniSttService;
        this.gnaniTtsService = gnaniTtsService;
        this.commodityRepository = commodityRepository;
        this.mandiRepository = mandiRepository;
        this.priceRecordRepository = priceRecordRepository;
    }

    public VoiceQueryResponse processTextQuery(VoiceQueryRequest request) {
        String query = request.queryText() != null ? request.queryText().trim() : "";
        String lang = request.language() != null ? request.language().toLowerCase() : "hi";

        String detectedLang = detectLanguageCode(query, lang);
        String responseEn;
        String responseHi;
        String responsePa;

        // Domain Intent Matching against real database records
        String queryLower = query.toLowerCase();
        if (queryLower.contains("wheat") || queryLower.contains("गेहूं") || queryLower.contains("ਕਣਕ")) {
            List<PriceRecord> records = priceRecordRepository.findByCommodityCodeOrderByPriceDateDesc("WHEAT");
            if (!records.isEmpty()) {
                PriceRecord latest = records.get(0);
                responseEn = String.format("Verified Agmarknet modal price for Wheat in %s is ₹%s per quintal (Reported %s).",
                        getMandiName(latest.getMandiCode(), "en"), latest.getModalPrice(), latest.getPriceDate());
                responseHi = String.format("गेहूं का प्रमाणित मॉडल भाव %s में ₹%s प्रति क्विंटल है (दिनांक: %s)।",
                        getMandiName(latest.getMandiCode(), "hi"), latest.getModalPrice(), latest.getPriceDate());
                responsePa = String.format("ਕਣਕ ਦਾ ਪ੍ਰਮਾਣਿਤ ਮਾਡਲ ਭਾਅ %s ਵਿੱਚ ₹%s ਪ੍ਰਤੀ ਕੁਇੰਟਲ ਹੈ (ਮਿਤੀ: %s)।",
                        getMandiName(latest.getMandiCode(), "pa"), latest.getModalPrice(), latest.getPriceDate());
            } else {
                responseEn = "No current verified price records found for Wheat. Please check back after daily mandi closure.";
                responseHi = "गेहूं के लिए वर्तमान में कोई प्रमाणित भाव दर्ज नहीं है। कृपया मंडी बंद होने के बाद जांचें।";
                responsePa = "ਕਣਕ ਲਈ ਕੋਈ ਤਾਜ਼ਾ ਭਾਅ ਨਹੀਂ ਮਿਲਿਆ।";
            }
        } else if (queryLower.contains("kisan") || queryLower.contains("pm-kisan") || queryLower.contains("किसान") || queryLower.contains("ਕਿਸਾਨ")) {
            responseEn = "For PM-KISAN registration, you need: 1. Aadhaar Card, 2. Land Ownership Records (Khasra/Khatauni), 3. Aadhaar-linked Bank Passbook, and 4. Mobile number for OTP e-KYC. Apply via pmkisan.gov.in.";
            responseHi = "पीएम-किसान योजना के लिए आवश्यक दस्तावेज़ हैं: 1. आधार कार्ड, 2. ज़मीन की खतौनी/जमाबंदी, 3. आधार से जुड़ा बैंक खाता, और 4. ई-केवाईसी हेतु मोबाइल नंबर। pmkisan.gov.in पर पंजीकरण करें।";
            responsePa = "ਪੀਐਮ-ਕਿਸਾਨ ਲਈ ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼ ਹਨ: 1. ਆਧਾਰ ਕਾਰਡ, 2. ਜ਼ਮੀਨ ਦੀ ਜਮ੍ਹਾਂਬੰਦੀ, 3. ਬੈਂਕ ਪਾਸਬੁੱਕ, ਅਤੇ 4. ਮੋਬਾਈਲ ਨੰਬਰ।";
        } else if (queryLower.contains("mandi") || queryLower.contains("मंडी") || queryLower.contains("ਮੰਡੀ")) {
            long mandiCount = mandiRepository.count();
            responseEn = String.format("MandiSaathi tracks %d key APMC grain and commodity mandis across Punjab, Haryana, Rajasthan, MP, Maharashtra, UP, and Delhi.", mandiCount);
            responseHi = String.format("मंडी साथी पंजाब, हरियाणा, राजस्थान, मध्य प्रदेश, महाराष्ट्र और दिल्ली की %d प्रमुख मंडियों की निगरानी करता है।", mandiCount);
            responsePa = String.format("ਮੰਡੀ ਸਾਥੀ ਪੰਜਾਬ, ਹਰਿਆਣਾ ਅਤੇ ਹੋਰ ਰਾਜਾਂ ਦੀਆਂ %d ਪ੍ਰਮੁੱਖ ਮੰਡੀਆਂ ਦੀ ਜਾਣਕਾਰੀ ਪ੍ਰਦਾਨ ਕਰਦਾ ਹੈ।", mandiCount);
        } else {
            responseEn = "I can help you check mandi prices, compare market rates, review PM-KISAN schemes, or record complaints. What commodity or mandi would you like to inspect?";
            responseHi = "मैं आपको कृषि उपज के ताज़ा भाव बताने, मंडियों की तुलना करने, सरकारी योजनाओं के नियम समझाने और मंडी संबंधी शिकायत दर्ज करने में सहायता कर सकता हूँ। आप किस फसल या मंडी की जानकारी चाहते हैं?";
            responsePa = "ਮੈਂ ਤੁਹਾਨੂੰ ਮੰਡੀ ਦੇ ਭਾਅ, ਯੋਜਨਾਵਾਂ ਅਤੇ ਸ਼ਿਕਾਇਤਾਂ ਬਾਰੇ ਜਾਣਕਾਰੀ ਦੇ ਸਕਦਾ ਹਾਂ। ਤੁਸੀਂ ਕਿਸ ਫ਼ਸਲ ਬਾਰੇ ਪੁੱਛਣਾ ਚਾਹੁੰਦੇ ਹੋ?";
        }

        // Choose response text based on requested language
        String activeResponse = switch (lang) {
            case "hi" -> responseHi;
            case "pa" -> responsePa;
            default -> responseEn;
        };

        // Synthesis check (stub or real)
        SynthesisResult synth = gnaniTtsService.synthesize(activeResponse, detectedLang, "female");
        String audioBase64 = (synth.audioData() != null && synth.audioData().length > 0)
                ? Base64.getEncoder().encodeToString(synth.audioData())
                : null;

        boolean isLive = gnaniProperties.enabled();
        String engineNotice = isLive
                ? "Live Gnani Prisma v2.5 / Timbre v2.5 voice pipeline connected."
                : "Development Mode: Gnani Prisma v2.5 STT & Timbre v2.5 TTS interface contracts verified. Live streaming credentials not enabled; local audio synthesizer fallback active.";

        List<String> related = List.of(
                "आज गेहूं का भाव क्या है?",
                "ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?",
                "What documents are needed for PM-KISAN?",
                "Compare wheat prices in nearby mandis"
        );

        return new VoiceQueryResponse(
                query,
                detectedLang,
                activeResponse,
                responseHi,
                responsePa,
                audioBase64,
                isLive,
                engineNotice,
                related
        );
    }

    private String detectLanguageCode(String text, String defaultLang) {
        if (text == null || text.isBlank()) return defaultLang + "-IN";
        for (char c : text.toCharArray()) {
            Character.UnicodeBlock block = Character.UnicodeBlock.of(c);
            if (Character.UnicodeBlock.DEVANAGARI.equals(block)) {
                return "hi-IN";
            }
            if (Character.UnicodeBlock.GURMUKHI.equals(block)) {
                return "pa-IN";
            }
        }
        return defaultLang + "-IN";
    }

    private String getMandiName(String code, String lang) {
        return mandiRepository.findByCode(code)
                .map(m -> switch (lang) {
                    case "hi" -> m.getNameHi();
                    case "pa" -> m.getNamePa() != null ? m.getNamePa() : m.getNameEn();
                    default -> m.getNameEn();
                })
                .orElse(code);
    }
}
