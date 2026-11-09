package com.mandisaathi.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Single-credential Gnani Voice AI configuration.
 * Uses ONE GNANI_API_KEY for both Prisma STT and Timbre TTS scopes,
 * authenticated via the documented X-API-Key-ID header.
 */
@ConfigurationProperties(prefix = "gnani")
public record GnaniProperties(
        boolean enabled,
        String apiKey,
        String sttUrl,
        String ttsUrl,
        String sttModel,
        String ttsModel,
        int timeoutMs,
        String ttsVoiceHindi,
        String ttsVoicePunjabi,
        String ttsVoiceEnglish,
        int maxConcurrentRequests,
        int acquireTimeoutMs
) {
    public GnaniProperties {
        if (sttUrl == null || sttUrl.isBlank()) {
            sttUrl = "https://api.vachana.ai/stt/v3";
        }
        if (ttsUrl == null || ttsUrl.isBlank()) {
            ttsUrl = "https://api.vachana.ai/api/v1/tts/inference";
        }
        if (sttModel == null || sttModel.isBlank()) {
            sttModel = "prisma-v2.5";
        }
        if (ttsModel == null || ttsModel.isBlank()) {
            ttsModel = "timbre-v2.5";
        }
        if (timeoutMs <= 0) {
            timeoutMs = 10000;
        }
        if (ttsVoiceHindi == null || ttsVoiceHindi.isBlank()) {
            ttsVoiceHindi = "Nalini";
        }
        if (ttsVoicePunjabi == null || ttsVoicePunjabi.isBlank()) {
            ttsVoicePunjabi = "Nalini";
        }
        if (ttsVoiceEnglish == null || ttsVoiceEnglish.isBlank()) {
            ttsVoiceEnglish = "Kaveri";
        }
        if (maxConcurrentRequests <= 0) {
            maxConcurrentRequests = 5;
        }
        if (acquireTimeoutMs <= 0) {
            acquireTimeoutMs = 3000;
        }
    }

    /**
     * Returns true when Gnani integration is enabled and a non-blank API key is configured.
     */
    public boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    /**
     * Documented Gnani API authentication header.
     */
    public String getEffectiveAuthHeaderKey() {
        return "X-API-Key-ID";
    }

    /**
     * Effective authentication key value.
     */
    public String getEffectiveAuthHeaderValue() {
        return apiKey != null ? apiKey : "";
    }
}
