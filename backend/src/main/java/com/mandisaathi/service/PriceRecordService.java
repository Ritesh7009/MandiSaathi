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
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
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

    public List<PriceRecordDto> getPricePage(
            String commodityCode, String mandiCode, String state, String district, int page, int size
    ) {
        return enrichRecords(priceRecordRepository.searchPricePage(
                Objects.toString(commodityCode, ""), Objects.toString(mandiCode, ""),
                Objects.toString(state, ""), Objects.toString(district, ""), PageRequest.of(page, size)));
    }

    public PriceComparisonDto comparePrices(String commodityCode, List<String> mandiCodes) {
        return comparePrices(commodityCode, mandiCodes, null);
    }

    public PriceComparisonDto comparePrices(String commodityCode, List<String> mandiCodes, String targetVariety) {
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
                    (commodity.getNamePa() != null ? commodity.getNamePa() : commodity.getNameEn()) + " ਲਈ ਕੋਈ ਭਾਅ ਉਪਲਬਧ ਨਹੀਂ ਹੈ。",
                    null,
                    null
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
        String commonVariety = null;
        List<PriceRecord> validRecordsForComparison = Collections.emptyList();

        for (LocalDate date : sortedDates) {
            List<PriceRecord> recordsOnDate = recordsByDate.get(date);

            // Group by normalized variety on this date
            Map<String, List<PriceRecord>> recordsByVariety = recordsOnDate.stream()
                    .collect(Collectors.groupingBy(r -> r.getVariety() != null && !r.getVariety().isBlank()
                            ? r.getVariety().trim() : "Common"));

            if (specificMandisRequested) {
                // Find varieties reported by ALL requested mandis on this date
                List<String> qualifyingVarieties = recordsByVariety.entrySet().stream()
                        .filter(entry -> {
                            if (targetVariety != null && !targetVariety.isBlank()) {
                                if (!entry.getKey().equalsIgnoreCase(targetVariety.trim())) {
                                    return false;
                                }
                            }
                            Set<String> mandisForVar = entry.getValue().stream()
                                    .map(PriceRecord::getMandiCode)
                                    .collect(Collectors.toSet());
                            return mandisForVar.containsAll(mandiCodes);
                        })
                        .map(Map.Entry::getKey)
                        .sorted() // deterministic alphabetical sorting
                        .toList();

                if (!qualifyingVarieties.isEmpty()) {
                    commonDate = date;
                    commonVariety = qualifyingVarieties.get(0);
                    List<PriceRecord> varRecords = recordsByVariety.get(commonVariety);

                    // Pick exactly one record per mandi deterministically (by highest arrival quantity or newest ID, NEVER highest modal price)
                    validRecordsForComparison = varRecords.stream()
                            .filter(r -> mandiCodes.contains(r.getMandiCode()))
                            .collect(Collectors.toMap(
                                    PriceRecord::getMandiCode,
                                    r -> r,
                                    (r1, r2) -> (r1.getId() != null && r2.getId() != null && r1.getId() >= r2.getId()) ? r1 : r2
                            ))
                            .values().stream().toList();
                    break;
                }
            } else {
                // National comparison: find varieties reported by at least 2 distinct mandis on this date
                List<Map.Entry<String, List<PriceRecord>>> qualifyingEntries = recordsByVariety.entrySet().stream()
                        .filter(entry -> {
                            if (targetVariety != null && !targetVariety.isBlank()) {
                                if (!entry.getKey().equalsIgnoreCase(targetVariety.trim())) {
                                    return false;
                                }
                            }
                            Set<String> mandis = entry.getValue().stream()
                                    .map(PriceRecord::getMandiCode)
                                    .collect(Collectors.toSet());
                            return mandis.size() >= 2;
                        })
                        .sorted((e1, e2) -> {
                            int countDiff = Integer.compare(e2.getValue().size(), e1.getValue().size());
                            return countDiff != 0 ? countDiff : e1.getKey().compareTo(e2.getKey());
                        })
                        .toList();

                if (!qualifyingEntries.isEmpty()) {
                    commonDate = date;
                    commonVariety = qualifyingEntries.get(0).getKey();
                    List<PriceRecord> varRecords = qualifyingEntries.get(0).getValue();

                    // Deduplicate per mandi deterministically
                    validRecordsForComparison = varRecords.stream()
                            .collect(Collectors.toMap(
                                    PriceRecord::getMandiCode,
                                    r -> r,
                                    (r1, r2) -> (r1.getId() != null && r2.getId() != null && r1.getId() >= r2.getId()) ? r1 : r2
                            ))
                            .values().stream().toList();
                    break;
                }
            }
        }

        if (commonDate == null || validRecordsForComparison.isEmpty() || (specificMandisRequested && validRecordsForComparison.size() < mandiCodes.size())) {
            String varietyNotice = (targetVariety != null && !targetVariety.isBlank())
                    ? "for requested variety '" + targetVariety + "'"
                    : "for the same crop variety";
            String summaryEn = "Insufficient comparative data: The selected mandis do not share price records " + varietyNotice + " on a common reporting date. Market comparisons require aligned reporting dates and identical crop varieties to prevent misleading price spreads.";
            String summaryHi = "अपर्याप्त तुलनात्मक डेटा: चयनित मंडियों में एक ही रिपोर्टिंग तिथि और समान किस्म के लिए मूल्य रिकॉर्ड उपलब्ध नहीं हैं। भ्रामक मूल्य अंतर से बचने के लिए समान तिथि और समान किस्म आवश्यक है।";
            String summaryPa = "ਨਾਕਾਫ਼ੀ ਤੁਲਨਾਤਮਕ ਡਾਟਾ: ਚੁਣੀਆਂ ਗਈਆਂ ਮੰਡੀਆਂ ਲਈ ਇੱਕੋ ਰਿਪੋਰਟਿੰਗ ਮਿਤੀ ਅਤੇ ਸਮਾਨ ਕਿਸਮ ਦੇ ਭਾਅ ਰਿਕਾਰਡ ਉਪਲਬਧ ਨਹੀਂ ਹਨ।";

            return new PriceComparisonDto(commodityDto, Collections.emptyList(), summaryEn, summaryHi, summaryPa, null, null);
        }

        List<PriceRecordDto> dtos = enrichRecords(validRecordsForComparison);

        String summaryEn = generateSummaryEn(commodity, dtos, commonDate, commonVariety);
        String summaryHi = generateSummaryHi(commodity, dtos, commonDate, commonVariety);
        String summaryPa = generateSummaryPa(commodity, dtos, commonDate, commonVariety);

        return new PriceComparisonDto(commodityDto, dtos, summaryEn, summaryHi, summaryPa, commonVariety, commonDate);
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
                .collect(Collectors.toMap(Commodity::getCode, c -> c, (a, b) -> a));
        Map<String, Mandi> mandiMap = mandiRepository.findAll().stream()
                .collect(Collectors.toMap(Mandi::getCode, m -> m, (a, b) -> a));

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

    private String generateSummaryEn(Commodity c, List<PriceRecordDto> dtos, LocalDate commonDate, String variety) {
        if (dtos.isEmpty()) {
            return "No verified market price records are currently filed for " + c.getNameEn() + ".";
        }
        String varSuffix = (variety != null && !variety.equalsIgnoreCase("Common")) ? " (" + variety + ")" : "";
        Optional<PriceRecordDto> maxRecord = dtos.stream().max(Comparator.comparing(PriceRecordDto::modalPrice));
        Optional<PriceRecordDto> minRecord = dtos.stream().min(Comparator.comparing(PriceRecordDto::modalPrice));
        if (maxRecord.isPresent() && minRecord.isPresent() && !maxRecord.get().equals(minRecord.get())) {
            return String.format("For %s%s on %s, %s reports the highest modal price of ₹%s/qtl, while %s reports ₹%s/qtl (Spread: ₹%s).",
                    c.getNameEn(), varSuffix, commonDate,
                    maxRecord.get().mandiNameEn(), maxRecord.get().modalPrice(),
                    minRecord.get().mandiNameEn(), minRecord.get().modalPrice(),
                    maxRecord.get().modalPrice().subtract(minRecord.get().modalPrice()));
        }
        return String.format("Verified modal price for %s%s on %s is ₹%s/qtl.", c.getNameEn(), varSuffix, commonDate, dtos.get(0).modalPrice());
    }

    private String generateSummaryHi(Commodity c, List<PriceRecordDto> dtos, LocalDate commonDate, String variety) {
        if (dtos.isEmpty()) {
            return c.getNameHi() + " के लिए वर्तमान में कोई प्रमाणित भाव दर्ज नहीं है।";
        }
        String varSuffix = (variety != null && !variety.equalsIgnoreCase("Common")) ? " (" + variety + ")" : "";
        Optional<PriceRecordDto> maxRecord = dtos.stream().max(Comparator.comparing(PriceRecordDto::modalPrice));
        Optional<PriceRecordDto> minRecord = dtos.stream().min(Comparator.comparing(PriceRecordDto::modalPrice));
        if (maxRecord.isPresent() && minRecord.isPresent() && !maxRecord.get().equals(minRecord.get())) {
            return String.format("%s%s के लिए (%s) %s में उच्चतम मॉडल भाव ₹%s/क्विंटल और %s में ₹%s/क्विंटल दर्ज किया गया (अंतर: ₹%s)।",
                    c.getNameHi(), varSuffix, commonDate,
                    maxRecord.get().mandiNameHi(), maxRecord.get().modalPrice(),
                    minRecord.get().mandiNameHi(), minRecord.get().modalPrice(),
                    maxRecord.get().modalPrice().subtract(minRecord.get().modalPrice()));
        }
        return String.format("%s%s का प्रमाणित मॉडल भाव (%s) ₹%s/क्विंटल है।", c.getNameHi(), varSuffix, commonDate, dtos.get(0).modalPrice());
    }

    private String generateSummaryPa(Commodity c, List<PriceRecordDto> dtos, LocalDate commonDate, String variety) {
        String name = c.getNamePa() != null ? c.getNamePa() : c.getNameEn();
        if (dtos.isEmpty()) {
            return name + " ਲਈ ਇਸ ਵੇਲੇ ਕੋਈ ਪ੍ਰਮਾਣਿਤ ਭਾਅ ਦਰਜ ਨਹੀਂ ਹੈ।";
        }
        String varSuffix = (variety != null && !variety.equalsIgnoreCase("Common")) ? " (" + variety + ")" : "";
        Optional<PriceRecordDto> maxRecord = dtos.stream().max(Comparator.comparing(PriceRecordDto::modalPrice));
        return String.format("%s%s ਦਾ ਪ੍ਰਮਾਣਿਤ ਮਾਡਲ ਭਾਅ (%s) ₹%s/ਕੁਇੰਟਲ ਦਰਜ ਕੀਤਾ ਗਿਆ ਹੈ।", name, varSuffix, commonDate, maxRecord.map(PriceRecordDto::modalPrice).orElse(BigDecimal.ZERO));
    }
}
