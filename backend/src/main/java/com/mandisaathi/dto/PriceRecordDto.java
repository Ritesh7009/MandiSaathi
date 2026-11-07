package com.mandisaathi.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PriceRecordDto(
        Long id,
        String commodityCode,
        String commodityNameEn,
        String commodityNameHi,
        String commodityNamePa,
        String mandiCode,
        String mandiNameEn,
        String mandiNameHi,
        String mandiNamePa,
        String state,
        String district,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        BigDecimal modalPrice,
        LocalDate priceDate,
        BigDecimal arrivalQuantity,
        String unit,
        String dataSource,
        boolean verified
) {}

