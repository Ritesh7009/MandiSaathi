package com.mandisaathi.controller;

import com.mandisaathi.dto.ComplaintDto;
import com.mandisaathi.dto.ComplaintRequest;
import com.mandisaathi.exception.RateLimitExceededException;
import com.mandisaathi.ratelimit.RateLimitResult;
import com.mandisaathi.ratelimit.RateLimiter;
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
    private final RateLimiter rateLimiter;

    public ComplaintController(ComplaintService complaintService, RateLimiter rateLimiter) {
        this.complaintService = complaintService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping
    public ResponseEntity<ComplaintDto> registerComplaint(
            @Valid @RequestBody ComplaintRequest request,
            HttpServletRequest httpServletRequest
    ) {
        String clientIp = ClientIpResolver.resolve(httpServletRequest);
        RateLimitResult rateResult = rateLimiter.tryAcquire("complaint_submit", clientIp, 5);
        if (!rateResult.allowed()) {
            throw new RateLimitExceededException(
                    "Complaint submission rate limit exceeded (5 requests/minute). Please try again shortly.",
                    rateResult.retryAfterSeconds()
            );
        }

        ComplaintDto created = complaintService.registerComplaint(request, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<ComplaintDto>> getAllComplaints() {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @GetMapping("/{referenceNumber}")
    public ResponseEntity<ComplaintDto> getByReferenceNumber(
            @PathVariable String referenceNumber,
            @RequestHeader(value = "X-Tracking-Token", required = false) String trackingToken
    ) {
        return ResponseEntity.ok(complaintService.getByReferenceNumber(referenceNumber, trackingToken));
    }
}
