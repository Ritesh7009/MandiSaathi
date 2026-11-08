package com.mandisaathi.repository;

import com.mandisaathi.entity.Mandi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MandiRepository extends JpaRepository<Mandi, Long> {
    Optional<Mandi> findByCode(String code);
    List<Mandi> findByStateIgnoreCaseAndActiveTrue(String state);
    List<Mandi> findByDistrictIgnoreCaseAndActiveTrue(String district);
    List<Mandi> findByActiveTrue();
}

