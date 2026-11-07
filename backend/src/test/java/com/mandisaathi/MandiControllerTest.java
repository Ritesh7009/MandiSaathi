package com.mandisaathi;

import com.mandisaathi.entity.Mandi;
import com.mandisaathi.repository.MandiRepository;
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
class MandiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MandiRepository mandiRepository;

    @BeforeEach
    void setUp() {
        mandiRepository.deleteAll();
        mandiRepository.save(new Mandi("KHANNA_PB", "Khanna Mandi", "खन्ना मंडी", "ਖੰਨਾ ਮੰਡੀ", "Punjab", "Ludhiana", 30.7071, 76.2166, true));
        mandiRepository.save(new Mandi("SIRSA_HR", "Sirsa Mandi", "सिरसा मंडी", "ਸਿਰਸਾ ਮੰਡੀ", "Haryana", "Sirsa", 29.5349, 75.0289, true));
    }

    @Test
    void shouldReturnActiveMandis() throws Exception {
        mockMvc.perform(get("/api/v1/mandis")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].state", is("Punjab")));
    }

    @Test
    void shouldFilterMandisByState() throws Exception {
        mockMvc.perform(get("/api/v1/mandis?state=Punjab")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].code", is("KHANNA_PB")));
    }

    @Test
    void shouldReturnMandiByCode() throws Exception {
        mockMvc.perform(get("/api/v1/mandis/KHANNA_PB")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", is("KHANNA_PB")))
                .andExpect(jsonPath("$.district", is("Ludhiana")));
    }
}

