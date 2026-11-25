package com.mandisaathi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.mandisaathi.config.MandiDataProperties;
import com.mandisaathi.dto.IngestionRunDto;
import com.mandisaathi.dto.IngestionSummaryDto;
import com.mandisaathi.dto.SyncStatusDto;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.IngestionRun;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.IngestionRunRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.util.UriComponentsBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class MandiDataIngestionService {

    private static final Logger log = LoggerFactory.getLogger(MandiDataIngestionService.class);

    private final MandiDataProperties mandiDataProperties;
    private final RestClient restClient;
    private final PriceRecordRepository priceRecordRepository;
    private final CommodityRepository commodityRepository;
    private final MandiRepository mandiRepository;
    private final IngestionRunRepository ingestionRunRepository;
    private final ObjectMapper objectMapper;
    private final DistributedSyncCoordinator syncCoordinator;
    private final MandiPriceBatchPersistenceService batchPersistenceService;

    private final AtomicBoolean isSyncRunning = new AtomicBoolean(false);
    private final java.util.concurrent.atomic.AtomicReference<Instant> lastCompletedSync = new java.util.concurrent.atomic.AtomicReference<>(null);
    private static final long MANUAL_SYNC_COOLDOWN_SECONDS = 10;
    private static final int MAX_PAGES_PER_SCOPE = 5;
    private static final int DEFAULT_BATCH_SIZE = 50;

    @Value("${mandidata.priority-district:}")
    private String priorityDistrict;

    @Value("${mandidata.priority-state:}")
    private String priorityState;

    @Value("${mandidata.batch-size:50}")
    private int batchSize = DEFAULT_BATCH_SIZE;

    @org.springframework.beans.factory.annotation.Autowired
    public MandiDataIngestionService(
            MandiDataProperties mandiDataProperties,
            RestClient restClient,
            PriceRecordRepository priceRecordRepository,
            CommodityRepository commodityRepository,
            MandiRepository mandiRepository,
            IngestionRunRepository ingestionRunRepository,
            ObjectMapper objectMapper,
            DistributedSyncCoordinator syncCoordinator,
            MandiPriceBatchPersistenceService batchPersistenceService
    ) {
        this.mandiDataProperties = mandiDataProperties;
        this.restClient = restClient;
        this.priceRecordRepository = priceRecordRepository;
        this.commodityRepository = commodityRepository;
        this.mandiRepository = mandiRepository;
        this.ingestionRunRepository = ingestionRunRepository;
        this.objectMapper = objectMapper;
        this.syncCoordinator = syncCoordinator;
        this.batchPersistenceService = batchPersistenceService;
    }

    public MandiDataIngestionService(
            MandiDataProperties mandiDataProperties,
            RestClient restClient,
            PriceRecordRepository priceRecordRepository,
            CommodityRepository commodityRepository,
            MandiRepository mandiRepository,
            IngestionRunRepository ingestionRunRepository,
            ObjectMapper objectMapper
    ) {
        this(mandiDataProperties, restClient, priceRecordRepository, commodityRepository, mandiRepository,
                ingestionRunRepository, objectMapper,
                new DistributedSyncCoordinator(null),
                new MandiPriceBatchPersistenceService(priceRecordRepository, mandiRepository));
    }

    public String getStatus() {
        if (!mandiDataProperties.enabled()) {
            return "STUBBED";
        }
        if (mandiDataProperties.apiKey() == null || mandiDataProperties.apiKey().isBlank()) {
            return "NOT_CONFIGURED";
        }
        return "CONFIGURED";
    }

    public boolean isSyncRunning() {
        return isSyncRunning.get();
    }

    @Scheduled(cron = "${mandidata.cron:0 0 19 * * *}", zone = "${mandidata.zone:Asia/Kolkata}")
    public void runScheduledSync() {
        if (!mandiDataProperties.scheduleEnabled()) {
            log.debug("Scheduled mandi data sync is disabled in configuration.");
            return;
        }
        log.info("Executing scheduled mandi data ingestion cron (Asia/Kolkata)");
        ingestLatestMandiPrices("SCHEDULED_CRON");
    }

    public IngestionSummaryDto ingestLatestMandiPrices() {
        return ingestLatestMandiPrices("MANUAL_SYNC");
    }

    public IngestionSummaryDto ingestLatestMandiPrices(String triggeredBy) {
        if ("MANUAL_SYNC".equalsIgnoreCase(triggeredBy)) {
            Instant last = lastCompletedSync.get();
            if (last != null && Instant.now().isBefore(last.plusSeconds(MANUAL_SYNC_COOLDOWN_SECONDS))) {
                log.warn("Manual sync rate limited: please wait {} seconds between requests", MANUAL_SYNC_COOLDOWN_SECONDS);
                return new IngestionSummaryDto(
                        0, 0, 0, 0,
                        "THROTTLED",
                        "Manual synchronization rate limited: please wait " + MANUAL_SYNC_COOLDOWN_SECONDS + " seconds between requests.",
                        Instant.now()
                );
            }
        }

        // 1. Acquire distributed synchronization lock across multi-instance deployment
        Optional<DistributedSyncCoordinator.DistributedSyncHandle> lockOpt = syncCoordinator.tryAcquireLock();
        if (lockOpt.isEmpty()) {
            log.warn("Ingestion skipped: another sync run is currently in progress across the cluster");
            return new IngestionSummaryDto(
                    0, 0, 0, 0,
                    "SKIPPED",
                    "Ingestion already in progress on another instance or thread",
                    Instant.now()
            );
        }

        // 2. Prevent overlapping local threads on this node
        if (!isSyncRunning.compareAndSet(false, true)) {
            lockOpt.get().close();
            log.warn("Ingestion skipped: another sync run is currently in progress on this node");
            return new IngestionSummaryDto(
                    0, 0, 0, 0,
                    "SKIPPED",
                    "Ingestion already in progress on this node",
                    Instant.now()
            );
        }

        try (DistributedSyncCoordinator.DistributedSyncHandle lockHandle = lockOpt.get()) {
            Instant startedAt = Instant.now();
            IngestionRun run = new IngestionRun(startedAt, "IN_PROGRESS", triggeredBy);
            try {
                run = ingestionRunRepository.save(run);
                if (!mandiDataProperties.isConfigured()) {
                    log.info("Mandi Data ingestion skipped: data.gov.in API key is not configured. Using verified seed data.");
                    String msg = mandiDataProperties.enabled()
                            ? "The Agmarknet API key is missing. Existing price records remain available."
                            : "Live Agmarknet ingestion is disabled. Existing price records remain available.";
                    run.setStatus("SKIPPED");
                    run.setMessage(msg);
                    run.setCompletedAt(Instant.now());
                    ingestionRunRepository.save(run);

                    return new IngestionSummaryDto(0, 0, 0, 0, getStatus(), msg, run.getCompletedAt());
                }

                // 3. Network I/O occurs outside any database transaction
                ArrayNode recordsNode = objectMapper.createArrayNode();
                List<String> scopeErrors = new ArrayList<>();
                if (priorityDistrict != null && !priorityDistrict.isBlank()
                        && priorityState != null && !priorityState.isBlank()) {
                    fetchScope(Map.of("state", priorityState, "district", priorityDistrict), recordsNode, scopeErrors);
                }
                fetchScope(Map.of(), recordsNode, scopeErrors);

                if (recordsNode.isEmpty()) {
                    log.warn("data.gov.in API returned 0 records");
                    run.setStatus(scopeErrors.isEmpty() ? "NO_DATA" : "FAILED");
                    run.setTotalFetched(0);
                    run.setMessage(scopeErrors.isEmpty() ? "No records returned by Agmarknet." : "Agmarknet fetch failed.");
                    if (!scopeErrors.isEmpty()) run.setErrorDetails(sanitizeErrorMessage(String.join("; ", scopeErrors)));
                    run.setCompletedAt(Instant.now());
                    ingestionRunRepository.save(run);

                    return new IngestionSummaryDto(0, 0, 0, 0, run.getStatus(), run.getMessage(), run.getCompletedAt());
                }

                int totalFetched = recordsNode.size();
                int inserted = 0;
                int updated = 0;
                int skipped = 0;

                // Pre-load known catalogs for memory efficiency
                List<Commodity> knownCommodities = commodityRepository.findAll();
                List<Mandi> knownMandis = new ArrayList<>(mandiRepository.findAll());

                List<JsonNode> allRecords = new ArrayList<>(totalFetched);
                for (JsonNode node : recordsNode) {
                    allRecords.add(node);
                }

                // 4. Bounded batch writes with isolated transactions per batch
                int effectiveBatchSize = Math.max(1, batchSize);
                for (int i = 0; i < allRecords.size(); i += effectiveBatchSize) {
                    List<JsonNode> batch = allRecords.subList(i, Math.min(i + effectiveBatchSize, allRecords.size()));
                    MandiPriceBatchPersistenceService.PaginationCheckpoint checkpoint =
                            new MandiPriceBatchPersistenceService.PaginationCheckpoint(
                                    "ALL_INDIA", (i / effectiveBatchSize) + 1, i + batch.size(), null);

                    try {
                        MandiPriceBatchPersistenceService.BatchPersistResult batchResult =
                                batchPersistenceService.persistBatch(batch, knownCommodities, knownMandis, checkpoint);

                        inserted += batchResult.inserted();
                        updated += batchResult.updated();
                        skipped += batchResult.skipped();
                    } catch (Exception batchEx) {
                        log.error("Batch persistence failed and rolled back cleanly: {}", batchEx.getMessage());
                        scopeErrors.add("Batch " + ((i / effectiveBatchSize) + 1) + " write error: " + sanitizeErrorMessage(batchEx.getMessage()));
                    }
                }

                run.setTotalFetched(totalFetched);
                run.setInsertedCount(inserted);
                run.setUpdatedCount(updated);
                run.setSkippedCount(skipped);
                boolean partial = !scopeErrors.isEmpty();
                run.setStatus(partial ? "PARTIAL" : "SUCCESS");
                if (partial) run.setErrorDetails(sanitizeErrorMessage(String.join("; ", scopeErrors)));
                String message = String.format("Agmarknet records: %d added, %d updated, %d skipped.",
                        inserted, updated, skipped);
                if (partial) message += " Some requests to Agmarknet failed.";
                run.setMessage(message);
                run.setCompletedAt(Instant.now());
                ingestionRunRepository.save(run);

                log.info("Agmarknet data ingestion finished. Total: {}, Inserted: {}, Updated: {}, Skipped: {}",
                        totalFetched, inserted, updated, skipped);

                return new IngestionSummaryDto(
                        totalFetched, inserted, updated, skipped,
                        partial ? "PARTIAL" : "CONNECTED",
                        message,
                        run.getCompletedAt()
                );

            } catch (Exception ex) {
                String sanitizedErr = sanitizeErrorMessage(ex.getMessage());
                log.error("Failed to ingest data from data.gov.in: {}", sanitizedErr);
                run.setStatus("FAILED");
                run.setMessage("Ingestion error: " + sanitizedErr);
                run.setErrorDetails(sanitizedErr);
                run.setCompletedAt(Instant.now());
                ingestionRunRepository.save(run);

                return new IngestionSummaryDto(
                        0, 0, 0, 0,
                        "FAILED",
                        "Ingestion error: " + sanitizedErr,
                        run.getCompletedAt()
                );
            }
        } finally {
            lastCompletedSync.set(Instant.now());
            isSyncRunning.set(false);
        }
    }

    private void fetchScope(Map<String, String> filters, ArrayNode destination, List<String> errors) {
        try {
            fetchPages(filters, destination);
        } catch (Exception ex) {
            String error = sanitizeErrorMessage(ex.getMessage());
            String scope = filters.isEmpty() ? "general feed" : "priority district";
            log.warn("Agmarknet {} fetch stopped: {}", scope, error);
            errors.add(scope + ": " + error);
        }
    }

    private void fetchPages(Map<String, String> filters, ArrayNode destination) throws Exception {
        int limit = mandiDataProperties.limit();
        JsonNode priorPage = null;
        for (int page = 0; page < MAX_PAGES_PER_SCOPE; page++) {
            UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(mandiDataProperties.apiUrl())
                    .queryParam("api-key", "{apiKey}")
                    .queryParam("format", "json")
                    .queryParam("limit", limit)
                    .queryParam("offset", page * limit);
            Map<String, String> variables = new HashMap<>();
            variables.put("apiKey", mandiDataProperties.apiKey());
            filters.forEach((name, value) -> {
                uri.queryParam("filters[" + name + "]", "{" + name + "}");
                variables.put(name, value);
            });
            URI requestUri = uri.encode().buildAndExpand(variables).toUri();

            String body = restClient.get().uri(requestUri).retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response) -> {
                        throw new IllegalStateException("data.gov.in upstream error: HTTP "
                                + response.getStatusCode().value());
                    })
                    .body(String.class);
            if (body == null || body.isBlank()) {
                throw new IllegalStateException("Empty response from data.gov.in API");
            }
            JsonNode payload = objectMapper.readTree(body);
            JsonNode pageRecords = payload.path("records");
            if (!pageRecords.isArray()) {
                throw new IllegalStateException("data.gov.in response has no records array");
            }
            if (pageRecords.equals(priorPage)) {
                log.warn("Agmarknet repeated a page for filters {}", filters);
                break;
            }
            for (JsonNode record : pageRecords) {
                if (filters.entrySet().stream().allMatch(filter ->
                        filter.getValue().equalsIgnoreCase(record.path(filter.getKey()).asText("").trim()))) {
                    destination.add(record);
                }
            }
            if (pageRecords.size() < limit || (payload.path("total").canConvertToInt()
                    && (page + 1) * limit >= payload.path("total").asInt())) {
                break;
            }
            priorPage = pageRecords;
        }
    }

    public SyncStatusDto getSyncStatus() {
        List<IngestionRun> recent = ingestionRunRepository.findTop10ByOrderByStartedAtDesc();
        List<IngestionRunDto> dtoList = recent.stream()
                .map(this::toDto)
                .toList();

        IngestionRunDto latestDto = dtoList.isEmpty() ? null : dtoList.get(0);

        return new SyncStatusDto(
                mandiDataProperties.scheduleEnabled(),
                mandiDataProperties.cron(),
                mandiDataProperties.zone(),
                isSyncRunning.get(),
                getStatus(),
                latestDto,
                dtoList
        );
    }

    private IngestionRunDto toDto(IngestionRun run) {
        return new IngestionRunDto(
                run.getId(),
                run.getStartedAt(),
                run.getCompletedAt(),
                run.getStatus(),
                run.getTotalFetched() != null ? run.getTotalFetched() : 0,
                run.getInsertedCount() != null ? run.getInsertedCount() : 0,
                run.getUpdatedCount() != null ? run.getUpdatedCount() : 0,
                run.getSkippedCount() != null ? run.getSkippedCount() : 0,
                run.getMessage(),
                run.getErrorDetails(),
                run.getTriggeredBy()
        );
    }

    private String sanitizeErrorMessage(String error) {
        if (error == null || error.isBlank()) return "Unknown upstream ingestion error";
        String sanitized = error;
        if (mandiDataProperties.apiKey() != null && !mandiDataProperties.apiKey().isBlank()) {
            sanitized = sanitized.replace(mandiDataProperties.apiKey(), "[REDACTED_API_KEY]");
        }
        sanitized = sanitized.replaceAll("api-key=[^&\\s]+", "api-key=[REDACTED]");
        sanitized = sanitized.replaceAll("api_key=[^&\\s]+", "api_key=[REDACTED]");
        if (sanitized.length() > 250) {
            sanitized = sanitized.substring(0, 250) + "...";
        }
        return sanitized;
    }
}
