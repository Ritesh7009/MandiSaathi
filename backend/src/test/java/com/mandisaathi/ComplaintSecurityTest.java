package com.mandisaathi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mandisaathi.dto.ComplaintRequest;
import com.mandisaathi.entity.Complaint;
import com.mandisaathi.repository.ComplaintRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ComplaintSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        complaintRepository.deleteAll();
    }

    @Test
    @DisplayName("Public user cannot list complaints without administrative key")
    void publicUserCannotListComplaints() throws Exception {
        mockMvc.perform(get("/api/v1/complaints"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Administrative authorization required")));
    }

    @Test
    @DisplayName("User with invalid admin key is rejected with 403 Forbidden")
    void invalidAdminKeyIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/complaints")
                        .header("X-Admin-Key", "wrong_key_12345"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Administrator with valid key can list all complaints")
    void adminCanListAllComplaints() throws Exception {
        Complaint c1 = new Complaint("MS-2026-11111", "DELAYED_PAYMENT", "Payment delayed 15 days", "Punjab", "Ludhiana", "KHANNA_PB", "Farmer A", "9876543210", "token12345");
        complaintRepository.save(c1);

        mockMvc.perform(get("/api/v1/complaints")
                        .header("X-Admin-Key", "mandisaathi_admin_secret_2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].referenceNumber", is("MS-2026-11111")));
    }

    @Test
    @DisplayName("Anonymous user cannot track complaint without tracking token")
    void cannotTrackComplaintWithoutToken() throws Exception {
        Complaint c = new Complaint("MS-2026-22222", "WEIGHMENT_DISPARITY", "Scale disparity 2%", "Punjab", "Ludhiana", "KHANNA_PB", "Farmer B", "9876543210", "secret_token_abc");
        complaintRepository.save(c);

        mockMvc.perform(get("/api/v1/complaints/MS-2026-22222"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Tracking token or administrative credentials required")));
    }

    @Test
    @DisplayName("Tracking complaint with wrong token returns 404 Not Found")
    void trackingWithWrongTokenReturnsNotFound() throws Exception {
        Complaint c = new Complaint("MS-2026-33333", "WEIGHMENT_DISPARITY", "Scale disparity 2%", "Punjab", "Ludhiana", "KHANNA_PB", "Farmer C", "9876543210", "secret_token_valid");
        complaintRepository.save(c);

        mockMvc.perform(get("/api/v1/complaints/MS-2026-33333")
                        .param("trackingToken", "wrong_token_xyz"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Tracking complaint with valid token succeeds and masks phone number")
    void trackingWithValidTokenSucceedsAndMasksPhone() throws Exception {
        Complaint c = new Complaint("MS-2026-44444", "QUALITY_DISPUTE", "Fair average quality rejected unjustly", "Haryana", "Sirsa", "SIRSA_HR", "Kavita Devi", "9876543210", "valid_secret_token_123");
        complaintRepository.save(c);

        mockMvc.perform(get("/api/v1/complaints/MS-2026-44444")
                        .param("trackingToken", "valid_secret_token_123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.referenceNumber", is("MS-2026-44444")))
                .andExpect(jsonPath("$.farmerPhone", is("******3210")))
                .andExpect(jsonPath("$.status", is("RECORDED")));
    }

    @Test
    @DisplayName("Registration returns unguessable tracking token to the submitter")
    void registrationReturnsUnguessableTrackingToken() throws Exception {
        ComplaintRequest req = new ComplaintRequest(
                "UNAUTHORIZED_DEDUCTIONS",
                "Arhatiya deducted 2% market fee above government statutory limits.",
                "Punjab",
                "Ludhiana",
                "KHANNA_PB",
                "Harjit Singh",
                "9812345678"
        );

        MvcResult result = mockMvc.perform(post("/api/v1/complaints")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.referenceNumber", startsWith("MS-2026-")))
                .andExpect(jsonPath("$.trackingToken", notNullValue()))
                .andExpect(jsonPath("$.farmerPhone", is("******5678")))
                .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString()).path("trackingToken").asText();
        assertFalse(token.isBlank(), "Tracking token must not be blank");
    }
}

