package com.mandisaathi.controller;

import com.mandisaathi.dto.HealthResponse;
import com.mandisaathi.service.HealthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping
    public ResponseEntity<HealthResponse> checkHealth() {
        HealthResponse health = healthService.getHealth();
        if ("UP".equalsIgnoreCase(health.status())) {
            return ResponseEntity.ok(health);
        }
        return ResponseEntity.status(503).body(health);
    }
}

