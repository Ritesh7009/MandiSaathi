package com.mandisaathi.dto;

public record CommodityDto(
        Long id,
        String code,
        String nameEn,
        String nameHi,
        String namePa,
        String category,
        String defaultUnit
) {}

