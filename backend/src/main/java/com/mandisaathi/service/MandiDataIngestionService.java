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
import com.mandisaathi.entity.PriceRecord;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.URI;
import java.nio.charset.StandardCharsets;
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
    private static final int MAX_PAGES_PER_SCOPE = 5;

    @Value("${mandidata.priority-district:}")
    private String priorityDistrict;

    @Value("${mandidata.priority-state:}")
    private String priorityState;

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

    @Transactional
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

            // Pre-load known commodities and mandis once per batch to avoid N+1 queries in the loop
            List<Commodity> knownCommodities = commodityRepository.findAll();
            List<Mandi> knownMandis = new ArrayList<>(mandiRepository.findAll());

            for (JsonNode node : recordsNode) {
                try {
                    String rawCommodity = node.path("commodity").asText("").trim();
                    String rawState = node.path("state").asText("").trim();
                    String rawDistrict = node.path("district").asText("").trim();
                    String rawMarket = node.path("market").asText("").trim();
                    String rawDate = node.path("arrival_date").asText("").trim();

                    String commCode = normalizeCommodityCode(rawCommodity, knownCommodities);
                    if (commCode == null) {
                        skipped++;
                        continue;
                    }

                    LocalDate priceDate = parseDate(rawDate);
                    if (priceDate == null) {
                        log.debug("Skipping record due to unparseable or missing arrival_date: '{}'", rawDate);
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

                    // Strict validation: Reject non-positive prices
                    if (minPrice.compareTo(BigDecimal.ZERO) <= 0 || modalPrice.compareTo(BigDecimal.ZERO) <= 0 || maxPrice.compareTo(BigDecimal.ZERO) <= 0) {
                        log.debug("Skipping record due to non-positive prices: min={}, modal={}, max={}", minPrice, modalPrice, maxPrice);
                        skipped++;
                        continue;
                    }

                    // Strict validation: min <= modal <= max (Reject, do NOT silently mutate or swap)
                    if (minPrice.compareTo(modalPrice) > 0 || modalPrice.compareTo(maxPrice) > 0) {
                        log.debug("Skipping record due to inconsistent price relationships: min={} > modal={} or modal={} > max={}",
                                minPrice, modalPrice, maxPrice);
                        skipped++;
                        continue;
                    }

                    String rawVariety = node.path("variety").asText("").trim();
                    String variety = (rawVariety.isBlank() || rawVariety.equalsIgnoreCase("Other")) ? "Standard / FAQ" : rawVariety;

                    // Resolve or register Mandi with complete identifiers using in-memory batch cache
                    String mandiCode = resolveOrRegisterMandi(rawMarket, rawDistrict, rawState, knownMandis);
                    if (mandiCode == null) {
                        log.debug("Skipping record due to incomplete market identifiers: market='{}', district='{}', state='{}'",
                                rawMarket, rawDistrict, rawState);
                        skipped++;
                        continue;
                    }

                    // Duplicate check considering commodity, mandi, date, variety
                    Optional<PriceRecord> existing = priceRecordRepository
                            .findByCommodityCodeAndMandiCodeAndPriceDateAndVariety(commCode, mandiCode, priceDate, variety);

                    if (existing.isPresent()) {
                        PriceRecord rec = existing.get();
                        // NEVER overwrite SEEDED_BASELINE records!
                        if ("SEEDED_BASELINE".equalsIgnoreCase(rec.getProvenanceType())) {
                            log.info("Preserving SEEDED_BASELINE record for commodity {} at mandi {} on date {}. Skipping overwrite.",
                                    commCode, mandiCode, priceDate);
                            skipped++;
                            continue;
                        }

                        rec.setMinPrice(minPrice);
                        rec.setMaxPrice(maxPrice);
                        rec.setModalPrice(modalPrice);
                        rec.setDataSource("Agmarknet (data.gov.in API)");
                        rec.setVariety(variety);
                        rec.setProvenanceType("LIVE_INGESTED");
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
                        newRec.setVariety(variety);
                        newRec.setProvenanceType("LIVE_INGESTED");
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

    private String normalizeCommodityCode(String rawCommodity, List<Commodity> commodities) {
        if (rawCommodity == null || rawCommodity.isBlank()) return null;
        String lower = rawCommodity.toLowerCase(Locale.ROOT);

        if (CommodityAliases.isCumin(rawCommodity)) {
            return commodities.stream().anyMatch(c -> "CUMIN".equals(c.getCode())) ? "CUMIN" : null;
        }
        if (lower.contains("wheat") || lower.contains("gehun") || lower.contains("गेहूं") || lower.contains("गेहूँ") || lower.contains("ਕਣਕ")) return "WHEAT";
        if (lower.contains("mustard") || lower.contains("sarson") || lower.contains("सरसों") || lower.contains("rapeseed")) return "MUSTARD";
        if (lower.contains("paddy") || lower.contains("dhan") || lower.contains("rice") || lower.contains("धान") || lower.contains("ਝੋਨਾ")) return "PADDY";
        if (lower.contains("onion") || lower.contains("pyaz") || lower.contains("प्याज") || lower.contains("ਗੰਢਾ")) return "ONION";
        if (lower.contains("cotton") || lower.contains("kapas") || lower.contains("कपास") || lower.contains("ਨਰਮਾ")) return "COTTON";
        if (lower.contains("maize") || lower.contains("makka") || lower.contains("मक्का") || lower.contains("ਮੱਕੀ")) return "MAIZE";

        if (lower.contains("bengal gram") || lower.contains("chana")) return "CHANA";
        if (lower.contains("soybean") || lower.contains("soyabean")) return "SOYBEAN";

        // Match with known pre-loaded commodities
        return commodities.stream()
                .filter(c -> c.getNameEn().equalsIgnoreCase(rawCommodity) || c.getCode().equalsIgnoreCase(rawCommodity))
                .map(Commodity::getCode)
                .findFirst()
                .orElse(null);
    }

    private static final Map<String, String> STATE_CODE_MAP = Map.ofEntries(
            Map.entry("punjab", "PB"),
            Map.entry("haryana", "HR"),
            Map.entry("rajasthan", "RJ"),
            Map.entry("uttar pradesh", "UP"),
            Map.entry("delhi", "DL"),
            Map.entry("nct of delhi", "DL"),
            Map.entry("madhya pradesh", "MP"),
            Map.entry("maharashtra", "MH"),
            Map.entry("gujarat", "GJ"),
            Map.entry("karnataka", "KA"),
            Map.entry("bihar", "BR"),
            Map.entry("west bengal", "WB"),
            Map.entry("tamil nadu", "TN"),
            Map.entry("andhra pradesh", "AP"),
            Map.entry("telangana", "TS"),
            Map.entry("kerala", "KL"),
            Map.entry("odisha", "OR"),
            Map.entry("assam", "AS"),
            Map.entry("jharkhand", "JH"),
            Map.entry("chhattisgarh", "CG"),
            Map.entry("uttarakhand", "UK"),
            Map.entry("himachal pradesh", "HP"),
            Map.entry("jammu and kashmir", "JK"),
            Map.entry("chandigarh", "CH")
    );

    private String resolveStateCode(String stateName) {
        if (stateName == null || stateName.isBlank()) return "IN";
        String normalized = stateName.trim().toLowerCase();
        return STATE_CODE_MAP.getOrDefault(normalized,
                normalized.length() >= 2 ? normalized.substring(0, 2).toUpperCase() : "IN");
    }

    private String resolveOrRegisterMandi(String market, String district, String state, List<Mandi> knownMandis) {
        if (market == null || market.isBlank() ||
            district == null || district.isBlank() ||
            state == null || state.isBlank()) {
            return null; // Reject incomplete identifiers
        }

        String normMarket = market.trim();
        String normDistrict = district.trim();
        String normState = state.trim();

        String marketKey = normalizeMarketName(normMarket);
        String districtKey = normalizeMarketName(normDistrict);
        String stateKey = normalizeMarketName(normState);
        Optional<Mandi> match = knownMandis.stream()
                .filter(m -> normalizeMarketName(m.getNameEn()).equals(marketKey)
                        && normalizeMarketName(m.getDistrict()).equals(districtKey)
                        && normalizeMarketName(m.getState()).equals(stateKey))
                .findFirst();
        if (match.isPresent()) {
            return match.get().getCode();
        }

        String identity = marketKey + "_" + districtKey + "_" + stateKey;
        String suffix = "_"
                + UUID.nameUUIDFromBytes(identity.getBytes(StandardCharsets.UTF_8)).toString().replace("-", "") + "_" + resolveStateCode(normState);
        String code = marketKey.substring(0, Math.min(marketKey.length(), 64 - suffix.length())) + suffix;

        Mandi newMandi = new Mandi();
        newMandi.setCode(code);
        newMandi.setNameEn(normMarket);
        newMandi.setNameHi(normMarket);
        newMandi.setState(normState);
        newMandi.setDistrict(normDistrict);
        newMandi.setActive(true);
        Mandi saved = mandiRepository.save(newMandi);
        knownMandis.add(saved);

        return code;
    }

    private static String normalizeMarketName(String value) {
        return value.trim().toUpperCase(Locale.ROOT)
                .replaceFirst("\\s+MANDI$", "")
                .replaceAll("[^\\p{L}\\p{N}]+", "_")
                .replaceAll("^_+|_+$", "");
    }

    private LocalDate parseDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) return null;
        String clean = rawDate.trim();
        for (DateTimeFormatter dtf : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(clean, dtf);
            } catch (Exception ignored) {}
        }
        return null; // Reject invalid dates rather than substituting LocalDate.now()
    }

    private BigDecimal parsePrice(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            String clean = raw.replaceAll("[^0-9.-]", "").trim();
            return new BigDecimal(clean);
        } catch (Exception ignored) {
            return null;
        }
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
