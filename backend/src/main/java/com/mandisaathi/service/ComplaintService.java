package com.mandisaathi.service;

import com.mandisaathi.dto.ComplaintDto;
import com.mandisaathi.dto.ComplaintRequest;
import com.mandisaathi.entity.Complaint;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.exception.ResourceNotFoundException;
import com.mandisaathi.exception.RateLimitExceededException;
import com.mandisaathi.repository.ComplaintRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.util.ClientIpResolver;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Year;
import java.time.ZoneId;
import java.util.Locale;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Transactional
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final MandiRepository mandiRepository;

    // In-memory sliding window rate-limiter for complaint submission abuse protection per IP
    private static final int MAX_SUBMISSIONS_PER_MINUTE = 10;
    private record SubmissionWindow(String ip, long minute) {}
    private final ConcurrentHashMap<SubmissionWindow, AtomicInteger> submissionRateMap = new ConcurrentHashMap<>();

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
        SubmissionWindow rateKey = new SubmissionWindow(safeIp, currentMinute);
        submissionRateMap.keySet().removeIf(window -> window.minute() < currentMinute - 2);

        AtomicInteger counter = submissionRateMap.computeIfAbsent(rateKey, key -> new AtomicInteger());
        if (counter.incrementAndGet() > MAX_SUBMISSIONS_PER_MINUTE) {
            throw new RateLimitExceededException(
                    "Submission rate limit exceeded. Please wait a minute before filing another grievance.",
                    60 - System.currentTimeMillis() / 1000 % 60);
        }

        if (request.description() == null || request.description().trim().length() < 10) {
            throw new IllegalArgumentException("Description must be at least 10 characters.");
        }
        if (request.description().length() > 2000) {
            throw new IllegalArgumentException("Description must not exceed 2000 characters.");
        }

        String ref = "MS-" + Year.now(ZoneId.of("Asia/Kolkata")) + "-"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
        String rawTrackingToken = UUID.randomUUID().toString().replace("-", "");
        String tokenHash = hashToken(rawTrackingToken);

        Complaint complaint = new Complaint(
                ref,
                request.category().trim(),
                request.description().trim(),
                request.state().trim(),
                request.district().trim(),
                request.mandiCode() != null ? request.mandiCode().trim() : null,
                request.farmerName() != null ? request.farmerName().trim() : null,
                request.farmerPhone() != null ? request.farmerPhone().trim() : null,
                tokenHash
        );

        Complaint saved = complaintRepository.save(complaint);
        // Include raw tracking token ONLY once in the initial creation response for the submitter
        return toDto(saved, rawTrackingToken, false);
    }

    @Transactional(readOnly = true)
    public List<ComplaintDto> getAllComplaints() {
        if (!isCallerAdmin()) {
            throw new AccessDeniedException("Administrative authorization required to access complaint registry.");
        }
        return complaintRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(c -> toDto(c, null, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public ComplaintDto getByReferenceNumber(String referenceNumber, String rawTrackingToken) {
        if (isCallerAdmin()) {
            return complaintRepository.findByReferenceNumber(referenceNumber)
                    .map(c -> toDto(c, null, true))
                    .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with reference: " + referenceNumber));
        }

        if (rawTrackingToken == null || rawTrackingToken.isBlank()) {
            throw new AccessDeniedException("Tracking token required to track grievance.");
        }

        String hash = hashToken(rawTrackingToken);
        return complaintRepository.findByReferenceNumberAndTrackingTokenHash(referenceNumber, hash)
                .map(c -> toDto(c, null, false)) // raw token is NEVER returned in tracking responses
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with the provided reference and tracking token."));
    }

    private boolean isCallerAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    public static String hashToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return "";
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.trim().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    private ComplaintDto toDto(Complaint c, String rawTrackingTokenForSubmitter, boolean isPrivileged) {
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
                rawTrackingTokenForSubmitter, // only non-null at registration time
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
