package com.mandisaathi.dto;

public record MandiDto(
        Long id,
        String code,
        String nameEn,
        String nameHi,
        String namePa,
        String state,
        String district,
        Double latitude,
        Double longitude,
        boolean active
) {}

