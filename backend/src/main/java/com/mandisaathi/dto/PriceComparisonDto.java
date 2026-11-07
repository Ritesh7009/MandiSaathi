package com.mandisaathi.dto;

import java.util.List;

public record PriceComparisonDto(
        CommodityDto commodity,
        List<PriceRecordDto> records,
        String summaryEn,
        String summaryHi,
        String summaryPa
) {}

