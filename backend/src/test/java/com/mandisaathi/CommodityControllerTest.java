package com.mandisaathi;

import com.mandisaathi.entity.Commodity;
import com.mandisaathi.repository.CommodityRepository;
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
class CommodityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CommodityRepository commodityRepository;

    @BeforeEach
    void setUp() {
        commodityRepository.deleteAll();
        commodityRepository.save(new Commodity("WHEAT", "Wheat", "गेहूं", "ਕਣਕ", "CEREALS", "QUINTAL"));
        commodityRepository.save(new Commodity("MUSTARD", "Mustard", "सरसों", "ਸਰ੍ਹੋਂ", "OILSEEDS", "QUINTAL"));
    }

    @Test
    void shouldReturnAllCommodities() throws Exception {
        mockMvc.perform(get("/api/v1/commodities")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].code", is("WHEAT")))
                .andExpect(jsonPath("$[0].nameHi", is("गेहूं")));
    }

    @Test
    void shouldReturnCommodityByCode() throws Exception {
        mockMvc.perform(get("/api/v1/commodities/WHEAT")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code", is("WHEAT")))
                .andExpect(jsonPath("$.nameEn", is("Wheat")));
    }

    @Test
    void shouldReturn404WhenNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/commodities/NON_EXISTENT")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.message", containsString("Commodity not found")));
    }
}

