package com.mandisaathi.dto;

import java.time.Instant;
import java.util.Map;

public record HealthResponse(
        String status,
        Instant timestamp,
        String version,
        String environment,
        Map<String, Object> services
) {}

