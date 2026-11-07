package com.mandisaathi.controller;

import com.mandisaathi.dto.ComplaintDto;
import com.mandisaathi.dto.ComplaintRequest;
import com.mandisaathi.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @PostMapping
    public ResponseEntity<ComplaintDto> registerComplaint(@Valid @RequestBody ComplaintRequest request) {
        ComplaintDto created = complaintService.registerComplaint(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<ComplaintDto>> getAllComplaints() {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @GetMapping("/{referenceNumber}")
    public ResponseEntity<ComplaintDto> getByReferenceNumber(@PathVariable String referenceNumber) {
        return ResponseEntity.ok(complaintService.getByReferenceNumber(referenceNumber));
    }
}

