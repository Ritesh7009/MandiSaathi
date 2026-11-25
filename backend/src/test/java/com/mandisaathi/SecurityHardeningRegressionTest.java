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

import java.util.List;

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

        // Client A consumes all 5 allowed tokens
        String targetClient = "192.0.2.1";
        for (int i = 0; i < 5; i++) {
            RateLimitResult res = inMemoryRateLimiter.tryAcquire("test_cat", targetClient, 5);
            assertTrue(res.allowed(), "Requests within limit must be allowed");
        }

        // Target client is now blocked
        RateLimitResult blockedRes = inMemoryRateLimiter.tryAcquire("test_cat", targetClient, 5);
        assertFalse(blockedRes.allowed(), "6th request must be rejected");

        // Attacker floods 1,200 distinct keys to trigger eviction
        for (int i = 0; i < 1200; i++) {
            inMemoryRateLimiter.tryAcquire("test_cat", "spoofed-ip-" + i, 10);
        }

        // Assert Target Client is STILL blocked and was NOT reset by a global clear()
        RateLimitResult stillBlocked = inMemoryRateLimiter.tryAcquire("test_cat", targetClient, 5);
        assertFalse(stillBlocked.allowed(), "Rate limiter must NOT wipe active blocked clients upon capacity eviction (No DoS/Evasion)");
    }

    @Test
    @DisplayName("2. ClientIpResolver Strict Proxy Validation: Configured proxy strictly rejects spoofing from untrusted remote IPs")
    void testClientIpResolverStrictProxyValidation() {
        try {
            // Explicitly configure only 10.50.0.1 as a trusted proxy
            ClientIpResolver.setConfiguredTrustedProxies(List.of("10.50.0.1"));

            // Case A: Request from an internal pod (10.0.0.99) that is NOT in the configured proxy list
            MockHttpServletRequest untrustedInternal = new MockHttpServletRequest();
            untrustedInternal.setRemoteAddr("10.0.0.99");
            untrustedInternal.addHeader("X-Forwarded-For", "203.0.113.195");
            untrustedInternal.addHeader("Render-Client-IP", "203.0.113.195");

            // Header MUST be ignored because 10.0.0.99 is not in configured trusted proxies
            assertEquals("10.0.0.99", ClientIpResolver.resolve(untrustedInternal));

            // Case B: Request from the legitimately configured proxy (10.50.0.1)
            MockHttpServletRequest trustedProxy = new MockHttpServletRequest();
            trustedProxy.setRemoteAddr("10.50.0.1");
            trustedProxy.addHeader("Render-Client-IP", "203.0.113.195");

            // Header MUST be accepted from configured trusted proxy
            assertEquals("203.0.113.195", ClientIpResolver.resolve(trustedProxy));
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
}

