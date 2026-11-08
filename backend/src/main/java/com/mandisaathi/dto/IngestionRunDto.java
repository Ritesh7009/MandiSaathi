package com.mandisaathi.dto;

import java.time.Instant;

public record IngestionRunDto(
        Long id,
        Instant startedAt,
        Instant completedAt,
        String status,
        int totalFetched,
        int insertedCount,
        int updatedCount,
        int skippedCount,
        String message,
        String errorDetails,
        String triggeredBy
) {}
