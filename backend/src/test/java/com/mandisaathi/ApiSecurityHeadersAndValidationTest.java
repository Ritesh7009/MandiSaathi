package com.mandisaathi;

import com.mandisaathi.util.ClientIpResolver;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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
        request.addHeader("X-Forwarded-For", "attacker-injected-string, 192.168.1.1");
        request.setRemoteAddr("10.0.0.5");

        // The malformed X-Forwarded-For is discarded, and it safely falls back to remoteAddr
        String resolved = ClientIpResolver.resolve(request);
        assertEquals("10.0.0.5", resolved);
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
}
