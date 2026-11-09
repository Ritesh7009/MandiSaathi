package com.mandisaathi.controller;

import com.mandisaathi.dto.ComplaintDto;
import com.mandisaathi.dto.ComplaintRequest;
import com.mandisaathi.service.ComplaintService;
import com.mandisaathi.util.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
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
    public ResponseEntity<ComplaintDto> registerComplaint(
            @Valid @RequestBody ComplaintRequest request,
            HttpServletRequest httpServletRequest
    ) {
        String clientIp = ClientIpResolver.resolve(httpServletRequest);
        ComplaintDto created = complaintService.registerComplaint(request, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<ComplaintDto>> getAllComplaints(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey
    ) {
        return ResponseEntity.ok(complaintService.getAllComplaints(adminKey));
    }

    @GetMapping("/{referenceNumber}")
    public ResponseEntity<ComplaintDto> getByReferenceNumber(
            @PathVariable String referenceNumber,
            @RequestParam(value = "trackingToken", required = false) String queryToken,
            @RequestHeader(value = "X-Tracking-Token", required = false) String headerToken,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey
    ) {
        String token = (headerToken != null && !headerToken.isBlank()) ? headerToken : queryToken;
        return ResponseEntity.ok(complaintService.getByReferenceNumber(referenceNumber, token, adminKey));
    }
}
