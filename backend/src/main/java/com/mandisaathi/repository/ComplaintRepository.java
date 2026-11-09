package com.mandisaathi.repository;

import com.mandisaathi.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    Optional<Complaint> findByReferenceNumber(String referenceNumber);

    Optional<Complaint> findByReferenceNumberAndTrackingToken(String referenceNumber, String trackingToken);

    List<Complaint> findAllByOrderByCreatedAtDesc();
}

