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

    public VoiceQueryResponse processAudioQuery(byte[] audioData, String clientLanguageHint) {
        return processAudioQuery(audioData, clientLanguageHint, "recording.wav", "audio/wav", null);
    }

    public VoiceQueryResponse processAudioQuery(
            byte[] audioData,
            String clientLanguageHint,
            String filename,
            String contentType,
            Double durationSeconds
    ) {
        long startTime = System.currentTimeMillis();
        String defaultLangCode = resolveLanguageLocale(clientLanguageHint);
        String durationStr = durationSeconds != null ? String.format("%.2fs", durationSeconds) : "unknown";

        log.info("Voice audio request: filename='{}', contentType='{}', byteSize={}, duration={}, lang='{}'",
                filename, contentType, audioData != null ? audioData.length : 0, durationStr, defaultLangCode);

        // 1. Gnani Prisma STT Transcription
        TranscriptionResult sttResult = gnaniSttService.transcribe(audioData, defaultLangCode, filename, contentType);
        long sttLatency = sttResult.latencyMs();

        log.info("STT response: status={}, errorCode='{}', transcript='{}', sttLatency={}ms",
                sttResult.statusCode(), sttResult.errorCode(), sttResult.transcript(), sttLatency);

        if (!sttResult.success() || sttResult.transcript() == null || sttResult.transcript().isBlank()) {
            String err = sttResult.errorMessage() != null ? sttResult.errorMessage() : "Could not transcribe audio. Please speak clearly.";
            long totalLatency = System.currentTimeMillis() - startTime;
            log.warn("STT transcription unsuccessful (status={}): {}", sttResult.statusCode(), err);

            String langPrefix = defaultLangCode.length() >= 2 ? defaultLangCode.substring(0, 2).toLowerCase() : "hi";
            String activeMessage = resolveFailureMessage(langPrefix, sttResult.statusCode(), "TIMEOUT".equalsIgnoreCase(sttResult.errorCode()));
            String userMessageHi = resolveFailureMessage("hi", sttResult.statusCode(), "TIMEOUT".equalsIgnoreCase(sttResult.errorCode()));
            String userMessagePa = resolveFailureMessage("pa", sttResult.statusCode(), "TIMEOUT".equalsIgnoreCase(sttResult.errorCode()));

            return new VoiceQueryResponse(
                    "",
                    defaultLangCode,
                    "UNKNOWN",
                    Map.of(),
                    List.of(),
                    activeMessage,
                    userMessageHi,
                    userMessagePa,
                    null,
                    "MandiSaathi Engine",
                    "",
                    sttResult.statusCode() == 200 ? "CONNECTED" : "FAILED",
                    gnaniProperties.isConfigured(),
                    err,
                    getLocalizedRelatedQueries(langPrefix),
                    totalLatency,
                    sttLatency,
                    sttResult.statusCode(),
                    sttResult.errorCode()
            );
        }

        String transcript = sttResult.transcript();
        String detectedLang = (sttResult.detectedLanguage() != null && !sttResult.detectedLanguage().isBlank())
                ? sttResult.detectedLanguage()
                : detectLanguageCode(transcript, clientLanguageHint);

        return executePipeline(transcript, detectedLang, sttLatency, startTime);
    }

    public VoiceQueryResponse processTextQuery(VoiceQueryRequest request) {
        long startTime = System.currentTimeMillis();
        String query = request.queryText() != null ? request.queryText().trim() : "";
        String requestedLang = request.language() != null ? request.language().toLowerCase() : "hi";
        String detectedLang = detectLanguageCode(query, requestedLang);

        return executePipeline(query, detectedLang, 0L, startTime);
    }

    private VoiceQueryResponse executePipeline(String query, String languageCode, long sttLatencyMs, long startTimeMs) {
        String langPrefix = languageCode.length() >= 2 ? languageCode.substring(0, 2).toLowerCase() : "hi";
        Map<String, String> entities = extractEntities(query);
        String intent = determineIntent(query, entities);

        String commodityCode = entities.get("commodity");
        String state = entities.get("state");
        String district = entities.get("district");
        String mandiCode = entities.get("mandi");

        List<PriceRecordDto> matchedPriceRecords = new ArrayList<>();
        String activeResponse;
        String responseHi;
        String responsePa;
        String sourceProvenance = "Agmarknet (DAC&FW)";
        String reportingDate = "";

        switch (intent) {
            case "MANDI_PRICE_LOOKUP" -> {
                if (commodityCode != null) {
                    if (mandiCode == null && district == null && state == null) {
                        List<PriceRecord> allCommodityRecords = priceRecordRepository.findByCommodityCodeOrderByPriceDateDesc(commodityCode);
                        if (!allCommodityRecords.isEmpty()) {
                            matchedPriceRecords = priceRecordService.getPrices(commodityCode, null);
                            List<String> marketCodes = allCommodityRecords.stream()
                                    .map(PriceRecord::getMandiCode)
                                    .distinct()
                                    .limit(3)
                                    .toList();

                            activeResponse = buildClarificationResponse(langPrefix, commodityCode, marketCodes);
                            responseHi = buildClarificationResponse("hi", commodityCode, marketCodes);
                            responsePa = buildClarificationResponse("pa", commodityCode, marketCodes);
                        } else {
                            activeResponse = buildNotFoundResponse(langPrefix, getLocalizedCommodityName(commodityCode, langPrefix), "APMC Mandis");
                            responseHi = buildNotFoundResponse("hi", getLocalizedCommodityName(commodityCode, "hi"), "एपीएमसी मंडियों");
                            responsePa = buildNotFoundResponse("pa", getLocalizedCommodityName(commodityCode, "pa"), "ਏਪੀਐਮਸੀ ਮੰਡੀਆਂ");
                        }
                    } else if (district != null && mandiCode == null) {
                        List<Mandi> districtMandis = mandiRepository.findByDistrictIgnoreCaseAndActiveTrue(district);
                        if (districtMandis.isEmpty()) {
                            activeResponse = buildNoMandisFoundResponse(langPrefix, district);
                            responseHi = buildNoMandisFoundResponse("hi", district);
                            responsePa = buildNoMandisFoundResponse("pa", district);
                        } else if (districtMandis.size() == 1) {
                            Mandi singleMandi = districtMandis.get(0);
                            List<PriceRecord> records = priceRecordRepository.findByCommodityCodeAndMandiCodeOrderByPriceDateDesc(commodityCode, singleMandi.getCode());
                            if (!records.isEmpty()) {
                                matchedPriceRecords = priceRecordService.getPrices(commodityCode, singleMandi.getCode());
                                PriceRecord latest = records.get(0);
                                reportingDate = latest.getPriceDate().toString();
                                sourceProvenance = latest.getDataSource();

                                activeResponse = buildPriceResponse(langPrefix, commodityCode, singleMandi.getCode(), latest.getModalPrice(), latest.getMinPrice(), latest.getMaxPrice(), reportingDate);
                                responseHi = buildPriceResponse("hi", commodityCode, singleMandi.getCode(), latest.getModalPrice(), latest.getMinPrice(), latest.getMaxPrice(), reportingDate);
                                responsePa = buildPriceResponse("pa", commodityCode, singleMandi.getCode(), latest.getModalPrice(), latest.getMinPrice(), latest.getMaxPrice(), reportingDate);
                            } else {
                                activeResponse = buildNotFoundResponse(langPrefix, getLocalizedCommodityName(commodityCode, langPrefix), singleMandi.getNameEn());
                                responseHi = buildNotFoundResponse("hi", getLocalizedCommodityName(commodityCode, "hi"), singleMandi.getNameHi() != null ? singleMandi.getNameHi() : singleMandi.getNameEn());
                                responsePa = buildNotFoundResponse("pa", getLocalizedCommodityName(commodityCode, "pa"), singleMandi.getNamePa() != null ? singleMandi.getNamePa() : singleMandi.getNameEn());
                            }
                        } else {
                            matchedPriceRecords = priceRecordService.getPrices(commodityCode, null).stream()
                                    .filter(p -> district.equalsIgnoreCase(p.district()))
                                    .toList();
                            List<String> codes = districtMandis.stream().map(Mandi::getCode).toList();
                            activeResponse = buildClarificationResponse(langPrefix, commodityCode, codes);
                            responseHi = buildClarificationResponse("hi", commodityCode, codes);
                            responsePa = buildClarificationResponse("pa", commodityCode, codes);
                        }
                    } else {
                        List<PriceRecord> records = fetchPriceRecords(commodityCode, state, district, mandiCode);
                        if (!records.isEmpty()) {
                            matchedPriceRecords = priceRecordService.getPrices(commodityCode, mandiCode);
                            PriceRecord latest = records.get(0);
                            reportingDate = latest.getPriceDate().toString();
                            sourceProvenance = latest.getDataSource();

                            activeResponse = buildPriceResponse(langPrefix, commodityCode, latest.getMandiCode(), latest.getModalPrice(), latest.getMinPrice(), latest.getMaxPrice(), reportingDate);
                            responseHi = buildPriceResponse("hi", commodityCode, latest.getMandiCode(), latest.getModalPrice(), latest.getMinPrice(), latest.getMaxPrice(), reportingDate);
                            responsePa = buildPriceResponse("pa", commodityCode, latest.getMandiCode(), latest.getModalPrice(), latest.getMinPrice(), latest.getMaxPrice(), reportingDate);
                        } else {
                            String locDesc = mandiCode != null ? getLocalizedMandiName(mandiCode, langPrefix) : getLocalizedRegionName(district != null ? district : state, langPrefix);
                            activeResponse = buildNotFoundResponse(langPrefix, getLocalizedCommodityName(commodityCode, langPrefix), locDesc);
                            responseHi = buildNotFoundResponse("hi", getLocalizedCommodityName(commodityCode, "hi"), mandiCode != null ? getLocalizedMandiName(mandiCode, "hi") : getLocalizedRegionName(district != null ? district : state, "hi"));
                            responsePa = buildNotFoundResponse("pa", getLocalizedCommodityName(commodityCode, "pa"), mandiCode != null ? getLocalizedMandiName(mandiCode, "pa") : getLocalizedRegionName(district != null ? district : state, "pa"));
                        }
                    }
                } else {
                    activeResponse = buildCommodityPrompt(langPrefix);
                    responseHi = buildCommodityPrompt("hi");
                    responsePa = buildCommodityPrompt("pa");
                }
            }

            case "MANDI_COMPARISON" -> {
                String targetComm = commodityCode != null ? commodityCode : "WHEAT";
                List<PriceRecordDto> allPrices = priceRecordService.getPrices(targetComm, null);

                if (district != null && !district.isBlank()) {
                    allPrices = allPrices.stream().filter(p -> p.district() != null && p.district().equalsIgnoreCase(district)).toList();
                } else if (state != null && !state.isBlank()) {
                    allPrices = allPrices.stream().filter(p -> p.state() != null && p.state().equalsIgnoreCase(state)).toList();
                }

                LocalDate latestDate = allPrices.stream().map(PriceRecordDto::priceDate).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
                List<PriceRecordDto> consistentDateRecords = (latestDate != null)
                        ? allPrices.stream().filter(p -> latestDate.equals(p.priceDate())).collect(Collectors.toMap(PriceRecordDto::mandiCode, p -> p, (p1, p2) -> p1)).values().stream().toList()
                        : List.of();

                matchedPriceRecords = consistentDateRecords;

                if (consistentDateRecords.size() >= 2) {
                    PriceRecordDto best = consistentDateRecords.stream().max(Comparator.comparing(PriceRecordDto::modalPrice)).orElse(consistentDateRecords.get(0));
                    PriceRecordDto lowest = consistentDateRecords.stream().min(Comparator.comparing(PriceRecordDto::modalPrice)).orElse(consistentDateRecords.get(0));
                    BigDecimal spread = best.modalPrice().subtract(lowest.modalPrice());
                    reportingDate = latestDate != null ? latestDate.toString() : "";

                    activeResponse = buildComparisonResponse(langPrefix, targetComm, consistentDateRecords.size(), best, lowest, spread, reportingDate);
                    responseHi = buildComparisonResponse("hi", targetComm, consistentDateRecords.size(), best, lowest, spread, reportingDate);
                    responsePa = buildComparisonResponse("pa", targetComm, consistentDateRecords.size(), best, lowest, spread, reportingDate);
                } else {
                    String regionName = (district != null && !district.isBlank()) ? district
                            : (state != null && !state.isBlank()) ? state : null;
                    PriceRecordDto singleRecord = !consistentDateRecords.isEmpty() ? consistentDateRecords.get(0) : null;
                    activeResponse = buildInsufficientComparisonResponse(langPrefix, targetComm, regionName, singleRecord);
                    responseHi = buildInsufficientComparisonResponse("hi", targetComm, regionName, singleRecord);
                    responsePa = buildInsufficientComparisonResponse("pa", targetComm, regionName, singleRecord);
                }
            }

            case "COMMODITY_SEARCH" -> {
                List<Commodity> comms = commodityRepository.findAll();
                activeResponse = buildCommoditySearchResponse(langPrefix, comms.size());
                responseHi = buildCommoditySearchResponse("hi", comms.size());
                responsePa = buildCommoditySearchResponse("pa", comms.size());
            }

            case "GENERAL_HELP" -> {
                boolean isPmKisan = query.toLowerCase().contains("pm-kisan") || query.contains("पीएम-किसान") || query.contains("किसान") || query.contains("ਕਿਸਾਨ") || query.contains("ಕಿಸಾನ್") || query.contains("కిసాన్") || query.contains("கிசான்");
                activeResponse = buildGeneralHelpResponse(langPrefix, isPmKisan);
                responseHi = buildGeneralHelpResponse("hi", isPmKisan);
                responsePa = buildGeneralHelpResponse("pa", isPmKisan);
            }

            default -> {
                activeResponse = buildDefaultResponse(langPrefix);
                responseHi = buildDefaultResponse("hi");
                responsePa = buildDefaultResponse("pa");
            }
        }

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

        List<String> related = getLocalizedRelatedQueries(langPrefix);
        long totalLatencyMs = System.currentTimeMillis() - startTimeMs;

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
                related,
                totalLatencyMs,
                sttLatencyMs,
                200,
                null
        );
    }

    private List<PriceRecord> fetchPriceRecords(String commCode, String state, String district, String mandiCode) {
        if (mandiCode != null && !mandiCode.isBlank()) {
            return priceRecordRepository.findByCommodityCodeAndMandiCodeOrderByPriceDateDesc(commCode, mandiCode);
        }
        if (district != null && !district.isBlank()) {
            List<Mandi> districtMandis = mandiRepository.findByDistrictIgnoreCaseAndActiveTrue(district);
            if (!districtMandis.isEmpty()) {
                List<String> codes = districtMandis.stream().map(Mandi::getCode).toList();
                return priceRecordRepository.findByCommodityCodeAndMandiCodeInOrderByPriceDateDesc(commCode, codes);
            }
            return List.of();
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

        // 1. Commodity Extraction (All 10 Gnani Languages)
        if (lower.contains("wheat") || lower.contains("gehun") || lower.contains("gehu") || lower.contains("गेहूं") || lower.contains("गेहूँ") || lower.contains("कनक") || lower.contains("ਕਣਕ") || lower.contains("गहू") || lower.contains("गव्हा") || lower.contains("ઘઉં") || lower.contains("গম") || lower.contains("ಗೋಧಿ") || lower.contains("ഗോതമ്പ്") || lower.contains("గోధుమ") || lower.contains("கோதுமை")) {
            entities.put("commodity", "WHEAT");
        } else if (lower.contains("mustard") || lower.contains("sarson") || lower.contains("सरसों") || lower.contains("सरसो") || lower.contains("ਸਰ੍ਹੋਂ") || lower.contains("ਸਰੋਂ") || lower.contains("मोहरी") || lower.contains("રાયડો") || lower.contains("સરીষা") || lower.contains("সরিষা") || lower.contains("সর্ষে") || lower.contains("ఆవాలు") || lower.contains("கடுகு") || lower.contains("ಸಾಸಿವೆ") || lower.contains("കടുക്") || lower.contains("राई")) {
            entities.put("commodity", "MUSTARD");
        } else if (lower.contains("paddy") || lower.contains("rice") || lower.contains("dhan") || lower.contains("धान") || lower.contains("चावल") || lower.contains("ਝੋਨਾ") || lower.contains("ਚੌਲ") || lower.contains("भात") || lower.contains("ડાંગર") || lower.contains("ধান") || lower.contains("వరి") || lower.contains("நெல்") || lower.contains("ಭತ್ತ") || lower.contains("നെല്ല്")) {
            entities.put("commodity", "PADDY");
        } else if (lower.contains("onion") || lower.contains("pyaz") || lower.contains("प्याज") || lower.contains("प्यास") || lower.contains("ਪਿਆਜ਼") || lower.contains("ਗੰਢਾ") || lower.contains("कांदा") || lower.contains("कांद्या") || lower.contains("कांदे") || lower.contains("કાંદા") || lower.contains("કાંદો") || lower.contains("ડુંગળી") || lower.contains("পেঁয়াজ") || lower.contains("ఉల్లిపాయ") || lower.contains("ఉల్లి") || lower.contains("வெங்காயம்") || lower.contains("ಈರುಳ್ಳಿ") || lower.contains("ഉള്ളി") || lower.contains("സവാള")) {
            entities.put("commodity", "ONION");
        } else if (lower.contains("cotton") || lower.contains("kapas") || lower.contains("कपास") || lower.contains("ਕਪਾਹ") || lower.contains("कापूस") || lower.contains("कापसा") || lower.contains("કપાસ") || lower.contains("তুলা") || lower.contains("పత్తి") || lower.contains("பருத்தி") || lower.contains("ಹತ್ತಿ") || lower.contains("പരുത്തി")) {
            entities.put("commodity", "COTTON");
        } else if (lower.contains("potato") || lower.contains("aloo") || lower.contains("आलू") || lower.contains("ਆਲੂ") || lower.contains("बटाटा") || lower.contains("बटाट्या") || lower.contains("બટાકા") || lower.contains("আলু") || lower.contains("బంగాళాదుంప") || lower.contains("உருளைக்கிழங்கு") || lower.contains("ಆಲೂಗಡ್ಡೆ") || lower.contains("ഉരുളക്കിഴങ്ങ്")) {
            entities.put("commodity", "POTATO");
        } else if (lower.contains("tomato") || lower.contains("tamatar") || lower.contains("टमाटर") || lower.contains("ਟਮਾਟਰ") || lower.contains("टोमॅटो") || lower.contains("ટામેટા") || lower.contains("টমেটো") || lower.contains("టమోటా") || lower.contains("தக்காளி") || lower.contains("ಟೊಮೇಟೊ") || lower.contains("തക്കാളി")) {
            entities.put("commodity", "TOMATO");
        } else if (lower.contains("maize") || lower.contains("corn") || lower.contains("makka") || lower.contains("मक्का") || lower.contains("मक्के") || lower.contains("मक्की") || lower.contains("ਮੱਕੀ") || lower.contains("मका") || lower.contains("મકાઈ") || lower.contains("ভুট্টা") || lower.contains("మొక్కజొన్న") || lower.contains("மக்காச்சோளம்") || lower.contains("ಮೆಕ್ಕೆಜೋಳ") || lower.contains("ചോളം")) {
            entities.put("commodity", "MAIZE");
        } else if (lower.contains("soyabean") || lower.contains("soybean") || lower.contains("सोयाबीन") || lower.contains("ਸੋਇਆਬੀਨ") || lower.contains("સયાવિન") || lower.contains("সয়াবিন") || lower.contains("సోయాబీన్") || lower.contains("சோயாபீன்") || lower.contains("ಸೋಯಾಬೀನ್") || lower.contains("സോയാബീൻ")) {
            entities.put("commodity", "SOYABEAN");
        } else if (lower.contains("chana") || lower.contains("gram") || lower.contains("चना") || lower.contains("ਛੋਲੇ") || lower.contains("हरभरा") || lower.contains("हरभऱ्या") || lower.contains("ચણા") || lower.contains("ছোলা") || lower.contains("శనగలు") || lower.contains("கொண்டைக்கடலை") || lower.contains("ಕಡಲೆ") || lower.contains("കടല")) {
            entities.put("commodity", "GRAM");
        }

        // 2. State Extraction (All Indian States & UTs across 10 Languages)
        if (lower.contains("punjab") || lower.contains("पंजाब") || lower.contains("ਪੰਜਾਬ")) {
            entities.put("state", "Punjab");
        } else if (lower.contains("haryana") || lower.contains("हरियाणा") || lower.contains("ਹਰਿਆਣਾ")) {
            entities.put("state", "Haryana");
        } else if (lower.contains("rajasthan") || lower.contains("राजस्थान") || lower.contains("ਰਾਜਸਥਾਨ") || lower.contains("રાજસ્થાન") || lower.contains("ராஜஸ்தான்")) {
            entities.put("state", "Rajasthan");
        } else if (lower.contains("madhya pradesh") || lower.contains("mp") || lower.contains("मध्य प्रदेश") || lower.contains("ਮੱਧ ਪ੍ਰਦੇਸ਼")) {
            entities.put("state", "Madhya Pradesh");
        } else if (lower.contains("maharashtra") || lower.contains("महाराष्ट्र") || lower.contains("ਮਹਾਰਾਸ਼ਟਰ") || lower.contains("મહારાષ્ટ્ર") || lower.contains("மகாராஷ்டிரா")) {
            entities.put("state", "Maharashtra");
        } else if (lower.contains("delhi") || lower.contains("दिल्ली") || lower.contains("ਦਿੱਲੀ") || lower.contains("દિલ્હી") || lower.contains("தில்லி")) {
            entities.put("state", "Delhi");
        } else if (lower.contains("uttar pradesh") || lower.contains("up") || lower.contains("उत्तर प्रदेश") || lower.contains("ਉੱਤਰ ਪ੍ਰਦੇਸ਼") || lower.contains("ઉત્તર પ્રદેશ")) {
            entities.put("state", "Uttar Pradesh");
        } else if (lower.contains("gujarat") || lower.contains("गुजरात") || lower.contains("ગુજરાત") || lower.contains("ਗੁਜਰਾਤ") || lower.contains("குஜராத்")) {
            entities.put("state", "Gujarat");
        } else if (lower.contains("west bengal") || lower.contains("bengal") || lower.contains("पश्चिम बंगाल") || lower.contains("পশ্চিমবঙ্গ") || lower.contains("ਪੱਛਮੀ ਬੰਗਾਲ")) {
            entities.put("state", "West Bengal");
        } else if (lower.contains("andhra") || lower.contains("आंध्र") || lower.contains("ఆంధ్ర")) {
            entities.put("state", "Andhra Pradesh");
        } else if (lower.contains("telangana") || lower.contains("तेलंगाना") || lower.contains("తెలంగాణ")) {
            entities.put("state", "Telangana");
        } else if (lower.contains("tamil nadu") || lower.contains("तमिलनाडु") || lower.contains("தமிழ்நாடு")) {
            entities.put("state", "Tamil Nadu");
        } else if (lower.contains("karnataka") || lower.contains("कर्नाटक") || lower.contains("ಕರ್ನಾಟಕ") || lower.contains("கர்நாடகா")) {
            entities.put("state", "Karnataka");
        } else if (lower.contains("kerala") || lower.contains("केरल") || lower.contains("കേരളം") || lower.contains("கேரளா")) {
            entities.put("state", "Kerala");
        } else if (lower.contains("bihar") || lower.contains("बिहार") || lower.contains("ਬਿਹਾਰ") || lower.contains("বিহার")) {
            entities.put("state", "Bihar");
        } else if (lower.contains("odisha") || lower.contains("orissa") || lower.contains("ओडिशा") || lower.contains("ਉੜੀਸਾ") || lower.contains("ওড়িশা")) {
            entities.put("state", "Odisha");
        } else if (lower.contains("assam") || lower.contains("असम") || lower.contains("ਆਸਾਮ") || lower.contains("আসাম")) {
            entities.put("state", "Assam");
        } else if (lower.contains("himachal") || lower.contains("हिमाचल") || lower.contains("ਹਿਮਾਚਲ")) {
            entities.put("state", "Himachal Pradesh");
        } else if (lower.contains("uttarakhand") || lower.contains("उत्तराखंड") || lower.contains("ਉੱਤਰਾਖੰਡ")) {
            entities.put("state", "Uttarakhand");
        } else if (lower.contains("chhattisgarh") || lower.contains("छत्तीसगढ़") || lower.contains("ਛੱਤੀਸਗੜ੍ਹ")) {
            entities.put("state", "Chhattisgarh");
        } else if (lower.contains("jharkhand") || lower.contains("झारखंड") || lower.contains("ਝਾਰਖੰਡ")) {
            entities.put("state", "Jharkhand");
        } else if (lower.contains("goa") || lower.contains("गोवा")) {
            entities.put("state", "Goa");
        }

        // 3. District Extraction (Prominent APMC Agricultural Districts)
        if (lower.contains("ludhiana") || lower.contains("लुधियाना") || lower.contains("ਲੁਧਿਆਣਾ")) {
            entities.put("district", "Ludhiana");
        } else if (lower.contains("nashik") || lower.contains("नासिक") || lower.contains("नाशिक")) {
            entities.put("district", "Nashik");
        } else if (lower.contains("sirsa") || lower.contains("सिरसा") || lower.contains("ਸਿਰਸਾ") || lower.contains("સિરસા")) {
            entities.put("district", "Sirsa");
        } else if (lower.contains("karnal") || lower.contains("करनाल") || lower.contains("ਕਰਨਾਲ") || lower.contains("કરનાલ")) {
            entities.put("district", "Karnal");
        } else if (lower.contains("kota") || lower.contains("कोटा") || lower.contains("ਕੋਟਾ") || lower.contains("કોટા")) {
            entities.put("district", "Kota");
        } else if (lower.contains("neemuch") || lower.contains("नीमच") || lower.contains("ਨੀਮਚ") || lower.contains("નીમચ")) {
            entities.put("district", "Neemuch");
        } else if (lower.contains("hapur") || lower.contains("हापुड़") || lower.contains("हापूड") || lower.contains("ਹਾਪੁੜ")) {
            entities.put("district", "Hapur");
        } else if (lower.contains("pune") || lower.contains("पुणे") || lower.contains("ਪੁਣੇ")) {
            entities.put("district", "Pune");
        } else if (lower.contains("bathinda") || lower.contains("बठिंडा") || lower.contains("ਬਠਿੰਡਾ")) {
            entities.put("district", "Bathinda");
        } else if (lower.contains("amritsar") || lower.contains("अमृतसर") || lower.contains("ਅੰਮ੍ਰਿਤਸਰ")) {
            entities.put("district", "Amritsar");
        } else if (lower.contains("jalandhar") || lower.contains("जालंधर") || lower.contains("ਜਲੰਧਰ")) {
            entities.put("district", "Jalandhar");
        } else if (lower.contains("patiala") || lower.contains("पटियाला") || lower.contains("ਪਟਿਆਲਾ")) {
            entities.put("district", "Patiala");
        } else if (lower.contains("hisar") || lower.contains("हिसार") || lower.contains("ਹਿਸਾਰ")) {
            entities.put("district", "Hisar");
        } else if (lower.contains("ambala") || lower.contains("अंबाला") || lower.contains("ਅੰਬਾਲਾ")) {
            entities.put("district", "Ambala");
        }

        // 4. Mandi Extraction (All 10 Gnani Languages)
        if (lower.contains("khanna") || lower.contains("खन्ना") || lower.contains("ਖੰਨਾ") || lower.contains("ખન્ના") || lower.contains("খান্না") || lower.contains("ఖన్నా") || lower.contains("கன்னா") || lower.contains("ಖನ್ನಾ") || lower.contains("ഖന്ന")) {
            entities.put("mandi", "KHANNA_PB");
        } else if (lower.contains("sirsa") || lower.contains("सिरसा") || lower.contains("ਸਿਰਸਾ") || lower.contains("સિરસા") || lower.contains("সিরসা") || lower.contains("సిర్సా") || lower.contains("சிர்சா") || lower.contains("ಸಿರ್ಸಾ") || lower.contains("സിർസ")) {
            entities.put("mandi", "SIRSA_HR");
        } else if (lower.contains("karnal") || lower.contains("करनाल") || lower.contains("ਕਰਨਾਲ") || lower.contains("કરનાલ") || lower.contains("করনাল") || lower.contains("కర్నాల్") || lower.contains("கர்னால்") || lower.contains("ಕರ್ನಾಲ್") || lower.contains("കർണാൽ")) {
            entities.put("mandi", "KARNAL_HR");
        } else if (lower.contains("kota") || lower.contains("कोटा") || lower.contains("ਕੋਟਾ") || lower.contains("કોટા") || lower.contains("কোটা") || lower.contains("కోటా") || lower.contains("கோட்டா") || lower.contains("ಕೋಟಾ") || lower.contains("കോട്ട")) {
            entities.put("mandi", "KOTA_RJ");
        } else if (lower.contains("neemuch") || lower.contains("नीमच") || lower.contains("ਨੀਮਚ") || lower.contains("નીમચ") || lower.contains("নিমচ") || lower.contains("నీమచ్") || lower.contains("நீமச்") || lower.contains("ನೀಮಚ್") || lower.contains("നീമച്ച്")) {
            entities.put("mandi", "NEEMUCH_MP");
        } else if (lower.contains("lasalgaon") || lower.contains("लासलगांव") || lower.contains("लासलगाव") || lower.contains("ਲਾਸਲਗਾਂਵ") || lower.contains("લાસલગાંવ") || lower.contains("লাসালগাঁও") || lower.contains("లాసల్‌గావ్") || lower.contains("லாசல்காவ்") || lower.contains("ಲಾಸಲ್‌ಗಾಂವ್") || lower.contains("ലാസൽഗാവ്")) {
            entities.put("mandi", "LASALGAON_MH");
        } else if (lower.contains("azadpur") || lower.contains("आजादपुर") || lower.contains("आझादपूर") || lower.contains("ਆਜ਼ਾਦਪੁਰ") || lower.contains("આઝાદપુર") || lower.contains("আজাদপুর") || lower.contains("ఆజాద్‌పూర్") || lower.contains("ஆசாத்பூர்") || lower.contains("ಆಜಾದ್‌ಪುರ") || lower.contains("ആസാദ്പൂർ")) {
            entities.put("mandi", "AZADPUR_DL");
        } else if (lower.contains("hapur") || lower.contains("हापुड़") || lower.contains("हापूड") || lower.contains("ਹਾਪੁੜ") || lower.contains("હાપુડ") || lower.contains("হাপুড়") || lower.contains("హాపూర్") || lower.contains("ஹாபூர்") || lower.contains("ಹಾಪುರ್") || lower.contains("ഹാപൂർ")) {
            entities.put("mandi", "HAPUR_UP");
        }

        return entities;
    }

    private String determineIntent(String text, Map<String, String> entities) {
        if (text == null || text.isBlank()) return "UNKNOWN";
        String lower = text.toLowerCase();

        if (lower.contains("compare") || lower.contains("तुलना") || lower.contains("अंतर") || lower.contains("ਮਿਲਾਓ") || lower.contains("ਫ਼ਰਕ")
                || lower.contains("સરખામણી") || lower.contains("তফাত") || lower.contains("పోలిక") || lower.contains("ஒப்பீடு") || lower.contains("ಹೋಲಿಕೆ") || lower.contains("താരതമ്യം")
                || lower.contains("सबसे अच्छा") || lower.contains("सबसे ज्यादा") || lower.contains("किस मंडी") || lower.contains("best mandi")
                || lower.contains("best price") || lower.contains("highest price") || lower.contains("highest rate")
                || lower.contains("ਸਭ ਤੋਂ ਵੱਧ") || lower.contains("ਕਿਹੜੀ ਮੰਡੀ")) {
            return "MANDI_COMPARISON";
        }
        if (lower.contains("भाव") || lower.contains("रेट") || lower.contains("मूल्य") || lower.contains("दर") || lower.contains("कीमत")
                || lower.contains("ਕੀ ਭਾਅ") || lower.contains("કેટલો") || lower.contains("কত")
                || lower.contains("ధర") || lower.contains("ఎంత") || lower.contains("விலை")
                || lower.contains("என்ன") || lower.contains("ಬೆಲೆ") || lower.contains("ಎಷ್ಟು")
                || lower.contains("വില") || lower.contains("നിരക്ക്") || lower.contains("എത്ര")
                || lower.contains("rate") || lower.contains("price")) {
            if (entities.containsKey("commodity") || entities.containsKey("mandi") || entities.containsKey("state") || entities.containsKey("district")
                    || lower.contains("मंडी") || lower.contains("ਮੰਡੀ") || lower.contains("mandi") || lower.contains("बाजार") || lower.contains("માર્કેટ")
                    || lower.contains("মার্কেট") || lower.contains("మార్కెట్") || lower.contains("சந்தை") || lower.contains("ಮಾರುಕಟ್ಟೆ") || lower.contains("മാർക്കറ്റ്")) {
                return "MANDI_PRICE_LOOKUP";
            }
            return "UNKNOWN";
        }
        if (lower.contains("फसलें") || lower.contains("फसल") || lower.contains("ਫ਼ਸਲਾਂ") || lower.contains("commodities") || lower.contains("crops") || lower.contains("list") || lower.contains("पिके") || lower.contains("પાક") || lower.contains("ফসল") || lower.contains("పంటలు") || lower.contains("பயிர்கள்") || lower.contains("ಬೆಳೆಗಳು") || lower.contains("വിളകൾ")) {
            return "COMMODITY_SEARCH";
        }
        if (lower.contains("योजना") || lower.contains("पीएम-किसान") || lower.contains("ਸਕੀਮ") || lower.contains("scheme") || lower.contains("pm-kisan") || lower.contains("kcc") || lower.contains("help") || lower.contains("मदद") || lower.contains("పథకం") || lower.contains("திட்டம்") || lower.contains("ಯೋಜನೆ") || lower.contains("പദ്ധതി") || lower.contains("প্রকল্প") || lower.contains("યોજના")) {
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
            if (Character.UnicodeBlock.GURMUKHI.equals(block)) return "pa-IN";
            if (Character.UnicodeBlock.BENGALI.equals(block)) return "bn-IN";
            if (Character.UnicodeBlock.GUJARATI.equals(block)) return "gu-IN";
            if (Character.UnicodeBlock.TELUGU.equals(block)) return "te-IN";
            if (Character.UnicodeBlock.TAMIL.equals(block)) return "ta-IN";
            if (Character.UnicodeBlock.KANNADA.equals(block)) return "kn-IN";
            if (Character.UnicodeBlock.MALAYALAM.equals(block)) return "ml-IN";
            if (Character.UnicodeBlock.DEVANAGARI.equals(block)) {
                if (defaultHint != null && defaultHint.toLowerCase().startsWith("mr")) return "mr-IN";
                return "hi-IN";
            }
        }
        return resolveLanguageLocale(defaultHint);
    }

    private String resolveLanguageLocale(String lang) {
        if (lang == null || lang.isBlank()) return "hi-IN";
        String lower = lang.toLowerCase().trim();
        if (lower.startsWith("hi")) return "hi-IN";
        if (lower.startsWith("pa")) return "pa-IN";
        if (lower.startsWith("en")) return "en-IN";
        if (lower.startsWith("mr")) return "mr-IN";
        if (lower.startsWith("gu")) return "gu-IN";
        if (lower.startsWith("bn")) return "bn-IN";
        if (lower.startsWith("te")) return "te-IN";
        if (lower.startsWith("ta")) return "ta-IN";
        if (lower.startsWith("kn")) return "kn-IN";
        if (lower.startsWith("ml")) return "ml-IN";
        return "hi-IN";
    }

    public String getLocalizedCommodityName(String code, String langPrefix) {
        if (code == null) return "Crops";
        String upper = code.toUpperCase();
        return switch (upper) {
            case "WHEAT" -> switch (langPrefix) {
                case "hi" -> "गेहूं";
                case "pa" -> "ਕਣਕ";
                case "mr" -> "गहू";
                case "gu" -> "ઘઉં";
                case "bn" -> "গম";
                case "te" -> "గోధుమ";
                case "ta" -> "கோதுமை";
                case "kn" -> "ಗೋಧಿ";
                case "ml" -> "ഗോതമ്പ്";
                default -> "Wheat";
            };
            case "PADDY" -> switch (langPrefix) {
                case "hi" -> "धान";
                case "pa" -> "ਝੋਨਾ";
                case "mr" -> "भात";
                case "gu" -> "ડાંગર";
                case "bn" -> "ধান";
                case "te" -> "వరి";
                case "ta" -> "நெல்";
                case "kn" -> "ಭತ್ತ";
                case "ml" -> "നെല്ല്";
                default -> "Paddy";
            };
            case "ONION" -> switch (langPrefix) {
                case "hi" -> "प्याज़";
                case "pa" -> "ਪਿਆਜ਼";
                case "mr" -> "कांदा";
                case "gu" -> "ડુંગળી";
                case "bn" -> "পেঁয়াজ";
                case "te" -> "ఉల్లిపాయ";
                case "ta" -> "வெங்காயம்";
                case "kn" -> "ಈರುಳ್ಳಿ";
                case "ml" -> "ഉള്ളി";
                default -> "Onion";
            };
            case "COTTON" -> switch (langPrefix) {
                case "hi" -> "कपास";
                case "pa" -> "ਕਪਾਹ";
                case "mr" -> "कापूस";
                case "gu" -> "કપાસ";
                case "bn" -> "তুলা";
                case "te" -> "పత్తి";
                case "ta" -> "பருத்தி";
                case "kn" -> "ಹತ್ತಿ";
                case "ml" -> "പരുത്തി";
                default -> "Cotton";
            };
            case "MUSTARD" -> switch (langPrefix) {
                case "hi" -> "सरसों";
                case "pa" -> "ਸਰ੍ਹੋਂ";
                case "mr" -> "मोहरी";
                case "gu" -> "રાયડો";
                case "bn" -> "সরিষা";
                case "te" -> "ఆవాలు";
                case "ta" -> "கடுகு";
                case "kn" -> "ಸಾಸಿವೆ";
                case "ml" -> "കടുക്";
                default -> "Mustard";
            };
            case "POTATO" -> switch (langPrefix) {
                case "hi" -> "आलू";
                case "pa" -> "ਆਲੂ";
                case "mr" -> "बटाटा";
                case "gu" -> "બટાકા";
                case "bn" -> "আলু";
                case "te" -> "బంగాళాదుంప";
                case "ta" -> "உருளைக்கிழங்கு";
                case "kn" -> "ಆಲೂಗಡ್ಡೆ";
                case "ml" -> "ഉരുളക്കിഴങ്ങ്";
                default -> "Potato";
            };
            case "TOMATO" -> switch (langPrefix) {
                case "hi" -> "टमाटर";
                case "pa" -> "ਟਮਾਟਰ";
                case "mr" -> "टोमॅटो";
                case "gu" -> "ટામેટા";
                case "bn" -> "টমেটো";
                case "te" -> "టమోటా";
                case "ta" -> "தக்காளி";
                case "kn" -> "ಟೊಮೇಟೊ";
                case "ml" -> "തക്കാളി";
                default -> "Tomato";
            };
            case "MAIZE" -> switch (langPrefix) {
                case "hi" -> "मक्का";
                case "pa" -> "ਮੱਕੀ";
                case "mr" -> "मका";
                case "gu" -> "મકાઈ";
                case "bn" -> "ভুট্টা";
                case "te" -> "మొక్కజొన్న";
                case "ta" -> "மக்காச்சோளம்";
                case "kn" -> "ಮೆಕ್ಕೆಜೋಳ";
                case "ml" -> "ചോളം";
                default -> "Maize";
            };
            case "SOYABEAN" -> switch (langPrefix) {
                case "hi", "mr" -> "सोयाबीन";
                case "pa" -> "ਸੋਇਆਬੀਨ";
                case "gu" -> "સોયાબીન";
                case "bn" -> "সয়াবিন";
                case "te" -> "సోయాబీన్";
                case "ta" -> "சோயாபீன்";
                case "kn" -> "ಸೋಯಾಬೀನ್";
                case "ml" -> "സോയാബീൻ";
                default -> "Soyabean";
            };
            case "GRAM" -> switch (langPrefix) {
                case "hi" -> "चना";
                case "pa" -> "ਛੋਲੇ";
                case "mr" -> "हरभरा";
                case "gu" -> "ચણા";
                case "bn" -> "ছোলা";
                case "te" -> "శనగలు";
                case "ta" -> "கொண்டைக்கடலை";
                case "kn" -> "ಕಡಲೆ";
                case "ml" -> "കടല";
                default -> "Bengal Gram";
            };
            default -> code;
        };
    }

    public String getLocalizedMandiName(String code, String langPrefix) {
        if (code == null) return "APMC Mandi";
        String upper = code.toUpperCase();
        return switch (upper) {
            case "KHANNA_PB" -> switch (langPrefix) {
                case "hi" -> "खन्ना मंडी";
                case "pa" -> "ਖੰਨਾ ਮੰਡੀ";
                case "mr" -> "खन्ना बाजार समिती";
                case "gu" -> "ખન્ના માર્કેટ યાર્ડ";
                case "bn" -> "খান্না মান্ডি";
                case "te" -> "ఖన్నా మార్కెట్";
                case "ta" -> "கன்னா மண்டி";
                case "kn" -> "ಖನ್ನಾ ಮಾರುಕಟ್ಟೆ";
                case "ml" -> "ഖന്ന മാർക്കറ്റ്";
                default -> "Khanna Mandi";
            };
            case "SIRSA_HR" -> switch (langPrefix) {
                case "hi" -> "सिरसा मंडी";
                case "pa" -> "ਸਿਰਸਾ ਮੰਡੀ";
                case "mr" -> "सिरसा बाजार समिती";
                case "gu" -> "સિરસા માર્કેટ યાર્ડ";
                case "bn" -> "সিরসা মান্ডি";
                case "te" -> "సిర్సా మార్కెట్";
                case "ta" -> "சிர்சா மண்டி";
                case "kn" -> "ಸಿರ್ಸಾ ಮಾರುಕಟ್ಟೆ";
                case "ml" -> "സിർസ മാർക്കറ്റ്";
                default -> "Sirsa Mandi";
            };
            case "KARNAL_HR" -> switch (langPrefix) {
                case "hi" -> "करनाल मंडी";
                case "pa" -> "ਕਰਨਾਲ ਮੰਡੀ";
                case "mr" -> "करनाल बाजार समिती";
                case "gu" -> "કરનાલ માર્કેટ યાર્ડ";
                case "bn" -> "করনাল মান্ডি";
                case "te" -> "కర్నాల్ మార్కెట్";
                case "ta" -> "கர்னால் மண்டி";
                case "kn" -> "ಕರ್ನಾಲ್ ಮಾರುಕಟ್ಟೆ";
                case "ml" -> "കർണാൽ മാർക്കറ്റ്";
                default -> "Karnal Mandi";
            };
            case "KOTA_RJ" -> switch (langPrefix) {
                case "hi" -> "कोटा मंडी";
                case "pa" -> "ਕੋਟਾ ਮੰਡੀ";
                case "mr" -> "कोटा बाजार समिती";
                case "gu" -> "કોટા માર્કેટ યાર્ડ";
                case "bn" -> "কোটা মান্ডি";
                case "te" -> "కోటా మార్కెట్";
                case "ta" -> "கோட்டா மண்டி";
                case "kn" -> "ಕೋಟಾ ಮಾರುಕಟ್ಟೆ";
                case "ml" -> "കോട്ട മാർക്കറ്റ്";
                default -> "Kota Mandi";
            };
            case "NEEMUCH_MP" -> switch (langPrefix) {
                case "hi" -> "नीमच मंडी";
                case "pa" -> "ਨੀਮਚ ਮੰਡੀ";
                case "mr" -> "नीमच बाजार समिती";
                case "gu" -> "નીમચ માર્કેટ યાર્ડ";
                case "bn" -> "নিমচ মান্ডি";
                case "te" -> "నీమచ్ మార్కెట్";
                case "ta" -> "நீமச் மண்டி";
                case "kn" -> "ನೀಮಚ್ ಮಾರುಕಟ್ಟೆ";
                case "ml" -> "നീമച്ച് മാർക്കറ്റ്";
                default -> "Neemuch Mandi";
            };
            case "LASALGAON_MH" -> switch (langPrefix) {
                case "hi" -> "लासलगांव मंडी";
                case "pa" -> "ਲਾਸਲਗਾਂਵ ਮੰਡੀ";
                case "mr" -> "लासलगाव बाजार समिती";
                case "gu" -> "લાસલગાંવ માર્કેટ યાર્ડ";
                case "bn" -> "লাসালগাঁও মান্ডি";
                case "te" -> "లాసల్‌గావ్ మార్కెట్";
                case "ta" -> "லாசல்காவ் மண்டி";
                case "kn" -> "ಲಾಸಲ್‌ಗಾಂವ್ ಮಾರುಕಟ್ಟೆ";
                case "ml" -> "ലാസൽഗാവ് മാർക്കറ്റ്";
                default -> "Lasalgaon Mandi";
            };
            case "AZADPUR_DL" -> switch (langPrefix) {
                case "hi" -> "आजादपुर मंडी";
                case "pa" -> "ਆਜ਼ਾਦਪੁਰ ਮੰਡੀ";
                case "mr" -> "आझादपूर बाजार समिती";
                case "gu" -> "આઝાદપુર માર્કેટ યાર્ડ";
                case "bn" -> "আজাদপুর মান্ডি";
                case "te" -> "ఆజాద్‌పూర్ మార్కెట్";
                case "ta" -> "ஆசாத்பூர் மண்டி";
                case "kn" -> "ಆಜಾದ್‌ಪುರ ಮಾರುಕಟ್ಟೆ";
                case "ml" -> "ആസാദ്പൂർ മാർക്കറ്റ്";
                default -> "Azadpur Mandi";
            };
            case "HAPUR_UP" -> switch (langPrefix) {
                case "hi" -> "हापुड़ मंडी";
                case "pa" -> "ਹਾਪੁੜ ਮੰਡੀ";
                case "mr" -> "हापूड बाजार समिती";
                case "gu" -> "હાપુડ માર્કેટ યાર્ડ";
                case "bn" -> "হাপুড় মান্ডি";
                case "te" -> "హాపూర్ మార్కెట్";
                case "ta" -> "ஹாபூர் மண்டி";
                case "kn" -> "ಹಾಪುರ್ ಮಾರುಕಟ್ಟೆ";
                case "ml" -> "ഹാപൂർ മാർക്കറ്റ്";
                default -> "Hapur Mandi";
            };
            default -> getMandiName(code, langPrefix);
        };
    }

    private String buildPriceResponse(String langPrefix, String commCode, String mandiCode, BigDecimal modalPrice, BigDecimal minPrice, BigDecimal maxPrice, String date) {
        String commName = getLocalizedCommodityName(commCode, langPrefix);
        String mandiName = getLocalizedMandiName(mandiCode, langPrefix);
        return switch (langPrefix) {
            case "hi" -> String.format("%s में %s का प्रमाणित मॉडल भाव ₹%s प्रति क्विंटल है (न्यूनतम: ₹%s, अधिकतम: ₹%s, दिनांक: %s)।",
                    mandiName, commName, modalPrice, minPrice, maxPrice, date);
            case "pa" -> String.format("%s ਵਿੱਚ %s ਦਾ ਪ੍ਰਮਾਣਿਤ ਮਾਡਲ ਭਾਅ ₹%s ਪ੍ਰਤੀ ਕੁਇੰਟਲ ਹੈ (ਘੱਟੋ-ਘੱਟ: ₹%s, ਵੱਧ ਤੋਂ ਵੱਧ: ₹%s, ਮਿਤੀ: %s)।",
                    mandiName, commName, modalPrice, minPrice, maxPrice, date);
            case "mr" -> String.format("%s मध्ये %s चा प्रमाणित मॉडेल भाव ₹%s प्रति क्विंटल आहे (किमान: ₹%s, कमाल: ₹%s, दिनांक: %s).",
                    mandiName, commName, modalPrice, minPrice, maxPrice, date);
            case "gu" -> String.format("%sમાં %sનો પ્રમાણિત મોડલ ભાવ ₹%s પ્રતિ ક્વિન્ટલ છે (ન્યૂનતમ: ₹%s, મહત્તમ: ₹%s, તારીખ: %s).",
                    mandiName, commName, modalPrice, minPrice, maxPrice, date);
            case "bn" -> String.format("%s মান্ডিতে %s-এর সরকারি নিলাম দর ₹%s প্রতি কুইন্টাল (সর্বনিম্ন: ₹%s, সর্বোচ্চ: ₹%s, তারিখ: %s)।",
                    mandiName, commName, modalPrice, minPrice, maxPrice, date);
            case "te" -> String.format("%s మార్కెట్‌లో %s మోడల్ ధర క్వింటాలుకు ₹%s (కనిష్ట ధర: ₹%s, గరిష్ట ధర: ₹%s, తేదీ: %s).",
                    mandiName, commName, modalPrice, minPrice, maxPrice, date);
            case "ta" -> String.format("%s சந்தையில் %s-ன் மாதிரி விலை குவிண்டாலுக்கு ₹%s (குறைந்தபட்சம்: ₹%s, அதிகபட்சம்: ₹%s, தேதி: %s).",
                    mandiName, commName, modalPrice, minPrice, maxPrice, date);
            case "kn" -> String.format("%s ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ %s ಮಾದರಿ ದರ ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ ₹%s (ಕನಿಷ್ಠ: ₹%s, ಗರಿಷ್ಠ: ₹%s, ದಿನಾಂಕ: %s).",
                    mandiName, commName, modalPrice, minPrice, maxPrice, date);
            case "ml" -> String.format("%s മാർക്കറ്റിൽ %s-ന്റെ മോഡൽ നിരക്ക് ക്വിന്റലിന് ₹%s ആണ് (കുറഞ്ഞത്: ₹%s, കൂടിയത്: ₹%s, തീയതി: %s).",
                    mandiName, commName, modalPrice, minPrice, maxPrice, date);
            default -> String.format("Verified Agmarknet modal rate for %s in %s mandi is ₹%s per quintal (Min: ₹%s, Max: ₹%s, Reported %s).",
                    commName, mandiName, modalPrice, minPrice, maxPrice, date);
        };
    }

    private String buildComparisonResponse(String langPrefix, String commCode, int count, PriceRecordDto best, PriceRecordDto lowest, BigDecimal spread, String date) {
        String commName = getLocalizedCommodityName(commCode, langPrefix);
        String bestMandi = getLocalizedMandiName(best.mandiCode(), langPrefix);
        String lowestMandi = getLocalizedMandiName(lowest.mandiCode(), langPrefix);
        return switch (langPrefix) {
            case "hi" -> String.format("%s की %d मंडियों में तुलना (दिनांक: %s): सर्वोत्तम मॉडल भाव ₹%s (%s) है, जबकि न्यूनतम ₹%s (%s) है (भाव अंतर: ₹%s प्रति क्विंटल)।",
                    commName, count, date, best.modalPrice(), bestMandi, lowest.modalPrice(), lowestMandi, spread);
            case "pa" -> String.format("%s ਦੀਆਂ %d ਮੰਡੀਆਂ ਦੀ ਤੁਲਨਾ (ਮਿਤੀ: %s): ਸਭ ਤੋਂ ਵੱਧ ਭਾਅ ₹%s (%s) ਅਤੇ ਘੱਟੋ-ਘੱਟ ₹%s (%s) ਹੈ (ਅੰਤਰ: ₹%s ਪ੍ਰਤੀ ਕੁਇੰਟਲ)।",
                    commName, count, date, best.modalPrice(), bestMandi, lowest.modalPrice(), lowestMandi, spread);
            case "mr" -> String.format("%s च्या %d बाजार समित्यांची तुलना (दिनांक: %s): सर्वोच्च मॉडेल भाव ₹%s (%s) आणि किमान ₹%s (%s) आहे (तफावत: ₹%s प्रति क्विंटल).",
                    commName, count, date, best.modalPrice(), bestMandi, lowest.modalPrice(), lowestMandi, spread);
            case "gu" -> String.format("%sના %d માર્કેટ યાર્ડની સરખામણી (તારીખ: %s): સર્વોચ્ચ મોડલ ભાવ ₹%s (%s) અને ન્યૂનતમ ₹%s (%s) છે (તફાવત: ₹%s પ્રતિ ક્વિન્ટલ).",
                    commName, count, date, best.modalPrice(), bestMandi, lowest.modalPrice(), lowestMandi, spread);
            case "bn" -> String.format("%s-এর %dটি মান্ডির তুলনা (তারিখ: %s): সর্বোচ্চ নিলাম দর ₹%s (%s) এবং সর্বনিম্ন ₹%s (%s) (দরের তফাত: ₹%s প্রতি কুইন্টাল)।",
                    commName, count, date, best.modalPrice(), bestMandi, lowest.modalPrice(), lowestMandi, spread);
            case "te" -> String.format("%s యొక్క %d మార్కెట్ల పోలిక (తేదీ: %s): అత్యధిక మోడల్ ధర ₹%s (%s) మరియు కనిష్ట ధర ₹%s (%s) (వ్యత్యాసం: క్వింటాలుకు ₹%s).",
                    commName, count, date, best.modalPrice(), bestMandi, lowest.modalPrice(), lowestMandi, spread);
            case "ta" -> String.format("%s-ன் %d சந்தை ஒப்பீடு (தேதி: %s): அதிகபட்ச மாதிரி விலை ₹%s (%s) மற்றும் குறைந்தபட்சம் ₹%s (%s) (விலை வித்தியாசம்: ₹%s).",
                    commName, count, date, best.modalPrice(), bestMandi, lowest.modalPrice(), lowestMandi, spread);
            case "kn" -> String.format("%s ಬೆಳೆಯ %d ಮಾರುಕಟ್ಟೆಗಳ ಹೋಲಿಕೆ (ದಿನಾಂಕ: %s): ಗರಿಷ್ಠ ಮಾದರಿ ದರ ₹%s (%s) ಮತ್ತು ಕನಿಷ್ಠ ₹%s (%s) (ವ್ಯತ್ಯಾಸ: ₹%s ಪ್ರತಿ ಕ್ವಿಂಟಾಲ್‌ಗೆ).",
                    commName, count, date, best.modalPrice(), bestMandi, lowest.modalPrice(), lowestMandi, spread);
            case "ml" -> String.format("%s വിളയുടെ %d വിപണികളുടെ താരതമ്യം (തീയതി: %s): ഏറ്റവും ഉയർന്ന നിരക്ക് ₹%s (%s) ഏറ്റവും കുറഞ്ഞ നിരക്ക് ₹%s (%s) ആണ് (വ്യത്യാസം: ₹%s).",
                    commName, count, date, best.modalPrice(), bestMandi, lowest.modalPrice(), lowestMandi, spread);
            default -> String.format("Comparing %s across %d mandis (Date: %s): Highest modal rate is ₹%s in %s; lowest is ₹%s in %s (Spread: ₹%s/qtl).",
                    commName, count, date, best.modalPrice(), bestMandi, lowest.modalPrice(), lowestMandi, spread);
        };
    }

    private String buildClarificationResponse(String langPrefix, String commCode, List<String> marketCodes) {
        String commName = getLocalizedCommodityName(commCode, langPrefix);
        String sampleMarkets = marketCodes.stream().map(c -> getLocalizedMandiName(c, langPrefix)).collect(Collectors.joining(", "));
        return switch (langPrefix) {
            case "hi" -> String.format("%s के भाव कई प्रमुख मंडियों में उपलब्ध हैं (जैसे %s)। आप किस विशिष्ट मंडी या राज्य का भाव जानना चाहते हैं?", commName, sampleMarkets);
            case "pa" -> String.format("%s ਦੇ ਭਾਅ ਕਈ ਮੰਡੀਆਂ ਵਿੱਚ ਦਰਜ ਹਨ (ਜਿਵੇਂ %s)। ਤੁਸੀਂ ਕਿਸ ਮੰਡੀ ਜਾਂ ਰਾਜ ਦਾ ਭਾਅ ਪੁੱਛਣਾ ਚਾਹੁੰਦੇ ਹੋ?", commName, sampleMarkets);
            case "mr" -> String.format("%s चे भाव अनेक प्रमुख बाजारांत उपलब्ध आहेत (उदा. %s). आपण कोणत्या बाजार समिती किंवा राज्याचा भाव विचारू इच्छिता?", commName, sampleMarkets);
            case "gu" -> String.format("%sના ભાવ અનેક માર્કેટ યાર્ડમાં ઉપલબ્ધ છે (જેમ કે %s). તમે કયા માર્કેટ યાર્ડ અથવા રાજ્યનો ભાવ જાણવા માંગો છો?", commName, sampleMarkets);
            case "bn" -> String.format("%s-এর দর একাধিক মান্ডিতে উপলব্ধ (যেমন %s)। আপনি কোন মান্ডি বা রাজ্যের দর জানতে চান?", commName, sampleMarkets);
            case "te" -> String.format("%s ధరలు పలు మార్కెట్లలో అందుబాటులో ఉన్నాయి (ఉదా: %s). మీరు ఏ మార్కెట్ లేదా రాష్ట్రం ధర తెలుసుకోవాలనుకుంటున్నారు?", commName, sampleMarkets);
            case "ta" -> String.format("%s-ன் விலைகள் பல சந்தைகளில் கிடைக்கின்றன (எ.கா: %s). எந்த சந்தை அல்லது மாநிலத்தின் விலையை அறிய விரும்புகிறீர்கள்?", commName, sampleMarkets);
            case "kn" -> String.format("%s ಬೆಲೆಯು ಹಲವು ಮಾರುಕಟ್ಟೆಗಳಲ್ಲಿ ಲಭ್ಯವಿದೆ (ಉದಾ: %s). ನೀವು ಯಾವ ಮಾರುಕಟ್ಟೆ ಅಥವಾ ರಾಜ್ಯದ ದರ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?", commName, sampleMarkets);
            case "ml" -> String.format("%s വിളയുടെ നിരക്കുകൾ പല വിപണികളിലും ലഭ്യമാണ് (ഉദാ: %s). ഏത് വിപണി അല്ലെങ്കിൽ സംസ്ഥാനത്തിലെ വിലയാണ് അറിയേണ്ടത്?", commName, sampleMarkets);
            default -> String.format("%s prices are currently tracked across several markets (e.g. %s). Which specific mandi or state would you like to inspect?", commName, sampleMarkets);
        };
    }

    private String buildNotFoundResponse(String langPrefix, String commName, String locDesc) {
        return switch (langPrefix) {
            case "hi" -> String.format("%s में %s के लिए आज कोई आधिकारिक भाव दर्ज नहीं है। कृपया नीलामी समाप्त होने के बाद जांचें।", locDesc, commName);
            case "pa" -> String.format("%s ਵਿੱਚ %s ਦਾ ਅੱਜ ਕੋਈ ਸਰਕਾਰੀ ਭਾਅ ਦਰਜ ਨਹੀਂ ਹੈ।", locDesc, commName);
            case "mr" -> String.format("%s मध्ये %s साठी आज कोणताही अधिकृत भाव नोंदवलेला नाही.", locDesc, commName);
            case "gu" -> String.format("%sમાં %s માટે આજે કોઈ સત્તાવાર ભાવ નોંધાયેલ નથી.", locDesc, commName);
            case "bn" -> String.format("%s মান্ডিতে %s-এর জন্য আজ কোনো সরকারি দর নথিভুক্ত নেই।", locDesc, commName);
            case "te" -> String.format("%s మార్కెట్‌లో %s కోసం ఈరోజు అధికారిక ధర నమోదు కాలేదు.", locDesc, commName);
            case "ta" -> String.format("%s சந்தையில் %s-க்கு இன்று அதிகாரப்பூர்வ விலை எதுவும் பதிவாகவில்லை.", locDesc, commName);
            case "kn" -> String.format("%s ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ %s ಬೆಳೆಗೆ ಇಂದು ಯಾವುದೇ ಅಧಿಕೃತ ದರ ದಾಖಲಾಗಿಲ್ಲ.", locDesc, commName);
            case "ml" -> String.format("%s മാർക്കറ്റിൽ %s-ന് ഇന്ന് ഔദ്യോഗിക നിരക്കുകൾ ലഭ്യമല്ല.", locDesc, commName);
            default -> String.format("No current verified price record found for %s in %s. Check back after daily APMC auction closure.", commName, locDesc);
        };
    }

    private String buildNoMandisFoundResponse(String langPrefix, String district) {
        return switch (langPrefix) {
            case "hi" -> String.format("%s जिले में कोई पंजीकृत एपीएमसी मंडी नहीं मिली।", district);
            case "pa" -> String.format("%s ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਕੋਈ ਰਜਿਸਟਰਡ ਏਪੀਐਮਸੀ ਮੰਡੀ ਨਹੀਂ ਮਿਲੀ।", district);
            case "mr" -> String.format("%s जिल्ह्यात कोणतीही नोंदणीकृत कृषी बाजार समिती आढळली नाही.", district);
            case "gu" -> String.format("%s જિલ્લામાં કોઈ નોંધાયેલ એપીએમસી માર્કેટ યાર્ડ મળ્યું નથી.", district);
            case "bn" -> String.format("%s জেলায় কোনো নিবন্ধিত নিয়ন্ত্রিত বাজার পাওয়া যায়নি।", district);
            case "te" -> String.format("%s జిల్లాలో నమోదైన వ్యవసాయ మార్కెట్లు ఏవీ లేవు.", district);
            case "ta" -> String.format("%s மாவட்டத்தில் பதிவு செய்யப்பட்ட ஒழுங்குமுறை சந்தைகள் எதுவும் இல்லை.", district);
            case "kn" -> String.format("%s ಜಿಲ್ಲೆಯಲ್ಲಿ ನೋಂದಾಯಿತ ಎಪಿಎಂಸಿ ಮಾರುಕಟ್ಟೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ.", district);
            case "ml" -> String.format("%s ജില്ലയിൽ രജിസ്റ്റർ ചെയ്ത വിപണികളൊന്നും കണ്ടെത്തിയില്ല.", district);
            default -> String.format("No registered APMC mandis found in %s district.", district);
        };
    }

    private String buildCommodityPrompt(String langPrefix) {
        return switch (langPrefix) {
            case "hi" -> "कृपया किसी फसल का नाम बताएं (जैसे गेहूं, सरसों, धान या प्याज) जिसका आप मंडी भाव जानना चाहते हैं।";
            case "pa" -> "ਕਿਰਪਾ ਕਰਕੇ ਕਿਸੇ ਫ਼ਸਲ ਦਾ ਨਾਮ ਦੱਸੋ (ਜਿਵੇਂ ਕਣਕ, ਸਰ੍ਹੋਂ, ਝੋਨਾ ਜਾਂ ਪਿਆਜ਼)।";
            case "mr" -> "कृपया पिकाचे नाव सांगा (उदा. गहू, कांदा, कापूस किंवा सोयाबीन) ज्याचा बाजार भाव तुम्हाला हवा आहे.";
            case "gu" -> "કૃપા કરીને પાકનું નામ જણાવો (જેમ કે કપાસ, મગફળી, જીરું કે ઘઉં) જેનો ભાવ તમે જાણવા માંગો છો.";
            case "bn" -> "দয়া করে কোনো ফসলের নাম বলুন (যেমন ধান, গম, আলু বা পেঁয়াজ) যার দর আপনি জানতে চান।";
            case "te" -> "దయచేసి మీరు ధర తెలుసుకోవాలనుకుంటున్న పంట పేరు చెప్పండి (ఉదా: పత్తి, వరి, మిర్చి లేదా ఉల్లిపాయ).";
            case "ta" -> "விலை அறிய விரும்பும் பயிரின் பெயரைக் குறிப்பிடவும் (எ.கா: நெல், பருத்தி, மஞ்சள் அல்லது வெங்காயம்).";
            case "kn" -> "ದಯವಿಟ್ಟು ನೀವು ದರ ತಿಳಿಯಲು ಬಯಸುವ ಬೆಳೆಯ ಹೆಸರನ್ನು ಹೇಳಿ (ಉದಾ: ಹತ್ತಿ, ಭತ್ತ, ಈರುಳ್ಳಿ ಅಥವಾ ಗೋಧಿ).";
            case "ml" -> "വിപണി വില അറിയേണ്ട വിളയുടെ പേര് പറയൂ (ഉദാ: ഏലക്കായ്, കുരുമുളക്, നെല്ല് അല്ലെങ്കിൽ ഉള്ളി).";
            default -> "Please mention an agricultural crop like Wheat, Paddy, Cotton, or Onion to check mandi rates.";
        };
    }

    public String getLocalizedRegionName(String region, String langPrefix) {
        if (region == null || region.isBlank()) {
            return switch (langPrefix) {
                case "hi" -> "इस क्षेत्र";
                case "pa" -> "ਇਸ ਖੇਤਰ";
                case "mr" -> "या भागात";
                case "gu" -> "આ વિસ્તાર";
                case "bn" -> "এই অঞ্চলে";
                case "te" -> "ఈ ప్రాంతంలో";
                case "ta" -> "இந்த பகுதியில்";
                case "kn" -> "ಈ ಪ್ರದೇಶದಲ್ಲಿ";
                case "ml" -> "ഈ പ്രദേശത്ത്";
                default -> "this region";
            };
        }
        if ("Punjab".equalsIgnoreCase(region)) {
            return switch (langPrefix) {
                case "hi" -> "पंजाब";
                case "pa" -> "ਪੰਜਾਬ";
                case "mr" -> "पंजाब";
                case "gu" -> "પંજાબ";
                case "bn" -> "পাঞ্জাব";
                case "te" -> "పంజాబ్";
                case "ta" -> "பஞ்சாப்";
                case "kn" -> "ಪಂಜಾಬ್";
                case "ml" -> "പഞ്ചാബ്";
                default -> "Punjab";
            };
        }
        if ("Haryana".equalsIgnoreCase(region)) {
            return switch (langPrefix) {
                case "hi" -> "हरियाणा";
                case "pa" -> "ਹਰਿਆਣਾ";
                case "mr" -> "हरियाणा";
                case "gu" -> "હરિયાણા";
                case "bn" -> "হরিয়ানা";
                case "te" -> "హర్యానా";
                case "ta" -> "ஹரியானா";
                case "kn" -> "ಹರಿಯಾಣ";
                case "ml" -> "ഹരിയാന";
                default -> "Haryana";
            };
        }
        if ("Rajasthan".equalsIgnoreCase(region)) {
            return switch (langPrefix) {
                case "hi" -> "राजस्थान";
                case "pa" -> "ਰਾਜਸਥਾਨ";
                case "mr" -> "राजस्थान";
                case "gu" -> "રાજસ્થાન";
                case "bn" -> "রাজস্থান";
                case "te" -> "రాజస్థాన్";
                case "ta" -> "ராஜஸ்தான்";
                case "kn" -> "ರಾಜಸ್ಥಾನ";
                case "ml" -> "രാജസ്ഥാൻ";
                default -> "Rajasthan";
            };
        }
        if ("Maharashtra".equalsIgnoreCase(region)) {
            return switch (langPrefix) {
                case "hi" -> "महाराष्ट्र";
                case "pa" -> "ਮਹਾਰਾਸ਼ਟਰ";
                case "mr" -> "महाराष्ट्र";
                case "gu" -> "મહારાષ્ટ્ર";
                case "bn" -> "মহারাষ্ট্র";
                case "te" -> "మహారాష్ట్ర";
                case "ta" -> "மகாராஷ்டிரா";
                case "kn" -> "ಮಹಾರಾಷ್ಟ್ರ";
                case "ml" -> "മഹാരാഷ്ട്ര";
                default -> "Maharashtra";
            };
        }
        if ("Uttar Pradesh".equalsIgnoreCase(region)) {
            return switch (langPrefix) {
                case "hi" -> "उत्तर प्रदेश";
                case "pa" -> "ਉੱਤਰ ਪ੍ਰਦੇਸ਼";
                case "mr" -> "उत्तर प्रदेश";
                case "gu" -> "ઉત્તર પ્રદેશ";
                case "bn" -> "উত্তর প্রদেশ";
                case "te" -> "ఉత్తర ప్రదేశ్";
                case "ta" -> "உத்தரப் பிரதேசம்";
                case "kn" -> "ಉತ್ತರ ಪ್ರದೇಶ";
                case "ml" -> "ഉത്തർപ്രദേശ്";
                default -> "Uttar Pradesh";
            };
        }
        if ("Madhya Pradesh".equalsIgnoreCase(region)) {
            return switch (langPrefix) {
                case "hi" -> "मध्य प्रदेश";
                case "pa" -> "ਮੱਧ ਪ੍ਰਦੇਸ਼";
                case "mr" -> "मध्य प्रदेश";
                case "gu" -> "મધ્ય પ્રદેશ";
                case "bn" -> "মধ্য প্রদেশ";
                case "te" -> "మధ్య ప్రదేశ్";
                case "ta" -> "மத்தியப் பிரதேசம்";
                case "kn" -> "ಮಧ್ಯ ಪ್ರದೇಶ";
                case "ml" -> "മധ്യപ്രദേശ്";
                default -> "Madhya Pradesh";
            };
        }
        if ("Delhi".equalsIgnoreCase(region)) {
            return switch (langPrefix) {
                case "hi" -> "दिल्ली";
                case "pa" -> "ਦਿੱਲੀ";
                case "mr" -> "दिल्ली";
                case "gu" -> "દિલ્હી";
                case "bn" -> "দিল্লি";
                case "te" -> "ఢిల్లీ";
                case "ta" -> "தில்லி";
                case "kn" -> "ದೆಹಲಿ";
                case "ml" -> "ഡൽഹി";
                default -> "Delhi";
            };
        }
        if ("Gujarat".equalsIgnoreCase(region)) {
            return switch (langPrefix) {
                case "hi" -> "गुजरात";
                case "pa" -> "ਗੁਜਰਾਤ";
                case "mr" -> "गुजरात";
                case "gu" -> "ગુજરાત";
                case "bn" -> "গুজরাট";
                case "te" -> "గుజరాత్";
                case "ta" -> "குஜராத்";
                case "kn" -> "ಗುಜರಾತ್";
                case "ml" -> "ഗുജറാത്ത്";
                default -> "Gujarat";
            };
        }
        if ("West Bengal".equalsIgnoreCase(region)) {
            return switch (langPrefix) {
                case "hi" -> "पश्चिम बंगाल";
                case "pa" -> "ਪੱਛਮੀ ਬੰਗਾਲ";
                case "mr" -> "पश्चिम बंगाल";
                case "gu" -> "પશ્ચિમ બંગાળ";
                case "bn" -> "পশ্চিমবঙ্গ";
                case "te" -> "పశ్చిమ బెంగాల్";
                case "ta" -> "மேற்கு வங்காளம்";
                case "kn" -> "ಪಶ್ಚಿಮ ಬಂಗಾಳ";
                case "ml" -> "പശ്ചിമ ബംഗാൾ";
                default -> "West Bengal";
            };
        }
        if ("Bihar".equalsIgnoreCase(region)) {
            return switch (langPrefix) {
                case "hi" -> "बिहार";
                case "pa" -> "ਬਿਹਾਰ";
                case "mr" -> "बिहार";
                case "gu" -> "બિહાર";
                case "bn" -> "বিহার";
                case "te" -> "బీహార్";
                case "ta" -> "பீகார்";
                case "kn" -> "ಬಿಹಾರ";
                case "ml" -> "ബിഹാർ";
                default -> "Bihar";
            };
        }
        return region;
    }

    private String getLocalizedSingleMandiInfo(PriceRecordDto rec, String langPrefix) {
        if (rec == null) return "";
        String mandi = getLocalizedMandiName(rec.mandiCode(), langPrefix);
        return switch (langPrefix) {
            case "hi" -> String.format(" (केवल %s का भाव ₹%s दर्ज है)", mandi, rec.modalPrice());
            case "pa" -> String.format(" (ਸਿਰਫ਼ %s ਦਾ ਭਾਅ ₹%s ਦਰਜ ਹੈ)", mandi, rec.modalPrice());
            case "mr" -> String.format(" (केवळ %s चा भाव ₹%s नोंदवला आहे)", mandi, rec.modalPrice());
            case "gu" -> String.format(" (માત્ર %sનો ભાવ ₹%s નોંધાયેલ છે)", mandi, rec.modalPrice());
            case "bn" -> String.format(" (কেবল %s-এর দর ₹%s নথিভুক্ত আছে)", mandi, rec.modalPrice());
            case "te" -> String.format(" (కేవలం %s ధర ₹%s మాత్రమే ఉంది)", mandi, rec.modalPrice());
            case "ta" -> String.format(" (மட்டும் %s விலை ₹%s பதிவாகியுள்ளது)", mandi, rec.modalPrice());
            case "kn" -> String.format(" (ಕೇವಲ %s ದರ ₹%s ದಾಖಲಾಗಿದೆ)", mandi, rec.modalPrice());
            case "ml" -> String.format(" (മാത്രം %s നിരക്ക് ₹%s രേഖപ്പെടുത്തിയിട്ടുണ്ട്)", mandi, rec.modalPrice());
            default -> String.format(" (only %s reported rate of ₹%s)", mandi, rec.modalPrice());
        };
    }

    private String buildInsufficientComparisonResponse(String langPrefix, String commCode, String region, PriceRecordDto singleRec) {
        String commName = getLocalizedCommodityName(commCode, langPrefix);
        String regionName = getLocalizedRegionName(region, langPrefix);
        String singleInfo = getLocalizedSingleMandiInfo(singleRec, langPrefix);
        return switch (langPrefix) {
            case "hi" -> String.format("%s में %s के लिए तुलनात्मक डेटा अपर्याप्त है%s। विश्वसनीय तुलना और मंडी सिफारिश के लिए एक ही तारीख पर कम से कम दो मंडियों के भाव दर्ज होने आवश्यक हैं।", regionName, commName, singleInfo);
            case "pa" -> String.format("%s ਵਿੱਚ %s ਲਈ ਤੁਲਨਾਤਮਕ ਡਾਟਾ ਨਾਕਾਫ਼ੀ ਹੈ%s। ਮੰਡੀ ਦੀ ਸਿਫ਼ਾਰਸ਼ ਲਈ ਘੱਟੋ-ਘੱਟ ਦੋ ਮੰਡੀਆਂ ਦੇ ਭਾਅ ਚਾਹੀਦੇ ਹਨ।", regionName, commName, singleInfo);
            case "mr" -> String.format("%s मध्ये %s साठी तुलनात्मक डेटा अपुरा आहे%s. विश्वासार्ह तुलना करण्यासाठी किमान दोन बाजार समित्यांचे भाव आवश्यक आहेत.", regionName, commName, singleInfo);
            case "gu" -> String.format("%sમાં %s માટે તુલનાત્મક માહિતી અપૂરતી છે%s. સરખામણી માટે ઓછામાં ઓછા બે માર્કેટ યાર્ડના ભાવ જરૂરી છે.", regionName, commName, singleInfo);
            case "bn" -> String.format("%s-এ %s-এর জন্য তুলনামূলক তথ্য অপর্যাপ্ত%s। নির্ভরযোগ্য তুলনার জন্য কমপক্ষে দুটি মান্ডির দর আবশ্যক।", regionName, commName, singleInfo);
            case "te" -> String.format("%sలో %s కోసం పోలిక సమాచారం సరిపోదు%s. నమ్మకమైన పోలిక కోసం కనీసం రెండు మార్కెట్ల ధరలు నమోదు కావాలి.", regionName, commName, singleInfo);
            case "ta" -> String.format("%s-ல் %s-க்கான ஒப்பீட்டுத் தரவு போதுமானதாக இல்லை%s. நம்பகமான ஒப்பீட்டுக்கு குறைந்தபட்சம் இரண்டு சந்தை விலைகள் தேவை.", regionName, commName, singleInfo);
            case "kn" -> String.format("%sದಲ್ಲಿ %s ಬೆಳೆಗೆ ಹೋಲಿಕೆ ಮಾಹಿತಿ ಸಾಕಷ್ಟಿಲ್ಲ%s. ವಿಶ್ವಾಸಾರ್ಹ ಹೋಲಿಕೆಗೆ ಕನಿಷ್ಠ ಎರಡು ಮಾರುಕಟ್ಟೆಗಳ ದರಗಳು ಅಗತ್ಯವಿದೆ.", regionName, commName, singleInfo);
            case "ml" -> String.format("%s-ൽ %s-ന്റെ താരതമ്യ വിവരങ്ങൾ അപര്യാപ്തമാണ്%s. വിശ്വസനീയമായ താരതമ്യത്തിന് കുറഞ്ഞത് രണ്ട് വിപണി നിരക്കുകൾ ആവശ്യമാണ്.", regionName, commName, singleInfo);
            default -> String.format("Insufficient comparative records for %s in %s%s. Market recommendation requires verified price filings from at least two mandis on the same reporting date.", commName, regionName, singleInfo);
        };
    }

    private String buildCommoditySearchResponse(String langPrefix, int count) {
        return switch (langPrefix) {
            case "hi" -> String.format("मंडी साथी पर %d फसलों के दैनिक भाव ट्रैक किए जाते हैं।", count);
            case "pa" -> String.format("ਮੰਡੀ ਸਾਥੀ ਤੇ %d ਫ਼ਸਲਾਂ ਦੇ ਪ੍ਰਮਾਣਿਤ ਭਾਅ ਉਪਲਬਧ ਹਨ।", count);
            case "mr" -> String.format("मंडी साथीवर %d प्रमुख पिकांचे दैनंदिन बाजार भाव उपलब्ध आहेत.", count);
            case "gu" -> String.format("મંડી સાથી પર %d પાકોના દૈનિક બજાર ભાવો ઉપલબ્ધ છે.", count);
            case "bn" -> String.format("মান্ডিসাথীতে %dটি ফসলের দৈনিক নির্ভরযোগ্য নিলাম দর উপলব্ধ।", count);
            case "te" -> String.format("మండిసాథీలో %d పంటల రోజువారీ మార్కెట్ ధరలు అందుబాటులో ఉన్నాయి.", count);
            case "ta" -> String.format("மண்டிசாத்தியில் %d பயிர்களின் தினசரி சந்தை விலைகள் கிடைக்கின்றன.", count);
            case "kn" -> String.format("ಮಂಡಿಸಾಥಿಯಲ್ಲಿ %d ಬೆಳೆಗಳ ದೈನಂದಿನ ಮಾರುಕಟ್ಟೆ ದರಗಳು ಲಭ್ಯವಿದೆ.", count);
            case "ml" -> String.format("മണ്ടിസാഥിയിൽ %d വിളകളുടെ ദൈനംദിന വിപണി നിരക്കുകൾ ലഭ്യമാണ്.", count);
            default -> String.format("MandiSaathi tracks daily market prices for %d agricultural commodities.", count);
        };
    }

    private String buildGeneralHelpResponse(String langPrefix, boolean isPmKisan) {
        if (isPmKisan) {
            return switch (langPrefix) {
                case "hi" -> "पीएम-किसान योजना में पात्र किसानों को ₹6,000 प्रति वर्ष तीन किस्तों में मिलते हैं। आवश्यक दस्तावेज: आधार कार्ड, जमीन की खतौनी और बैंक पासबुक।";
                case "pa" -> "ਪੀਐਮ-ਕਿਸਾਨ ਸਕੀਮ ਅਧੀਨ ਸਾਲਾਨਾ ₹6,000 ਮਿਲਦੇ ਹਨ। ਜ਼ਰੂਰੀ ਕਾਗਜ਼: ਆਧਾਰ ਕਾਰਡ, ਜਮ੍ਹਾਂਬੰਦੀ ਅਤੇ ਬੈਂਕ ਪਾਸਬੁੱਕ।";
                case "mr" -> "पीएम-किसान योजनेअंतर्गत पात्र शेतकऱ्यांना दरवर्षी ₹6,000 तीन हप्त्यांत मिळतात. आवश्यक कागदपत्रे: आधार कार्ड, ७/१२ उतारा आणि बँक पासबुक.";
                case "gu" -> "પીએમ-કિસાન યોજના હેઠળ ખેડૂતોને વાર્ષિક ₹6,000 ત્રણ હપ્તામાં મળે છે. જરૂરી દસ્તાવેજ: આધાર કાર્ડ, ૭/૧૨ જમીનના કાગળ અને બેંક પાસબુક.";
                case "bn" -> "পিএম-কিসান প্রকল্পে যোগ্য কৃষকরা বছরে ৩টি কিস্তিতে ₹৬,০০০ পান। প্রয়োজনীয় নথিপত্র: আধার কার্ড, জমির খতিয়ান ও ব্যাংক পাসবই।";
                case "te" -> "పీఎం-కిసాన్ పథకం ద్వారా అర్హులైన రైతులకు ఏడాదికి ₹6,000 మూడు విడతల్లో అందుతాయి. కావలసిన పత్రాలు: ఆధార్ కార్డు, పట్టాదారు పాస్‌బుక్, బ్యాంక్ ఖాతా.";
                case "ta" -> "பிஎம்-கிசான் திட்டத்தில் தகுதியான விவசாயிகளுக்கு ஆண்டுக்கு ₹6,000 மூன்று தவணைகளில் வழங்கப்படுகிறது. தேவையான ஆவணங்கள்: ஆதார் அட்டை, நில ஆவணங்கள் மற்றும் வங்கி கணக்கு புத்தகம்.";
                case "kn" -> "ಪಿಎಂ-ಕಿಸಾನ್ ಯೋಜನೆಯಡಿ ಅರ್ಹ ರೈತರಿಗೆ ವಾರ್ಷಿಕ ₹6,000 ಮೂರು ಕಂತುಗಳಲ್ಲಿ ಸಿಗುತ್ತದೆ. ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಆಧಾರ್ ಕಾರ್ಡ್, ಪಹಣಿ (RTC) ಮತ್ತು ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್.";
                case "ml" -> "പിഎം-കിസാൻ പദ്ധതി പ്രകാരം കർഷകർക്ക് പ്രതിവർഷം ₹6,000 മൂന്ന് ഗഡുക്കളായി ലഭിക്കും. ആവശ്യമായ രേഖകൾ: ആധാർ കാർഡ്, ഭൂമി രേഖകൾ, ബാങ്ക് പാസ്ബുക്ക്.";
                default -> "For PM-KISAN, eligible landholding farmers receive ₹6,000 per year in three installments. Required documents: Aadhaar Card, Land records, and Bank Passbook.";
            };
        }
        return switch (langPrefix) {
            case "hi" -> "मैं आपको कृषि उपज के सत्यापित भाव बताने, मंडियों की तुलना करने और पीएम-किसान जैसी सरकारी योजनाओं की जानकारी देने में सहायता कर सकता हूँ। आप पूछ सकते हैं: 'आज पंजाब में गेहूं का भाव क्या चल रहा है?'";
            case "pa" -> "ਮੈਂ ਤੁਹਾਨੂੰ ਮੰਡੀ ਦੇ ਭਾਅ ਅਤੇ ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਬਾਰੇ ਦੱਸ ਸਕਦਾ ਹਾਂ। ਪੁੱਛੋ: 'ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?'";
            case "mr" -> "मी तुम्हाला कृषी मालाचे अधिकृत भाव, बाजार समित्यांची तुलना आणि पीएम-किसान योजनांची माहिती देऊ शकतो. उदा. 'आज लासलगावमध्ये कांद्याचा भाव काय आहे?'";
            case "gu" -> "હું તમને એપીએમસી બજાર ભાવ, બજારોની સરખામણી અને સરકારી યોજનાઓની માહિતી આપી શકું છું. પૂછો: 'આજે રાજકોટમાં કપાસનો ભાવ શું છે?'";
            case "bn" -> "আমি আপনাকে সঠিক মান্ডি নিলাম দর, বাজারের তুলনা এবং পিএম-কিসান প্রকল্পের তথ্য দিতে পারি। জিজ্ঞাসা করুন: 'আজ বর্ধমানে ধানের দর কত?'";
            case "te" -> "నేను మీకు వ్యవసాయ మార్కెట్ ధరలు, మార్కెట్ల పోలిక మరియు పీఎం-కిసాన్ పథకాల వివరాలు అందించగలను. అడగండి: 'ఈరోజు గుంటూరులో మిర్చి ధర ఎంత?'";
            case "ta" -> "நான் உங்களுக்கு வேளாண் சந்தை விலைகள், சந்தை ஒப்பீடு மற்றும் அரசு நலத்திட்டங்கள் குறித்த தகவல்களை வழங்க முடியும். கேட்கவும்: 'இன்று ஈரோட்டில் மஞ்சள் விலை என்ன?'";
            case "kn" -> "ನಾನು ನಿಮಗೆ ಕೃಷಿ ಮಾರುಕಟ್ಟೆ ದರಗಳು, ಮಾರುಕಟ್ಟೆಗಳ ಹೋಲಿಕೆ ಮತ್ತು ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ವಿವರ ನೀಡಬಲ್ಲೆ. ಕೇಳಿ: 'ಇಂದು ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ ಹತ್ತಿ ಬೆಲೆ ಎಷ್ಟಿದೆ?'";
            case "ml" -> "വിപണി വിലകൾ, വിപണി താരതമ്യം, കർഷക പദ്ധതികൾ എന്നിവ അറിയാൻ ഞാൻ സഹായിക്കാം. ചോദിക്കൂ: 'ഇന്ന് കൊച്ചിയിൽ ഏലക്കായുടെ വില എത്രയാണ്?'";
            default -> "I can help you check mandi rates, compare agricultural markets, or explain government schemes like PM-KISAN. Try asking: 'What is the wheat price in Punjab?'";
        };
    }

    private String buildDefaultResponse(String langPrefix) {
        return buildGeneralHelpResponse(langPrefix, false);
    }

    private String resolveFailureMessage(String langPrefix, int statusCode, boolean isTimeout) {
        if (statusCode == 401 || statusCode == 402 || statusCode == 403) {
            return switch (langPrefix) {
                case "hi" -> "तकनीकी कारणों से आवाज़ सेवा अस्थायी रूप से अनुपलब्ध है। कृपया नीचे लिखकर भाव खोजें।";
                case "pa" -> "ਤਕਨੀਕੀ ਕਾਰਨਾਂ ਕਰਕੇ ਆਵਾਜ਼ ਸੇਵਾ ਅਸਥਾਈ ਤੌਰ 'ਤੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਲਿਖ ਕੇ ਭਾਅ ਲੱਭੋ।";
                case "mr" -> "तांत्रिक कारणास्तव आवाज सेवा तात्पुरती अनुपलब्ध आहे. कृपया खाली लिहून भाव शोधा.";
                case "gu" -> "ટેકનિકલ કારણોસર અવાજ સેવા અસ્થાયી રૂપે ઉપલબ્ધ નથી. કૃપા કરીને નીચે લખીને ભાવ શોધો.";
                case "bn" -> "প্রযুক্তিগত কারণে ভয়েস সেবা সাময়িকভাবে অনুপলব্ধ। অনুগ্রহ করে নিচে লিখে দর অনুসন্ধান করুন।";
                case "te" -> "సాంకేతిక కారణాల వల్ల వాయిస్ సేవ తాత్కాలికంగా అందుబాటులో లేదు. దయచేసి క్రింద టైప్ చేసి ధరలను శోధించండి.";
                case "ta" -> "தொழில்நுட்ப காரணங்களால் குரல் சேவை தற்காலிகமாக கிடைக்கவில்லை. தயவுசெய்து கீழே தட்டச்சு செய்து விலையைத் தேடவும்.";
                case "kn" -> "ತಾಂತ್ರಿಕ ಕಾರಣಗಳಿಂದ ಧ್ವನಿ ಸೇವೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ ಬೆಲೆ ಹುಡುಕಿ.";
                case "ml" -> "സാങ്കേതിക കാരണങ്ങളാൽ വോയ്‌സ് സേവനം താൽക്കാലികമായി ലഭ്യമല്ല. ദയവായി താഴെ ടൈപ്പ് ചെയ്ത് വില തിരയുക.";
                default -> "Voice service is temporarily unavailable due to technical reasons. Please type your query below.";
            };
        }
        if (statusCode == 429) {
            return switch (langPrefix) {
                case "hi" -> "सर्वर पर अधिक लोड है। कृपया कुछ क्षण प्रतीक्षा करके पुनः प्रयास करें।";
                case "pa" -> "ਸਰਵਰ 'ਤੇ ਰਸ਼ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਥੋੜ੍ਹੀ ਦੇਰ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।";
                case "mr" -> "सर्व्हरवर ताण आहे. कृपया थोडा वेळ थांबा आणि पुन्हा प्रयत्न करा.";
                case "gu" -> "સર્વર પર વધુ લોડ છે. કૃપા કરીને થોડીવાર પછી ફરી પ્રયાસ કરો.";
                case "bn" -> "সার্ভারে অতিরিক্ত চাপ রয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
                case "te" -> "సర్వర్‌పై రద్దీ ఎక్కువగా ఉంది. దయచేసి కొద్దిసేపు ఆగి మళ్లీ ప్రయత్నించండి.";
                case "ta" -> "சேவையகத்தில் அதிக சுமை உள்ளது. தயவுசெய்து சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.";
                case "kn" -> "ಸರ್ವರ್‌ನಲ್ಲಿ ಹೆಚ್ಚಿನ ದಟ್ಟಣೆ ಇದೆ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.";
                case "ml" -> "സെർവറിൽ തിരക്ക് കൂടുതലാണ്. ദയവായി അൽപ്പസമയം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.";
                default -> "The voice server is experiencing high traffic. Please wait a moment and try again.";
            };
        }
        if (statusCode == 504 || isTimeout) {
            return switch (langPrefix) {
                case "hi" -> "अनुरोध का समय समाप्त हो गया। कृपया दोबारा बोलें या इंटरनेट कनेक्शन जांचें।";
                case "pa" -> "ਸਮਾਂ ਸਮਾਪਤ ਹੋ ਗਿਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ ਜਾਂ ਇੰਟਰਨੈੱਟ ਕਨੈਕਸ਼ਨ ਚੈੱਕ ਕਰੋ।";
                case "mr" -> "विनंतीची वेळ संपली. कृपया पुन्हा बोला किंवा इंटरनेट कनेक्शन तपासा.";
                case "gu" -> "સમય સમાપ્ત થઈ ગયો છે. કૃપા કરીને ફરીથી બોલો અથવા ઇન્ટરનેટ કનેક્શન તપાસੋ.";
                case "bn" -> "সময় শেষ হয়ে গেছে। অনুগ্রহ করে আবার বলুন অথবা ইন্টারনেট সংযোগ পরীক্ষা করুন।";
                case "te" -> "సమయం ముగిసింది. దయచేసి మళ్లీ మాట్లాడండి లేదా ఇంటర్నెట్ కనెక్షన్‌ని తనిఖీ చేయండి.";
                case "ta" -> "நேரம் முடிந்துவிட்டது. தயவுசெய்து மீண்டும் பேசவும் அல்லது இணைய இணைப்பை சரிபார்க்கவும்.";
                case "kn" -> "ಸಮಯ ಮೀರಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಮಾತನಾಡಿ ಅಥವಾ ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ.";
                case "ml" -> "സമയം കഴിഞ്ഞു. ദയവായി വീണ്ടും സംസാരിക്കുക അല്ലെങ്കിൽ ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിക്കുക.";
                default -> "Request timed out. Please try speaking again or check your internet connection.";
            };
        }
        return switch (langPrefix) {
            case "hi" -> "आवाज़ पहचानी नहीं जा सकी। कृपया माइक्रोफ़ोन के पास आकर दोबारा बोलें।";
            case "pa" -> "ਆਵਾਜ਼ ਸਮਝ ਨਹੀਂ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ।";
            case "mr" -> "आवाज ओळखता आला नाही. कृपया स्पष्ट आवाजात पुन्हा बोला.";
            case "gu" -> "અવાજ ઓળખી શકાયો નથી. કૃપા કરીને સ્પષ્ટ અવાજે ફરી બોલો.";
            case "bn" -> "কথা বোঝা যায়নি। অনুগ্রহ করে পরিষ্কারভাবে পুনরায় বলুন।";
            case "te" -> "మీ మాటలు స్పష్టంగా వినపడలేదు. దయచేసి మళ్ళీ స్పష్టంగా మాట్లాడండి.";
            case "ta" -> "குரலை அடையாளம் காண முடியவில்லை. தயவுசெய்து தெளிவாக மீண்டும் பேசுங்கள்.";
            case "kn" -> "ಧ್ವನಿ ಸರಿಯಾಗಿ ಗುರುತಿಸಲಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟವಾಗಿ ಮತ್ತೊಮ್ಮೆ ಮಾತನಾಡಿ.";
            case "ml" -> "ശബ്ദം തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. ദയവായി വ്യക്തമായി വീണ്ടും സംസാരിക്കൂ.";
            default -> "Speech could not be recognized. Please speak clearly into the microphone.";
        };
    }

    private List<String> getLocalizedRelatedQueries(String langPrefix) {
        return switch (langPrefix) {
            case "mr" -> List.of(
                    "आज लासलगावमध्ये कांद्याचा भाव काय आहे?",
                    "नाशिक बाजारात सोयाबीनचे दर काय आहेत?",
                    "पुणे मंडईत गव्हाचा मॉडेल भाव काय आहे?",
                    "पीएम-किसान योजनेसाठी कागदपत्रे कोणती लागतात?"
            );
            case "gu" -> List.of(
                    "આજે રાજકોટમાં કપાસનો ભાવ શું છે?",
                    "ઊંઝા માર્કેટમાં જીરુંના તાજા ભાવ જણાવો",
                    "ગોંડલ મંડીમાં મગફળીનો મોડલ ભાવ શું છે?",
                    "પીએમ કિસાન યોજનાની વિગત આપો"
            );
            case "bn" -> List.of(
                    "আজ বর্ধমানে ধানের সরকারি দর কত চলছে?",
                    "শিলিগুড়ি বাজারে গমের দাম কত?",
                    "আলুর আজকের পাইকারি নিলাম দর কত?",
                    "পিএম-কিসান প্রকল্পে কি কি নথি লাগে?"
            );
            case "te" -> List.of(
                    "ఈరోజు గుంటూరులో మిర్చి ధర ఎంత ఉంది?",
                    "వరంగల్ మార్కెట్లో పత్తి ధర చెప్పండి",
                    "వరి ధాన్యం ప్రభుత్వ మద్దతు ధర ఎంత?",
                    "పీఎం-కిసాన్ పథకానికి దరఖాస్తు ఎలా చేయాలి?"
            );
            case "ta" -> List.of(
                    "இன்று ஈரோட்டில் மஞ்சள் விலை என்ன?",
                    "மதுரை மார்க்கெட்டில் நெல் விலை என்ன?",
                    "பருத்தி இன்றைய மாடல் விலை என்ன?",
                    "பிஎம் கிசான் திட்டத்திற்கு என்ன ஆவணங்கள் தேவை?"
            );
            case "kn" -> List.of(
                    "ಇಂದು ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ ಹತ್ತಿ ಬೆಲೆ ಎಷ್ಟಿದೆ?",
                    "ಮೈಸೂರು ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಭತ್ತದ ದರ ತಿಳಿಸಿ",
                    "ರಾಗಿಯ ಇಂದಿನ ಮಾಡಲ್ ದರ ಎಷ್ಟು?",
                    "ಪಿಎಂ ಕಿಸಾನ್ ಯೋಜನೆಗೆ ಬೇಕಾದ ದಾಖಲೆಗಳು ಯಾವುವು?"
            );
            case "ml" -> List.of(
                    "ഇന്ന് കൊച്ചിയിൽ ഏലക്കായുടെ വില എത്രയാണ്?",
                    "വയനാട് വിപണിയിൽ കുരുമുളകിന്റെ നിരക്ക് പറയൂ",
                    "നെല്ലിന്റെ ഇന്നത്തെ വിപണി വില എത്രയാണ്?",
                    "പിഎം-കിസാൻ പദ്ധതിക്ക് ആവശ്യമായ രേഖകൾ എന്തൊക്കെ?"
            );
            case "pa" -> List.of(
                    "ਲੁਧਿਆਣਾ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?",
                    "ਖੰਨਾ ਮੰਡੀ ਵਿੱਚ ਬਾਸਮਤੀ ਦਾ ਰੇਟ ਕੀ ਚੱਲ ਰਿਹਾ ਹੈ?",
                    "ਕਪਾਹ ਦੀ ਤਾਜ਼ਾ ਬੋਲੀ ਦਾ ਭਾਅ ਦੱਸੋ",
                    "ਪੀਐਮ-ਕਿਸਾਨ ਸਕੀਮ ਲਈ ਕਿਹੜੇ ਕਾਗਜ਼ ਚਾਹੀਦੇ ਹਨ?"
            );
            case "en" -> List.of(
                    "What is the wheat price in Punjab today?",
                    "Compare cotton rates between Sirsa and Khanna mandis",
                    "What is the modal mustard rate in Sirsa?",
                    "What documents are required for PM-KISAN?"
            );
            default -> List.of(
                    "आज पंजाब में गेहूं का भाव क्या चल रहा है?",
                    "ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?",
                    "लासलगांव में प्याज का भाव क्या है?",
                    "पीएम-किसान योजना के लिए क्या कागज़ चाहिए?"
            );
        };
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
