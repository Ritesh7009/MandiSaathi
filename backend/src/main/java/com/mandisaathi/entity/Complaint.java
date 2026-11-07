package com.mandisaathi.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference_number", nullable = false, unique = true, length = 64)
    private String referenceNumber;

    @NotBlank
    @Column(nullable = false, length = 64)
    private String category;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @NotBlank
    @Column(nullable = false, length = 64)
    private String state;

    @NotBlank
    @Column(nullable = false, length = 64)
    private String district;

    @Column(name = "mandi_code", length = 64)
    private String mandiCode;

    @Column(name = "farmer_name", length = 128)
    private String farmerName;

    @Column(name = "farmer_phone", length = 32)
    private String farmerPhone;

    @Column(nullable = false, length = 32)
    private String status = "RECORDED";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Complaint() {}

    public Complaint(String referenceNumber, String category, String description, String state, String district, String mandiCode, String farmerName, String farmerPhone) {
        this.referenceNumber = referenceNumber;
        this.category = category;
        this.description = description;
        this.state = state;
        this.district = district;
        this.mandiCode = mandiCode;
        this.farmerName = farmerName;
        this.farmerPhone = farmerPhone;
        this.status = "RECORDED";
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getReferenceNumber() { return referenceNumber; }
    public String getCategory() { return category; }
    public String getDescription() { return description; }
    public String getState() { return state; }
    public String getDistrict() { return district; }
    public String getMandiCode() { return mandiCode; }
    public String getFarmerName() { return farmerName; }
    public String getFarmerPhone() { return farmerPhone; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}

