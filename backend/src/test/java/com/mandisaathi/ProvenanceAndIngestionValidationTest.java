package com.mandisaathi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mandisaathi.config.MandiDataProperties;
import com.mandisaathi.dto.IngestionSummaryDto;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.IngestionRunRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import com.mandisaathi.service.MandiDataIngestionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@SpringBootTest
@ActiveProfiles("test")
class ProvenanceAndIngestionValidationTest {

    @Autowired
    private PriceRecordRepository priceRecordRepository;

    @Autowired
    private CommodityRepository commodityRepository;

    @Autowired
    private MandiRepository mandiRepository;

    @Autowired
    private IngestionRunRepository ingestionRunRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private MandiDataIngestionService testIngestionService;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        priceRecordRepository.deleteAll();
        ingestionRunRepository.deleteAll();

        // Ensure baseline WHEAT commodity exists
        if (commodityRepository.findByCode("WHEAT").isEmpty()) {
            Commodity wheat = new Commodity("WHEAT", "Wheat", "गेहूं", "ਕਣਕ", "GRAINS", "QUINTAL");
            commodityRepository.save(wheat);
        }

        // Configure active MandiDataProperties
        MandiDataProperties properties = new MandiDataProperties(
                true,
                "test-api-key-12345",
                "https://api.data.gov.in/test-feed",
                100,
                5000,
                false,
                "0 0 19 * * *",
                "Asia/Kolkata"
        );

        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder.build();

