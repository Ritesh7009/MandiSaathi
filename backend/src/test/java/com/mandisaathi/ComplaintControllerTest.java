package com.mandisaathi;

import com.mandisaathi.repository.ComplaintRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ComplaintControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ComplaintRepository complaintRepository;

    @BeforeEach
    void setUp() {
        complaintRepository.deleteAll();
    }

    @Test
    void shouldRegisterComplaintSuccessfully() throws Exception {
        String json = """
            {
                "category": "WEIGHMENT_DISPARITY",
                "description": "Electronic scale showed 5% difference compared to primary weighbridge.",
                "state": "Punjab",
                "district": "Ludhiana",
                "mandiCode": "KHANNA_PB",
                "farmerName": "Gurpreet Singh",
                "farmerPhone": "9876543210"
            }
            """;

        mockMvc.perform(post("/api/v1/complaints")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.referenceNumber", startsWith("MS-2026-")))
                .andExpect(jsonPath("$.category", is("WEIGHMENT_DISPARITY")))
                .andExpect(jsonPath("$.status", is("RECORDED")));
    }
}

