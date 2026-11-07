package com.mandisaathi.service;

import com.mandisaathi.dto.ComplaintDto;
import com.mandisaathi.dto.ComplaintRequest;
import com.mandisaathi.entity.Complaint;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.exception.ResourceNotFoundException;
import com.mandisaathi.repository.ComplaintRepository;
import com.mandisaathi.repository.MandiRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@Transactional
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final MandiRepository mandiRepository;
    private final SecureRandom random = new SecureRandom();

    public ComplaintService(ComplaintRepository complaintRepository, MandiRepository mandiRepository) {
        this.complaintRepository = complaintRepository;
        this.mandiRepository = mandiRepository;
    }

    public ComplaintDto registerComplaint(ComplaintRequest request) {
        String ref = "MS-2026-" + (10000 + random.nextInt(90000));

        Complaint complaint = new Complaint(
                ref,
                request.category(),
                request.description(),
                request.state(),
                request.district(),
                request.mandiCode(),
                request.farmerName(),
                request.farmerPhone()
        );

        Complaint saved = complaintRepository.save(complaint);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ComplaintDto> getAllComplaints() {
        return complaintRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ComplaintDto getByReferenceNumber(String referenceNumber) {
        return complaintRepository.findByReferenceNumber(referenceNumber)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with reference: " + referenceNumber));
    }

    private ComplaintDto toDto(Complaint c) {
        String mandiName = null;
        if (c.getMandiCode() != null) {
            mandiName = mandiRepository.findByCode(c.getMandiCode())
                    .map(Mandi::getNameEn)
                    .orElse(c.getMandiCode());
        }

        return new ComplaintDto(
                c.getId(),
                c.getReferenceNumber(),
                c.getCategory(),
                c.getDescription(),
                c.getState(),
                c.getDistrict(),
                c.getMandiCode(),
                mandiName,
                c.getFarmerName(),
                c.getFarmerPhone(),
                c.getStatus(),
                c.getCreatedAt()
        );
    }
}
