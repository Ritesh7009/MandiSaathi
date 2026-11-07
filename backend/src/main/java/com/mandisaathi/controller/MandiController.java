package com.mandisaathi.controller;

import com.mandisaathi.dto.MandiDto;
import com.mandisaathi.service.MandiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mandis")
public class MandiController {

    private final MandiService mandiService;

    public MandiController(MandiService mandiService) {
        this.mandiService = mandiService;
    }

    @GetMapping
    public ResponseEntity<List<MandiDto>> getMandis(
            @RequestParam(required = false) String state
    ) {
        return ResponseEntity.ok(mandiService.getAllMandis(state));
    }

    @GetMapping("/{code}")
    public ResponseEntity<MandiDto> getMandiByCode(@PathVariable String code) {
        return ResponseEntity.ok(mandiService.getMandiByCode(code));
    }
}

