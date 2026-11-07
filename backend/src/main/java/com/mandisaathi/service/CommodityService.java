package com.mandisaathi.service;

import com.mandisaathi.dto.CommodityDto;
import com.mandisaathi.entity.Commodity;
import com.mandisaathi.exception.ResourceNotFoundException;
import com.mandisaathi.repository.CommodityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CommodityService {

    private final CommodityRepository commodityRepository;

    public CommodityService(CommodityRepository commodityRepository) {
        this.commodityRepository = commodityRepository;
    }

    public List<CommodityDto> getAllCommodities(String category) {
        List<Commodity> commodities = (category != null && !category.isBlank())
                ? commodityRepository.findByCategoryIgnoreCase(category)
                : commodityRepository.findAll();

        return commodities.stream().map(this::toDto).toList();
    }

    public CommodityDto getCommodityByCode(String code) {
        return commodityRepository.findByCode(code)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Commodity not found with code: " + code));
    }

    private CommodityDto toDto(Commodity c) {
        return new CommodityDto(
                c.getId(),
                c.getCode(),
                c.getNameEn(),
                c.getNameHi(),
                c.getNamePa(),
                c.getCategory(),
                c.getDefaultUnit()
        );
    }
}

