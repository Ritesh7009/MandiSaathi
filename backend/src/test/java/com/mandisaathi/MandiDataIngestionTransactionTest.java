package com.mandisaathi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mandisaathi.config.MandiDataProperties;
import com.mandisaathi.dto.IngestionSummaryDto;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.IngestionRunRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import com.mandisaathi.service.DistributedSyncCoordinator;
import com.mandisaathi.service.MandiDataIngestionService;
import com.mandisaathi.service.MandiPriceBatchPersistenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@SpringBootTest
@ActiveProfiles("test")
public class MandiDataIngestionTransactionTest {

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

    @Autowired
    private MandiPriceBatchPersistenceService batchPersistenceService;

    @Autowired
    private DistributedSyncCoordinator syncCoordinator;

    private MandiDataIngestionService testIngestionService;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        priceRecordRepository.deleteAll();
        ingestionRunRepository.deleteAll();

        if (commodityRepository.findByCode("WHEAT").isEmpty()) {
            Commodity wheat = new Commodity("WHEAT", "Wheat", "गेहूं", "ਕਣਕ", "GRAINS", "QUINTAL");
            commodityRepository.save(wheat);
        }

        MandiDataProperties properties = new MandiDataProperties(
                true,
                "test-api-key-txn-test",
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
                objectMapper,
                syncCoordinator,
                batchPersistenceService
        );
    }

    @Test
    @DisplayName("Verify Spring manages MandiPriceBatchPersistenceService via a transactional proxy")
    void testSpringTransactionalProxyBehavior() {
        assertTrue(AopUtils.isAopProxy(batchPersistenceService),
                "MandiPriceBatchPersistenceService must be wrapped in a Spring AOP transactional proxy");
    }

    @Test
    @DisplayName("No active database write transaction during external HTTP requests to data.gov.in")
    void testNoActiveWriteTransactionDuringHttpFetch() {
        AtomicBoolean activeTransactionDetected = new AtomicBoolean(false);

        String sampleResponse = """
        {
            "records": [
                {
                    "commodity": "Wheat",
                    "state": "Punjab",
                    "district": "Ludhiana",
                    "market": "Khanna",
                    "arrival_date": "25/11/2026",
                    "variety": "Standard / FAQ",
                    "min_price": "2250",
                    "max_price": "2450",
                    "modal_price": "2350"
                }
            ]
        }
        """;

        mockServer.expect(method(HttpMethod.GET)).andRespond(request -> {
            // Check whether a database transaction is open when the external HTTP call is dispatched
            if (TransactionSynchronizationManager.isActualTransactionActive()) {
                activeTransactionDetected.set(true);
            }
            return withSuccess(sampleResponse, MediaType.APPLICATION_JSON).createResponse(request);
        });

        IngestionSummaryDto summary = testIngestionService.ingestLatestMandiPrices("TEST_TXN_ISOLATION");

        assertFalse(activeTransactionDetected.get(),
                "CRITICAL: Database transaction was active during external HTTP call to data.gov.in (Connection Pool Starvation Risk)");
        assertEquals(1, summary.insertedCount(), "Record should be inserted successfully in a separate bounded batch transaction");
        assertEquals(1, priceRecordRepository.count());
    }

    @Test
    @DisplayName("Idempotent batch processing and clean supersession of demonstration benchmarks")
    void testIdempotentBatchProcessingAndSupersession() {
        // Pre-seed a DEMO_BENCHMARK record for the same crop, market, and date
        Mandi mandi = new Mandi();
        mandi.setCode("KHANNA_PB");
        mandi.setNameEn("Khanna");
        mandi.setNameHi("खन्ना");
        mandi.setState("Punjab");
        mandi.setDistrict("Ludhiana");
        mandi.setActive(true);
        if (mandiRepository.findByCode("KHANNA_PB").isEmpty()) {
            mandiRepository.save(mandi);
        }

        PriceRecord demoRecord = new PriceRecord();
        demoRecord.setCommodityCode("WHEAT");
        demoRecord.setMandiCode("KHANNA_PB");
        demoRecord.setMinPrice(new BigDecimal("2100.00"));
        demoRecord.setMaxPrice(new BigDecimal("2300.00"));
        demoRecord.setModalPrice(new BigDecimal("2200.00"));
        demoRecord.setPriceDate(LocalDate.of(2026, 11, 25));
        demoRecord.setVariety("Standard / FAQ");
        demoRecord.setProvenanceType(PriceRecord.PROVENANCE_DEMO);
        demoRecord.setVerified(false);
        priceRecordRepository.save(demoRecord);

        // Batch containing official live filing for the same commodity, mandi, and date
        ArrayNode batchNode = objectMapper.createArrayNode();
        ObjectNode rec = batchNode.addObject();
        rec.put("commodity", "Wheat");
        rec.put("state", "Punjab");
        rec.put("district", "Ludhiana");
        rec.put("market", "Khanna");
        rec.put("arrival_date", "25/11/2026");
        rec.put("variety", "Standard / FAQ");
        rec.put("min_price", "2300");
        rec.put("max_price", "2500");
        rec.put("modal_price", "2400");

        List<Commodity> commodities = commodityRepository.findAll();
        List<Mandi> mandis = mandiRepository.findAll();

        // Execution 1: Should supersede demo benchmark
        MandiPriceBatchPersistenceService.BatchPersistResult result1 =
                batchPersistenceService.persistBatch(List.of(rec), commodities, mandis, null);

        assertEquals(0, result1.inserted());
        assertEquals(1, result1.updated());
        assertEquals(1, priceRecordRepository.count());

        PriceRecord superseded = priceRecordRepository.findByCommodityCodeOrderByPriceDateDesc("WHEAT").get(0);
        assertEquals(PriceRecord.PROVENANCE_OFFICIAL, superseded.getProvenanceType());
        assertTrue(superseded.isVerified());
        assertEquals(new BigDecimal("2400.00"), superseded.getModalPrice());

        // Execution 2: Running exact same batch again must be idempotent
        MandiPriceBatchPersistenceService.BatchPersistResult result2 =
                batchPersistenceService.persistBatch(List.of(rec), commodities, mandis, null);

        assertEquals(0, result2.inserted());
        assertEquals(1, result2.updated());
        assertEquals(1, priceRecordRepository.count());
    }

    @Test
    @DisplayName("Simulate batch write rollback on fatal transaction failure")
    void testDatabaseWriteRollbackOnBatchFailure() {
        PriceRecordRepository mockRepo = org.mockito.Mockito.mock(PriceRecordRepository.class);
        MandiRepository mockMandiRepo = org.mockito.Mockito.mock(MandiRepository.class);

        org.mockito.Mockito.when(mockRepo.findByCommodityCodeAndMandiCodeAndPriceDateAndVariety(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString()
        )).thenReturn(java.util.Optional.empty());

        // Simulate database connection failure or deadlock on save
        org.mockito.Mockito.when(mockRepo.save(org.mockito.ArgumentMatchers.any(PriceRecord.class)))
                .thenThrow(new org.springframework.dao.CannotAcquireLockException("Simulated PostgreSQL lock acquisition failure"));

        MandiPriceBatchPersistenceService isolatedBatchService =
                new MandiPriceBatchPersistenceService(mockRepo, mockMandiRepo);

        ArrayNode batchNode = objectMapper.createArrayNode();
        ObjectNode rec = batchNode.addObject();
        rec.put("commodity", "Wheat");
        rec.put("state", "Punjab");
        rec.put("district", "Ludhiana");
        rec.put("market", "Khanna");
        rec.put("arrival_date", "25/11/2026");
        rec.put("variety", "Standard / FAQ");
        rec.put("min_price", "2200");
        rec.put("max_price", "2400");
        rec.put("modal_price", "2300");

        List<Commodity> commodities = commodityRepository.findAll();
        List<Mandi> mandis = mandiRepository.findAll();

        assertThrows(org.springframework.dao.DataAccessException.class, () -> {
            isolatedBatchService.persistBatch(List.of(rec), commodities, mandis, null);
        }, "Fatal DataAccessException must bubble up to trigger Spring transaction rollback");

        assertEquals(0, priceRecordRepository.count(), "No records should be committed when batch transaction rolls back");
    }
}
