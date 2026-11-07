package com.mandisaathi.dto;

import java.time.Instant;

public record ComplaintDto(
        Long id,
        String referenceNumber,
        String category,
        String description,
        String state,
        String district,
        String mandiCode,
        String mandiName,
        String farmerName,
        String farmerPhone,
        String status,
        Instant createdAt
) {}

