package com.mandisaathi.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gnani")
public record GnaniProperties(
        boolean enabled,
        String apiKey,
        String token,
        String sttUrl,
        String ttsUrl,
        String sttModel,
        String ttsModel,
        int timeoutMs,
        String ttsVoiceHindi,
        String ttsVoicePunjabi,
        String ttsVoiceEnglish
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
    }

    public boolean isConfigured() {
        return enabled && ((apiKey != null && !apiKey.isBlank()) || (token != null && !token.isBlank()));
    }

    public String getEffectiveAuthHeaderKey() {
        return (apiKey != null && !apiKey.isBlank()) ? "X-API-Key-ID" : "Authorization";
    }

    public String getEffectiveAuthHeaderValue() {
        if (apiKey != null && !apiKey.isBlank()) {
            return apiKey;
        }
        if (token != null && !token.isBlank()) {
            return token.startsWith("Bearer ") ? token : "Bearer " + token;
        }
        return "";
    }
}
