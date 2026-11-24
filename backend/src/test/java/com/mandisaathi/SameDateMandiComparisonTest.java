package com.mandisaathi;

import com.mandisaathi.dto.PriceComparisonDto;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import com.mandisaathi.service.PriceRecordService;
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
class SameDateMandiComparisonTest {

    @Autowired
    private PriceRecordService priceRecordService;

    @Autowired
    private PriceRecordRepository priceRecordRepository;

    @Autowired
    private CommodityRepository commodityRepository;

    @Autowired
    private MandiRepository mandiRepository;

    @BeforeEach
    void setUp() {
        priceRecordRepository.deleteAll();

        if (commodityRepository.findByCode("WHEAT").isEmpty()) {
            commodityRepository.save(new Commodity("WHEAT", "Wheat", "गेहूं", "ਕਣਕ", "GRAINS", "QUINTAL"));
        }

        if (mandiRepository.findByCode("KHANNA_PB").isEmpty()) {
            mandiRepository.save(new Mandi("KHANNA_PB", "Khanna Mandi", "खन्ना मंडी", "ਖੰਨਾ ਮੰਡੀ", "Punjab", "Ludhiana", 30.70, 76.22, true));
        }
        if (mandiRepository.findByCode("SIRSA_HR").isEmpty()) {
            mandiRepository.save(new Mandi("SIRSA_HR", "Sirsa Mandi", "सिरसा मंडी", "ਸਿਰਸਾ ਮੰਡੀ", "Haryana", "Sirsa", 29.53, 75.03, true));
        }
        if (mandiRepository.findByCode("KARNAL_HR").isEmpty()) {
            mandiRepository.save(new Mandi("KARNAL_HR", "Karnal Mandi", "करनाल मंडी", "ਕਰਨਾਲ ਮੰਡੀ", "Haryana", "Karnal", 29.68, 76.98, true));
        }
    }

    @Test
    @DisplayName("Comparison succeeds when all requested mandis have records for an identical reporting date and variety")
    void comparisonSucceedsOnSameDateAndVariety() {
        LocalDate commonDate = LocalDate.of(2026, 11, 8);

        PriceRecord r1 = createRecord("WHEAT", "KHANNA_PB", commonDate, "2300.00", "2400.00", "2350.00", "Standard / FAQ");
        PriceRecord r2 = createRecord("WHEAT", "SIRSA_HR", commonDate, "2250.00", "2350.00", "2300.00", "Standard / FAQ");
        priceRecordRepository.saveAll(List.of(r1, r2));

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("KHANNA_PB", "SIRSA_HR"));

