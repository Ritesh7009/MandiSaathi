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
    private final com.mandisaathi.service.MandiDataIngestionService mandiDataIngestionService;

    public PriceRecordController(
            PriceRecordService priceRecordService,
            com.mandisaathi.service.MandiDataIngestionService mandiDataIngestionService
    ) {
        this.priceRecordService = priceRecordService;
        this.mandiDataIngestionService = mandiDataIngestionService;
    }

    @PostMapping("/sync")
    public ResponseEntity<com.mandisaathi.dto.IngestionSummaryDto> syncPrices() {
        return ResponseEntity.ok(mandiDataIngestionService.ingestLatestMandiPrices());
    }

    @GetMapping("/sync/status")
    public ResponseEntity<com.mandisaathi.dto.SyncStatusDto> getSyncStatus() {
        return ResponseEntity.ok(mandiDataIngestionService.getSyncStatus());
    }

    @GetMapping
    public ResponseEntity<List<PriceRecordDto>> getPrices(
            @RequestParam(required = false) String commodityCode,
            @RequestParam(required = false) String mandiCode,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        if (state == null && district == null && page == null && size == null) {
            return ResponseEntity.ok(priceRecordService.getPrices(commodityCode, mandiCode));
        }
        int pageNumber = page == null ? 0 : page;
        int pageSize = size == null ? 100 : size;
        if (pageNumber < 0 || pageNumber > 10000 || pageSize < 1 || pageSize > 200) {
            throw new IllegalArgumentException("Page must be between 0 and 10000 and size between 1 and 200.");
        }
        return ResponseEntity.ok(priceRecordService.getPricePage(
                commodityCode, mandiCode, state, district, pageNumber, pageSize));
    }

    @PostMapping("/compare")
    public ResponseEntity<PriceComparisonDto> comparePrices(@RequestBody PriceComparisonRequest request) {
        return ResponseEntity.ok(priceRecordService.comparePrices(request.commodityCode(), request.mandiCodes(), request.variety()));
    }
}

