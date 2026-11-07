package com.mandisaathi;

import com.mandisaathi.entity.GovernmentScheme;
import com.mandisaathi.repository.GovernmentSchemeRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GovernmentSchemeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GovernmentSchemeRepository schemeRepository;

    @BeforeEach
    void setUp() {
        schemeRepository.deleteAll();

        GovernmentScheme s = new GovernmentScheme(
                "PM_KISAN",
                "PM-KISAN",
                "पीएम-किसान",
                "ਪੀਐਮ-ਕਿਸਾਨ",
                "INCOME_SUPPORT",
                "Income support of Rs 6,000",
                "₹6,000 की वित्तीय सहायता",
                "₹6,000 ਦੀ ਸਹਾਇਤਾ",
                "Landholder farmers",
                "भूमि धारक किसान",
                "ਜ਼ਮੀਨ ਮਾਲਕ ਕਿਸਾਨ",
                "Aadhaar, Land records",
                "आधार, खतौनी",
                "ਆਧਾਰ, ਜਮ੍ਹਾਂਬੰਦੀ",
                "Register on pmkisan.gov.in",
                "pmkisan.gov.in पर जाएं",
                "pmkisan.gov.in ਤੇ ਜਾਓ",
                "https://pmkisan.gov.in",
                "Verified Nov 2026"
        );
        schemeRepository.save(s);
    }

    @Test
    void shouldReturnSchemes() throws Exception {
        mockMvc.perform(get("/api/v1/schemes")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].code", is("PM_KISAN")))
                .andExpect(jsonPath("$[0].nameHi", is("पीएम-किसान")));
    }

    @Test
    void shouldReturnSchemeByCode() throws Exception {
        mockMvc.perform(get("/api/v1/schemes/PM_KISAN")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", is("PM_KISAN")))
                .andExpect(jsonPath("$.officialUrl", is("https://pmkisan.gov.in")));
    }
}
