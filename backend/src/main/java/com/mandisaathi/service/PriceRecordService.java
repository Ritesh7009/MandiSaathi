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

        List<PriceRecord> records;
        if (mandiCodes != null && !mandiCodes.isEmpty()) {
            records = priceRecordRepository.findByCommodityCodeAndMandiCodeInOrderByPriceDateDesc(commodityCode, mandiCodes);
        } else {
            records = priceRecordRepository.findByCommodityCodeOrderByPriceDateDesc(commodityCode);
        }

        List<PriceRecordDto> dtos = enrichRecords(records);

        String summaryEn = generateSummaryEn(commodity, dtos);
        String summaryHi = generateSummaryHi(commodity, dtos);
        String summaryPa = generateSummaryPa(commodity, dtos);

        CommodityDto commodityDto = new CommodityDto(
                commodity.getId(),
                commodity.getCode(),
                commodity.getNameEn(),
                commodity.getNameHi(),
                commodity.getNamePa(),
                commodity.getCategory(),
                commodity.getDefaultUnit()
        );

        return new PriceComparisonDto(commodityDto, dtos, summaryEn, summaryHi, summaryPa);
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
                    r.isVerified()
            );
        }).toList();
    }

    private String generateSummaryEn(Commodity c, List<PriceRecordDto> dtos) {
        if (dtos.isEmpty()) {
            return "No verified market price records are currently filed for " + c.getNameEn() + ".";
        }
        Optional<PriceRecordDto> maxRecord = dtos.stream().max(Comparator.comparing(PriceRecordDto::modalPrice));
        Optional<PriceRecordDto> minRecord = dtos.stream().min(Comparator.comparing(PriceRecordDto::modalPrice));
        if (maxRecord.isPresent() && minRecord.isPresent() && !maxRecord.get().equals(minRecord.get())) {
            return String.format("For %s, %s reports the highest modal price of ₹%s/qtl, while %s reports ₹%s/qtl (Spread: ₹%s).",
                    c.getNameEn(),
                    maxRecord.get().mandiNameEn(), maxRecord.get().modalPrice(),
                    minRecord.get().mandiNameEn(), minRecord.get().modalPrice(),
                    maxRecord.get().modalPrice().subtract(minRecord.get().modalPrice()));
        }
        return String.format("Verified modal price for %s is ₹%s/qtl.", c.getNameEn(), dtos.get(0).modalPrice());
    }

    private String generateSummaryHi(Commodity c, List<PriceRecordDto> dtos) {
        if (dtos.isEmpty()) {
            return c.getNameHi() + " के लिए वर्तमान में कोई प्रमाणित भाव दर्ज नहीं है।";
        }
        Optional<PriceRecordDto> maxRecord = dtos.stream().max(Comparator.comparing(PriceRecordDto::modalPrice));
        Optional<PriceRecordDto> minRecord = dtos.stream().min(Comparator.comparing(PriceRecordDto::modalPrice));
        if (maxRecord.isPresent() && minRecord.isPresent() && !maxRecord.get().equals(minRecord.get())) {
            return String.format("%s के लिए %s में उच्चतम मॉडल भाव ₹%s/क्विंटल और %s में ₹%s/क्विंटल दर्ज किया गया (अंतर: ₹%s)।",
                    c.getNameHi(),
                    maxRecord.get().mandiNameHi(), maxRecord.get().modalPrice(),
                    minRecord.get().mandiNameHi(), minRecord.get().modalPrice(),
                    maxRecord.get().modalPrice().subtract(minRecord.get().modalPrice()));
        }
        return String.format("%s का प्रमाणित मॉडल भाव ₹%s/क्विंटल है।", c.getNameHi(), dtos.get(0).modalPrice());
    }

    private String generateSummaryPa(Commodity c, List<PriceRecordDto> dtos) {
        String name = c.getNamePa() != null ? c.getNamePa() : c.getNameEn();
        if (dtos.isEmpty()) {
            return name + " ਲਈ ਇਸ ਵੇਲੇ ਕੋਈ ਪ੍ਰਮਾਣਿਤ ਭਾਅ ਦਰਜ ਨਹੀਂ ਹੈ।";
        }
        Optional<PriceRecordDto> maxRecord = dtos.stream().max(Comparator.comparing(PriceRecordDto::modalPrice));
        return String.format("%s ਦਾ ਪ੍ਰਮਾਣਿਤ ਮਾਡਲ ਭਾਅ ₹%s/ਕੁਇੰਟਲ ਦਰਜ ਕੀਤਾ ਗਿਆ ਹੈ।", name, maxRecord.map(PriceRecordDto::modalPrice).orElse(BigDecimal.ZERO));
    }
}