        testIngestionService = new MandiDataIngestionService(
                properties,
                restClient,
                priceRecordRepository,
                commodityRepository,
                mandiRepository,
                ingestionRunRepository,
                objectMapper
        );
    }

    @Test
    @DisplayName("Invalid or missing date is rejected and never replaced with LocalDate.now()")
    void invalidDateIsRejected() {
        String json = """
        {
            "records": [
                {
                    "commodity": "Wheat",
                    "state": "Punjab",
                    "district": "Ludhiana",
                    "market": "Khanna",
                    "arrival_date": "INVALID_DATE_FORMAT",
                    "min_price": "2200",
                    "max_price": "2400",
                    "modal_price": "2300"
                }
            ]
        }
        """;

        mockServer.expect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        IngestionSummaryDto summary = testIngestionService.ingestLatestMandiPrices("TEST_DATE");
        assertEquals(0, summary.insertedCount(), "Invalid date must not be inserted");
        assertEquals(1, summary.skippedCount(), "Record with invalid date must be skipped");
        assertEquals(0, priceRecordRepository.count());
    }

    @Test
    @DisplayName("Inconsistent prices (min > modal or modal > max) are rejected rather than silently swapped")
    void inconsistentPriceBoundsAreRejected() {
        String json = """
        {
            "records": [
                {
                    "commodity": "Wheat",
                    "state": "Punjab",
                    "district": "Ludhiana",
                    "market": "Khanna",
                    "arrival_date": "08/11/2026",
                    "min_price": "3000",
                    "max_price": "2500",
                    "modal_price": "2800"
                }
            ]
        }
        """;

        mockServer.expect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        IngestionSummaryDto summary = testIngestionService.ingestLatestMandiPrices("TEST_PRICES");
        assertEquals(0, summary.insertedCount(), "Inconsistent price bounds must be rejected");
        assertEquals(1, summary.skippedCount(), "Record must be skipped");
    }

    @Test
    @DisplayName("Negative and zero prices are rejected")
    void negativePricesAreRejected() {
        String json = """
        {
            "records": [
                {
                    "commodity": "Wheat",
                    "state": "Punjab",
                    "district": "Ludhiana",
                    "market": "Khanna",
                    "arrival_date": "08/11/2026",
                    "min_price": "-100",
                    "max_price": "2500",
                    "modal_price": "2300"
                }
            ]
        }
        """;

        mockServer.expect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        IngestionSummaryDto summary = testIngestionService.ingestLatestMandiPrices("TEST_NEGATIVE");
        assertEquals(0, summary.insertedCount());
        assertEquals(1, summary.skippedCount());
    }

    @Test
    @DisplayName("Incomplete market identifiers (missing district or state) are rejected")
    void incompleteMarketIdentifiersAreRejected() {
        String json = """
        {
            "records": [
                {
                    "commodity": "Wheat",
                    "state": "",
                    "district": "Ludhiana",
                    "market": "Khanna",
                    "arrival_date": "08/11/2026",
                    "min_price": "2200",
                    "max_price": "2400",
                    "modal_price": "2300"
                }
            ]
        }
        """;

        mockServer.expect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        IngestionSummaryDto summary = testIngestionService.ingestLatestMandiPrices("TEST_INCOMPLETE");
        assertEquals(0, summary.insertedCount());
        assertEquals(1, summary.skippedCount());
    }

    @Test
    @DisplayName("Valid upstream records are saved as LIVE_INGESTED with proper state codes")
    void validRecordsAreSavedAsLiveIngested() {
        String json = """
        {
            "records": [
                {
                    "commodity": "Wheat",
                    "variety": "Lokwan",
                    "state": "Rajasthan",
                    "district": "Kota",
                    "market": "Kota New Mandi",
                    "arrival_date": "08/11/2026",
                    "min_price": "2350",
                    "max_price": "2550",
                    "modal_price": "2450"
                }
            ]
        }
        """;

        mockServer.expect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        IngestionSummaryDto summary = testIngestionService.ingestLatestMandiPrices("TEST_VALID");
        assertEquals(1, summary.insertedCount());
        assertEquals(0, summary.skippedCount());

        PriceRecord saved = priceRecordRepository.findAll().get(0);
        assertEquals("LIVE_INGESTED", saved.getProvenanceType());
        assertEquals("Lokwan", saved.getVariety());
        assertTrue(saved.getMandiCode().endsWith("_RJ"), "Rajasthan should map to _RJ state code");
    }

    @Test
    @DisplayName("SEEDED_BASELINE records are preserved and cannot be overwritten by live ingestion")
    void seededBaselineRecordsArePreserved() {
        LocalDate date = LocalDate.of(2026, 11, 8);

        // Pre-seed a baseline record
        PriceRecord baseline = new PriceRecord();
        baseline.setCommodityCode("WHEAT");
        baseline.setMandiCode("KHANNA_PB");
        baseline.setPriceDate(date);
        baseline.setMinPrice(new BigDecimal("2275.00"));
        baseline.setMaxPrice(new BigDecimal("2380.00"));
        baseline.setModalPrice(new BigDecimal("2320.00"));
        baseline.setUnit("QUINTAL");
        baseline.setDataSource("Agmarknet / Punjab Mandi Board");
        baseline.setVariety("Standard / FAQ");
        baseline.setProvenanceType("SEEDED_BASELINE");
        priceRecordRepository.save(baseline);

        // Attempt live ingestion of same commodity, mandi, date, variety with different prices
        String json = """
        {
            "records": [
                {
                    "commodity": "Wheat",
                    "variety": "Standard / FAQ",
                    "state": "Punjab",
                    "district": "Ludhiana",
                    "market": "Khanna",
                    "arrival_date": "08/11/2026",
                    "min_price": "2100",
                    "max_price": "2200",
                    "modal_price": "2150"
                }
            ]
        }
        """;

        mockServer.expect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        IngestionSummaryDto summary = testIngestionService.ingestLatestMandiPrices("TEST_PRESERVE");
        assertEquals(0, summary.insertedCount());
        assertEquals(0, summary.updatedCount(), "Baseline record must NOT be updated");
        assertEquals(1, summary.skippedCount(), "Baseline duplicate must be skipped");

        PriceRecord retained = priceRecordRepository.findById(baseline.getId()).orElseThrow();
        assertEquals("SEEDED_BASELINE", retained.getProvenanceType());
        assertEquals(new BigDecimal("2320.00"), retained.getModalPrice());
    }
}
