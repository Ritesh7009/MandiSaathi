package com.mandisaathi.service;

import com.mandisaathi.dto.CommodityDto;
import com.mandisaathi.dto.PriceComparisonDto;
import com.mandisaathi.dto.PriceRecordDto;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.exception.ResourceNotFoundException;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PriceRecordService {

    private final PriceRecordRepository priceRecordRepository;
    private final CommodityRepository commodityRepository;
    private final MandiRepository mandiRepository;

    public PriceRecordService(
            PriceRecordRepository priceRecordRepository,
            CommodityRepository commodityRepository,
            MandiRepository mandiRepository
    ) {
        this.priceRecordRepository = priceRecordRepository;
        this.commodityRepository = commodityRepository;
        this.mandiRepository = mandiRepository;
    }

    public List<PriceRecordDto> getPrices(String commodityCode, String mandiCode) {
        List<PriceRecord> records = priceRecordRepository.searchPrices(commodityCode, mandiCode);
        return enrichRecords(records);
    }

    public PriceComparisonDto comparePrices(String commodityCode, List<String> mandiCodes) {
        Commodity commodity = commodityRepository.findByCode(commodityCode)
                .orElseThrow(() -> new ResourceNotFoundException("Commodity not found with code: " + commodityCode));

        List<PriceRecord> candidates;
        boolean specificMandisRequested = mandiCodes != null && !mandiCodes.isEmpty();
        if (specificMandisRequested) {
            candidates = priceRecordRepository.findByCommodityCodeAndMandiCodeInOrderByPriceDateDesc(commodityCode, mandiCodes);
        } else {
            candidates = priceRecordRepository.findByCommodityCodeOrderByPriceDateDesc(commodityCode);
        }

        CommodityDto commodityDto = toCommodityDto(commodity);

        if (candidates.isEmpty()) {
            return new PriceComparisonDto(
                    commodityDto,
                    Collections.emptyList(),
                    "No market price records are currently filed for " + commodity.getNameEn() + ".",
                    commodity.getNameHi() + " के लिए कोई भाव उपलब्ध नहीं है।",
                    (commodity.getNamePa() != null ? commodity.getNamePa() : commodity.getNameEn()) + " ਲਈ ਕੋਈ ਭਾਅ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।"
            );
        }

        // Group candidate records by reporting date
        Map<LocalDate, List<PriceRecord>> recordsByDate = candidates.stream()
                .collect(Collectors.groupingBy(PriceRecord::getPriceDate));

        // Sort reporting dates in descending order (newest first)
        List<LocalDate> sortedDates = recordsByDate.keySet().stream()
                .sorted(Comparator.reverseOrder())
                .toList();

        LocalDate commonDate = null;
        List<PriceRecord> validRecordsForComparison = Collections.emptyList();

        for (LocalDate date : sortedDates) {
            List<PriceRecord> recordsOnDate = recordsByDate.get(date);
            Set<String> mandisReportingOnDate = recordsOnDate.stream()
                    .map(PriceRecord::getMandiCode)
                    .collect(Collectors.toSet());

            if (specificMandisRequested) {
                // All requested mandis must have reported on this identical date
                if (mandisReportingOnDate.containsAll(mandiCodes)) {
                    commonDate = date;
                    // Deduplicate per mandi (pick record with highest modal price if multiple varieties exist)
                    validRecordsForComparison = recordsOnDate.stream()
                            .filter(r -> mandiCodes.contains(r.getMandiCode()))
                            .collect(Collectors.toMap(PriceRecord::getMandiCode, r -> r, (r1, r2) -> r1.getModalPrice().compareTo(r2.getModalPrice()) >= 0 ? r1 : r2))
                            .values().stream().toList();
                    break;
                }
            } else {
                // If no specific mandis requested, find the latest date where at least 2 distinct mandis reported
                if (mandisReportingOnDate.size() >= 2) {
                    commonDate = date;
                    validRecordsForComparison = recordsOnDate.stream()
                            .collect(Collectors.toMap(PriceRecord::getMandiCode, r -> r, (r1, r2) -> r1.getModalPrice().compareTo(r2.getModalPrice()) >= 0 ? r1 : r2))
                            .values().stream().toList();
                    break;
                }
            }
        }

        if (commonDate == null || validRecordsForComparison.isEmpty() || (specificMandisRequested && validRecordsForComparison.size() < mandiCodes.size())) {
            // Insufficient common date data
            String summaryEn = "Insufficient comparative data: The selected mandis do not have price records for a common reporting date. Market comparisons require aligned reporting dates to prevent misleading price spreads.";
            String summaryHi = "अपर्याप्त तुलनात्मक डेटा: चयनित मंडियों में एक ही रिपोर्टिंग तिथि के लिए मूल्य रिकॉर्ड उपलब्ध नहीं हैं। भ्रामक मूल्य अंतर से बचने के लिए समान तिथि का डेटा आवश्यक है।";
            String summaryPa = "ਨਾਕਾਫ਼ੀ ਤੁਲਨਾਤਮਕ ਡਾਟਾ: ਚੁਣੀਆਂ ਗਈਆਂ ਮੰਡੀਆਂ ਲਈ ਇੱਕੋ ਰਿਪੋਰਟਿੰਗ ਮਿਤੀ ਦੇ ਭਾਅ ਰਿਕਾਰਡ ਉਪਲਬਧ ਨਹੀਂ ਹਨ। ਗੁੰਮਰਾਹਕੁੰਨ ਭਾਅ ਅੰਤਰ ਤੋਂ ਬਚਣ ਲਈ ਸਾਂਝੀ ਮਿਤੀ ਜ਼ਰੂਰੀ ਹੈ।";

            return new PriceComparisonDto(commodityDto, Collections.emptyList(), summaryEn, summaryHi, summaryPa);
        }

        List<PriceRecordDto> dtos = enrichRecords(validRecordsForComparison);

        String summaryEn = generateSummaryEn(commodity, dtos, commonDate);
        String summaryHi = generateSummaryHi(commodity, dtos, commonDate);
        String summaryPa = generateSummaryPa(commodity, dtos, commonDate);

        return new PriceComparisonDto(commodityDto, dtos, summaryEn, summaryHi, summaryPa);
    }

    private CommodityDto toCommodityDto(Commodity commodity) {
        return new CommodityDto(
                commodity.getId(),
                commodity.getCode(),
                commodity.getNameEn(),
                commodity.getNameHi(),
                commodity.getNamePa(),
                commodity.getCategory(),
                commodity.getDefaultUnit()
        );
    }

    private List<PriceRecordDto> enrichRecords(List<PriceRecord> records) {
        if (records.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, Commodity> commodityMap = commodityRepository.findAll().stream()
                .collect(Collectors.toMap(Commodity::getCode, Function.identity(), (a, b) -> a));

        Map<String, Mandi> mandiMap = mandiRepository.findAll().stream()
                .collect(Collectors.toMap(Mandi::getCode, Function.identity(), (a, b) -> a));

        return records.stream().map(r -> {
            Commodity c = commodityMap.get(r.getCommodityCode());
            Mandi m = mandiMap.get(r.getMandiCode());

            return new PriceRecordDto(
                    r.getId(),
                    r.getCommodityCode(),
                    c != null ? c.getNameEn() : r.getCommodityCode(),
                    c != null ? c.getNameHi() : r.getCommodityCode(),
                    c != null ? c.getNamePa() : null,
                    r.getMandiCode(),
                    m != null ? m.getNameEn() : r.getMandiCode(),
                    m != null ? m.getNameHi() : r.getMandiCode(),
                    m != null ? m.getNamePa() : null,
                    m != null ? m.getState() : "",
                    m != null ? m.getDistrict() : "",
                    r.getMinPrice(),
                    r.getMaxPrice(),
                    r.getModalPrice(),
                    r.getPriceDate(),
                    r.getArrivalQuantity(),
                    r.getUnit(),
                    r.getDataSource(),
                    r.getVariety(),
                    r.getProvenanceType(),
                    r.isVerified()
            );
        }).toList();
    }

    private String generateSummaryEn(Commodity c, List<PriceRecordDto> dtos, LocalDate commonDate) {
        if (dtos.isEmpty()) {
            return "No verified market price records are currently filed for " + c.getNameEn() + ".";
        }
        Optional<PriceRecordDto> maxRecord = dtos.stream().max(Comparator.comparing(PriceRecordDto::modalPrice));
        Optional<PriceRecordDto> minRecord = dtos.stream().min(Comparator.comparing(PriceRecordDto::modalPrice));
        if (maxRecord.isPresent() && minRecord.isPresent() && !maxRecord.get().equals(minRecord.get())) {
            return String.format("For %s on %s, %s reports the highest modal price of ₹%s/qtl, while %s reports ₹%s/qtl (Spread: ₹%s).",
                    c.getNameEn(), commonDate,
                    maxRecord.get().mandiNameEn(), maxRecord.get().modalPrice(),
                    minRecord.get().mandiNameEn(), minRecord.get().modalPrice(),
                    maxRecord.get().modalPrice().subtract(minRecord.get().modalPrice()));
        }
        return String.format("Verified modal price for %s on %s is ₹%s/qtl.", c.getNameEn(), commonDate, dtos.get(0).modalPrice());
    }

    private String generateSummaryHi(Commodity c, List<PriceRecordDto> dtos, LocalDate commonDate) {
        if (dtos.isEmpty()) {
            return c.getNameHi() + " के लिए वर्तमान में कोई प्रमाणित भाव दर्ज नहीं है।";
        }
        Optional<PriceRecordDto> maxRecord = dtos.stream().max(Comparator.comparing(PriceRecordDto::modalPrice));
        Optional<PriceRecordDto> minRecord = dtos.stream().min(Comparator.comparing(PriceRecordDto::modalPrice));
        if (maxRecord.isPresent() && minRecord.isPresent() && !maxRecord.get().equals(minRecord.get())) {
            return String.format("%s के लिए (%s) %s में उच्चतम मॉडल भाव ₹%s/क्विंटल और %s में ₹%s/क्विंटल दर्ज किया गया (अंतर: ₹%s)।",
                    c.getNameHi(), commonDate,
                    maxRecord.get().mandiNameHi(), maxRecord.get().modalPrice(),
                    minRecord.get().mandiNameHi(), minRecord.get().modalPrice(),
                    maxRecord.get().modalPrice().subtract(minRecord.get().modalPrice()));
        }
        return String.format("%s का प्रमाणित मॉडल भाव (%s) ₹%s/क्विंटल है।", c.getNameHi(), commonDate, dtos.get(0).modalPrice());
    }

    private String generateSummaryPa(Commodity c, List<PriceRecordDto> dtos, LocalDate commonDate) {
        String name = c.getNamePa() != null ? c.getNamePa() : c.getNameEn();
        if (dtos.isEmpty()) {
            return name + " ਲਈ ਇਸ ਵੇਲੇ ਕੋਈ ਪ੍ਰਮਾਣਿਤ ਭਾਅ ਦਰਜ ਨਹੀਂ ਹੈ।";
        }
        Optional<PriceRecordDto> maxRecord = dtos.stream().max(Comparator.comparing(PriceRecordDto::modalPrice));
        return String.format("%s ਦਾ ਪ੍ਰਮਾਣਿਤ ਮਾਡਲ ਭਾਅ (%s) ₹%s/ਕੁਇੰਟਲ ਦਰਜ ਕੀਤਾ ਗਿਆ ਹੈ।", name, commonDate, maxRecord.map(PriceRecordDto::modalPrice).orElse(BigDecimal.ZERO));
    }
}

