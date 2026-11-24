package com.mandisaathi.dto;

import java.util.List;

public record PriceComparisonRequest(
        String commodityCode,
        List<String> mandiCodes,
        String variety
) {
    public PriceComparisonRequest(String commodityCode, List<String> mandiCodes) {
        this(commodityCode, mandiCodes, null);
    }
}
