package com.mandisaathi.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "mandidata")
public record MandiDataProperties(
        boolean enabled,
        String apiKey,
        String apiUrl,
        int limit,
        int timeoutMs,
        boolean scheduleEnabled,
        String cron,
        String zone
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
        if (cron == null || cron.isBlank()) {
            cron = "0 0 19 * * *";
        }
        if (zone == null || zone.isBlank()) {
            zone = "Asia/Kolkata";
        }
    }

    public boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }
}
