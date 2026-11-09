package com.mandisaathi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mandisaathi.client.gnani.GnaniSttServiceImpl;
import com.mandisaathi.client.gnani.GnaniTtsServiceImpl;
import com.mandisaathi.client.gnani.SynthesisResult;
import com.mandisaathi.client.gnani.TranscriptionResult;
import com.mandisaathi.config.GnaniProperties;
import com.mandisaathi.config.MandiDataProperties;
import com.mandisaathi.service.HealthService;
import com.mandisaathi.service.MandiDataIngestionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import javax.sql.DataSource;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GnaniClientTest {

    private static final String TEST_SHARED_API_KEY = "gnani-shared-stt-tts-key-99999";

    private GnaniProperties gnaniProperties;
    private RestClient restClient;
    private MockRestServiceServer mockServer;
    private ObjectMapper objectMapper;

    private GnaniSttServiceImpl sttService;
    private GnaniTtsServiceImpl ttsService;

    @BeforeEach
    void setUp() {
        // Single GNANI_API_KEY for both Prisma STT and Timbre TTS
        gnaniProperties = new GnaniProperties(
                true,
                TEST_SHARED_API_KEY,
                "https://api.vachana.ai/stt/v3",
                "https://api.vachana.ai/api/v1/tts/inference",
                "prisma-v2.5",
                "timbre-v2.5",
                5000,
                "Nalini",
                "Nalini",
                "Kaveri",
                5,
                3000
        );

        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        restClient = builder.build();
        objectMapper = new ObjectMapper();

        sttService = new GnaniSttServiceImpl(gnaniProperties, restClient, objectMapper);
        ttsService = new GnaniTtsServiceImpl(gnaniProperties, restClient);
    }

    @Test
    void testSingleApiKeyConfiguration() {
        assertTrue(gnaniProperties.isConfigured());
        assertEquals("X-API-Key-ID", gnaniProperties.getEffectiveAuthHeaderKey());
        assertEquals(TEST_SHARED_API_KEY, gnaniProperties.getEffectiveAuthHeaderValue());
    }

    @Test
    void testSuccessfulSttTranscriptionUsingSharedKey() {
        String mockResponseJson = """
            {
                "success": true,
                "request_id": "req-stt-101",
                "transcript": "आज पंजाब में गेहूं का भाव क्या चल रहा है",
                "detected_language_code": "hi-IN",
                "model": "prisma-v2.5",
                "processing_time": 0.42
            }
            """;

        // Verifies X-API-Key-ID header with the single shared key
        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-API-Key-ID", TEST_SHARED_API_KEY))
                .andRespond(withSuccess(mockResponseJson, MediaType.APPLICATION_JSON));

        byte[] fakeAudio = new byte[]{1, 2, 3, 4, 5, 6, 7, 8};
        TranscriptionResult result = sttService.transcribe(fakeAudio, "hi-IN");

        assertTrue(result.success());
        assertEquals("आज पंजाब में गेहूं का भाव क्या चल रहा है", result.transcript());
        assertEquals("hi-IN", result.detectedLanguage());
        mockServer.verify();
    }

    @Test
    void testSuccessfulTtsSynthesisUsingSharedKey() {
        byte[] expectedAudioBytes = "RIFF....WAVEfmt ....data....".getBytes();

        // Verifies X-API-Key-ID header with the same single shared key
        mockServer.expect(requestTo("https://api.vachana.ai/api/v1/tts/inference"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-API-Key-ID", TEST_SHARED_API_KEY))
                .andRespond(withSuccess(expectedAudioBytes, MediaType.valueOf("audio/wav")));

        SynthesisResult result = ttsService.synthesize("गेहूं का भाव ₹2450 है", "hi-IN", "female");

        assertTrue(result.success());
        assertEquals("audio/wav", result.mimeType());
        assertArrayEquals(expectedAudioBytes, result.audioData());
        mockServer.verify();
    }

    @Test
    void testSttAuthenticationFailure401() {
        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-API-Key-ID", TEST_SHARED_API_KEY))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        byte[] fakeAudio = new byte[]{1, 2, 3};
        TranscriptionResult result = sttService.transcribe(fakeAudio, "hi-IN");

        assertFalse(result.success());
        assertTrue(result.errorMessage().contains("authentication failure"));
        mockServer.verify();
    }

    @Test
    void testTtsAuthenticationFailure401() {
        mockServer.expect(requestTo("https://api.vachana.ai/api/v1/tts/inference"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-API-Key-ID", TEST_SHARED_API_KEY))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        SynthesisResult result = ttsService.synthesize("परीक्षण", "hi-IN", "female");

        assertFalse(result.success());
        assertTrue(result.errorMessage().contains("authentication failure"));
        mockServer.verify();
    }

    @Test
    void testInvalidAudioReturnsFailure() {
        TranscriptionResult nullResult = sttService.transcribe(null, "hi-IN");
        assertFalse(nullResult.success());
        assertTrue(nullResult.errorMessage().contains("empty"));

        TranscriptionResult emptyResult = sttService.transcribe(new byte[0], "hi-IN");
        assertFalse(emptyResult.success());
        assertTrue(emptyResult.errorMessage().contains("empty"));
    }

    @Test
    void testMissingCredentialsReturnsFailure() {
        GnaniProperties unconfigured = new GnaniProperties(
                true, "", "https://api.vachana.ai/stt/v3", "https://api.vachana.ai/api/v1/tts/inference",
                "prisma-v2.5", "timbre-v2.5", 5000, "Nalini", "Nalini", "Kaveri", 5, 3000
        );
        GnaniSttServiceImpl unconfiguredStt = new GnaniSttServiceImpl(unconfigured, restClient, objectMapper);

        TranscriptionResult result = unconfiguredStt.transcribe(new byte[]{1, 2, 3}, "hi-IN");
        assertFalse(result.success());
        assertTrue(result.errorMessage().contains("not configured"));
    }

    @Test
    void testTtsEmptyTextReturnsFailure() {
        SynthesisResult result = ttsService.synthesize("", "hi-IN", "female");
        assertFalse(result.success());
        assertTrue(result.errorMessage().contains("empty"));
    }

    @Test
    void testIndependentAuthenticationReportingInHealthCheck() {
        DataSource mockDataSource = mock(DataSource.class);
        MandiDataProperties mandiProps = new MandiDataProperties(false, "", "", 100, 10000, false, "0 0 19 * * *", "Asia/Kolkata");
        MandiDataIngestionService mockIngestion = mock(MandiDataIngestionService.class);
        org.mockito.Mockito.when(mockIngestion.getStatus()).thenReturn("ACTIVE");

        HealthService healthService = new HealthService(
                mockDataSource,
                gnaniProperties,
                mandiProps,
                mockIngestion,
                restClient
        );

        // STT succeeds (HTTP 405 Method Not Allowed indicates endpoint authenticated and reached)
        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-API-Key-ID", TEST_SHARED_API_KEY))
                .andRespond(withStatus(HttpStatus.METHOD_NOT_ALLOWED));

        // TTS fails with 401 Unauthorized
        mockServer.expect(requestTo("https://api.vachana.ai/api/v1/tts/inference"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-API-Key-ID", TEST_SHARED_API_KEY))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        var health = healthService.getHealth();
        assertNotNull(health);

        @SuppressWarnings("unchecked")
        var sttMap = (java.util.Map<String, Object>) health.services().get("gnaniPrismaStt");
        assertEquals("CONNECTED", sttMap.get("status"));

        @SuppressWarnings("unchecked")
        var ttsMap = (java.util.Map<String, Object>) health.services().get("gnaniTimbreTts");
        assertEquals("FAILED", ttsMap.get("status"));

        mockServer.verify();
    }
}
