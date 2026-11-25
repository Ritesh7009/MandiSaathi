package com.mandisaathi.controller;

import com.mandisaathi.dto.PriceComparisonDto;
import com.mandisaathi.dto.PriceComparisonRequest;
import com.mandisaathi.dto.PriceRecordDto;
import com.mandisaathi.service.PriceRecordService;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<com.mandisaathi.dto.IngestionSummaryDto> syncPrices() {
        return ResponseEntity.ok(mandiDataIngestionService.ingestLatestMandiPrices());
    }

    @GetMapping("/sync/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<com.mandisaathi.dto.SyncStatusDto> getSyncStatus() {
        return ResponseEntity.ok(mandiDataIngestionService.getSyncStatus());
    }

    @GetMapping
    public ResponseEntity<List<PriceRecordDto>> getPrices(
            @RequestParam(required = false) String commodityCode,
            @RequestParam(required = false) String mandiCode,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String variety,
            @RequestParam(required = false) String provenanceType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate priceDate,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        int pageNumber = page == null ? 0 : page;
        int pageSize = size == null ? 50 : size;
        if (pageNumber < 0 || pageNumber > 10000 || pageSize < 1 || pageSize > 200) {
            throw new IllegalArgumentException("Page must be between 0 and 10000 and size between 1 and 200.");
        }

        Page<PriceRecordDto> pricePage = priceRecordService.getPricePage(
                commodityCode, mandiCode, state, district, variety, provenanceType, priceDate, pageNumber, pageSize);

        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(pricePage.getTotalElements()))
                .header("X-Total-Pages", String.valueOf(pricePage.getTotalPages()))
                .header("X-Page-Number", String.valueOf(pricePage.getNumber()))
                .header("X-Page-Size", String.valueOf(pricePage.getSize()))
                .header("X-Has-Next", String.valueOf(pricePage.hasNext()))
                .body(pricePage.getContent());
    }

    @GetMapping("/varieties")
    public ResponseEntity<List<String>> getVarieties(@RequestParam String commodityCode) {
        return ResponseEntity.ok(priceRecordService.getDistinctVarieties(commodityCode));
    }

    @PostMapping("/compare")
    public ResponseEntity<PriceComparisonDto> comparePrices(@RequestBody PriceComparisonRequest request) {
        return ResponseEntity.ok(priceRecordService.comparePrices(request.commodityCode(), request.mandiCodes(), request.variety()));
    }
}

