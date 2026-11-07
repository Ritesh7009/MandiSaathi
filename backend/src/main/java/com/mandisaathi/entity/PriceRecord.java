package com.mandisaathi.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "price_records")
public class PriceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "commodity_code", nullable = false, length = 64)
    private String commodityCode;

    @Column(name = "mandi_code", nullable = false, length = 64)
    private String mandiCode;

    @Column(name = "min_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal minPrice;

    @Column(name = "max_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxPrice;

    @Column(name = "modal_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal modalPrice;

    @Column(name = "price_date", nullable = false)
    private LocalDate priceDate;

    @Column(name = "arrival_quantity", precision = 12, scale = 2)
    private BigDecimal arrivalQuantity;

    @Column(name = "unit", nullable = false, length = 32)
    private String unit = "QUINTAL";

    @Column(name = "data_source", nullable = false, length = 128)
    private String dataSource = "Agmarknet (DAC&FW)";

    @Column(nullable = false)
    private boolean verified = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public PriceRecord() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCommodityCode() { return commodityCode; }
    public void setCommodityCode(String commodityCode) { this.commodityCode = commodityCode; }

    public String getMandiCode() { return mandiCode; }
    public void setMandiCode(String mandiCode) { this.mandiCode = mandiCode; }

    public BigDecimal getMinPrice() { return minPrice; }
    public void setMinPrice(BigDecimal minPrice) { this.minPrice = minPrice; }

    public BigDecimal getMaxPrice() { return maxPrice; }
    public void setMaxPrice(BigDecimal maxPrice) { this.maxPrice = maxPrice; }

    public BigDecimal getModalPrice() { return modalPrice; }
    public void setModalPrice(BigDecimal modalPrice) { this.modalPrice = modalPrice; }

    public LocalDate getPriceDate() { return priceDate; }
    public void setPriceDate(LocalDate priceDate) { this.priceDate = priceDate; }

    public BigDecimal getArrivalQuantity() { return arrivalQuantity; }
    public void setArrivalQuantity(BigDecimal arrivalQuantity) { this.arrivalQuantity = arrivalQuantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getDataSource() { return dataSource; }
    public void setDataSource(String dataSource) { this.dataSource = dataSource; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public Instant getCreatedAt() { return createdAt; }
}
