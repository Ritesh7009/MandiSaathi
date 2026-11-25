package com.mandisaathi;

import com.mandisaathi.ratelimit.InMemoryRateLimiter;
import com.mandisaathi.ratelimit.RateLimitResult;
import com.mandisaathi.util.ClientIpResolver;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHardeningRegressionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private InMemoryRateLimiter inMemoryRateLimiter;

    @Test
    @DisplayName("1. Rate Limiter Flood Attack Resilience: High volume of keys does not cause global counter wipe")
    void testRateLimiterFloodDoesNotWipeActiveCounters() {
        inMemoryRateLimiter.reset();
        inMemoryRateLimiter.setClock(Clock.fixed(Instant.parse("2026-11-25T12:00:10Z"), ZoneOffset.UTC));

        // Client A consumes all 5 allowed tokens
        String targetClient = "192.0.2.1";
        for (int i = 0; i < 5; i++) {
            RateLimitResult res = inMemoryRateLimiter.tryAcquire("test_cat", targetClient, 5);
            assertTrue(res.allowed(), "Requests within limit must be allowed");
        }

        // Target client is now blocked
        RateLimitResult blockedRes = inMemoryRateLimiter.tryAcquire("test_cat", targetClient, 5);
        assertFalse(blockedRes.allowed(), "6th request must be rejected");

        // Attacker floods 15,000 distinct keys to exceed the 10,000-entry capacity threshold
        for (int i = 0; i < 15000; i++) {
            inMemoryRateLimiter.tryAcquire("test_cat", "spoofed-ip-" + i, 10);
        }

        // Assert Target Client is STILL blocked and was NOT reset by capacity eviction
        RateLimitResult stillBlocked = inMemoryRateLimiter.tryAcquire("test_cat", targetClient, 5);
        assertFalse(stillBlocked.allowed(), "Rate limiter must NOT wipe active blocked clients upon capacity eviction (No DoS/Evasion)");
        inMemoryRateLimiter.reset();
    }

    @Test
    @DisplayName("1b. Rate Limiter Concurrent Flood: Multi-threaded key saturation protects active blocked clients")
    void testRateLimiterConcurrentFloodSafety() throws Exception {
        inMemoryRateLimiter.reset();
        inMemoryRateLimiter.setClock(Clock.fixed(Instant.parse("2026-11-25T12:00:10Z"), ZoneOffset.UTC));

        String targetClient = "192.0.2.100";
        for (int i = 0; i < 5; i++) {
            inMemoryRateLimiter.tryAcquire("test_concurrent", targetClient, 5);
        }
        assertFalse(inMemoryRateLimiter.tryAcquire("test_concurrent", targetClient, 5).allowed());

        // Launch 10 parallel threads each generating 1,500 keys (15,000 keys total)
        int threadCount = 10;
        int keysPerThread = 1500;
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(threadCount);
        java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(threadCount);

        for (int t = 0; t < threadCount; t++) {
            final int threadId = t;
            executor.submit(() -> {
                try {
                    for (int k = 0; k < keysPerThread; k++) {
                        inMemoryRateLimiter.tryAcquire("test_concurrent", "thread-" + threadId + "-ip-" + k, 10);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean finished = latch.await(10, java.util.concurrent.TimeUnit.SECONDS);
        executor.shutdown();
        assertTrue(finished, "Concurrent rate limiter flood completed within timeout");

        // Target client MUST remain blocked
        assertFalse(inMemoryRateLimiter.tryAcquire("test_concurrent", targetClient, 5).allowed(),
                "Target client must remain blocked even under concurrent saturation");
        inMemoryRateLimiter.reset();
    }

    @Test
    @DisplayName("2. ClientIpResolver Exact IP & CIDR Validation: Prevents prefix spoofing and evaluates subnets")
    void testClientIpResolverStrictProxyValidation() {
        try {
            // Case 1: Exact IP configured (10.50.0.1)
            ClientIpResolver.setConfiguredTrustedProxies(List.of("10.50.0.1"));

            // 10.50.0.100 must NOT match via prefix!
            MockHttpServletRequest prefixSpoof = new MockHttpServletRequest();
            prefixSpoof.setRemoteAddr("10.50.0.100");
            prefixSpoof.addHeader("Render-Client-IP", "203.0.113.195");
            assertEquals("10.50.0.100", ClientIpResolver.resolve(prefixSpoof));

            // 10.50.0.1 must match exactly
            MockHttpServletRequest exactMatch = new MockHttpServletRequest();
            exactMatch.setRemoteAddr("10.50.0.1");
            exactMatch.addHeader("Render-Client-IP", "203.0.113.195");
            assertEquals("203.0.113.195", ClientIpResolver.resolve(exactMatch));

            // Case 2: CIDR subnet configured (192.168.10.0/24)
            ClientIpResolver.setConfiguredTrustedProxies(List.of("192.168.10.0/24"));

            MockHttpServletRequest subnetMatch = new MockHttpServletRequest();
            subnetMatch.setRemoteAddr("192.168.10.45");
            subnetMatch.addHeader("Render-Client-IP", "203.0.113.195");
            assertEquals("203.0.113.195", ClientIpResolver.resolve(subnetMatch));

            MockHttpServletRequest subnetMismatch = new MockHttpServletRequest();
            subnetMismatch.setRemoteAddr("192.168.11.45");
            subnetMismatch.addHeader("Render-Client-IP", "203.0.113.195");
            assertEquals("192.168.11.45", ClientIpResolver.resolve(subnetMismatch));
        } finally {
            ClientIpResolver.setConfiguredTrustedProxies(null);
        }
    }

    @Test
    @DisplayName("3. Voice Audio Payload Hardening: Rejects payload exceeding 4MB with 413 Payload Too Large")
    void testVoiceAudioRejectsOversizedPayload() throws Exception {
        byte[] oversized = new byte[5 * 1024 * 1024]; // 5MB payload
        MockMultipartFile file = new MockMultipartFile("audio", "large.wav", "audio/wav", oversized);

        mockMvc.perform(multipart("/api/v1/voice/audio")
                        .file(file)
                        .param("language", "hi"))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.errorCode").value("AUDIO_TOO_LARGE"))
                .andExpect(jsonPath("$.statusCode").value(413));
    }

    @Test
    @DisplayName("4. Security Headers Verification: CSP, Permissions-Policy, Frame-Options, Content-Type-Options")
    void testSecurityHeadersPresentOnResponses() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().string("Permissions-Policy", "camera=(), geolocation=(), payment=(), microphone=(self)"));
    }

    @Test
    @DisplayName("5. Administrative Endpoints Require ROLE_ADMIN Authorization")
    void testAdministrativeEndpointsRequireRoleAdmin() throws Exception {
        // Unauthenticated access to /api/v1/complaints must return 403 Forbidden
        mockMvc.perform(get("/api/v1/complaints"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Administrative authorization required to access this resource."));

        // Unauthenticated access to /api/v1/prices/sync must return 403 Forbidden
        mockMvc.perform(post("/api/v1/prices/sync"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // Unauthenticated access to /api/v1/prices/sync/status must return 403 Forbidden
        mockMvc.perform(get("/api/v1/prices/sync/status"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // Authenticated access with valid X-Admin-Key must succeed
        String validAdminKey = "test_admin_key_32_characters_strictly_for_unit_tests";
        mockMvc.perform(get("/api/v1/complaints")
                        .header("X-Admin-Key", validAdminKey))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/prices/sync/status")
                        .header("X-Admin-Key", validAdminKey))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("6. CORS Configuration: Does NOT expose sensitive admin or tracking token headers")
    void testCorsDoesNotExposeSensitiveHeaders() throws Exception {
        mockMvc.perform(options("/api/v1/prices")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Expose-Headers", not(containsString("X-Admin-Key"))))
                .andExpect(header().string("Access-Control-Expose-Headers", not(containsString("X-Tracking-Token"))))
                .andExpect(header().string("Access-Control-Expose-Headers", containsString("X-Total-Count")));
    }
}

