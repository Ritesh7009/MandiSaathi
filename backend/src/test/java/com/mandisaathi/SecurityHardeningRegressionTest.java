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

    @Test
    @DisplayName("7. Rate Limiter: Partially consumed allowances and low limits")
    void testPartiallyConsumedAllowancesAndLowLimits() {
        inMemoryRateLimiter.reset();

        // 1. Partially consumed allowance (3 of 5)
        String clientA = "192.168.1.50";
        RateLimitResult r1 = inMemoryRateLimiter.tryAcquire("test_quota", clientA, 5);
        assertTrue(r1.allowed());
        assertEquals(4, r1.remaining());

        RateLimitResult r2 = inMemoryRateLimiter.tryAcquire("test_quota", clientA, 5);
        assertTrue(r2.allowed());
        assertEquals(3, r2.remaining());

        RateLimitResult r3 = inMemoryRateLimiter.tryAcquire("test_quota", clientA, 5);
        assertTrue(r3.allowed());
        assertEquals(2, r3.remaining());

        // 2. Low request limit (limit = 1)
        String clientB = "192.168.1.51";
        RateLimitResult low1 = inMemoryRateLimiter.tryAcquire("test_strict", clientB, 1);
        assertTrue(low1.allowed());
        assertEquals(0, low1.remaining());

        RateLimitResult low2 = inMemoryRateLimiter.tryAcquire("test_strict", clientB, 1);
        assertFalse(low2.allowed());
        assertEquals(0, low2.remaining());
        assertTrue(low2.retryAfterSeconds() > 0);
        inMemoryRateLimiter.reset();
    }

    @Test
    @DisplayName("8. Rate Limiter: IPv6 Client Identifier Native Support")
    void testIpv6ClientIdentifiersSupportedWithoutParsingErrors() {
        inMemoryRateLimiter.reset();

        String ipv6Standard = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
        String ipv6Loopback = "::1";

        // Check standard IPv6
        for (int i = 0; i < 3; i++) {
            RateLimitResult res = inMemoryRateLimiter.tryAcquire("ipv6_cat", ipv6Standard, 3);
            assertTrue(res.allowed(), "Requests within limit must succeed for IPv6");
        }
        RateLimitResult rejectedIpv6 = inMemoryRateLimiter.tryAcquire("ipv6_cat", ipv6Standard, 3);
        assertFalse(rejectedIpv6.allowed(), "Requests exceeding limit must reject for IPv6");

        // Check loopback IPv6
        RateLimitResult loopbackRes = inMemoryRateLimiter.tryAcquire("ipv6_cat", ipv6Loopback, 2);
        assertTrue(loopbackRes.allowed());
        assertEquals(1, loopbackRes.remaining());

        inMemoryRateLimiter.reset();
    }

    @Test
    @DisplayName("9. Rate Limiter: Strict Maximum Capacity and Rejection of New Identifiers")
    void testStrictMaximumCapacityEnforcement() {
        inMemoryRateLimiter.reset();
        inMemoryRateLimiter.setClock(Clock.fixed(Instant.parse("2026-11-25T12:00:10Z"), ZoneOffset.UTC));

        // 1. Existing client consumes partial quota (2 of 5)
        String existingClient = "10.0.0.1";
        inMemoryRateLimiter.tryAcquire("cap_test", existingClient, 5);
        inMemoryRateLimiter.tryAcquire("cap_test", existingClient, 5);

        // 2. Fill the map up to strict capacity of 10,000 entries
        int capacity = InMemoryRateLimiter.MAX_MAP_ENTRIES;
        // We already have 1 entry (existingClient). Add capacity - 1 more.
        for (int i = 1; i < capacity; i++) {
            inMemoryRateLimiter.tryAcquire("cap_test", "bulk-ip-" + i, 10);
        }
        assertEquals(capacity, inMemoryRateLimiter.getCurrentEntryCount(), "Map should be exactly at capacity");

        // 3. New identifier 10,001 must be REJECTED because capacity is exhausted
        String newFlooder = "flood-attacker-ip";
        RateLimitResult floodRes = inMemoryRateLimiter.tryAcquire("cap_test", newFlooder, 10);
        assertFalse(floodRes.allowed(), "New identifier must be rejected when capacity is exhausted");
        assertTrue(floodRes.degraded(), "Rejected result must report degraded status");
        assertEquals(capacity, inMemoryRateLimiter.getCurrentEntryCount(), "Map capacity must strictly not be exceeded");

        // 4. Existing active client with partial allowance is NOT evicted and can finish their quota
        RateLimitResult existingRes = inMemoryRateLimiter.tryAcquire("cap_test", existingClient, 5);
        assertTrue(existingRes.allowed(), "Active client in map must NOT be evicted or locked out");
        assertEquals(2, existingRes.remaining(), "Remaining quota must continue normally");

        inMemoryRateLimiter.reset();
    }
}

