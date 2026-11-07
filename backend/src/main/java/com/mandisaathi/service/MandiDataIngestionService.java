package com.mandisaathi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mandisaathi.config.MandiDataProperties;
import com.mandisaathi.dto.IngestionSummaryDto;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class MandiDataIngestionService {

    private static final Logger log = LoggerFactory.getLogger(MandiDataIngestionService.class);

    private final MandiDataProperties mandiDataProperties;
    private final RestClient restClient;
    private final PriceRecordRepository priceRecordRepository;
    private final CommodityRepository commodityRepository;
    private final MandiRepository mandiRepository;
    private final ObjectMapper objectMapper;

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
            ObjectMapper objectMapper
    ) {
        this.mandiDataProperties = mandiDataProperties;
        this.restClient = restClient;
        this.priceRecordRepository = priceRecordRepository;
        this.commodityRepository = commodityRepository;
        this.mandiRepository = mandiRepository;
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

    @Transactional
    public IngestionSummaryDto ingestLatestMandiPrices() {
        if (!mandiDataProperties.isConfigured()) {
            log.info("Mandi Data ingestion skipped: data.gov.in API key is not configured. Using verified seed data.");
            return new IngestionSummaryDto(
                    0, 0, 0, 0,
                    getStatus(),
                    "data.gov.in Agmarknet API key not configured. Retaining verified Agmarknet baseline telemetry.",
                    Instant.now()
            );
        }

        String endpoint = mandiDataProperties.apiUrl();
        String apiKey = mandiDataProperties.apiKey();
        int limit = mandiDataProperties.limit();

        log.info("Triggering data.gov.in Agmarknet data ingestion from {} (limit: {})", endpoint, limit);

        try {
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
                return new IngestionSummaryDto(0, 0, 0, 0, "FAILED", "Empty response from data.gov.in API", Instant.now());
            }

            JsonNode root = objectMapper.readTree(responseString);
            JsonNode recordsNode = root.path("records");
            if (!recordsNode.isArray() || recordsNode.isEmpty()) {
                log.warn("data.gov.in API returned 0 records");
                return new IngestionSummaryDto(0, 0, 0, 0, "CONNECTED", "0 records returned by API feed", Instant.now());
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

            log.info("Agmarknet data ingestion finished. Total: {}, Inserted: {}, Updated: {}, Skipped: {}",
                    totalFetched, inserted, updated, skipped);

            return new IngestionSummaryDto(
                    totalFetched, inserted, updated, skipped,
                    "CONNECTED",
                    String.format("Ingested %d new price records, updated %d, skipped %d from official Agmarknet feed.",
                            inserted, updated, skipped),
                    Instant.now()
            );

        } catch (Exception ex) {
            log.error("Failed to ingest data from data.gov.in: {}", ex.getMessage());
            return new IngestionSummaryDto(
                    0, 0, 0, 0,
                    "FAILED",
                    "Ingestion error: " + ex.getMessage(),
                    Instant.now()
            );
        }
    }

    private String normalizeCommodityCode(String rawCommodity) {
        if (rawCommodity == null || rawCommodity.isBlank()) return null;
        String lower = rawCommodity.toLowerCase();

        if (lower.contains("wheat") || lower.contains("gehun") || lower.contains("गेहूं")) return "WHEAT";
        if (lower.contains("mustard") || lower.contains("sarson") || lower.contains("सरसों") || lower.contains("rapeseed")) return "MUSTARD";
        if (lower.contains("paddy") || lower.contains("dhan") || lower.contains("rice") || lower.contains("धान")) return "PADDY";
        if (lower.contains("onion") || lower.contains("pyaz") || lower.contains("प्याज")) return "ONION";
        if (lower.contains("cotton") || lower.contains("kapas") || lower.contains("कपास")) return "COTTON";
        if (lower.contains("maize") || lower.contains("makka") || lower.contains("मक्का")) return "MAIZE";

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

