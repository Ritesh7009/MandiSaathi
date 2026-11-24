package com.mandisaathi;

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

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiSecurityHeadersAndValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("API responses include mandatory security headers (nosniff, DENY framing, referrer policy)")
    void responsesIncludeMandatorySecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"));
    }

    @Test
    @DisplayName("Unknown endpoints are strictly rejected with 403 Forbidden under fail-safe denyAll policy")
    void unknownEndpointsAreDeniedByDefault() throws Exception {
        mockMvc.perform(get("/api/v1/unlisted-admin-backdoor"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ClientIpResolver accurately validates valid IPv4 and IPv6 addresses")
    void clientIpResolverValidatesStandardIps() {
        assertTrue(ClientIpResolver.isValidIp("127.0.0.1"));
        assertTrue(ClientIpResolver.isValidIp("192.168.1.1"));
        assertTrue(ClientIpResolver.isValidIp("10.0.0.254"));
        assertTrue(ClientIpResolver.isValidIp("::1"));
        assertTrue(ClientIpResolver.isValidIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334"));
    }

    @Test
    @DisplayName("ClientIpResolver rejects malformed strings, command injections, and spoofed headers")
    void clientIpResolverRejectsSpoofedAndMaliciousInputs() {
        assertFalse(ClientIpResolver.isValidIp("invalid-ip"));
        assertFalse(ClientIpResolver.isValidIp("192.168.1.300")); // out of range octet
        assertFalse(ClientIpResolver.isValidIp("127.0.0.1; DROP TABLE users;"));
        assertFalse(ClientIpResolver.isValidIp(""));
        assertFalse(ClientIpResolver.isValidIp(null));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "attacker-injected-string, 999.999.999.999");
        request.setRemoteAddr("10.0.0.5");

        // The malformed X-Forwarded-For is discarded, and it safely falls back to remoteAddr
        String resolved = ClientIpResolver.resolve(request);
        assertEquals("10.0.0.5", resolved);

        // When remoteAddr is NOT a trusted proxy, X-Forwarded-For is completely ignored
        MockHttpServletRequest untrustedPeer = new MockHttpServletRequest();
        untrustedPeer.addHeader("X-Forwarded-For", "192.168.1.99");
        untrustedPeer.setRemoteAddr("198.51.100.25");
        assertEquals("198.51.100.25", ClientIpResolver.resolve(untrustedPeer));
    }

    @Test
    @DisplayName("Voice assistant rejects arbitrary non-audio files (e.g. scripts or text) with 400 Bad Request")
    void voiceAssistantRejectsNonAudioPayloads() throws Exception {
        byte[] fakeScriptBytes = "echo 'malicious payload attack test'".getBytes();
        MockMultipartFile fakeFile = new MockMultipartFile(
                "audio",
                "attack.sh",
                "application/x-sh",
                fakeScriptBytes
        );

        mockMvc.perform(multipart("/api/v1/voice/audio")
                        .file(fakeFile)
                        .param("language", "hi"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_AUDIO_FORMAT"))
                .andExpect(jsonPath("$.aiServiceStatus").value("FAILED"))
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @Test
    @DisplayName("Voice assistant rejects fake audio files that claim audio/wav MIME type but lack RIFF container header")
    void voiceAssistantRejectsMimeSpoofedBinaryPayloads() throws Exception {
        byte[] arbitraryBinary = new byte[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16};
        MockMultipartFile spoofedFile = new MockMultipartFile(
                "audio",
                "malicious.wav",
                "audio/wav",
                arbitraryBinary
        );

        mockMvc.perform(multipart("/api/v1/voice/audio")
                        .file(spoofedFile)
                        .param("language", "hi"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_AUDIO_FORMAT"))
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @Test
    @DisplayName("ClientIpResolver prioritizes Render-Client-IP when behind trusted proxy and rejects spoofing from untrusted peers")
    void clientIpResolverProxyTrustAndSpoofingBehavior() {
        // Behind trusted proxy: Render-Client-IP is respected
        MockHttpServletRequest trustedReq = new MockHttpServletRequest();
        trustedReq.setRemoteAddr("10.0.0.1");
        trustedReq.addHeader("Render-Client-IP", "203.0.113.195");
        assertEquals("203.0.113.195", ClientIpResolver.resolve(trustedReq));

        // Behind trusted proxy with multi-hop X-Forwarded-For: client, proxy1
        MockHttpServletRequest multiHop = new MockHttpServletRequest();
        multiHop.setRemoteAddr("127.0.0.1");
        multiHop.addHeader("X-Forwarded-For", "198.51.100.50, 10.0.0.2");
        assertEquals("198.51.100.50", ClientIpResolver.resolve(multiHop));

        // Untrusted peer attempting to spoof Render-Client-IP and X-Forwarded-For
        MockHttpServletRequest spoofedReq = new MockHttpServletRequest();
        spoofedReq.setRemoteAddr("203.0.113.5");
        spoofedReq.addHeader("Render-Client-IP", "1.1.1.1");
        spoofedReq.addHeader("X-Forwarded-For", "8.8.8.8");
        assertEquals("203.0.113.5", ClientIpResolver.resolve(spoofedReq));
    }

    @Test
    @DisplayName("Grievance submission rate limiting triggers HTTP 429 when threshold exceeded")
    void complaintRateLimitingEnforced() throws Exception {
        String json = """
            {
                "category": "WEIGHING",
                "description": "Rate limit verification test case description",
                "state": "Punjab",
                "district": "Ludhiana",
                "mandiCode": "KHANNA_PB",
                "farmerName": "Test Farmer",
                "farmerPhone": "9876543210"
            }
            """;

        String fixedIp = "198.51.100.77";

        // First 5 requests should succeed (201 Created)
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/complaints")
                            .with(req -> { req.setRemoteAddr(fixedIp); return req; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isCreated());
        }

        // 6th request must trigger HTTP 429 Too Many Requests
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/complaints")
                        .with(req -> { req.setRemoteAddr(fixedIp); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }
}
