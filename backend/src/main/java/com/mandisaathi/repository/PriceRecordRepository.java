package com.mandisaathi.repository;

import com.mandisaathi.entity.PriceRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PriceRecordRepository extends JpaRepository<PriceRecord, Long> {

    interface ComparisonCandidateProjection {
        LocalDate getPriceDate();
        String getVariety();
        Long getMandiCount();
    }

    @Query("SELECT p FROM PriceRecord p WHERE p.commodityCode = :commodityCode ORDER BY p.priceDate DESC, p.verified DESC, p.id DESC")
    List<PriceRecord> findByCommodityCodeOrderByPriceDateDesc(@Param("commodityCode") String commodityCode);

    @Query("SELECT p FROM PriceRecord p WHERE p.commodityCode = :commodityCode AND p.mandiCode = :mandiCode ORDER BY p.priceDate DESC, p.verified DESC, p.id DESC")
    List<PriceRecord> findByCommodityCodeAndMandiCodeOrderByPriceDateDesc(@Param("commodityCode") String commodityCode, @Param("mandiCode") String mandiCode);

    @Query("SELECT p FROM PriceRecord p WHERE p.commodityCode = :commodityCode AND p.mandiCode IN :mandiCodes ORDER BY p.priceDate DESC, p.verified DESC, p.id DESC")
    List<PriceRecord> findByCommodityCodeAndMandiCodeInOrderByPriceDateDesc(@Param("commodityCode") String commodityCode, @Param("mandiCodes") List<String> mandiCodes);

    java.util.Optional<PriceRecord> findByCommodityCodeAndMandiCodeAndPriceDate(
            String commodityCode,
            String mandiCode,
            LocalDate priceDate
    );

    java.util.Optional<PriceRecord> findByCommodityCodeAndMandiCodeAndPriceDateAndVariety(
            String commodityCode,
            String mandiCode,
            LocalDate priceDate,
            String variety
    );

    @Query("SELECT p FROM PriceRecord p WHERE (:commodityCode IS NULL OR p.commodityCode = :commodityCode) " +
           "AND (:mandiCode IS NULL OR p.mandiCode = :mandiCode) " +
           "AND p.verified = true AND p.provenanceType IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED') " +
           "ORDER BY p.priceDate DESC, p.verified DESC, p.id DESC")
    List<PriceRecord> searchPrices(
            @Param("commodityCode") String commodityCode,
            @Param("mandiCode") String mandiCode
    );

    @Query("SELECT p FROM PriceRecord p WHERE p.commodityCode = :commodityCode AND p.verified = true AND p.provenanceType IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED') ORDER BY p.priceDate DESC, p.verified DESC, p.id DESC")
    List<PriceRecord> findTop50ByCommodityCode(@Param("commodityCode") String commodityCode, Pageable pageable);

    @Query("SELECT p FROM PriceRecord p WHERE p.commodityCode = :commodityCode AND p.mandiCode = :mandiCode AND p.verified = true AND p.provenanceType IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED') ORDER BY p.priceDate DESC, p.verified DESC, p.id DESC")
    List<PriceRecord> findTop50ByCommodityCodeAndMandiCode(@Param("commodityCode") String commodityCode, @Param("mandiCode") String mandiCode, Pageable pageable);

    @Query("SELECT p FROM PriceRecord p WHERE p.commodityCode = :commodityCode AND p.mandiCode IN :mandiCodes AND p.verified = true AND p.provenanceType IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED') ORDER BY p.priceDate DESC, p.verified DESC, p.id DESC")
    List<PriceRecord> findTop50ByCommodityCodeAndMandiCodes(@Param("commodityCode") String commodityCode, @Param("mandiCodes") List<String> mandiCodes, Pageable pageable);

    @Query(value = """
            SELECT p FROM PriceRecord p
            WHERE (:commodityCode = '' OR p.commodityCode = :commodityCode)
              AND (:mandiCode = '' OR p.mandiCode = :mandiCode)
              AND (:variety = '' OR lower(p.variety) = lower(:variety))
              AND ((:provenanceType = '' AND p.verified = true AND p.provenanceType IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED'))
                   OR (:provenanceType = 'ALL')
                   OR (p.provenanceType = :provenanceType))
              AND (:priceDate IS NULL OR p.priceDate = :priceDate)
              AND ((:state = '' AND :district = '') OR EXISTS (
                  SELECT m.code FROM Mandi m WHERE m.code = p.mandiCode
                    AND (:state = '' OR lower(m.state) = lower(:state))
                    AND (:district = '' OR lower(m.district) = lower(:district))))
            ORDER BY p.priceDate DESC, p.verified DESC, p.id DESC
            """,
            countQuery = """
            SELECT count(p) FROM PriceRecord p
            WHERE (:commodityCode = '' OR p.commodityCode = :commodityCode)
              AND (:mandiCode = '' OR p.mandiCode = :mandiCode)
              AND (:variety = '' OR lower(p.variety) = lower(:variety))
              AND ((:provenanceType = '' AND p.verified = true AND p.provenanceType IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED'))
                   OR (:provenanceType = 'ALL')
                   OR (p.provenanceType = :provenanceType))
              AND (:priceDate IS NULL OR p.priceDate = :priceDate)
              AND ((:state = '' AND :district = '') OR EXISTS (
                  SELECT m.code FROM Mandi m WHERE m.code = p.mandiCode
                    AND (:state = '' OR lower(m.state) = lower(:state))
                    AND (:district = '' OR lower(m.district) = lower(:district))))
            """)
    Page<PriceRecord> searchPricePage(
            @Param("commodityCode") String commodityCode,
            @Param("mandiCode") String mandiCode,
            @Param("state") String state,
            @Param("district") String district,
            @Param("variety") String variety,
            @Param("provenanceType") String provenanceType,
            @Param("priceDate") LocalDate priceDate,
            Pageable pageable
    );

    @Query("SELECT DISTINCT p.variety FROM PriceRecord p WHERE p.commodityCode = :commodityCode AND p.verified = true AND p.provenanceType IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED') AND p.variety IS NOT NULL AND p.variety <> '' ORDER BY p.variety ASC")
    List<String> findDistinctVarietiesByCommodityCode(@Param("commodityCode") String commodityCode);

    @Query("""
            SELECT p.priceDate AS priceDate, p.variety AS variety, count(DISTINCT p.mandiCode) AS mandiCount
            FROM PriceRecord p
            WHERE p.commodityCode = :commodityCode
              AND p.verified = true
              AND p.provenanceType IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED')
              AND (:targetVariety = '' OR lower(p.variety) = lower(:targetVariety))
              AND (:hasSpecificMandis = false OR p.mandiCode IN :mandiCodes)
            GROUP BY p.priceDate, p.variety
            HAVING count(DISTINCT p.mandiCode) >= :requiredCount
            ORDER BY p.priceDate DESC, count(DISTINCT p.mandiCode) DESC, p.variety ASC
            """)
    List<ComparisonCandidateProjection> findComparisonCandidates(
            @Param("commodityCode") String commodityCode,
            @Param("mandiCodes") List<String> mandiCodes,
            @Param("hasSpecificMandis") boolean hasSpecificMandis,
            @Param("targetVariety") String targetVariety,
            @Param("requiredCount") long requiredCount,
            Pageable pageable
    );

    @Query("""
            SELECT p FROM PriceRecord p
            WHERE p.commodityCode = :commodityCode
              AND p.verified = true
              AND p.provenanceType IN ('OFFICIAL_INGESTION', 'HISTORICAL_VERIFIED')
              AND p.priceDate = :priceDate
              AND p.variety = :variety
              AND (:hasSpecificMandis = false OR p.mandiCode IN :mandiCodes)
            ORDER BY p.id DESC
            """)
    List<PriceRecord> findSpecificComparisonRecords(
            @Param("commodityCode") String commodityCode,
            @Param("priceDate") LocalDate priceDate,
            @Param("variety") String variety,
            @Param("mandiCodes") List<String> mandiCodes,
            @Param("hasSpecificMandis") boolean hasSpecificMandis
    );
}

