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
    @DisplayName("Comparison succeeds when all requested mandis have records for an identical reporting date")
    void comparisonSucceedsOnSameDate() {
        LocalDate commonDate = LocalDate.of(2026, 11, 8);

        PriceRecord r1 = createRecord("WHEAT", "KHANNA_PB", commonDate, "2300.00", "2400.00", "2350.00");
        PriceRecord r2 = createRecord("WHEAT", "SIRSA_HR", commonDate, "2250.00", "2350.00", "2300.00");
        priceRecordRepository.saveAll(List.of(r1, r2));

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("KHANNA_PB", "SIRSA_HR"));

        assertNotNull(comparison);
        assertEquals(2, comparison.records().size());
        assertEquals(commonDate, comparison.records().get(0).priceDate());
        assertEquals(commonDate, comparison.records().get(1).priceDate());
        assertTrue(comparison.summaryEn().contains("2026-11-08"));
        assertTrue(comparison.summaryEn().contains("Spread: ₹50.00"));
    }

    @Test
    @DisplayName("Comparison returns insufficient data when selected mandis have different reporting dates")
    void comparisonReturnsInsufficientDataWhenDatesDiffer() {
        LocalDate date1 = LocalDate.of(2026, 11, 8);
        LocalDate date2 = LocalDate.of(2026, 11, 5); // 3 days earlier

        // Khanna only on Nov 8, Sirsa only on Nov 5
        PriceRecord r1 = createRecord("WHEAT", "KHANNA_PB", date1, "2300.00", "2400.00", "2350.00");
        PriceRecord r2 = createRecord("WHEAT", "SIRSA_HR", date2, "2250.00", "2350.00", "2300.00");
        priceRecordRepository.saveAll(List.of(r1, r2));

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("KHANNA_PB", "SIRSA_HR"));

        assertNotNull(comparison);
        assertTrue(comparison.records().isEmpty(), "Records must be empty when no common date exists");
        assertTrue(comparison.summaryEn().contains("Insufficient comparative data"));
        assertTrue(comparison.summaryEn().contains("common reporting date"));
    }

    @Test
    @DisplayName("Comparison picks the latest common date when multiple common dates exist")
    void comparisonPicksLatestCommonDate() {
        LocalDate olderCommonDate = LocalDate.of(2026, 11, 2);
        LocalDate newerCommonDate = LocalDate.of(2026, 11, 7);

        // Older date records
        PriceRecord old1 = createRecord("WHEAT", "KHANNA_PB", olderCommonDate, "2200.00", "2300.00", "2250.00");
        PriceRecord old2 = createRecord("WHEAT", "SIRSA_HR", olderCommonDate, "2180.00", "2280.00", "2230.00");

        // Newer date records
        PriceRecord new1 = createRecord("WHEAT", "KHANNA_PB", newerCommonDate, "2320.00", "2420.00", "2380.00");
        PriceRecord new2 = createRecord("WHEAT", "SIRSA_HR", newerCommonDate, "2280.00", "2380.00", "2330.00");

        priceRecordRepository.saveAll(List.of(old1, old2, new1, new2));

        PriceComparisonDto comparison = priceRecordService.comparePrices("WHEAT", List.of("KHANNA_PB", "SIRSA_HR"));

        assertEquals(2, comparison.records().size());
        assertEquals(newerCommonDate, comparison.records().get(0).priceDate());
        assertEquals(newerCommonDate, comparison.records().get(1).priceDate());
    }

    private PriceRecord createRecord(String commodity, String mandi, LocalDate date, String min, String max, String modal) {
        PriceRecord r = new PriceRecord();
        r.setCommodityCode(commodity);
        r.setMandiCode(mandi);
        r.setPriceDate(date);
        r.setMinPrice(new BigDecimal(min));
        r.setMaxPrice(new BigDecimal(max));
        r.setModalPrice(new BigDecimal(modal));
        r.setUnit("QUINTAL");
        r.setDataSource("Agmarknet");
        r.setVariety("Standard / FAQ");
        r.setProvenanceType("SEEDED_BASELINE");
        return r;
    }
}

