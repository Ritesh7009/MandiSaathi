package com.mandisaathi.dto;

import java.util.List;

public record VoiceQueryResponse(
        String transcript,
        String detectedLanguage,
        String responseText,
        String responseTextHi,
        String responseTextPa,
        String audioBase64,
        boolean isLiveGnaniConnected,
        String engineNotice,
        List<String> relatedQueries
) {}
