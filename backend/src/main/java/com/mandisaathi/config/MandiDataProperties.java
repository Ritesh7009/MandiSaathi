package com.mandisaathi.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "mandidata")
public record MandiDataProperties(
        boolean enabled,
        String apiKey,
        String apiUrl,
        int limit,
        int timeoutMs
) {
    public MandiDataProperties {
        if (apiUrl == null || apiUrl.isBlank()) {
            apiUrl = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";
        }
        if (limit <= 0) {
            limit = 100;
        }
        if (timeoutMs <= 0) {
            timeoutMs = 15000;
        }
    }

    public boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }
}
