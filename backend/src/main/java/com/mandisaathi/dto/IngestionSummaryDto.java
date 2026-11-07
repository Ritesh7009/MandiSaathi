package com.mandisaathi.dto;

import java.time.Instant;

public record IngestionSummaryDto(
        int totalFetched,
        int insertedCount,
        int updatedCount,
        int skippedCount,
        String status,
        String message,
        Instant timestamp
) {}

