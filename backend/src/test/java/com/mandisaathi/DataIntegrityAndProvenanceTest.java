package com.mandisaathi;

import com.mandisaathi.dto.PriceComparisonDto;
import com.mandisaathi.dto.PriceRecordDto;
import com.mandisaathi.dto.VoiceQueryRequest;
import com.mandisaathi.dto.VoiceQueryResponse;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import com.mandisaathi.service.PriceRecordService;
import com.mandisaathi.service.VoiceAssistantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class DataIntegrityAndProvenanceTest {

    @Autowired
    private PriceRecordRepository priceRecordRepository;

    @Autowired
    private CommodityRepository commodityRepository;

    @Autowired
    private MandiRepository mandiRepository;

    @Autowired
    private PriceRecordService priceRecordService;

    @Autowired
    private VoiceAssistantService voiceAssistantService;

    @BeforeEach
    void setUp() {
        priceRecordRepository.deleteAll();
        mandiRepository.deleteAll();
        commodityRepository.deleteAll();

        // 1. Seed Core Commodities
        commodityRepository.save(new Commodity("CUMIN", "Cumin (Jeera)", "जीरा", "ਜ਼ੀਰਾ", "SPICES", "QUINTAL"));
        commodityRepository.save(new Commodity("WHEAT", "Wheat", "गेहूं", "ਕਣਕ", "CEREALS", "QUINTAL"));

        // 2. Seed Core Mandis
        Mandi jodhpur = new Mandi();
        jodhpur.setCode("JODHPUR_GRAIN_RJ");
        jodhpur.setNameEn("Jodhpur (Grain)");
        jodhpur.setNameHi("जोधपुर (अनाज)");
        jodhpur.setNamePa("ਜੋਧਪੁਰ (ਅਨਾਜ)");
        jodhpur.setState("Rajasthan");
        jodhpur.setDistrict("Jodhpur");
        jodhpur.setActive(true);
        mandiRepository.save(jodhpur);

        Mandi sirsa = new Mandi();
        sirsa.setCode("SIRSA_HR");
        sirsa.setNameEn("Sirsa");
        sirsa.setNameHi("सिरसा");
        sirsa.setNamePa("ਸਿਰਸਾ");
        sirsa.setState("Haryana");
        sirsa.setDistrict("Sirsa");
        sirsa.setActive(true);
        mandiRepository.save(sirsa);

        Mandi khanna = new Mandi();
        khanna.setCode("KHANNA_PB");
        khanna.setNameEn("Khanna");
        khanna.setNameHi("खन्ना");
        khanna.setNamePa("ਖੰਨਾ");
        khanna.setState("Punjab");
        khanna.setDistrict("Ludhiana");
        khanna.setActive(true);
        mandiRepository.save(khanna);
    }

    @Test
    @DisplayName("1. Provenance Separation: Entity defaults and tiers are strictly honored")
    void testProvenanceTiersAndDefaults() {
        PriceRecord demoRecord = new PriceRecord();
        demoRecord.setCommodityCode("WHEAT");
        demoRecord.setMandiCode("SIRSA_HR");
        demoRecord.setMinPrice(new BigDecimal("2200.00"));
        demoRecord.setMaxPrice(new BigDecimal("2400.00"));
        demoRecord.setModalPrice(new BigDecimal("2300.00"));
        demoRecord.setPriceDate(LocalDate.of(2024, 11, 20));
        demoRecord.setVariety("Standard / FAQ");
        // Do not explicitly set provenance or verified - test defaults!
        PriceRecord savedDemo = priceRecordRepository.save(demoRecord);

        assertEquals(PriceRecord.PROVENANCE_DEMO, savedDemo.getProvenanceType());
        assertFalse(savedDemo.isVerified(), "Default demonstration records must be marked unverified");
        assertEquals("MandiSaathi Demonstration Benchmark", savedDemo.getDataSource());

        PriceRecord historicalRecord = new PriceRecord();
        historicalRecord.setCommodityCode("CUMIN");
        historicalRecord.setMandiCode("JODHPUR_GRAIN_RJ");
        historicalRecord.setMinPrice(new BigDecimal("24000.00"));
        historicalRecord.setMaxPrice(new BigDecimal("27000.00"));
        historicalRecord.setModalPrice(new BigDecimal("25500.00"));
        historicalRecord.setPriceDate(LocalDate.of(2024, 11, 20));
        historicalRecord.setVariety("Standard / Machine Cleaned");
        historicalRecord.setProvenanceType(PriceRecord.PROVENANCE_HISTORICAL);
        historicalRecord.setVerified(true);
        historicalRecord.setDataSource("Agmarknet Official Archive (DES/MoAFW)");
        PriceRecord savedHist = priceRecordRepository.save(historicalRecord);

        assertEquals(PriceRecord.PROVENANCE_HISTORICAL, savedHist.getProvenanceType());
        assertTrue(savedHist.isVerified(), "Historical archives must be marked verified");

        PriceRecord officialRecord = new PriceRecord();
        officialRecord.setCommodityCode("WHEAT");
        officialRecord.setMandiCode("KHANNA_PB");
        officialRecord.setMinPrice(new BigDecimal("2300.00"));
        officialRecord.setMaxPrice(new BigDecimal("2500.00"));
        officialRecord.setModalPrice(new BigDecimal("2400.00"));
        officialRecord.setPriceDate(LocalDate.of(2024, 11, 20));
        officialRecord.setVariety("Standard / FAQ");
        officialRecord.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        officialRecord.setVerified(true);
        officialRecord.setDataSource("Agmarknet (data.gov.in API)");
        PriceRecord savedOff = priceRecordRepository.save(officialRecord);

        assertEquals(PriceRecord.PROVENANCE_OFFICIAL, savedOff.getProvenanceType());
        assertTrue(savedOff.isVerified(), "Official live filings must be marked verified");
    }

    @Test
    @DisplayName("2. Repository Query Prioritization: Verified records take precedence over unverified records")
    void testQueryPrioritization() {
        LocalDate date = LocalDate.of(2024, 11, 20);

        PriceRecord demo = new PriceRecord();
        demo.setCommodityCode("WHEAT");
        demo.setMandiCode("SIRSA_HR");
        demo.setMinPrice(new BigDecimal("2100.00"));
        demo.setMaxPrice(new BigDecimal("2300.00"));
        demo.setModalPrice(new BigDecimal("2200.00"));
        demo.setPriceDate(date);
        demo.setVariety("Variety A");
        demo.setProvenanceType(PriceRecord.PROVENANCE_DEMO);
        demo.setVerified(false);
        priceRecordRepository.save(demo);

        PriceRecord verified = new PriceRecord();
        verified.setCommodityCode("WHEAT");
        verified.setMandiCode("SIRSA_HR");
        verified.setMinPrice(new BigDecimal("2300.00"));
        verified.setMaxPrice(new BigDecimal("2500.00"));
        verified.setModalPrice(new BigDecimal("2400.00"));
        verified.setPriceDate(date);
        verified.setVariety("Variety B");
        verified.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        verified.setVerified(true);
        priceRecordRepository.save(verified);

        List<PriceRecord> results = priceRecordRepository.findByCommodityCodeAndMandiCodeOrderByPriceDateDesc("WHEAT", "SIRSA_HR");
        assertFalse(results.isEmpty());
        assertEquals("Variety B", results.get(0).getVariety(), "Verified record must be prioritized at the head of the list");
        assertTrue(results.get(0).isVerified());
    }

    @Test
    @DisplayName("3. Required Regression Case: What is the price of jeera in Jeera Mandi Jodhpur?")
    void testJeeraMandiJodhpurRegression() {
        PriceRecord jodhpurJeera = new PriceRecord();
        jodhpurJeera.setCommodityCode("CUMIN");
        jodhpurJeera.setMandiCode("JODHPUR_GRAIN_RJ");
        jodhpurJeera.setMinPrice(new BigDecimal("24200.00"));
        jodhpurJeera.setMaxPrice(new BigDecimal("27500.00"));
        jodhpurJeera.setModalPrice(new BigDecimal("25800.00"));
        jodhpurJeera.setPriceDate(LocalDate.of(2024, 11, 20));
        jodhpurJeera.setVariety("Standard / Machine Cleaned");
        jodhpurJeera.setProvenanceType(PriceRecord.PROVENANCE_HISTORICAL);
        jodhpurJeera.setVerified(true);
        jodhpurJeera.setDataSource("Agmarknet Official Archive (DES/MoAFW)");
        priceRecordRepository.save(jodhpurJeera);

        VoiceQueryResponse response = voiceAssistantService.processTextQuery(
                new VoiceQueryRequest("What is the price of jeera in Jeera Mandi Jodhpur?", "en")
        );

        assertNotNull(response);
        assertEquals("MANDI_PRICE_LOOKUP", response.intent());
        assertEquals("CUMIN", response.extractedEntities().get("commodity"));
        assertEquals("JODHPUR_GRAIN_RJ", response.extractedEntities().get("mandi"));
        assertTrue(response.responseText().contains("25800"));
        assertTrue(response.responseText().contains("Standard / Machine Cleaned"));
        assertEquals("2024-11-20", response.reportingDate());
        assertEquals("Agmarknet Official Archive (DES/MoAFW)", response.source());
    }

    @Test
    @DisplayName("4. Today's Price Query when Filing is Unavailable explicitly states today's filing is not yet released")
    void testTodayPriceQueryReportsFilingUnavailable() {
        PriceRecord pastFiling = new PriceRecord();
        pastFiling.setCommodityCode("WHEAT");
        pastFiling.setMandiCode("SIRSA_HR");
        pastFiling.setMinPrice(new BigDecimal("2250.00"));
        pastFiling.setMaxPrice(new BigDecimal("2350.00"));
        pastFiling.setModalPrice(new BigDecimal("2300.00"));
        pastFiling.setPriceDate(LocalDate.of(2024, 11, 20));
        pastFiling.setVariety("Standard / FAQ");
        pastFiling.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        pastFiling.setVerified(true);
        pastFiling.setDataSource("Agmarknet (data.gov.in API)");
        priceRecordRepository.save(pastFiling);

        VoiceQueryResponse response = voiceAssistantService.processTextQuery(
                new VoiceQueryRequest("What is today's price of wheat in Sirsa?", "en")
        );

        assertNotNull(response);
        assertTrue(response.responseText().contains("Today's official filing is not yet released"),
                "Must explicitly report that today's official report has not been released");
        assertTrue(response.responseText().contains("Last available reported rate (2024-11-20)"),
                "Must state the genuine historical date of the last available record");
        assertTrue(response.responseText().contains("2300"));
    }

    @Test
    @DisplayName("5. Mandi Price Comparison preserves variety alignment and date integrity")
    void testMandiComparisonIntegrity() {
        LocalDate commonDate = LocalDate.of(2024, 11, 20);

        PriceRecord r1 = new PriceRecord();
        r1.setCommodityCode("WHEAT");
        r1.setMandiCode("SIRSA_HR");
        r1.setMinPrice(new BigDecimal("2200.00"));
        r1.setMaxPrice(new BigDecimal("2350.00"));
        r1.setModalPrice(new BigDecimal("2280.00"));
        r1.setPriceDate(commonDate);
        r1.setVariety("Standard / FAQ");
        r1.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        r1.setVerified(true);
        priceRecordRepository.save(r1);

        PriceRecord r2 = new PriceRecord();
        r2.setCommodityCode("WHEAT");
        r2.setMandiCode("KHANNA_PB");
        r2.setMinPrice(new BigDecimal("2300.00"));
        r2.setMaxPrice(new BigDecimal("2450.00"));
        r2.setModalPrice(new BigDecimal("2380.00"));
        r2.setPriceDate(commonDate);
        r2.setVariety("Standard / FAQ");
        r2.setProvenanceType(PriceRecord.PROVENANCE_OFFICIAL);
        r2.setVerified(true);
        priceRecordRepository.save(r2);

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("SIRSA_HR", "KHANNA_PB"), "Standard / FAQ");

        assertNotNull(comparison);
        assertEquals(2, comparison.records().size());
        assertEquals(commonDate, comparison.commonDate());
        assertEquals("Standard / FAQ", comparison.commonVariety());
        assertTrue(comparison.summaryEn().contains("2380"));
        assertTrue(comparison.summaryEn().contains("2280"));
        assertTrue(comparison.summaryEn().contains("100")); // price spread
    }
}
