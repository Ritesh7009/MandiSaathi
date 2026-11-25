package com.mandisaathi;

import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PriceRecordOptimizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CommodityRepository commodityRepository;

    @Autowired
    private MandiRepository mandiRepository;

    @Autowired
    private PriceRecordRepository priceRecordRepository;

    @BeforeEach
    void setUp() {
        priceRecordRepository.deleteAll();
        commodityRepository.deleteAll();
        mandiRepository.deleteAll();

        commodityRepository.save(new Commodity("WHEAT", "Wheat", "गेहूं", "ਕਣਕ", "CEREALS", "QUINTAL"));
        commodityRepository.save(new Commodity("RICE", "Rice", "चावल", "ਚੌਲ", "CEREALS", "QUINTAL"));

        mandiRepository.save(new Mandi("KHANNA_PB", "Khanna Mandi", "खन्ना मंडी", "ਖੰਨਾ ਮੰਡੀ", "Punjab", "Ludhiana", 30.7, 76.2, true));
        mandiRepository.save(new Mandi("SIRSA_HR", "Sirsa Mandi", "सिरसा मंडी", "ਸਿਰਸਾ ਮੰਡੀ", "Haryana", "Sirsa", 29.5, 75.0, true));
        mandiRepository.save(new Mandi("AMRITSAR_PB", "Amritsar Mandi", "अमृतसर मंडी", "ਅੰਮ੍ਰਿਤਸਰ ਮੰਡੀ", "Punjab", "Amritsar", 31.6, 74.8, true));
    }

    @Test
    void testInvalidPaginationParameters() throws Exception {
        mockMvc.perform(get("/api/v1/prices?page=-1"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/prices?page=10001"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/prices?size=0"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/prices?size=201"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testEmptyResultsReturnCleanListAndHeaders() throws Exception {
        mockMvc.perform(get("/api/v1/prices?commodityCode=NON_EXISTENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)))
                .andExpect(header().string("X-Total-Count", "0"))
                .andExpect(header().string("X-Total-Pages", "0"))
                .andExpect(header().string("X-Page-Number", "0"))
                .andExpect(header().string("X-Has-Next", "false"));
    }

    @Test
    void testDatabaseLevelFiltering() throws Exception {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        // Record 1: WHEAT, Sharbati, Punjab, OFFICIAL
        PriceRecord p1 = new PriceRecord();
        p1.setCommodityCode("WHEAT");
        p1.setMandiCode("KHANNA_PB");
        p1.setMinPrice(new BigDecimal("2300.00"));
        p1.setMaxPrice(new BigDecimal("2400.00"));
        p1.setModalPrice(new BigDecimal("2350.00"));
        p1.setPriceDate(today);
        p1.setVariety("Sharbati");
        p1.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        priceRecordRepository.save(p1);

        // Record 2: WHEAT, Lokwan, Haryana, DEMO
        PriceRecord p2 = new PriceRecord();
        p2.setCommodityCode("WHEAT");
        p2.setMandiCode("SIRSA_HR");
        p2.setMinPrice(new BigDecimal("2200.00"));
        p2.setMaxPrice(new BigDecimal("2300.00"));
        p2.setModalPrice(new BigDecimal("2250.00"));
        p2.setPriceDate(yesterday);
        p2.setVariety("Lokwan");
        p2.setProvenanceType(PriceRecord.PROVENANCE_DEMO);
        priceRecordRepository.save(p2);

        // Filter by variety
        mockMvc.perform(get("/api/v1/prices?variety=Sharbati"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].variety", is("Sharbati")));

        // Filter by provenanceType
        mockMvc.perform(get("/api/v1/prices?provenanceType=OFFICIAL_INGESTION"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].provenanceType", is("OFFICIAL_INGESTION")));

        // Filter by state
        mockMvc.perform(get("/api/v1/prices?state=Punjab"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].mandiCode", is("KHANNA_PB")));

        // Filter by priceDate
        mockMvc.perform(get("/api/v1/prices?priceDate=" + today))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].priceDate", is(today.toString())));
    }

    @Test
    void testDefaultQueryExcludesDemoBenchmarkRecords() throws Exception {
        LocalDate today = LocalDate.now();

        PriceRecord demo = new PriceRecord();
        demo.setCommodityCode("WHEAT");
        demo.setMandiCode("SIRSA_HR");
        demo.setMinPrice(new BigDecimal("2100.00"));
        demo.setMaxPrice(new BigDecimal("2200.00"));
        demo.setModalPrice(new BigDecimal("2150.00"));
        demo.setPriceDate(today);
        demo.setVariety("Standard");
        demo.setProvenanceType(PriceRecord.PROVENANCE_DEMO);
        demo.setVerified(false);
        priceRecordRepository.save(demo);

        PriceRecord official = new PriceRecord();
        official.setCommodityCode("WHEAT");
        official.setMandiCode("KHANNA_PB");
        official.setMinPrice(new BigDecimal("2300.00"));
        official.setMaxPrice(new BigDecimal("2400.00"));
        official.setModalPrice(new BigDecimal("2350.00"));
        official.setPriceDate(today);
        official.setVariety("Standard");
        official.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        official.setVerified(true);
        priceRecordRepository.save(official);

        // 1. Default query with no provenanceType specified MUST strictly exclude DEMO_BENCHMARK
        mockMvc.perform(get("/api/v1/prices?commodityCode=WHEAT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].mandiCode", is("KHANNA_PB")))
                .andExpect(jsonPath("$[0].provenanceType", is("OFFICIAL_INGESTION")));

        // 2. Explicit DEMO_BENCHMARK parameter allows querying demo benchmark
        mockMvc.perform(get("/api/v1/prices?commodityCode=WHEAT&provenanceType=DEMO_BENCHMARK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].mandiCode", is("SIRSA_HR")));

        // 3. Explicit ALL parameter returns both
        mockMvc.perform(get("/api/v1/prices?commodityCode=WHEAT&provenanceType=ALL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void testComparisonExcludesDemoBenchmarkRecords() throws Exception {
        LocalDate commonDate = LocalDate.now();

        // 2 mandis have demo benchmark records on the same date
        PriceRecord d1 = new PriceRecord();
        d1.setCommodityCode("WHEAT");
        d1.setMandiCode("KHANNA_PB");
        d1.setMinPrice(new BigDecimal("2300"));
        d1.setMaxPrice(new BigDecimal("2400"));
        d1.setModalPrice(new BigDecimal("2350"));
        d1.setPriceDate(commonDate);
        d1.setVariety("Standard");
        d1.setProvenanceType(PriceRecord.PROVENANCE_DEMO);
        priceRecordRepository.save(d1);

        PriceRecord d2 = new PriceRecord();
        d2.setCommodityCode("WHEAT");
        d2.setMandiCode("SIRSA_HR");
        d2.setMinPrice(new BigDecimal("2200"));
        d2.setMaxPrice(new BigDecimal("2300"));
        d2.setModalPrice(new BigDecimal("2250"));
        d2.setPriceDate(commonDate);
        d2.setVariety("Standard");
        d2.setProvenanceType(PriceRecord.PROVENANCE_DEMO);
        priceRecordRepository.save(d2);

        String json = """
            {
                "commodityCode": "WHEAT",
                "mandiCodes": ["KHANNA_PB", "SIRSA_HR"]
            }
            """;

        // Comparison MUST exclude demo benchmark records and report insufficient data
        mockMvc.perform(post("/api/v1/prices/compare")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.records", hasSize(0)))
                .andExpect(jsonPath("$.summaryEn", containsString("Insufficient comparative data")));
    }

    @Test
    void testDeterministicSortingAndStablePagination() throws Exception {
        LocalDate baseDate = LocalDate.now().minusDays(20);
        List<PriceRecord> records = new ArrayList<>();

        for (int i = 0; i < 15; i++) {
            PriceRecord p = new PriceRecord();
            p.setCommodityCode("WHEAT");
            p.setMandiCode("KHANNA_PB");
            p.setMinPrice(new BigDecimal("2000.00").add(BigDecimal.valueOf(i * 10)));
            p.setMaxPrice(new BigDecimal("2100.00").add(BigDecimal.valueOf(i * 10)));
            p.setModalPrice(new BigDecimal("2050.00").add(BigDecimal.valueOf(i * 10)));
            p.setPriceDate(baseDate.plusDays(i));
            p.setVariety("Standard");
            p.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
            p.setVerified(true);
            records.add(p);
        }
        priceRecordRepository.saveAll(records);

        // Fetch page 0, size 5
        mockMvc.perform(get("/api/v1/prices?commodityCode=WHEAT&page=0&size=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(header().string("X-Total-Count", "15"))
                .andExpect(header().string("X-Total-Pages", "3"))
                .andExpect(header().string("X-Has-Next", "true"))
                // Newest date first
                .andExpect(jsonPath("$[0].priceDate", is(baseDate.plusDays(14).toString())));

        // Fetch page 1, size 5
        mockMvc.perform(get("/api/v1/prices?commodityCode=WHEAT&page=1&size=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[0].priceDate", is(baseDate.plusDays(9).toString())));

        // Fetch page 2, size 5 (last page)
        mockMvc.perform(get("/api/v1/prices?commodityCode=WHEAT&page=2&size=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(header().string("X-Has-Next", "false"))
                .andExpect(jsonPath("$[4].priceDate", is(baseDate.toString())));
    }

    @Test
    void testDistinctVarietiesEndpoint() throws Exception {
        LocalDate today = LocalDate.now();

        PriceRecord p1 = new PriceRecord();
        p1.setCommodityCode("WHEAT");
        p1.setMandiCode("KHANNA_PB");
        p1.setMinPrice(new BigDecimal("2300"));
        p1.setMaxPrice(new BigDecimal("2400"));
        p1.setModalPrice(new BigDecimal("2350"));
        p1.setPriceDate(today);
        p1.setVariety("Sharbati");
        p1.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        p1.setVerified(true);
        priceRecordRepository.save(p1);

        PriceRecord p2 = new PriceRecord();
        p2.setCommodityCode("WHEAT");
        p2.setMandiCode("SIRSA_HR");
        p2.setMinPrice(new BigDecimal("2200"));
        p2.setMaxPrice(new BigDecimal("2300"));
        p2.setModalPrice(new BigDecimal("2250"));
        p2.setPriceDate(today);
        p2.setVariety("Lokwan");
        p2.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        p2.setVerified(true);
        priceRecordRepository.save(p2);

        mockMvc.perform(get("/api/v1/prices/varieties?commodityCode=WHEAT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0]", is("Lokwan")))
                .andExpect(jsonPath("$[1]", is("Sharbati")));
    }

    @Test
    void testDatabaseSideComparisonCorrectness() throws Exception {
        LocalDate commonDate = LocalDate.now().minusDays(2);
        LocalDate unalignedDate = LocalDate.now().minusDays(1);

        // KHANNA has unaligned date with Lokwan
        PriceRecord p1 = new PriceRecord();
        p1.setCommodityCode("WHEAT");
        p1.setMandiCode("KHANNA_PB");
        p1.setMinPrice(new BigDecimal("2400"));
        p1.setMaxPrice(new BigDecimal("2500"));
        p1.setModalPrice(new BigDecimal("2450"));
        p1.setPriceDate(unalignedDate);
        p1.setVariety("Lokwan");
        p1.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        p1.setVerified(true);
        priceRecordRepository.save(p1);

        // Both mandis have common date with Sharbati
        PriceRecord p2 = new PriceRecord();
        p2.setCommodityCode("WHEAT");
        p2.setMandiCode("KHANNA_PB");
        p2.setMinPrice(new BigDecimal("2300"));
        p2.setMaxPrice(new BigDecimal("2400"));
        p2.setModalPrice(new BigDecimal("2350"));
        p2.setPriceDate(commonDate);
        p2.setVariety("Sharbati");
        p2.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        p2.setVerified(true);
        priceRecordRepository.save(p2);

        PriceRecord p3 = new PriceRecord();
        p3.setCommodityCode("WHEAT");
        p3.setMandiCode("SIRSA_HR");
        p3.setMinPrice(new BigDecimal("2200"));
        p3.setMaxPrice(new BigDecimal("2300"));
        p3.setModalPrice(new BigDecimal("2250"));
        p3.setPriceDate(commonDate);
        p3.setVariety("Sharbati");
        p3.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        p3.setVerified(true);
        priceRecordRepository.save(p3);

        String json = """
            {
                "commodityCode": "WHEAT",
                "mandiCodes": ["KHANNA_PB", "SIRSA_HR"]
            }
            """;

        mockMvc.perform(post("/api/v1/prices/compare")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commodity.code", is("WHEAT")))
                .andExpect(jsonPath("$.commonDate", is(commonDate.toString())))
                .andExpect(jsonPath("$.commonVariety", is("Sharbati")))
                .andExpect(jsonPath("$.records", hasSize(2)))
                .andExpect(jsonPath("$.summaryEn", containsString("Spread: ₹100")));
    }
}

