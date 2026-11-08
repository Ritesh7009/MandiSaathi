package com.mandisaathi.dto;

import java.util.List;

public record SyncStatusDto(
        boolean scheduleEnabled,
        String cron,
        String zone,
        boolean isRunning,
        String upstreamStatus,
        IngestionRunDto latestRun,
        List<IngestionRunDto> recentRuns
) {}
