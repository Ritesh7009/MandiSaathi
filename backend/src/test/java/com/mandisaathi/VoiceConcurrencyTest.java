package com.mandisaathi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mandisaathi.client.gnani.GnaniSttServiceImpl;
import com.mandisaathi.client.gnani.TranscriptionResult;
import com.mandisaathi.config.GnaniProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class VoiceConcurrencyTest {

    private static final String TEST_KEY = "test-gnani-key-12345";
    private static final byte[] VALID_AUDIO = new byte[]{1, 2, 3, 4, 5, 6, 7, 8};

    @Test
    @DisplayName("STT Semaphore rejects requests beyond max concurrency with HTTP 429 RATE_LIMIT_OVERLOAD")
    void testConcurrencyLimitRejection() throws Exception {
        // Set max concurrency = 2, acquire timeout = 100ms
        GnaniProperties properties = new GnaniProperties(
                true,
                TEST_KEY,
                "https://api.vachana.ai/stt/v3",
                "https://api.vachana.ai/api/v1/tts/inference",
                "prisma-v2.5",
                "timbre-v2.5",
                5000,
                "Nalini",
                "Nalini",
                "Kaveri",
                2,   // maxConcurrentRequests = 2
                100  // acquireTimeoutMs = 100ms
        );

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder.build();
        ObjectMapper objectMapper = new ObjectMapper();

        CountDownLatch slowRequestsHolding = new CountDownLatch(2);
        CountDownLatch releaseSlowRequests = new CountDownLatch(1);

        // Custom slow response for the first 2 concurrent requests
        ResponseCreator slowResponse = request -> {
            slowRequestsHolding.countDown();
            try {
                // Hold permit for up to 1 second unless released
                releaseSlowRequests.await(1000, TimeUnit.MILLISECONDS);
            } catch (InterruptedException ignored) {}
            return withSuccess("{\"transcript\": \"holding complete\", \"confidence\": 0.98}", MediaType.APPLICATION_JSON)
                    .createResponse(request);
        };

        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3")).andRespond(slowResponse);
        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3")).andRespond(slowResponse);

        GnaniSttServiceImpl sttService = new GnaniSttServiceImpl(properties, restClient, objectMapper);

        ExecutorService executor = Executors.newFixedThreadPool(3);
        try {
            // Submit 2 slow background requests that saturate the semaphore permits
            executor.submit(() -> sttService.transcribe(VALID_AUDIO, "hi"));
            executor.submit(() -> sttService.transcribe(VALID_AUDIO, "hi"));

            // Wait until both slow requests have entered RestClient and are holding the permits
            assertTrue(slowRequestsHolding.await(500, TimeUnit.MILLISECONDS), "First two requests should acquire permits");

            // 3rd concurrent request arrives while 2 permits are occupied and acquireTimeout is only 100ms
            TranscriptionResult overloadResult = sttService.transcribe(VALID_AUDIO, "hi");

            assertNotNull(overloadResult);
            assertFalse(overloadResult.success(), "Over-capacity request must fail");
            assertEquals(429, overloadResult.statusCode(), "Over-capacity request must return 429");
            assertEquals("RATE_LIMIT_OVERLOAD", overloadResult.errorCode());
            assertTrue(overloadResult.errorMessage().contains("High voice traffic"));

        } finally {
            // Release held requests to allow clean shutdown
            releaseSlowRequests.countDown();
            executor.shutdown();
            assertTrue(executor.awaitTermination(2, TimeUnit.SECONDS));
        }
    }

    @Test
    @DisplayName("STT releases semaphore permit upon completion, allowing subsequent requests")
    void testPermitReleasedAfterCompletion() {
        GnaniProperties properties = new GnaniProperties(
                true,
                TEST_KEY,
                "https://api.vachana.ai/stt/v3",
                "https://api.vachana.ai/api/v1/tts/inference",
                "prisma-v2.5",
                "timbre-v2.5",
                5000,
                "Nalini",
                "Nalini",
                "Kaveri",
                1,   // maxConcurrentRequests = 1
                200  // acquireTimeoutMs = 200ms
        );

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder.build();
        ObjectMapper objectMapper = new ObjectMapper();

        // Expect 2 sequential requests
        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3"))
                .andRespond(withSuccess("{\"transcript\": \"पहला अनुरोध\"}", MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3"))
                .andRespond(withSuccess("{\"transcript\": \"दूसरा अनुरोध\"}", MediaType.APPLICATION_JSON));

        GnaniSttServiceImpl sttService = new GnaniSttServiceImpl(properties, restClient, objectMapper);

        // First request executes and releases permit
        TranscriptionResult result1 = sttService.transcribe(VALID_AUDIO, "hi");
        assertTrue(result1.success());
        assertEquals("पहला अनुरोध", result1.transcript());

        // Second request can immediately acquire the released permit
        TranscriptionResult result2 = sttService.transcribe(VALID_AUDIO, "hi");
        assertTrue(result2.success());
        assertEquals("दूसरा अनुरोध", result2.transcript());

        mockServer.verify();
    }

    @Test
    @DisplayName("STT respects upstream 429 Retry-After header and succeeds on retry")
    void testUpstreamRateLimitWithRetryAfter() {
        GnaniProperties properties = new GnaniProperties(
                true,
                TEST_KEY,
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
        MockRestServiceServer mockServer = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder.build();
        ObjectMapper objectMapper = new ObjectMapper();

        HttpHeaders rateLimitHeaders = new HttpHeaders();
        rateLimitHeaders.set("Retry-After", "1"); // 1 second retry-after

        // First attempt returns 429 Too Many Requests
        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3"))
                .andRespond(withRawStatus(429)
                        .headers(rateLimitHeaders)
                        .body("{\"error\": \"Rate limit exceeded\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        // Second attempt succeeds
        mockServer.expect(requestTo("https://api.vachana.ai/stt/v3"))
                .andRespond(withSuccess("{\"transcript\": \"पुनर्प्रयास सफल\"}", MediaType.APPLICATION_JSON));

        GnaniSttServiceImpl sttService = new GnaniSttServiceImpl(properties, restClient, objectMapper);

        long start = System.currentTimeMillis();
        TranscriptionResult result = sttService.transcribe(VALID_AUDIO, "hi");
        long duration = System.currentTimeMillis() - start;

        assertTrue(result.success(), "Should succeed on second attempt after retry-after backoff");
        assertEquals("पुनर्प्रयास सफल", result.transcript());
        assertTrue(duration >= 900, "Should have waited for Retry-After duration (~1000ms)");

        mockServer.verify();
    }
}
