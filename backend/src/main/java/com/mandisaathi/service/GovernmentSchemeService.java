package com.mandisaathi.service;

import com.mandisaathi.dto.SchemeDto;
import com.mandisaathi.entity.GovernmentScheme;
import com.mandisaathi.exception.ResourceNotFoundException;
import com.mandisaathi.repository.GovernmentSchemeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class GovernmentSchemeService {

    private final GovernmentSchemeRepository schemeRepository;

    public GovernmentSchemeService(GovernmentSchemeRepository schemeRepository) {
        this.schemeRepository = schemeRepository;
    }

    public List<SchemeDto> getSchemes(String category, String search) {
        List<GovernmentScheme> schemes;

        if (search != null && !search.isBlank()) {
            schemes = schemeRepository.searchSchemes(search.trim());
        } else if (category != null && !category.isBlank()) {
            schemes = schemeRepository.findByCategoryIgnoreCaseAndActiveTrue(category.trim());
        } else {
            schemes = schemeRepository.findByActiveTrue();
        }

        return schemes.stream().map(this::toDto).toList();
    }

    public SchemeDto getSchemeByCode(String code) {
        return schemeRepository.findByCodeAndActiveTrue(code)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Government scheme not found with code: " + code));
    }

    private SchemeDto toDto(GovernmentScheme s) {
        return new SchemeDto(
                s.getId(),
                s.getCode(),
                s.getNameEn(),
                s.getNameHi(),
                s.getNamePa(),
                s.getCategory(),
                s.getDescriptionEn(),
                s.getDescriptionHi(),
                s.getDescriptionPa(),
                s.getEligibilityEn(),
                s.getEligibilityHi(),
                s.getEligibilityPa(),
                s.getDocumentsEn(),
                s.getDocumentsHi(),
                s.getDocumentsPa(),
                s.getApplicationStepsEn(),
                s.getApplicationStepsHi(),
                s.getApplicationStepsPa(),
                s.getOfficialUrl(),
                s.getVerifiedDate(),
                s.isActive()
        );
    }
}
