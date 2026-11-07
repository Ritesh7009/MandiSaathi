package com.mandisaathi.repository;

import com.mandisaathi.entity.Commodity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommodityRepository extends JpaRepository<Commodity, Long> {
    Optional<Commodity> findByCode(String code);
    List<Commodity> findByCategoryIgnoreCase(String category);
}

