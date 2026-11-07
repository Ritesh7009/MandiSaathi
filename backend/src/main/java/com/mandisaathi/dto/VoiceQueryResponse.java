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
        List<String> relatedQueries
) {
    // Backward-compatible constructor for Phase 1 & 2 tests
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
                relatedQueries
        );
    }
}
