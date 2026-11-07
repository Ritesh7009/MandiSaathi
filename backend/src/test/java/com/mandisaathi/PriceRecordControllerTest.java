package com.mandisaathi;

import com.mandisaathi.entity.Commodity;
import com.mandisaathi.entity.Mandi;
import com.mandisaathi.entity.PriceRecord;
import com.mandisaathi.repository.CommodityRepository;
import com.mandisaathi.repository.MandiRepository;
import com.mandisaathi.repository.PriceRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PriceRecordControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CommodityRepository commodityRepository;

    @Autowired
    private MandiRepository mandiRepository;

    @Autowired
    private PriceRecordRepository priceRecordRepository;

    @BeforeEach
    void setUp() {
        priceRecordRepository.deleteAll();
        commodityRepository.deleteAll();
        mandiRepository.deleteAll();

        commodityRepository.save(new Commodity("WHEAT", "Wheat", "गेहूं", "ਕਣਕ", "CEREALS", "QUINTAL"));
        mandiRepository.save(new Mandi("KHANNA_PB", "Khanna Mandi", "खन्ना मंडी", "ਖੰਨਾ ਮੰਡੀ", "Punjab", "Ludhiana", 30.7, 76.2, true));
        mandiRepository.save(new Mandi("SIRSA_HR", "Sirsa Mandi", "सिरसा मंडी", "ਸਿਰਸਾ ਮੰਡੀ", "Haryana", "Sirsa", 29.5, 75.0, true));

        PriceRecord p1 = new PriceRecord();
        p1.setCommodityCode("WHEAT");
        p1.setMandiCode("KHANNA_PB");
        p1.setMinPrice(new BigDecimal("2275.00"));
        p1.setMaxPrice(new BigDecimal("2380.00"));
        p1.setModalPrice(new BigDecimal("2320.00"));
        p1.setPriceDate(LocalDate.now());
        p1.setArrivalQuantity(new BigDecimal("400.00"));
        priceRecordRepository.save(p1);
    }

    @Test
    void shouldReturnPriceRecords() throws Exception {
        mockMvc.perform(get("/api/v1/prices")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].commodityCode", is("WHEAT")))
                .andExpect(jsonPath("$[0].mandiNameEn", is("Khanna Mandi")));
    }

    @Test
    void shouldComparePricesAcrossMandis() throws Exception {
        String json = """
            {
                "commodityCode": "WHEAT",
                "mandiCodes": ["KHANNA_PB", "SIRSA_HR"]
            }
            """;

        mockMvc.perform(post("/api/v1/prices/compare")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commodity.code", is("WHEAT")))
                .andExpect(jsonPath("$.records", hasSize(1)));
    }
}
