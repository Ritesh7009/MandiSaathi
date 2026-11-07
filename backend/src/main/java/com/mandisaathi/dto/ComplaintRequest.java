package com.mandisaathi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ComplaintRequest(
        @NotBlank(message = "Category is required")
        String category,

        @NotBlank(message = "Description is required")
        @Size(min = 10, max = 2000, message = "Description must be between 10 and 2000 characters")
        String description,

        @NotBlank(message = "State is required")
        String state,

        @NotBlank(message = "District is required")
        String district,

        String mandiCode,
        String farmerName,
        String farmerPhone
) {}
