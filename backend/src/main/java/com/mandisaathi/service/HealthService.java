package com.mandisaathi.service;

import com.mandisaathi.config.GnaniProperties;
import com.mandisaathi.config.MandiDataProperties;
import com.mandisaathi.dto.HealthResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class HealthService {

    private static final Logger log = LoggerFactory.getLogger(HealthService.class);

    private final DataSource dataSource;
    private final GnaniProperties gnaniProperties;
    private final MandiDataProperties mandiDataProperties;
    private final MandiDataIngestionService mandiDataIngestionService;
    private final RestClient restClient;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @Value("${app.version:0.3.0-phase3}")
    private String version;

    public HealthService(
            DataSource dataSource,
            GnaniProperties gnaniProperties,
            MandiDataProperties mandiDataProperties,
            MandiDataIngestionService mandiDataIngestionService,
            RestClient restClient
    ) {
        this.dataSource = dataSource;
        this.gnaniProperties = gnaniProperties;
        this.mandiDataProperties = mandiDataProperties;
        this.mandiDataIngestionService = mandiDataIngestionService;
        this.restClient = restClient;
    }

    public HealthResponse getHealth() {
        Map<String, Object> services = new HashMap<>();

        // 1. Database check
        boolean dbOk = checkDatabaseConnection();
        services.put("database", Map.of(
                "status", dbOk ? "UP" : "DOWN",
                "connectionStatus", dbOk ? "CONNECTED" : "FAILED",
                "type", "PostgreSQL"
        ));

        // 2. Gnani STT Status
        String sttStatus = evaluateGnaniSttStatus();
        services.put("gnaniPrismaStt", Map.of(
                "status", sttStatus,
                "model", gnaniProperties.sttModel(),
                "endpoint", gnaniProperties.sttUrl()
        ));

        // 3. Gnani TTS Status
        String ttsStatus = evaluateGnaniTtsStatus();
        services.put("gnaniTimbreTts", Map.of(
                "status", ttsStatus,
                "model", gnaniProperties.ttsModel(),
                "voiceHindi", gnaniProperties.ttsVoiceHindi(),
                "voicePunjabi", gnaniProperties.ttsVoicePunjabi(),
                "voiceEnglish", gnaniProperties.ttsVoiceEnglish(),
                "endpoint", gnaniProperties.ttsUrl()
        ));

        // 4. Combined Gnani Voice Status (backward compatibility for existing health consumers)
        services.put("gnaniVoice", Map.of(
                "status", "CONFIGURED",
                "prismaStt", gnaniProperties.sttModel(),
                "timbreTts", gnaniProperties.ttsModel()
        ));

        // 5. Mandi Data Source Status
        String mandiStatus = mandiDataIngestionService.getStatus();
        services.put("mandiDataSource", Map.of(
                "status", mandiStatus,
                "source", "Agmarknet / data.gov.in (OGD)",
                "catalog", "current-daily-price-various-commodities-various-markets-mandi"
        ));

        String overallStatus = dbOk ? "UP" : "DEGRADED";

        return new HealthResponse(
                overallStatus,
                Instant.now(),
                version,
                activeProfile,
                services
        );
    }

    public boolean checkDatabaseConnection() {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            return statement.execute("SELECT 1");
        } catch (Exception ex) {
            log.error("Database health check failed: {}", ex.getMessage());
            return false;
        }
    }

    private String evaluateGnaniSttStatus() {
        if (!gnaniProperties.enabled()) {
            return "STUBBED";
        }
        if (!gnaniProperties.isConfigured()) {
            return "NOT_CONFIGURED";
        }
        // When configured with credentials, check reachability safely
        try {
            int statusCode = restClient.get()
                    .uri(gnaniProperties.sttUrl())
                    .headers(headers -> headers.set(gnaniProperties.getEffectiveAuthHeaderKey(), gnaniProperties.getEffectiveAuthHeaderValue()))
                    .exchange((req, res) -> res.getStatusCode().value());

            // 405 Method Not Allowed or 400 Bad Request indicates endpoint is online and responsive
            if (statusCode == 200 || statusCode == 405 || statusCode == 400) {
                return "CONNECTED";
            } else if (statusCode == 401 || statusCode == 403) {
                return "FAILED";
            }
            return "CONFIGURED";
        } catch (Exception ex) {
            log.warn("Gnani STT health connectivity check failed: {}", ex.getMessage());
            return "FAILED";
        }
    }

    private String evaluateGnaniTtsStatus() {
        if (!gnaniProperties.enabled()) {
            return "STUBBED";
        }
        if (!gnaniProperties.isConfigured()) {
            return "NOT_CONFIGURED";
        }
        try {
            int statusCode = restClient.get()
                    .uri(gnaniProperties.ttsUrl())
                    .headers(headers -> headers.set(gnaniProperties.getEffectiveAuthHeaderKey(), gnaniProperties.getEffectiveAuthHeaderValue()))
                    .exchange((req, res) -> res.getStatusCode().value());

            if (statusCode == 200 || statusCode == 405 || statusCode == 400) {
                return "CONNECTED";
            } else if (statusCode == 401 || statusCode == 403) {
                return "FAILED";
            }
            return "CONFIGURED";
        } catch (Exception ex) {
            log.warn("Gnani TTS health connectivity check failed: {}", ex.getMessage());
            return "FAILED";
        }
    }
}
