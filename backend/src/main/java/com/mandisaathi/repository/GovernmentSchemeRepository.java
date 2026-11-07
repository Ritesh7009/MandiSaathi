package com.mandisaathi.repository;

import com.mandisaathi.entity.GovernmentScheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GovernmentSchemeRepository extends JpaRepository<GovernmentScheme, Long> {

    Optional<GovernmentScheme> findByCodeAndActiveTrue(String code);

    List<GovernmentScheme> findByActiveTrue();

    List<GovernmentScheme> findByCategoryIgnoreCaseAndActiveTrue(String category);

    @Query("SELECT s FROM GovernmentScheme s WHERE s.active = true AND (" +
           "LOWER(s.nameEn) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(s.nameHi) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(s.descriptionEn) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
           "LOWER(s.descriptionHi) LIKE LOWER(CONCAT('%', :term, '%'))" +
           ")")
    List<GovernmentScheme> searchSchemes(@Param("term") String term);
}

