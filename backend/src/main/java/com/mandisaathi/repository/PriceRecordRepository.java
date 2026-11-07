package com.mandisaathi.repository;

import com.mandisaathi.entity.PriceRecord;
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

    @Query("SELECT p FROM PriceRecord p WHERE (:commodityCode IS NULL OR p.commodityCode = :commodityCode) " +
           "AND (:mandiCode IS NULL OR p.mandiCode = :mandiCode) " +
           "ORDER BY p.priceDate DESC")
    List<PriceRecord> searchPrices(
            @Param("commodityCode") String commodityCode,
            @Param("mandiCode") String mandiCode
    );
}
