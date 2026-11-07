package com.mandisaathi.service;

import com.mandisaathi.dto.MandiDto;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.exception.ResourceNotFoundException;
import com.mandisaathi.repository.MandiRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class MandiService {

    private final MandiRepository mandiRepository;

    public MandiService(MandiRepository mandiRepository) {
        this.mandiRepository = mandiRepository;
    }

    public List<MandiDto> getAllMandis(String state) {
        List<Mandi> mandis = (state != null && !state.isBlank())
                ? mandiRepository.findByStateIgnoreCaseAndActiveTrue(state)
                : mandiRepository.findByActiveTrue();

        return mandis.stream().map(this::toDto).toList();
    }

    public MandiDto getMandiByCode(String code) {
        return mandiRepository.findByCode(code)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Mandi not found with code: " + code));
    }

    private MandiDto toDto(Mandi m) {
        return new MandiDto(
                m.getId(),
                m.getCode(),
                m.getNameEn(),
                m.getNameHi(),
                m.getNamePa(),
                m.getState(),
                m.getDistrict(),
                m.getLatitude(),
                m.getLongitude(),
                m.isActive()
        );
    }
}

