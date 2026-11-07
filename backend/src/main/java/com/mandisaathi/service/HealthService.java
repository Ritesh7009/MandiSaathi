package com.mandisaathi.service;

import com.mandisaathi.dto.HealthResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

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

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @Value("${app.version:0.1.0-phase1}")
    private String version;

    public HealthService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public HealthResponse getHealth() {
        Map<String, Object> services = new HashMap<>();

        boolean dbOk = checkDatabaseConnection();
        services.put("database", Map.of(
                "status", dbOk ? "UP" : "DOWN",
                "type", "PostgreSQL"
        ));

        services.put("gnaniVoice", Map.of(
                "status", "CONFIGURED",
                "prismaStt", "v2.5",
                "timbreTts", "v2.5"
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
}

