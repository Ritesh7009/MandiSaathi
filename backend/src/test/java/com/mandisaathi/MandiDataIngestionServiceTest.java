package com.mandisaathi;

import com.mandisaathi.config.MandiDataProperties;
import com.mandisaathi.dto.IngestionSummaryDto;
import com.mandisaathi.dto.SyncStatusDto;
import com.mandisaathi.entity.IngestionRun;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.IngestionRunRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import com.mandisaathi.service.MandiDataIngestionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class MandiDataIngestionServiceTest {

    @Autowired
    private MandiDataIngestionService ingestionService;

    @Autowired
    private IngestionRunRepository ingestionRunRepository;

    @Autowired
    private PriceRecordRepository priceRecordRepository;

    @BeforeEach
    void setUp() {
        ingestionRunRepository.deleteAll();
    }

    @Test
    void testIngestPricesWhenNotConfiguredLogsRunAsSkipped() {
        IngestionSummaryDto result = ingestionService.ingestLatestMandiPrices("TEST_RUN");

        assertNotNull(result);
        assertEquals("STUBBED", result.status());

        List<IngestionRun> runs = ingestionRunRepository.findAll();
        assertFalse(runs.isEmpty());
        IngestionRun latest = runs.get(0);
        assertEquals("SKIPPED", latest.getStatus());
        assertEquals("TEST_RUN", latest.getTriggeredBy());
        assertNotNull(latest.getCompletedAt());
    }

    @Test
    void testGetSyncStatusReportsConfigAndHistory() {
        ingestionService.ingestLatestMandiPrices("MANUAL_SYNC");

        SyncStatusDto status = ingestionService.getSyncStatus();

        assertNotNull(status);
        assertEquals("0 0 19 * * *", status.cron());
        assertEquals("Asia/Kolkata", status.zone());
        assertFalse(status.scheduleEnabled());
        assertFalse(status.isRunning());
        assertNotNull(status.latestRun());
        assertFalse(status.recentRuns().isEmpty());
        assertEquals("MANUAL_SYNC", status.latestRun().triggeredBy());
    }
}
