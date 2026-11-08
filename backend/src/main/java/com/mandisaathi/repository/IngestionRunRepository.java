package com.mandisaathi.repository;

import com.mandisaathi.entity.IngestionRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IngestionRunRepository extends JpaRepository<IngestionRun, Long> {

    List<IngestionRun> findTop10ByOrderByStartedAtDesc();

    Optional<IngestionRun> findTopByOrderByStartedAtDesc();

    Optional<IngestionRun> findTopByStatusOrderByCompletedAtDesc(String status);
}
