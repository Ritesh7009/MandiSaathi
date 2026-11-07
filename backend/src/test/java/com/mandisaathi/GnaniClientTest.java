package com.mandisaathi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mandisaathi.client.gnani.GnaniSttServiceImpl;
import com.mandisaathi.client.gnani.GnaniTtsServiceImpl;
import com.mandisaathi.client.gnani.SynthesisResult;
import com.mandisaathi.client.gnani.TranscriptionResult;
import com.mandisaathi.config.GnaniProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GnaniClientTest {

    private GnaniProperties gnaniProperties;
    private RestClient restClient;
    private MockRestServiceServer mockServer;
    private ObjectMapper objectMapper;

    private GnaniSttServiceImpl sttService;
    private GnaniTtsServiceImpl ttsService;

    @BeforeEach
    void setUp() {
        gnaniProperties = new GnaniProperties(
                true,
                "test-api-key-12345",
                "test-token-abcdef",
                "https://api.vachana.ai/stt/v3",
                "https://api.vachana.ai/api/v1/tts/inference",
                "prisma-v2.5",
                "timbre-v2.5",
                5000,
                "Nalini",
                "Nalini",
                "Kaveri"
        );

        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        restClient = builder.build();
        objectMapper = new ObjectMapper();

        sttService = new GnaniSttServiceImpl(gnaniProperties, restClient, objectMapper);
        ttsService = new GnaniTtsServiceImpl(gnaniProperties, restClient);
    }

    @Test
    void testSuccessfulSttTranscription() {
        String mockResponseJson = """
            {
                "success": true,
                "request_id": "req-9876",
                "transcript": "आज पंजाब में गेहूं का भाव क्या चल रहा है",
                "detected_language_code": "hi-IN",
                "model": "prisma-v2.5",
                "processing_time": 0.45
            }
            """;

        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-API-Key-ID", "test-api-key-12345"))
                .andRespond(withSuccess(mockResponseJson, MediaType.APPLICATION_JSON));

        byte[] fakeAudio = new byte[]{1, 2, 3, 4, 5, 6, 7, 8};
        TranscriptionResult result = sttService.transcribe(fakeAudio, "hi-IN");

        assertTrue(result.success());
        assertEquals("आज पंजाब में गेहूं का भाव क्या चल रहा है", result.transcript());
        assertEquals("hi-IN", result.detectedLanguage());
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
                true, "", "", "https://api.vachana.ai/stt/v3", "https://api.vachana.ai/api/v1/tts/inference",
                "prisma-v2.5", "timbre-v2.5", 5000, "Nalini", "Nalini", "Kaveri"
        );
        GnaniSttServiceImpl unconfiguredStt = new GnaniSttServiceImpl(unconfigured, restClient, objectMapper);

        TranscriptionResult result = unconfiguredStt.transcribe(new byte[]{1, 2, 3}, "hi-IN");
        assertFalse(result.success());
        assertTrue(result.errorMessage().contains("not configured"));
    }

    @Test
    void testGnaniAuthenticationFailure401() {
        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        byte[] fakeAudio = new byte[]{1, 2, 3};
        TranscriptionResult result = sttService.transcribe(fakeAudio, "hi-IN");

        assertFalse(result.success());
        assertTrue(result.errorMessage().contains("authentication failure"));
        mockServer.verify();
    }

    @Test
    void testSuccessfulTtsSynthesis() {
        byte[] expectedAudioBytes = "RIFF....WAVEfmt ....data....".getBytes();

        mockServer.expect(requestTo("https://api.vachana.ai/api/v1/tts/inference"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-API-Key-ID", "test-api-key-12345"))
                .andRespond(withSuccess(expectedAudioBytes, MediaType.valueOf("audio/wav")));

        SynthesisResult result = ttsService.synthesize("गेहूं का भाव ₹2450 है", "hi-IN", "female");

        assertTrue(result.success());
        assertEquals("audio/wav", result.mimeType());
        assertArrayEquals(expectedAudioBytes, result.audioData());
        mockServer.verify();
    }

    @Test
    void testTtsAuthenticationFailure401() {
        mockServer.expect(requestTo("https://api.vachana.ai/api/v1/tts/inference"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        SynthesisResult result = ttsService.synthesize("परीक्षण", "hi-IN", "female");

        assertFalse(result.success());
        assertTrue(result.errorMessage().contains("authentication failure"));
        mockServer.verify();
    }

    @Test
    void testTtsEmptyTextReturnsFailure() {
        SynthesisResult result = ttsService.synthesize("", "hi-IN", "female");
        assertFalse(result.success());
        assertTrue(result.errorMessage().contains("empty"));
    }
}
