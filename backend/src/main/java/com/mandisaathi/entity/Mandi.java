package com.mandisaathi.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
@Table(name = "mandis")
public class Mandi {

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
    private String state;

    @NotBlank
    @Column(nullable = false, length = 64)
    private String district;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Mandi() {}

    public Mandi(String code, String nameEn, String nameHi, String namePa, String state, String district, Double latitude, Double longitude, boolean active) {
        this.code = code;
        this.nameEn = nameEn;
        this.nameHi = nameHi;
        this.namePa = namePa;
        this.state = state;
        this.district = district;
        this.latitude = latitude;
        this.longitude = longitude;
        this.active = active;
        this.createdAt = Instant.now();
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

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Instant getCreatedAt() { return createdAt; }
}

