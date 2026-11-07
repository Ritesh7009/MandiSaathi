package com.mandisaathi.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gnani")
public record GnaniProperties(
        boolean enabled,
        String apiKey,
        String sttUrl,
        String ttsUrl,
        int timeoutMs
) {
    public GnaniProperties {
        if (timeoutMs <= 0) {
            timeoutMs = 10000;
        }
    }
}

