package com.mandisaathi.repository;

import com.mandisaathi.entity.PriceRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PriceRecordRepository extends JpaRepository<PriceRecord, Long> {

    List<PriceRecord> findByCommodityCodeOrderByPriceDateDesc(String commodityCode);

    List<PriceRecord> findByCommodityCodeAndMandiCodeOrderByPriceDateDesc(String commodityCode, String mandiCode);

    List<PriceRecord> findByCommodityCodeAndMandiCodeInOrderByPriceDateDesc(String commodityCode, List<String> mandiCodes);

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
           "ORDER BY p.priceDate DESC")
    List<PriceRecord> searchPrices(
            @Param("commodityCode") String commodityCode,
            @Param("mandiCode") String mandiCode
    );

    @Query("""
            SELECT p FROM PriceRecord p
            WHERE (:commodityCode = '' OR p.commodityCode = :commodityCode)
              AND (:mandiCode = '' OR p.mandiCode = :mandiCode)
              AND ((:state = '' AND :district = '') OR EXISTS (
                  SELECT m.code FROM Mandi m WHERE m.code = p.mandiCode
                    AND (:state = '' OR lower(m.state) = lower(:state))
                    AND (:district = '' OR lower(m.district) = lower(:district))))
            ORDER BY p.priceDate DESC, p.id DESC
            """)
    List<PriceRecord> searchPricePage(
            @Param("commodityCode") String commodityCode,
            @Param("mandiCode") String mandiCode,
            @Param("state") String state,
            @Param("district") String district,
            Pageable pageable
    );
}

