package com.mandisaathi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "government_schemes")
public class GovernmentScheme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(name = "name_en", nullable = false, length = 256)
    private String nameEn;

    @Column(name = "name_hi", nullable = false, length = 256)
    private String nameHi;

    @Column(name = "name_pa", length = 256)
    private String namePa;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(name = "description_en", nullable = false, columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(name = "description_hi", nullable = false, columnDefinition = "TEXT")
    private String descriptionHi;

    @Column(name = "description_pa", columnDefinition = "TEXT")
    private String descriptionPa;

    @Column(name = "eligibility_en", nullable = false, columnDefinition = "TEXT")
    private String eligibilityEn;

    @Column(name = "eligibility_hi", nullable = false, columnDefinition = "TEXT")
    private String eligibilityHi;

    @Column(name = "eligibility_pa", columnDefinition = "TEXT")
    private String eligibilityPa;

    @Column(name = "documents_en", nullable = false, columnDefinition = "TEXT")
    private String documentsEn;

    @Column(name = "documents_hi", nullable = false, columnDefinition = "TEXT")
    private String documentsHi;

    @Column(name = "documents_pa", columnDefinition = "TEXT")
    private String documentsPa;

    @Column(name = "application_steps_en", nullable = false, columnDefinition = "TEXT")
    private String applicationStepsEn;

    @Column(name = "application_steps_hi", nullable = false, columnDefinition = "TEXT")
    private String applicationStepsHi;

    @Column(name = "application_steps_pa", columnDefinition = "TEXT")
    private String applicationStepsPa;

    @Column(name = "official_url", nullable = false, length = 512)
    private String officialUrl;

    @Column(name = "verified_date", nullable = false, length = 64)
    private String verifiedDate;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public GovernmentScheme() {}

    public GovernmentScheme(String code, String nameEn, String nameHi, String namePa, String category,
                            String descriptionEn, String descriptionHi, String descriptionPa,
                            String eligibilityEn, String eligibilityHi, String eligibilityPa,
                            String documentsEn, String documentsHi, String documentsPa,
                            String applicationStepsEn, String applicationStepsHi, String applicationStepsPa,
                            String officialUrl, String verifiedDate) {
        this.code = code;
        this.nameEn = nameEn;
        this.nameHi = nameHi;
        this.namePa = namePa;
        this.category = category;
        this.descriptionEn = descriptionEn;
        this.descriptionHi = descriptionHi;
        this.descriptionPa = descriptionPa;
        this.eligibilityEn = eligibilityEn;
        this.eligibilityHi = eligibilityHi;
        this.eligibilityPa = eligibilityPa;
        this.documentsEn = documentsEn;
        this.documentsHi = documentsHi;
        this.documentsPa = documentsPa;
        this.applicationStepsEn = applicationStepsEn;
        this.applicationStepsHi = applicationStepsHi;
        this.applicationStepsPa = applicationStepsPa;
        this.officialUrl = officialUrl;
        this.verifiedDate = verifiedDate;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getNameEn() { return nameEn; }
    public String getNameHi() { return nameHi; }
    public String getNamePa() { return namePa; }
    public String getCategory() { return category; }
    public String getDescriptionEn() { return descriptionEn; }
    public String getDescriptionHi() { return descriptionHi; }
    public String getDescriptionPa() { return descriptionPa; }
    public String getEligibilityEn() { return eligibilityEn; }
    public String getEligibilityHi() { return eligibilityHi; }
    public String getEligibilityPa() { return eligibilityPa; }
    public String getDocumentsEn() { return documentsEn; }
    public String getDocumentsHi() { return documentsHi; }
    public String getDocumentsPa() { return documentsPa; }
    public String getApplicationStepsEn() { return applicationStepsEn; }
    public String getApplicationStepsHi() { return applicationStepsHi; }
    public String getApplicationStepsPa() { return applicationStepsPa; }
    public String getOfficialUrl() { return officialUrl; }
    public String getVerifiedDate() { return verifiedDate; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
