package com.mandisaathi.dto;

public record SchemeDto(
        Long id,
        String code,
        String nameEn,
        String nameHi,
        String namePa,
        String category,
        String descriptionEn,
        String descriptionHi,
        String descriptionPa,
        String eligibilityEn,
        String eligibilityHi,
        String eligibilityPa,
        String documentsEn,
        String documentsHi,
        String documentsPa,
        String applicationStepsEn,
        String applicationStepsHi,
        String applicationStepsPa,
        String officialUrl,
        String verifiedDate,
        boolean active
) {}

