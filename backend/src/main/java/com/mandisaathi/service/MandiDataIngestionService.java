package com.mandisaathi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mandisaathi.config.MandiDataProperties;
import com.mandisaathi.dto.IngestionRunDto;
import com.mandisaathi.dto.IngestionSummaryDto;
import com.mandisaathi.dto.SyncStatusDto;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.IngestionRun;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.IngestionRunRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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

    private final AtomicBoolean isSyncRunning = new AtomicBoolean(false);
    private final java.util.concurrent.atomic.AtomicReference<Instant> lastCompletedSync = new java.util.concurrent.atomic.AtomicReference<>(null);
    private static final long MANUAL_SYNC_COOLDOWN_SECONDS = 10;

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy")
    );

    public MandiDataIngestionService(
            MandiDataProperties mandiDataProperties,
            RestClient restClient,
            PriceRecordRepository priceRecordRepository,
            CommodityRepository commodityRepository,
            MandiRepository mandiRepository,
            IngestionRunRepository ingestionRunRepository,
            ObjectMapper objectMapper
    ) {
        this.mandiDataProperties = mandiDataProperties;
        this.restClient = restClient;
        this.priceRecordRepository = priceRecordRepository;
        this.commodityRepository = commodityRepository;
        this.mandiRepository = mandiRepository;
        this.ingestionRunRepository = ingestionRunRepository;
        this.objectMapper = objectMapper;
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

    @Transactional
    public IngestionSummaryDto ingestLatestMandiPrices() {
        return ingestLatestMandiPrices("MANUAL_SYNC");
    }

    @Transactional
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

        if (!isSyncRunning.compareAndSet(false, true)) {
            log.warn("Ingestion skipped: another sync run is currently in progress");
            return new IngestionSummaryDto(
                    0, 0, 0, 0,
                    "SKIPPED",
                    "Ingestion already in progress",
                    Instant.now()
            );
        }

        Instant startedAt = Instant.now();
        IngestionRun run = new IngestionRun(startedAt, "IN_PROGRESS", triggeredBy);
        run = ingestionRunRepository.save(run);

        try {
            if (!mandiDataProperties.isConfigured()) {
                log.info("Mandi Data ingestion skipped: data.gov.in API key is not configured. Using verified seed data.");
                String msg = "data.gov.in Agmarknet API key not configured. Retaining verified Agmarknet baseline telemetry.";
                run.setStatus("SKIPPED");
                run.setMessage(msg);
                run.setCompletedAt(Instant.now());
                ingestionRunRepository.save(run);

                return new IngestionSummaryDto(0, 0, 0, 0, getStatus(), msg, run.getCompletedAt());
            }

            String endpoint = mandiDataProperties.apiUrl();
            String apiKey = mandiDataProperties.apiKey();
            int limit = mandiDataProperties.limit();

            log.info("Triggering data.gov.in Agmarknet data ingestion from {} (limit: {}, trigger: {})", endpoint, limit, triggeredBy);

            String url = endpoint + (endpoint.contains("?") ? "&" : "?") + "api-key=" + apiKey + "&format=json&limit=" + limit;

            String responseString = restClient.get()
                    .uri(url)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        log.error("data.gov.in API returned error: HTTP {}", status);
                        throw new RuntimeException("data.gov.in upstream error: HTTP " + status);
                    })
                    .body(String.class);

            if (responseString == null || responseString.isBlank()) {
                run.setStatus("FAILED");
                run.setMessage("Empty response from data.gov.in API");
                run.setCompletedAt(Instant.now());
                ingestionRunRepository.save(run);

                return new IngestionSummaryDto(0, 0, 0, 0, "FAILED", run.getMessage(), run.getCompletedAt());
            }

            JsonNode root = objectMapper.readTree(responseString);
            JsonNode recordsNode = root.path("records");
            if (!recordsNode.isArray() || recordsNode.isEmpty()) {
                log.warn("data.gov.in API returned 0 records");
                run.setStatus("SUCCESS");
                run.setTotalFetched(0);
                run.setMessage("0 records returned by API feed");
                run.setCompletedAt(Instant.now());
                ingestionRunRepository.save(run);

                return new IngestionSummaryDto(0, 0, 0, 0, "CONNECTED", run.getMessage(), run.getCompletedAt());
            }

            int totalFetched = recordsNode.size();
            int inserted = 0;
            int updated = 0;
            int skipped = 0;

            for (JsonNode node : recordsNode) {
                try {
                    String rawCommodity = node.path("commodity").asText("").trim();
                    String rawState = node.path("state").asText("").trim();
                    String rawDistrict = node.path("district").asText("").trim();
                    String rawMarket = node.path("market").asText("").trim();
                    String rawDate = node.path("arrival_date").asText("").trim();

                    String commCode = normalizeCommodityCode(rawCommodity);
                    if (commCode == null) {
                        skipped++;
                        continue;
                    }

                    LocalDate priceDate = parseDate(rawDate);
                    if (priceDate == null) {
                        skipped++;
                        continue;
                    }

                    BigDecimal minPrice = parsePrice(node.path("min_price").asText());
                    BigDecimal maxPrice = parsePrice(node.path("max_price").asText());
                    BigDecimal modalPrice = parsePrice(node.path("modal_price").asText());

                    if (minPrice == null || maxPrice == null || modalPrice == null) {
                        skipped++;
                        continue;
                    }

                    // Enforce price bounds: min <= modal <= max
                    if (minPrice.compareTo(maxPrice) > 0) {
                        BigDecimal temp = minPrice;
                        minPrice = maxPrice;
                        maxPrice = temp;
                    }
                    if (modalPrice.compareTo(minPrice) < 0) modalPrice = minPrice;
                    if (modalPrice.compareTo(maxPrice) > 0) modalPrice = maxPrice;

                    // Resolve or register Mandi
                    String mandiCode = resolveOrRegisterMandi(rawMarket, rawDistrict, rawState);

                    // Duplicate check
                    Optional<PriceRecord> existing = priceRecordRepository
                            .findByCommodityCodeAndMandiCodeAndPriceDate(commCode, mandiCode, priceDate);

                    if (existing.isPresent()) {
                        PriceRecord rec = existing.get();
                        rec.setMinPrice(minPrice);
                        rec.setMaxPrice(maxPrice);
                        rec.setModalPrice(modalPrice);
                        rec.setDataSource("Agmarknet (data.gov.in API)");
                        priceRecordRepository.save(rec);
                        updated++;
                    } else {
                        PriceRecord newRec = new PriceRecord();
                        newRec.setCommodityCode(commCode);
                        newRec.setMandiCode(mandiCode);
                        newRec.setMinPrice(minPrice);
                        newRec.setMaxPrice(maxPrice);
                        newRec.setModalPrice(modalPrice);
                        newRec.setPriceDate(priceDate);
                        newRec.setUnit("QUINTAL");
                        newRec.setDataSource("Agmarknet (data.gov.in API)");
                        newRec.setVerified(true);
                        priceRecordRepository.save(newRec);
                        inserted++;
                    }
                } catch (Exception recEx) {
                    log.warn("Failed to ingest record: {}", recEx.getMessage());
                    skipped++;
                }
            }

            run.setTotalFetched(totalFetched);
            run.setInsertedCount(inserted);
            run.setUpdatedCount(updated);
            run.setSkippedCount(skipped);
            run.setStatus("SUCCESS");
            String message = String.format("Ingested %d new price records, updated %d, skipped %d from official Agmarknet feed.",
                    inserted, updated, skipped);
            run.setMessage(message);
            run.setCompletedAt(Instant.now());
            ingestionRunRepository.save(run);

            log.info("Agmarknet data ingestion finished. Total: {}, Inserted: {}, Updated: {}, Skipped: {}",
                    totalFetched, inserted, updated, skipped);

            return new IngestionSummaryDto(
                    totalFetched, inserted, updated, skipped,
                    "CONNECTED",
                    message,
                    run.getCompletedAt()
            );

        } catch (Exception ex) {
            log.error("Failed to ingest data from data.gov.in: {}", ex.getMessage());
            run.setStatus("FAILED");
            run.setMessage("Ingestion error: " + ex.getMessage());
            run.setErrorDetails(ex.toString());
            run.setCompletedAt(Instant.now());
            ingestionRunRepository.save(run);

            return new IngestionSummaryDto(
                    0, 0, 0, 0,
                    "FAILED",
                    "Ingestion error: " + ex.getMessage(),
                    run.getCompletedAt()
            );
        } finally {
            lastCompletedSync.set(Instant.now());
            isSyncRunning.set(false);
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

    private String normalizeCommodityCode(String rawCommodity) {
        if (rawCommodity == null || rawCommodity.isBlank()) return null;
        String lower = rawCommodity.toLowerCase();

        if (lower.contains("wheat") || lower.contains("gehun") || lower.contains("गेहूं") || lower.contains("गेहूँ") || lower.contains("ਕਣਕ")) return "WHEAT";
        if (lower.contains("mustard") || lower.contains("sarson") || lower.contains("सरसों") || lower.contains("rapeseed")) return "MUSTARD";
        if (lower.contains("paddy") || lower.contains("dhan") || lower.contains("rice") || lower.contains("धान") || lower.contains("ਝੋਨਾ")) return "PADDY";
        if (lower.contains("onion") || lower.contains("pyaz") || lower.contains("प्याज") || lower.contains("ਗੰਢਾ")) return "ONION";
        if (lower.contains("cotton") || lower.contains("kapas") || lower.contains("कपास") || lower.contains("ਨਰਮਾ")) return "COTTON";
        if (lower.contains("maize") || lower.contains("makka") || lower.contains("मक्का") || lower.contains("ਮੱਕੀ")) return "MAIZE";

        // Try exact match with existing commodities
        return commodityRepository.findAll().stream()
                .filter(c -> c.getNameEn().equalsIgnoreCase(rawCommodity) || c.getCode().equalsIgnoreCase(rawCommodity))
                .map(Commodity::getCode)
                .findFirst()
                .orElse(null);
    }

    private String resolveOrRegisterMandi(String market, String district, String state) {
        // Try lookup by name
        Optional<Mandi> existing = mandiRepository.findAll().stream()
                .filter(m -> m.getNameEn().equalsIgnoreCase(market) || m.getNameEn().contains(market))
                .findFirst();

        if (existing.isPresent()) {
            return existing.get().getCode();
        }

        // Generate clean code: e.g. KHANNA_PB
        String sanitizedMarket = market.replaceAll("[^a-zA-Z0-9]", "_").toUpperCase();
        String stateSuffix = state.length() >= 2 ? state.substring(0, 2).toUpperCase() : "IN";
        String code = sanitizedMarket + "_" + stateSuffix;

        // Check if code exists
        if (mandiRepository.findByCode(code).isPresent()) {
            return code;
        }

        Mandi newMandi = new Mandi();
        newMandi.setCode(code);
        newMandi.setNameEn(market);
        newMandi.setNameHi(market);
        newMandi.setState(state);
        newMandi.setDistrict(district);
        newMandi.setActive(true);
        mandiRepository.save(newMandi);

        return code;
    }

    private LocalDate parseDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) return LocalDate.now();
        for (DateTimeFormatter dtf : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(rawDate, dtf);
            } catch (Exception ignored) {}
        }
        return LocalDate.now();
    }

    private BigDecimal parsePrice(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            BigDecimal val = new BigDecimal(raw.replaceAll("[^0-9.]", "").trim());
            return val.compareTo(BigDecimal.ZERO) > 0 ? val : null;
        } catch (Exception ignored) {
            return null;
        }
    }
}
