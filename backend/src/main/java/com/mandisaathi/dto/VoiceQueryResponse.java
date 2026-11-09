package com.mandisaathi.dto;

import java.util.List;
import java.util.Map;

public record VoiceQueryResponse(
        String transcript,
        String detectedLanguage,
        String intent,
        Map<String, String> extractedEntities,
        List<PriceRecordDto> priceRecords,
        String responseText,
        String responseTextHi,
        String responseTextPa,
        String audioBase64,
        String source,
        String reportingDate,
        String aiServiceStatus,
        boolean isLiveGnaniConnected,
        String engineNotice,
        List<String> relatedQueries,
        Long backendLatencyMs,
        Long sttLatencyMs,
        Integer statusCode,
        String errorCode
) {
    // 15-parameter constructor for existing service callers
    public VoiceQueryResponse(
            String transcript,
            String detectedLanguage,
            String intent,
            Map<String, String> extractedEntities,
            List<PriceRecordDto> priceRecords,
            String responseText,
            String responseTextHi,
            String responseTextPa,
            String audioBase64,
            String source,
            String reportingDate,
            String aiServiceStatus,
            boolean isLiveGnaniConnected,
            String engineNotice,
            List<String> relatedQueries
    ) {
        this(
                transcript,
                detectedLanguage,
                intent,
                extractedEntities,
                priceRecords,
                responseText,
                responseTextHi,
                responseTextPa,
                audioBase64,
                source,
                reportingDate,
                aiServiceStatus,
                isLiveGnaniConnected,
                engineNotice,
                relatedQueries,
                0L,
                0L,
                200,
                null
        );
    }

    // 9-parameter constructor for legacy Phase 1 & 2 tests
    public VoiceQueryResponse(
            String transcript,
            String detectedLanguage,
            String responseText,
            String responseTextHi,
            String responseTextPa,
            String audioBase64,
            boolean isLiveGnaniConnected,
            String engineNotice,
            List<String> relatedQueries
    ) {
        this(
                transcript,
                detectedLanguage,
                "UNKNOWN",
                Map.of(),
                List.of(),
                responseText,
                responseTextHi,
                responseTextPa,
                audioBase64,
                "Agmarknet (DAC&FW)",
                "",
                isLiveGnaniConnected ? "CONNECTED" : "STUBBED",
                isLiveGnaniConnected,
                engineNotice,
                relatedQueries,
                0L,
                0L,
                200,
                null
        );
    }
}
