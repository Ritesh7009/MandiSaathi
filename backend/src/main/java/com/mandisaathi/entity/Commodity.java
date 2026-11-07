package com.mandisaathi.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
@Table(name = "commodities")
public class Commodity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @NotBlank
    @Column(name = "name_en", nullable = false, length = 128)
    private String nameEn;

    @NotBlank
    @Column(name = "name_hi", nullable = false, length = 128)
    private String nameHi;

    @Column(name = "name_pa", length = 128)
    private String namePa;

    @NotBlank
    @Column(nullable = false, length = 64)
    private String category;

    @Column(name = "default_unit", nullable = false, length = 32)
    private String defaultUnit = "QUINTAL";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Commodity() {}

    public Commodity(String code, String nameEn, String nameHi, String namePa, String category, String defaultUnit) {
        this.code = code;
        this.nameEn = nameEn;
        this.nameHi = nameHi;
        this.namePa = namePa;
        this.category = category;
        this.defaultUnit = defaultUnit;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getNameEn() { return nameEn; }
    public void setNameEn(String nameEn) { this.nameEn = nameEn; }

    public String getNameHi() { return nameHi; }
    public void setNameHi(String nameHi) { this.nameHi = nameHi; }

    public String getNamePa() { return namePa; }
    public void setNamePa(String namePa) { this.namePa = namePa; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDefaultUnit() { return defaultUnit; }
    public void setDefaultUnit(String defaultUnit) { this.defaultUnit = defaultUnit; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

