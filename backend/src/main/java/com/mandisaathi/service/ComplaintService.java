package com.mandisaathi.service;

import com.mandisaathi.dto.ComplaintDto;
import com.mandisaathi.dto.ComplaintRequest;
import com.mandisaathi.entity.Complaint;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.exception.ResourceNotFoundException;
import com.mandisaathi.repository.ComplaintRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.util.ClientIpResolver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Transactional
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final MandiRepository mandiRepository;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.security.admin-api-key:mandisaathi_admin_secret_2026}")
    private String adminApiKey;

    // In-memory sliding window rate-limiter for complaint submission abuse protection per IP
    private static final int MAX_SUBMISSIONS_PER_MINUTE = 20;
    private final ConcurrentHashMap<String, AtomicInteger> submissionRateMap = new ConcurrentHashMap<>();

    public ComplaintService(ComplaintRepository complaintRepository, MandiRepository mandiRepository) {
        this.complaintRepository = complaintRepository;
        this.mandiRepository = mandiRepository;
    }

    public ComplaintDto registerComplaint(ComplaintRequest request) {
        return registerComplaint(request, "127.0.0.1");
    }

    public ComplaintDto registerComplaint(ComplaintRequest request, String clientIp) {
        // Abuse protection check per IP per minute
        long currentMinute = System.currentTimeMillis() / 60000;
        String safeIp = (clientIp != null && ClientIpResolver.isValidIp(clientIp.trim()))
                ? clientIp.trim()
                : "127.0.0.1";
        String rateKey = safeIp + ":" + currentMinute;

        submissionRateMap.entrySet().removeIf(e -> {
            String[] parts = e.getKey().split(":");
            if (parts.length < 2) return true;
            try {
                return Long.parseLong(parts[1]) < currentMinute - 2;
            } catch (NumberFormatException ignored) {
                return true;
            }
        });

        AtomicInteger counter = submissionRateMap.computeIfAbsent(rateKey, k -> new AtomicInteger(0));
        if (counter.incrementAndGet() > MAX_SUBMISSIONS_PER_MINUTE) {
            throw new IllegalArgumentException("Submission rate limit exceeded. Please wait a minute before filing another grievance.");
        }

        if (request.description() == null || request.description().trim().length() < 10) {
            throw new IllegalArgumentException("Description must be at least 10 characters.");
        }
        if (request.description().length() > 2000) {
            throw new IllegalArgumentException("Description must not exceed 2000 characters.");
        }

        String ref = "MS-2026-" + (10000 + random.nextInt(90000));
        String trackingToken = UUID.randomUUID().toString().replace("-", "");

        Complaint complaint = new Complaint(
                ref,
                request.category().trim(),
                request.description().trim(),
                request.state().trim(),
                request.district().trim(),
                request.mandiCode() != null ? request.mandiCode().trim() : null,
                request.farmerName() != null ? request.farmerName().trim() : null,
                request.farmerPhone() != null ? request.farmerPhone().trim() : null,
                trackingToken
        );

        Complaint saved = complaintRepository.save(complaint);
        // Include tracking token in creation response so the submitting farmer can retain it, but mask phone
        return toDto(saved, true, false);
    }

    @Transactional(readOnly = true)
    public List<ComplaintDto> getAllComplaints(String adminKey) {
        validateAdminKey(adminKey);
        return complaintRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(c -> toDto(c, true, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public ComplaintDto getByReferenceNumber(String referenceNumber, String trackingToken, String adminKey) {
        if (isAdmin(adminKey)) {
            return complaintRepository.findByReferenceNumber(referenceNumber)
                    .map(c -> toDto(c, true, true))
                    .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with reference: " + referenceNumber));
        }

        if (trackingToken == null || trackingToken.isBlank()) {
            throw new AccessDeniedException("Tracking token or administrative credentials required to track grievance.");
        }

        return complaintRepository.findByReferenceNumberAndTrackingToken(referenceNumber, trackingToken.trim())
                .map(c -> toDto(c, false, false)) // masked personal details for public tracking
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with the provided reference and tracking token."));
    }

    private void validateAdminKey(String providedKey) {
        if (!isAdmin(providedKey)) {
            throw new AccessDeniedException("Administrative authorization required to access complaint registry.");
        }
    }

    private boolean isAdmin(String providedKey) {
        if (providedKey == null || providedKey.isBlank() || adminApiKey == null || adminApiKey.isBlank()) {
            return false;
        }
        byte[] providedBytes = providedKey.trim().getBytes(StandardCharsets.UTF_8);
        byte[] actualBytes = adminApiKey.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(providedBytes, actualBytes);
    }

    private ComplaintDto toDto(Complaint c, boolean includeTrackingToken, boolean isPrivileged) {
        String mandiName = null;
        if (c.getMandiCode() != null) {
            mandiName = mandiRepository.findByCode(c.getMandiCode())
                    .map(Mandi::getNameEn)
                    .orElse(c.getMandiCode());
        }

        String phone = c.getFarmerPhone();
        if (!isPrivileged && phone != null && !phone.isBlank()) {
            phone = maskPhone(phone);
        }

        return new ComplaintDto(
                c.getId(),
                c.getReferenceNumber(),
                includeTrackingToken ? c.getTrackingToken() : null,
                c.getCategory(),
                c.getDescription(),
                c.getState(),
                c.getDistrict(),
                c.getMandiCode(),
                mandiName,
                c.getFarmerName(),
                phone,
                c.getStatus(),
                c.getCreatedAt()
        );
    }

    private String maskPhone(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.length() <= 4) {
            return "****";
        }
        String lastFour = digits.substring(digits.length() - 4);
        return "******" + lastFour;
    }
}
