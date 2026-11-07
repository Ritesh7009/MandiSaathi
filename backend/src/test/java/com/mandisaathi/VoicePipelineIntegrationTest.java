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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VoicePipelineIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CommodityRepository commodityRepository;

    @Autowired
    private MandiRepository mandiRepository;

    @Autowired
    private PriceRecordRepository priceRecordRepository;

    @BeforeEach
    void seedTestData() {
        priceRecordRepository.deleteAll();
        mandiRepository.deleteAll();
        commodityRepository.deleteAll();

        // Commodities
        Commodity wheat = new Commodity();
        wheat.setCode("WHEAT");
        wheat.setNameEn("Wheat");
        wheat.setNameHi("गेहूं");
        wheat.setNamePa("ਕਣਕ");
        wheat.setCategory("CEREALS");
        wheat.setDefaultUnit("QUINTAL");
        commodityRepository.save(wheat);

        Commodity mustard = new Commodity();
        mustard.setCode("MUSTARD");
        mustard.setNameEn("Mustard");
        mustard.setNameHi("सरसों");
        mustard.setNamePa("ਸਰ੍ਹੋਂ");
        mustard.setCategory("OILSEEDS");
        mustard.setDefaultUnit("QUINTAL");
        commodityRepository.save(mustard);

        // Mandis
        Mandi khanna = new Mandi();
        khanna.setCode("KHANNA_PB");
        khanna.setNameEn("Khanna");
        khanna.setNameHi("खन्ना");
        khanna.setNamePa("ਖੰਨਾ");
        khanna.setState("Punjab");
        khanna.setDistrict("Ludhiana");
        khanna.setActive(true);
        mandiRepository.save(khanna);

        Mandi sirsa = new Mandi();
        sirsa.setCode("SIRSA_HR");
        sirsa.setNameEn("Sirsa");
        sirsa.setNameHi("सिरसा");
        sirsa.setNamePa("ਸਿਰਸਾ");
        sirsa.setState("Haryana");
        sirsa.setDistrict("Sirsa");
        sirsa.setActive(true);
        mandiRepository.save(sirsa);

        // Price Records
        PriceRecord wheatKhanna = new PriceRecord();
        wheatKhanna.setCommodityCode("WHEAT");
        wheatKhanna.setMandiCode("KHANNA_PB");
        wheatKhanna.setMinPrice(new BigDecimal("2380.00"));
        wheatKhanna.setMaxPrice(new BigDecimal("2490.00"));
        wheatKhanna.setModalPrice(new BigDecimal("2450.00"));
        wheatKhanna.setPriceDate(LocalDate.now());
        wheatKhanna.setUnit("QUINTAL");
        wheatKhanna.setDataSource("Agmarknet / Punjab Mandi Board");
        wheatKhanna.setVerified(true);
        priceRecordRepository.save(wheatKhanna);

        PriceRecord wheatSirsa = new PriceRecord();
        wheatSirsa.setCommodityCode("WHEAT");
        wheatSirsa.setMandiCode("SIRSA_HR");
        wheatSirsa.setMinPrice(new BigDecimal("2350.00"));
        wheatSirsa.setMaxPrice(new BigDecimal("2460.00"));
        wheatSirsa.setModalPrice(new BigDecimal("2420.00"));
        wheatSirsa.setPriceDate(LocalDate.now());
        wheatSirsa.setUnit("QUINTAL");
        wheatSirsa.setDataSource("Agmarknet / Haryana HSAMB");
        wheatSirsa.setVerified(true);
        priceRecordRepository.save(wheatSirsa);

        PriceRecord mustardSirsa = new PriceRecord();
        mustardSirsa.setCommodityCode("MUSTARD");
        mustardSirsa.setMandiCode("SIRSA_HR");
        mustardSirsa.setMinPrice(new BigDecimal("5450.00"));
        mustardSirsa.setMaxPrice(new BigDecimal("5820.00"));
        mustardSirsa.setModalPrice(new BigDecimal("5680.00"));
        mustardSirsa.setPriceDate(LocalDate.now());
        mustardSirsa.setUnit("QUINTAL");
        mustardSirsa.setDataSource("Agmarknet / Haryana HSAMB");
        mustardSirsa.setVerified(true);
        priceRecordRepository.save(mustardSirsa);
    }

    @Test
    void testValidMandiPriceQueryInHindi_PunjabWheat() throws Exception {
        String json = """
            {
                "queryText": "आज पंजाब में गेहूं का भाव क्या चल रहा है?",
                "language": "hi"
            }
            """;

        mockMvc.perform(post("/api/v1/voice/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intent", is("MANDI_PRICE_LOOKUP")))
                .andExpect(jsonPath("$.detectedLanguage", is("hi-IN")))
                .andExpect(jsonPath("$.extractedEntities.commodity", is("WHEAT")))
                .andExpect(jsonPath("$.extractedEntities.state", is("Punjab")))
                .andExpect(jsonPath("$.responseTextHi", containsString("2450")))
                .andExpect(jsonPath("$.responseTextHi", containsString("खन्ना")))
                .andExpect(jsonPath("$.priceRecords", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void testValidMandiPriceQueryInPunjabi_LudhianaWheat() throws Exception {
        String json = """
            {
                "queryText": "ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?",
                "language": "pa"
            }
            """;

        mockMvc.perform(post("/api/v1/voice/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intent", is("MANDI_PRICE_LOOKUP")))
                .andExpect(jsonPath("$.detectedLanguage", is("pa-IN")))
                .andExpect(jsonPath("$.extractedEntities.commodity", is("WHEAT")))
                .andExpect(jsonPath("$.extractedEntities.mandi", is("KHANNA_PB")))
                .andExpect(jsonPath("$.responseTextPa", containsString("2450")))
                .andExpect(jsonPath("$.priceRecords", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void testValidMandiPriceQueryInEnglish_SirsaWheat() throws Exception {
        String json = """
            {
                "queryText": "What is the wheat price in Sirsa mandi?",
                "language": "en"
            }
            """;

        mockMvc.perform(post("/api/v1/voice/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intent", is("MANDI_PRICE_LOOKUP")))
                .andExpect(jsonPath("$.extractedEntities.commodity", is("WHEAT")))
                .andExpect(jsonPath("$.extractedEntities.mandi", is("SIRSA_HR")))
                .andExpect(jsonPath("$.responseText", containsString("2420")))
                .andExpect(jsonPath("$.responseText", containsString("Sirsa")));
    }

    @Test
    void testMissingMandiInformationAsksClarification() throws Exception {
        String json = """
            {
                "queryText": "सरसों का भाव क्या है?",
                "language": "hi"
            }
            """;

        mockMvc.perform(post("/api/v1/voice/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intent", is("MANDI_PRICE_LOOKUP")))
                .andExpect(jsonPath("$.extractedEntities.commodity", is("MUSTARD")))
                .andExpect(jsonPath("$.responseTextHi", containsString("मंडी या राज्य का भाव जानना चाहते हैं")))
                .andExpect(jsonPath("$.priceRecords", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void testUnknownCommodityReturnsHelpfulMessage() throws Exception {
        String json = """
            {
                "queryText": "स्मार्टफोन का भाव क्या है?",
                "language": "hi"
            }
            """;

        mockMvc.perform(post("/api/v1/voice/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intent", is("UNKNOWN")))
                .andExpect(jsonPath("$.responseTextHi", containsString("कृषि उपज")));
    }

    @Test
    void testNoPriceRecordsFound() throws Exception {
        String json = """
            {
                "queryText": "राजस्थान में गेहूं का भाव क्या है?",
                "language": "hi"
            }
            """;

        mockMvc.perform(post("/api/v1/voice/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intent", is("MANDI_PRICE_LOOKUP")))
                .andExpect(jsonPath("$.extractedEntities.commodity", is("WHEAT")))
                .andExpect(jsonPath("$.extractedEntities.state", is("Rajasthan")))
                .andExpect(jsonPath("$.responseTextHi", containsString("कोई आधिकारिक भाव दर्ज नहीं है")));
    }

    @Test
    void testMandiComparisonQuery() throws Exception {
        String json = """
            {
                "queryText": "गेहूं के भाव की तुलना करें",
                "language": "hi"
            }
            """;

        mockMvc.perform(post("/api/v1/voice/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intent", is("MANDI_COMPARISON")))
                .andExpect(jsonPath("$.responseTextHi", containsString("तुलना")))
                .andExpect(jsonPath("$.responseTextHi", containsString("सर्वोत्तम मॉडल भाव")));
    }

    @Test
    void testMultipartAudioSubmission() throws Exception {
        MockMultipartFile audioFile = new MockMultipartFile(
                "audio",
                "farmer_query.wav",
                "audio/wav",
                new byte[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
        );

        mockMvc.perform(multipart("/api/v1/voice/audio")
                        .file(audioFile)
                        .param("language", "hi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transcript", notNullValue()))
                .andExpect(jsonPath("$.intent", notNullValue()))
                .andExpect(jsonPath("$.responseText", notNullValue()));
    }

    @Test
    void testInvalidEmptyAudioSubmissionReturnsBadRequest() throws Exception {
        MockMultipartFile emptyAudio = new MockMultipartFile(
                "audio",
                "empty.wav",
                "audio/wav",
                new byte[0]
        );

        mockMvc.perform(multipart("/api/v1/voice/audio")
                        .file(emptyAudio)
                        .param("language", "hi"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.aiServiceStatus", is("FAILED")));
    }
}

