package com.mandisaathi.dto;

import java.time.LocalDate;
import java.util.List;

public record PriceComparisonDto(
        CommodityDto commodity,
        List<PriceRecordDto> records,
        String summaryEn,
        String summaryHi,
        String summaryPa,
        String commonVariety,
        LocalDate commonDate
) {
    public PriceComparisonDto(CommodityDto commodity, List<PriceRecordDto> records, String summaryEn, String summaryHi, String summaryPa) {
        this(commodity, records, summaryEn, summaryHi, summaryPa, null, null);
    }
}
