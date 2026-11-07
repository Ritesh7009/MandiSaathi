package com.mandisaathi.controller;

import com.mandisaathi.dto.SchemeDto;
import com.mandisaathi.service.GovernmentSchemeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/schemes")
public class GovernmentSchemeController {

    private final GovernmentSchemeService schemeService;

    public GovernmentSchemeController(GovernmentSchemeService schemeService) {
        this.schemeService = schemeService;
    }

    @GetMapping
    public ResponseEntity<List<SchemeDto>> getSchemes(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(schemeService.getSchemes(category, search));
    }

    @GetMapping("/{code}")
    public ResponseEntity<SchemeDto> getSchemeByCode(@PathVariable String code) {
        return ResponseEntity.ok(schemeService.getSchemeByCode(code));
    }
}