        assertNotNull(comparison);
        assertEquals(2, comparison.records().size());
        assertEquals(commonDate, comparison.records().get(0).priceDate());
        assertEquals(commonDate, comparison.records().get(1).priceDate());
        assertEquals("Standard / FAQ", comparison.records().get(0).variety());
        assertEquals("Standard / FAQ", comparison.records().get(1).variety());
        assertTrue(comparison.summaryEn().contains("2026-11-08"));
        assertTrue(comparison.summaryEn().contains("Spread: ₹50.00"));
    }

    @Test
    @DisplayName("Comparison returns insufficient data when mandis have the same date but completely different varieties")
    void comparisonFailsWhenVarietiesDifferOnSameDate() {
        LocalDate commonDate = LocalDate.of(2026, 11, 8);

        // Khanna has Sharbati, Sirsa has Kalyan Sona on the exact same date
        PriceRecord r1 = createRecord("WHEAT", "KHANNA_PB", commonDate, "2800.00", "3000.00", "2900.00", "Sharbati");
        PriceRecord r2 = createRecord("WHEAT", "SIRSA_HR", commonDate, "2200.00", "2300.00", "2250.00", "Kalyan Sona");
        priceRecordRepository.saveAll(List.of(r1, r2));

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("KHANNA_PB", "SIRSA_HR"));

        assertNotNull(comparison);
        assertTrue(comparison.records().isEmpty(), "Must not compare disparate crop varieties across mandis");
        assertTrue(comparison.summaryEn().contains("Insufficient comparative data"));
        assertTrue(comparison.summaryEn().contains("same crop variety"));
    }

    @Test
    @DisplayName("Comparison matches on the common variety when multiple varieties exist on the same date")
    void comparisonMatchesOnCommonVariety() {
        LocalDate commonDate = LocalDate.of(2026, 11, 8);

        // Khanna has Desi (high modal 3200) and Sharbati (modal 2500)
        PriceRecord khannaDesi = createRecord("WHEAT", "KHANNA_PB", commonDate, "3000.00", "3400.00", "3200.00", "Desi");
        PriceRecord khannaSharbati = createRecord("WHEAT", "KHANNA_PB", commonDate, "2400.00", "2600.00", "2500.00", "Sharbati");

        // Sirsa ONLY has Sharbati (modal 2450)
        PriceRecord sirsaSharbati = createRecord("WHEAT", "SIRSA_HR", commonDate, "2400.00", "2500.00", "2450.00", "Sharbati");

        priceRecordRepository.saveAll(List.of(khannaDesi, khannaSharbati, sirsaSharbati));

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("KHANNA_PB", "SIRSA_HR"));

        assertEquals(2, comparison.records().size());
        assertEquals("Sharbati", comparison.records().get(0).variety());
        assertEquals("Sharbati", comparison.records().get(1).variety());
        // Crucial verification: Khanna modal must be 2500 (Sharbati), NOT 3200 (Desi highest modal price!)
        assertEquals(new BigDecimal("2500.00"), comparison.records().stream()
                .filter(r -> "KHANNA_PB".equals(r.mandiCode()))
                .findFirst().get().modalPrice());
    }

    @Test
    @DisplayName("Comparison returns insufficient data when selected mandis have different reporting dates")
    void comparisonReturnsInsufficientDataWhenDatesDiffer() {
        LocalDate date1 = LocalDate.of(2026, 11, 8);
        LocalDate date2 = LocalDate.of(2026, 11, 5); // 3 days earlier

        PriceRecord r1 = createRecord("WHEAT", "KHANNA_PB", date1, "2300.00", "2400.00", "2350.00", "Standard / FAQ");
        PriceRecord r2 = createRecord("WHEAT", "SIRSA_HR", date2, "2250.00", "2350.00", "2300.00", "Standard / FAQ");
        priceRecordRepository.saveAll(List.of(r1, r2));

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("KHANNA_PB", "SIRSA_HR"));

        assertNotNull(comparison);
        assertTrue(comparison.records().isEmpty(), "Records must be empty when no common date exists");
        assertTrue(comparison.summaryEn().contains("Insufficient comparative data"));
    }

    @Test
    @DisplayName("Comparison handles duplicate records deterministically without throwing or blending")
    void comparisonHandlesDuplicateRecordsDeterministically() {
        LocalDate commonDate = LocalDate.of(2026, 11, 8);

        // Khanna has two records for same variety and date
        PriceRecord r1a = createRecord("WHEAT", "KHANNA_PB", commonDate, "2300.00", "2400.00", "2350.00", "Standard / FAQ");
        PriceRecord r1b = createRecord("WHEAT", "KHANNA_PB", commonDate, "2310.00", "2410.00", "2360.00", "Standard / FAQ");
        PriceRecord r2 = createRecord("WHEAT", "SIRSA_HR", commonDate, "2250.00", "2350.00", "2300.00", "Standard / FAQ");

        priceRecordRepository.saveAll(List.of(r1a, r1b, r2));

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("KHANNA_PB", "SIRSA_HR"));

        assertEquals(2, comparison.records().size(), "Deduplication must yield exactly 2 records (1 per mandi)");
    }

    @Test
    @DisplayName("Targeted variety comparison succeeds when requested variety is shared across mandis")
    void targetedVarietyComparisonSucceeds() {
        LocalDate commonDate = LocalDate.of(2026, 11, 8);

        PriceRecord r1 = createRecord("WHEAT", "KHANNA_PB", commonDate, "2800.00", "3000.00", "2900.00", "Sharbati");
        PriceRecord r2 = createRecord("WHEAT", "SIRSA_HR", commonDate, "2750.00", "2950.00", "2850.00", "Sharbati");
        priceRecordRepository.saveAll(List.of(r1, r2));

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("KHANNA_PB", "SIRSA_HR"), "Sharbati");

        assertNotNull(comparison);
        assertEquals(2, comparison.records().size());
        assertEquals("Sharbati", comparison.commonVariety());
        assertEquals(commonDate, comparison.commonDate());
        assertEquals("Sharbati", comparison.records().get(0).variety());
    }

    @Test
    @DisplayName("Targeted variety comparison returns insufficient data when requested variety is absent")
    void targetedVarietyComparisonFailsWhenAbsent() {
        LocalDate commonDate = LocalDate.of(2026, 11, 8);

        PriceRecord r1 = createRecord("WHEAT", "KHANNA_PB", commonDate, "2800.00", "3000.00", "2900.00", "Sharbati");
        PriceRecord r2 = createRecord("WHEAT", "SIRSA_HR", commonDate, "2750.00", "2950.00", "2850.00", "Sharbati");
        priceRecordRepository.saveAll(List.of(r1, r2));

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("KHANNA_PB", "SIRSA_HR"), "Basmati");

        assertNotNull(comparison);
        assertTrue(comparison.records().isEmpty());
        assertTrue(comparison.summaryEn().contains("Basmati"));
    }

    private PriceRecord createRecord(String commodity, String mandi, LocalDate date, String min, String max, String modal, String variety) {
        PriceRecord r = new PriceRecord();
        r.setCommodityCode(commodity);
        r.setMandiCode(mandi);
        r.setPriceDate(date);
        r.setMinPrice(new BigDecimal(min));
        r.setMaxPrice(new BigDecimal(max));
        r.setModalPrice(new BigDecimal(modal));
        r.setUnit("QUINTAL");
        r.setDataSource("Agmarknet");
        r.setVariety(variety != null ? variety : "Standard / FAQ");
        r.setProvenanceType("SEEDED_BASELINE");
        return r;
    }
}
