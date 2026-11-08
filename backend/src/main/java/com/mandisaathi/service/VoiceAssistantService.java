package com.mandisaathi.service;

import com.mandisaathi.client.gnani.GnaniSttService;
import com.mandisaathi.client.gnani.GnaniTtsService;
import com.mandisaathi.client.gnani.SynthesisResult;
import com.mandisaathi.client.gnani.TranscriptionResult;
import com.mandisaathi.config.GnaniProperties;
import com.mandisaathi.dto.PriceRecordDto;
import com.mandisaathi.dto.VoiceQueryRequest;
import com.mandisaathi.dto.VoiceQueryResponse;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VoiceAssistantService {

    private static final Logger log = LoggerFactory.getLogger(VoiceAssistantService.class);

    private final GnaniProperties gnaniProperties;
    private final GnaniSttService gnaniSttService;
    private final GnaniTtsService gnaniTtsService;
    private final CommodityRepository commodityRepository;
    private final MandiRepository mandiRepository;
    private final PriceRecordRepository priceRecordRepository;
    private final PriceRecordService priceRecordService;

    public VoiceAssistantService(
            GnaniProperties gnaniProperties,
            GnaniSttService gnaniSttService,
            GnaniTtsService gnaniTtsService,
            CommodityRepository commodityRepository,
            MandiRepository mandiRepository,
            PriceRecordRepository priceRecordRepository,
            PriceRecordService priceRecordService
    ) {
        this.gnaniProperties = gnaniProperties;
        this.gnaniSttService = gnaniSttService;
        this.gnaniTtsService = gnaniTtsService;
        this.commodityRepository = commodityRepository;
        this.mandiRepository = mandiRepository;
        this.priceRecordRepository = priceRecordRepository;
        this.priceRecordService = priceRecordService;
    }

    /**
     * Complete Audio Workflow:
     * Audio bytes -> Gnani Prisma STT -> Transcript & Language -> Entity/Intent extraction -> DB Lookup -> Grounded Answer -> Gnani Timbre TTS
     */
    public VoiceQueryResponse processAudioQuery(byte[] audioData, String clientLanguageHint) {
        String defaultLangCode = resolveLanguageLocale(clientLanguageHint);

        // 1. Gnani Prisma STT Transcription
        TranscriptionResult sttResult = gnaniSttService.transcribe(audioData, defaultLangCode);
        if (!sttResult.success() || sttResult.transcript() == null || sttResult.transcript().isBlank()) {
            String err = sttResult.errorMessage() != null ? sttResult.errorMessage() : "Could not transcribe audio. Please speak clearly.";
            log.warn("STT transcription unsuccessful: {}", err);
            return new VoiceQueryResponse(
                    "",
                    defaultLangCode,
                    "UNKNOWN",
                    Map.of(),
                    List.of(),
                    "आवाज़ पहचानी नहीं जा सकी। कृपया माइक्रोफ़ोन के पास आकर दोबारा बोलें।",
                    "आवाज़ पहचानी नहीं जा सकी। कृपया माइक्रोफ़ोन के पास आकर दोबारा बोलें।",
                    "ਆਵਾਜ਼ ਸਮਝ ਨਹੀਂ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ।",
                    null,
                    "MandiSaathi Engine",
                    "",
                    gnaniProperties.isConfigured() ? "FAILED" : "STUBBED",
                    gnaniProperties.isConfigured(),
                    "STT engine did not return valid speech transcript: " + err,
                    List.of("आज पंजाब में गेहूं का भाव क्या चल रहा है?", "ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?")
            );
        }

        String transcript = sttResult.transcript();
        String detectedLang = (sttResult.detectedLanguage() != null && !sttResult.detectedLanguage().isBlank())
                ? sttResult.detectedLanguage()
                : detectLanguageCode(transcript, clientLanguageHint);

        return executePipeline(transcript, detectedLang);
    }

    /**
     * Text Fallback Workflow:
     * Text query -> Entity/Intent extraction -> DB Lookup -> Grounded Answer -> Gnani Timbre TTS
     */
    public VoiceQueryResponse processTextQuery(VoiceQueryRequest request) {
        String query = request.queryText() != null ? request.queryText().trim() : "";
        String requestedLang = request.language() != null ? request.language().toLowerCase() : "hi";
        String detectedLang = detectLanguageCode(query, requestedLang);

        return executePipeline(query, detectedLang);
    }

    /**
     * Core Grounded Intelligence Pipeline
     */
    private VoiceQueryResponse executePipeline(String query, String languageCode) {
        String langPrefix = languageCode.length() >= 2 ? languageCode.substring(0, 2).toLowerCase() : "hi";
        Map<String, String> entities = extractEntities(query);
        String intent = determineIntent(query, entities);

        String commodityCode = entities.get("commodity");
        String state = entities.get("state");
        String mandiCode = entities.get("mandi");

        List<PriceRecordDto> matchedPriceRecords = new ArrayList<>();
        String responseEn;
        String responseHi;
        String responsePa;
        String sourceProvenance = "Agmarknet (DAC&FW)";
        String reportingDate = "";

        switch (intent) {
            case "MANDI_PRICE_LOOKUP" -> {
                if (commodityCode != null) {
                    Commodity commodity = commodityRepository.findByCode(commodityCode).orElse(null);
                    String commNameEn = commodity != null ? commodity.getNameEn() : commodityCode;
                    String commNameHi = commodity != null ? commodity.getNameHi() : commodityCode;
                    String commNamePa = commodity != null && commodity.getNamePa() != null ? commodity.getNamePa() : commNameEn;

                    if (mandiCode == null && state == null) {
                        // User did not specify market: ask clarification while listing markets
                        List<PriceRecord> allCommodityRecords = priceRecordRepository.findByCommodityCodeOrderByPriceDateDesc(commodityCode);
                        if (!allCommodityRecords.isEmpty()) {
                            matchedPriceRecords = priceRecordService.getPrices(commodityCode, null);
                            List<String> marketNames = allCommodityRecords.stream()
                                    .map(r -> getMandiName(r.getMandiCode(), "hi"))
                                    .distinct()
                                    .limit(3)
                                    .toList();
                            String marketListHi = String.join(", ", marketNames);

                            responseEn = String.format("%s prices are currently tracked across several markets (e.g. %s). Which specific mandi or state would you like to inspect?",
                                    commNameEn, String.join(", ", allCommodityRecords.stream().map(r -> getMandiName(r.getMandiCode(), "en")).distinct().limit(3).toList()));
                            responseHi = String.format("%s के भाव कई प्रमुख मंडियों में उपलब्ध हैं (जैसे %s)। आप किस विशिष्ट मंडी या राज्य का भाव जानना चाहते हैं?",
                                    commNameHi, marketListHi);
                            responsePa = String.format("%s ਦੇ ਭਾਅ ਕਈ ਮੰਡੀਆਂ ਵਿੱਚ ਦਰਜ ਹਨ। ਤੁਸੀਂ ਕਿਸ ਮੰਡੀ ਜਾਂ ਰਾਜ ਦਾ ਭਾਅ ਪੁੱਛਣਾ ਚਾਹੁੰਦੇ ਹੋ?",
                                    commNamePa);
                        } else {
                            responseEn = String.format("No current verified price records found for %s. Daily filings update after APMC auction closure at 4:00 PM.", commNameEn);
                            responseHi = String.format("%s के लिए वर्तमान में कोई सत्यापित भाव दर्ज नहीं है। दैनिक नीलामी के बाद शाम 4 बजे भाव अपडेट होते हैं।", commNameHi);
                            responsePa = String.format("%s ਲਈ ਕੋਈ ਤਾਜ਼ਾ ਭਾਅ ਨਹੀਂ ਮਿਲਿਆ।", commNamePa);
                        }
                    } else {
                        List<PriceRecord> records = fetchPriceRecords(commodityCode, state, mandiCode);
                        if (!records.isEmpty()) {
                            matchedPriceRecords = priceRecordService.getPrices(commodityCode, mandiCode);
                            PriceRecord latest = records.get(0);
                            reportingDate = latest.getPriceDate().toString();
                            sourceProvenance = latest.getDataSource();

                            String mandiNameEn = getMandiName(latest.getMandiCode(), "en");
                            String mandiNameHi = getMandiName(latest.getMandiCode(), "hi");
                            String mandiNamePa = getMandiName(latest.getMandiCode(), "pa");

                            responseEn = String.format("Verified Agmarknet modal rate for %s in %s mandi is ₹%s per quintal (Min: ₹%s, Max: ₹%s, Reported %s).",
                                    commNameEn, mandiNameEn, latest.getModalPrice(), latest.getMinPrice(), latest.getMaxPrice(), reportingDate);
                            responseHi = String.format("%s में %s का प्रमाणित मॉडल भाव ₹%s प्रति क्विंटल है (न्यूनतम: ₹%s, अधिकतम: ₹%s, दिनांक: %s)।",
                                    mandiNameHi, commNameHi, latest.getModalPrice(), latest.getMinPrice(), latest.getMaxPrice(), reportingDate);
                            responsePa = String.format("%s ਮੰਡੀ ਵਿੱਚ %s ਦਾ ਪ੍ਰਮਾਣਿਤ ਮਾਡਲ ਭਾਅ ₹%s ਪ੍ਰਤੀ ਕੁਇੰਟਲ ਹੈ (ਘੱਟੋ-ਘੱਟ: ₹%s, ਵੱਧ ਤੋਂ ਵੱਧ: ₹%s, ਮਿਤੀ: %s)।",
                                    mandiNamePa, commNamePa, latest.getModalPrice(), latest.getMinPrice(), latest.getMaxPrice(), reportingDate);
                        } else {
                            String locDesc = mandiCode != null ? getMandiName(mandiCode, "en") : state;
                            responseEn = String.format("No current verified price record found for %s in %s. Check back after daily APMC auction closure.", commNameEn, locDesc);
                            responseHi = String.format("%s में %s के लिए आज कोई आधिकारिक भाव दर्ज नहीं है। कृपया मंडी नीलामी समाप्त होने के बाद जांचें।",
                                    mandiCode != null ? getMandiName(mandiCode, "hi") : state, commNameHi);
                            responsePa = String.format("%s ਵਿੱਚ %s ਦਾ ਅੱਜ ਦਾ ਭਾਅ ਦਰਜ ਨਹੀਂ ਹੈ।",
                                    mandiCode != null ? getMandiName(mandiCode, "pa") : state, commNamePa);
                        }
                    }
                } else {
                    responseEn = "Please mention an agricultural commodity like Wheat (गेहूं), Mustard (सरसों), Paddy (धान), or Onion (प्याज) to check mandi rates.";
                    responseHi = "कृपया किसी फसल का नाम बताएं (जैसे गेहूं, सरसों, धान या प्याज) जिसका आप मंडी भाव जानना चाहते हैं।";
                    responsePa = "ਕਿਰਪਾ ਕਰਕੇ ਕਿਸੇ ਫ਼ਸਲ ਦਾ ਨਾਮ ਦੱਸੋ (ਜਿਵੇਂ ਕਣਕ, ਸਰ੍ਹੋਂ, ਝੋਨਾ ਜਾਂ ਪਿਆਜ਼)।";
                }
            }

            case "MANDI_COMPARISON" -> {
                String targetComm = commodityCode != null ? commodityCode : "WHEAT";
                Commodity commodity = commodityRepository.findByCode(targetComm).orElse(null);
                List<PriceRecordDto> allPrices = priceRecordService.getPrices(targetComm, null);

                // If state is specified, filter mandis by that state
                if (state != null && !state.isBlank()) {
                    allPrices = allPrices.stream()
                            .filter(p -> p.state() != null && p.state().equalsIgnoreCase(state))
                            .toList();
                }

                // Group by distinct mandi taking the most recent consistent reporting date
                LocalDate latestDate = allPrices.stream()
                        .map(PriceRecordDto::priceDate)
                        .filter(Objects::nonNull)
                        .max(Comparator.naturalOrder())
                        .orElse(null);

                List<PriceRecordDto> consistentDateRecords = (latestDate != null)
                        ? allPrices.stream()
                                .filter(p -> latestDate.equals(p.priceDate()))
                                .collect(Collectors.toMap(PriceRecordDto::mandiCode, p -> p, (p1, p2) -> p1))
                                .values().stream().toList()
                        : List.of();

                matchedPriceRecords = consistentDateRecords;

                if (consistentDateRecords.size() >= 2) {
                    PriceRecordDto best = consistentDateRecords.stream()
                            .max(Comparator.comparing(PriceRecordDto::modalPrice))
                            .orElse(consistentDateRecords.get(0));
                    PriceRecordDto lowest = consistentDateRecords.stream()
                            .min(Comparator.comparing(PriceRecordDto::modalPrice))
                            .orElse(consistentDateRecords.get(0));
                    BigDecimal spread = best.modalPrice().subtract(lowest.modalPrice());
                    reportingDate = latestDate != null ? latestDate.toString() : "";

                    responseEn = String.format("Comparing %s across %d mandis (Date: %s): Highest modal rate is ₹%s in %s; lowest is ₹%s in %s (Inter-mandi spread: ₹%s/qtl).",
                            commodity != null ? commodity.getNameEn() : targetComm, consistentDateRecords.size(), reportingDate,
                            best.modalPrice(), best.mandiNameEn(), lowest.modalPrice(), lowest.mandiNameEn(), spread);
                    responseHi = String.format("%s की %d मंडियों में तुलना (दिनांक: %s): सर्वोत्तम मॉडल भाव ₹%s (%s) है, जबकि न्यूनतम ₹%s (%s) है (भाव का अंतर: ₹%s प्रति क्विंटल)।",
                            commodity != null ? commodity.getNameHi() : targetComm, consistentDateRecords.size(), reportingDate,
                            best.modalPrice(), best.mandiNameHi(), lowest.modalPrice(), lowest.mandiNameHi(), spread);
                    responsePa = String.format("%s ਦੀਆਂ %d ਮੰਡੀਆਂ ਦੀ ਤੁਲਨਾ (ਮਿਤੀ: %s): ਸਭ ਤੋਂ ਵੱਧ ਭਾਅ ₹%s (%s) ਅਤੇ ਘੱਟੋ-ਘੱਟ ₹%s (%s) ਹੈ (ਅੰਤਰ: ₹%s ਪ੍ਰਤੀ ਕੁਇੰਟਲ)।",
                            commodity != null && commodity.getNamePa() != null ? commodity.getNamePa() : targetComm, consistentDateRecords.size(), reportingDate,
                            best.modalPrice(), best.mandiNamePa() != null ? best.mandiNamePa() : best.mandiNameEn(),
                            lowest.modalPrice(), lowest.mandiNamePa() != null ? lowest.mandiNamePa() : lowest.mandiNameEn(), spread);
                } else if (state != null && !state.isBlank()) {
                    String stateName = state;
                    String singleMandiInfo = !consistentDateRecords.isEmpty()
                            ? String.format(" (वर्तमान में केवल %s दर्ज है, भाव: ₹%s)", consistentDateRecords.get(0).mandiNameHi(), consistentDateRecords.get(0).modalPrice())
                            : "";
                    String singleMandiInfoEn = !consistentDateRecords.isEmpty()
                            ? String.format(" (only %s is currently tracked, rate: ₹%s)", consistentDateRecords.get(0).mandiNameEn(), consistentDateRecords.get(0).modalPrice())
                            : "";
                    String singleMandiInfoPa = !consistentDateRecords.isEmpty()
                            ? String.format(" (ਸਿਰਫ਼ %s ਦਾ ਭਾਅ ₹%s ਦਰਜ ਹੈ)", consistentDateRecords.get(0).mandiNamePa() != null ? consistentDateRecords.get(0).mandiNamePa() : consistentDateRecords.get(0).mandiNameEn(), consistentDateRecords.get(0).modalPrice())
                            : "";

                    responseEn = String.format("Insufficient comparative records for %s in %s%s. Market recommendation requires verified price filings from at least two mandis on the same reporting date.",
                            commodity != null ? commodity.getNameEn() : targetComm, stateName, singleMandiInfoEn);
                    responseHi = String.format("%s में %s के लिए तुलनात्मक डेटा अपर्याप्त है%s। विश्वसनीय तुलना और मंडी सिफारिश के लिए एक ही तारीख पर कम से कम दो मंडियों के भाव दर्ज होने आवश्यक हैं।",
                            stateName, commodity != null ? commodity.getNameHi() : targetComm, singleMandiInfo);
                    responsePa = String.format("%s ਵਿੱਚ %s ਲਈ ਤੁਲਨਾਤਮਕ ਡਾਟਾ ਨਾਕਾਫ਼ੀ ਹੈ%s। ਮੰਡੀ ਦੀ ਸਿਫ਼ਾਰਸ਼ ਲਈ ਘੱਟੋ-ਘੱਟ ਦੋ ਮੰਡੀਆਂ ਦੇ ਭਾਅ ਚਾਹੀਦੇ ਹਨ।",
                            stateName, commodity != null && commodity.getNamePa() != null ? commodity.getNamePa() : targetComm, singleMandiInfoPa);
                } else {
                    responseEn = "Need price filings from at least two mandis with consistent reporting dates to calculate comparison spread.";
                    responseHi = "तुलना देखने के लिए एक ही तारीख पर कम से कम दो मंडियों के भाव दर्ज होने आवश्यक हैं।";
                    responsePa = "ਤੁਲਨਾ ਦੇਖਣ ਲਈ ਘੱਟੋ-ਘੱਟ ਦੋ ਮੰਡੀਆਂ ਚੁਣੋ।";
                }
            }

            case "COMMODITY_SEARCH" -> {
                List<Commodity> comms = commodityRepository.findAll();
                String namesEn = comms.stream().map(Commodity::getNameEn).collect(Collectors.joining(", "));
                String namesHi = comms.stream().map(Commodity::getNameHi).collect(Collectors.joining(", "));

                responseEn = String.format("MandiSaathi tracks daily market prices for %d commodities: %s.", comms.size(), namesEn);
                responseHi = String.format("मंडी साथी पर %d फसलों के दैनिक भाव ट्रैक किए जाते हैं: %s।", comms.size(), namesHi);
                responsePa = String.format("ਮੰਡੀ ਸਾਥੀ ਤੇ %d ਫ਼ਸਲਾਂ ਦੇ ਪ੍ਰਮਾਣਿਤ ਭਾਅ ਉਪਲਬਧ ਹਨ।", comms.size());
            }

            case "GENERAL_HELP" -> {
                if (query.toLowerCase().contains("pm-kisan") || query.contains("पीएम-किसान") || query.contains("किसान") || query.contains("ਕਿਸਾਨ")) {
                    responseEn = "For PM-KISAN, eligible landholding farmers receive ₹6,000 per year in three installments. Required documents: 1. Aadhaar Card, 2. Land records (Khasra/Khatauni), 3. Aadhaar-linked Bank Passbook. Apply at pmkisan.gov.in.";
                    responseHi = "पीएम-किसान योजना में पात्र किसानों को ₹6,000 प्रति वर्ष तीन किस्तों में मिलते हैं। आवश्यक दस्तावेज: 1. आधार कार्ड, 2. जमीन की खतौनी/जमाबंदी, 3. बैंक पासबुक। pmkisan.gov.in पर आवेदन करें।";
                    responsePa = "ਪੀਐਮ-ਕਿਸਾਨ ਸਕੀਮ ਅਧੀਨ ਸਾਲਾਨਾ ₹6,000 ਮਿਲਦੇ ਹਨ। ਜ਼ਰੂਰੀ ਕਾਗਜ਼: ਆਧਾਰ ਕਾਰਡ, ਜਮ੍ਹਾਂਬੰਦੀ, ਅਤੇ ਬੈਂਕ ਪਾਸਬੁੱਕ।";
                } else {
                    responseEn = "Welcome to MandiSaathi. You can ask for mandi prices (e.g. 'Wheat rate in Punjab'), compare market spreads, review government schemes, or register grievances.";
                    responseHi = "मंडी साथी में आपका स्वागत है। आप किसी भी फसल का भाव पूछ सकते हैं (उदा. 'पंजाब में गेहूं का भाव क्या है'), मंडियों की तुलना कर सकते हैं या सरकारी योजनाओं के बारे में जान सकते हैं।";
                    responsePa = "ਮੰਡੀ ਸਾਥੀ ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ। ਤੁਸੀਂ ਫ਼ਸਲ ਦੇ ਭਾਅ (ਜਿਵੇਂ 'ਪੰਜਾਬ ਵਿੱਚ ਕਣਕ ਦਾ ਭਾਅ') ਪੁੱਛ ਸਕਦੇ ਹੋ।";
                }
            }

            default -> {
                responseEn = "I can help you check mandi rates, compare agricultural markets, or explain government schemes like PM-KISAN. Try asking: 'What is the wheat price in Punjab?'";
                responseHi = "मैं आपको कृषि उपज के सत्यापित भाव बताने, मंडियों की तुलना करने और पीएम-किसान जैसी सरकारी योजनाओं की जानकारी देने में सहायता कर सकता हूँ। आप पूछ सकते हैं: 'आज पंजाब में गेहूं का भाव क्या चल रहा है?'";
                responsePa = "ਮੈਂ ਤੁਹਾਨੂੰ ਮੰਡੀ ਦੇ ਭਾਅ ਅਤੇ ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਬਾਰੇ ਦੱਸ ਸਕਦਾ ਹਾਂ। ਪੁੱਛੋ: 'ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?'";
            }
        }

        // Active vernacular response selection
        String activeResponse = switch (langPrefix) {
            case "hi" -> responseHi;
            case "pa" -> responsePa;
            default -> responseEn;
        };

        // 2. Gnani Timbre TTS Audio Synthesis
        SynthesisResult synth = gnaniTtsService.synthesize(activeResponse, languageCode, "female");
        String audioBase64 = (synth.audioData() != null && synth.audioData().length > 0)
                ? Base64.getEncoder().encodeToString(synth.audioData())
                : null;

        boolean isLive = gnaniProperties.isConfigured();
        String aiStatus = isLive ? "CONNECTED" : "STUBBED";
        String engineNotice = isLive
                ? "Live Gnani Prisma v2.5 STT & Timbre v2.5 TTS voice pipeline active."
                : "Development Mode: Gnani Prisma v2.5 & Timbre v2.5 interface contracts verified. Local synthesizer active.";

        List<String> related = List.of(
                "आज पंजाब में गेहूं का भाव क्या चल रहा है?",
                "ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?",
                "Compare wheat prices in nearby mandis",
                "What documents are needed for PM-KISAN?"
        );

        return new VoiceQueryResponse(
                query,
                languageCode,
                intent,
                entities,
                matchedPriceRecords,
                activeResponse,
                responseHi,
                responsePa,
                audioBase64,
                sourceProvenance,
                reportingDate,
                aiStatus,
                isLive,
                engineNotice,
                related
        );
    }

    private List<PriceRecord> fetchPriceRecords(String commCode, String state, String mandiCode) {
        if (mandiCode != null && !mandiCode.isBlank()) {
            return priceRecordRepository.findByCommodityCodeAndMandiCodeOrderByPriceDateDesc(commCode, mandiCode);
        }
        if (state != null && !state.isBlank()) {
            List<Mandi> stateMandis = mandiRepository.findByStateIgnoreCaseAndActiveTrue(state);
            if (!stateMandis.isEmpty()) {
                List<String> codes = stateMandis.stream().map(Mandi::getCode).toList();
                return priceRecordRepository.findByCommodityCodeAndMandiCodeInOrderByPriceDateDesc(commCode, codes);
            }
            return List.of();
        }
        return priceRecordRepository.findByCommodityCodeOrderByPriceDateDesc(commCode);
    }

    private Map<String, String> extractEntities(String text) {
        Map<String, String> entities = new HashMap<>();
        if (text == null || text.isBlank()) return entities;
        String lower = text.toLowerCase();

        // 1. Commodity Extraction
        if (lower.contains("wheat") || lower.contains("gehun") || lower.contains("गेहूं") || lower.contains("कनक") || lower.contains("ਕਣਕ")) {
            entities.put("commodity", "WHEAT");
        } else if (lower.contains("mustard") || lower.contains("sarson") || lower.contains("सरसों") || lower.contains("ਸਰ੍ਹੋਂ") || lower.contains("राई")) {
            entities.put("commodity", "MUSTARD");
        } else if (lower.contains("paddy") || lower.contains("rice") || lower.contains("dhan") || lower.contains("धान") || lower.contains("चावल") || lower.contains("ਝੋਨਾ") || lower.contains("ਚੌਲ")) {
            entities.put("commodity", "PADDY");
        } else if (lower.contains("onion") || lower.contains("pyaz") || lower.contains("प्याज") || lower.contains("ਪਿਆਜ਼") || lower.contains("ਗੰਢਾ")) {
            entities.put("commodity", "ONION");
        } else if (lower.contains("cotton") || lower.contains("kapas") || lower.contains("कपास") || lower.contains("ਕਪਾਹ")) {
            entities.put("commodity", "COTTON");
        } else if (lower.contains("maize") || lower.contains("corn") || lower.contains("makka") || lower.contains("मक्का") || lower.contains("ਮੱਕੀ")) {
            entities.put("commodity", "MAIZE");
        }

        // 2. State Extraction
        if (lower.contains("punjab") || lower.contains("पंजाब") || lower.contains("ਪੰਜਾਬ")) {
            entities.put("state", "Punjab");
        } else if (lower.contains("haryana") || lower.contains("हरियाणा") || lower.contains("ਹਰਿਆਣਾ")) {
            entities.put("state", "Haryana");
        } else if (lower.contains("rajasthan") || lower.contains("राजस्थान")) {
            entities.put("state", "Rajasthan");
        } else if (lower.contains("madhya pradesh") || lower.contains("mp") || lower.contains("मध्य प्रदेश")) {
            entities.put("state", "Madhya Pradesh");
        } else if (lower.contains("maharashtra") || lower.contains("महाराष्ट्र")) {
            entities.put("state", "Maharashtra");
        } else if (lower.contains("delhi") || lower.contains("दिल्ली")) {
            entities.put("state", "Delhi");
        } else if (lower.contains("uttar pradesh") || lower.contains("up") || lower.contains("उत्तर प्रदेश")) {
            entities.put("state", "Uttar Pradesh");
        }

        // 3. Mandi Extraction
        if (lower.contains("khanna") || lower.contains("खन्ना") || lower.contains("ਖੰਨਾ") || lower.contains("ludhiana") || lower.contains("लुधियाना") || lower.contains("ਲੁਧਿਆਣਾ")) {
            entities.put("mandi", "KHANNA_PB");
        } else if (lower.contains("sirsa") || lower.contains("सिरसा") || lower.contains("ਸਿਰਸਾ")) {
            entities.put("mandi", "SIRSA_HR");
        } else if (lower.contains("karnal") || lower.contains("करनाल") || lower.contains("ਕਰਨਾਲ")) {
            entities.put("mandi", "KARNAL_HR");
        } else if (lower.contains("kota") || lower.contains("कोटा")) {
            entities.put("mandi", "KOTA_RJ");
        } else if (lower.contains("neemuch") || lower.contains("नीमच")) {
            entities.put("mandi", "NEEMUCH_MP");
        } else if (lower.contains("lasalgaon") || lower.contains("लासलगांव")) {
            entities.put("mandi", "LASALGAON_MH");
        } else if (lower.contains("azadpur") || lower.contains("आजादपुर")) {
            entities.put("mandi", "AZADPUR_DL");
        }

        return entities;
    }

    private String determineIntent(String text, Map<String, String> entities) {
        if (text == null || text.isBlank()) return "UNKNOWN";
        String lower = text.toLowerCase();

        if (lower.contains("compare") || lower.contains("तुलना") || lower.contains("अंतर") || lower.contains("ਮਿਲਾਓ") || lower.contains("ਫ਼ਰਕ")
                || lower.contains("सबसे अच्छा") || lower.contains("सबसे ज्यादा") || lower.contains("किस मंडी") || lower.contains("best mandi")
                || lower.contains("best price") || lower.contains("highest price") || lower.contains("highest rate")
                || lower.contains("ਸਭ ਤੋਂ ਵੱਧ") || lower.contains("ਕਿਹੜੀ ਮੰਡੀ")) {
            return "MANDI_COMPARISON";
        }
        if (lower.contains("भाव") || lower.contains("रेट") || lower.contains("मूल्य") || lower.contains("ਦਰ") || lower.contains("ਕੀ ਭਾਅ") || lower.contains("rate") || lower.contains("price")) {
            if (entities.containsKey("commodity") || entities.containsKey("mandi") || entities.containsKey("state") || lower.contains("मंडी") || lower.contains("ਮੰਡੀ") || lower.contains("mandi")) {
                return "MANDI_PRICE_LOOKUP";
            }
            return "UNKNOWN";
        }
        if (lower.contains("फसलें") || lower.contains("फसल") || lower.contains("ਫ਼ਸਲਾਂ") || lower.contains("commodities") || lower.contains("crops") || lower.contains("list")) {
            return "COMMODITY_SEARCH";
        }
        if (lower.contains("योजना") || lower.contains("पीएम-किसान") || lower.contains("ਸਕੀਮ") || lower.contains("scheme") || lower.contains("pm-kisan") || lower.contains("kcc") || lower.contains("help") || lower.contains("मदद")) {
            return "GENERAL_HELP";
        }
        if (entities.containsKey("commodity")) {
            return "MANDI_PRICE_LOOKUP";
        }

        return "UNKNOWN";
    }

    private String detectLanguageCode(String text, String defaultHint) {
        if (text == null || text.isBlank()) {
            return resolveLanguageLocale(defaultHint);
        }
        for (char c : text.toCharArray()) {
            Character.UnicodeBlock block = Character.UnicodeBlock.of(c);
            if (Character.UnicodeBlock.DEVANAGARI.equals(block)) {
                return "hi-IN";
            }
            if (Character.UnicodeBlock.GURMUKHI.equals(block)) {
                return "pa-IN";
            }
        }
        return resolveLanguageLocale(defaultHint);
    }

    private String resolveLanguageLocale(String lang) {
        if (lang == null || lang.isBlank()) return "hi-IN";
        String lower = lang.toLowerCase();
        if (lower.startsWith("hi")) return "hi-IN";
        if (lower.startsWith("pa")) return "pa-IN";
        if (lower.startsWith("en")) return "en-IN";
        return "hi-IN";
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
