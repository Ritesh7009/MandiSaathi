package com.mandisaathi.controller;

import com.mandisaathi.dto.CommodityDto;
import com.mandisaathi.service.CommodityService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/commodities")
public class CommodityController {

    private final CommodityService commodityService;

    public CommodityController(CommodityService commodityService) {
        this.commodityService = commodityService;
    }

    @GetMapping
    public ResponseEntity<List<CommodityDto>> getCommodities(
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(commodityService.getAllCommodities(category));
    }

    @GetMapping("/{code}")
    public ResponseEntity<CommodityDto> getCommodityByCode(@PathVariable String code) {
        return ResponseEntity.ok(commodityService.getCommodityByCode(code));
    }
}

