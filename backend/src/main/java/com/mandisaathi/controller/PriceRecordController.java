package com.mandisaathi.controller;

import com.mandisaathi.dto.PriceComparisonDto;
import com.mandisaathi.dto.PriceComparisonRequest;
import com.mandisaathi.dto.PriceRecordDto;
import com.mandisaathi.service.PriceRecordService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/prices")
public class PriceRecordController {

    private final PriceRecordService priceRecordService;

    public PriceRecordController(PriceRecordService priceRecordService) {
        this.priceRecordService = priceRecordService;
    }

    @GetMapping
    public ResponseEntity<List<PriceRecordDto>> getPrices(
            @RequestParam(required = false) String commodityCode,
            @RequestParam(required = false) String mandiCode
    ) {
        return ResponseEntity.ok(priceRecordService.getPrices(commodityCode, mandiCode));
    }

    @PostMapping("/compare")
    public ResponseEntity<PriceComparisonDto> comparePrices(@RequestBody PriceComparisonRequest request) {
        return ResponseEntity.ok(priceRecordService.comparePrices(request.commodityCode(), request.mandiCodes()));
    }
}
