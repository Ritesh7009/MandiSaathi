package com.mandisaathi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VoiceAssistantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldProcessVoiceTextQueryInHindi() throws Exception {
        String json = """
            {
                "queryText": "आज गेहूं का भाव क्या है?",
                "language": "hi"
            }
            """;

        mockMvc.perform(post("/api/v1/voice/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transcript", is("आज गेहूं का भाव क्या है?")))
                .andExpect(jsonPath("$.detectedLanguage", is("hi-IN")))
                .andExpect(jsonPath("$.responseText", notNullValue()))
                .andExpect(jsonPath("$.engineNotice", containsString("Gnani Prisma v2.5")));
    }
}
