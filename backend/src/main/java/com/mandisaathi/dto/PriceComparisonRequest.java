package com.mandisaathi.dto;

import java.util.List;

public record PriceComparisonRequest(
        String commodityCode,
        List<String> mandiCodes
) {}
