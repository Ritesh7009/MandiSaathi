package com.mandisaathi.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Authenticates requests bearing the X-Admin-Key header using constant-time
 * byte-array comparison to prevent side-channel timing attacks (CWE-208).
 */
@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private final String adminApiKey;

    public ApiKeyAuthenticationFilter(
            @Value("${app.security.admin-api-key:mandisaathi_admin_secret_2026}") String adminApiKey
    ) {
        this.adminApiKey = adminApiKey != null ? adminApiKey.trim() : "";
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String providedKey = request.getHeader("X-Admin-Key");
        if (providedKey != null && !providedKey.isBlank() && !adminApiKey.isBlank()) {
            byte[] providedBytes = providedKey.trim().getBytes(StandardCharsets.UTF_8);
            byte[] actualBytes = adminApiKey.getBytes(StandardCharsets.UTF_8);
            if (MessageDigest.isEqual(providedBytes, actualBytes)) {
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        "admin",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}

