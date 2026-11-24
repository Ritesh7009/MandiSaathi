package com.mandisaathi.config;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.List;

/**
 * Authenticates requests bearing the X-Admin-Key header using constant-time
 * byte-array comparison to prevent side-channel timing attacks (CWE-208).
 * Fails startup in production if ADMIN_API_KEY is missing or weak.
 */
@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private final String adminApiKey;
    private final Environment environment;

    public ApiKeyAuthenticationFilter(
            @Value("${app.security.admin-api-key:}") String adminApiKey,
            Environment environment
    ) {
        this.adminApiKey = adminApiKey != null ? adminApiKey.trim() : "";
        this.environment = environment;
    }

    @PostConstruct
    public void validateKeyForEnvironment() {
        boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        if (isProd) {
            if (adminApiKey.isBlank() || adminApiKey.length() < 32 || adminApiKey.contains("mandisaathi")) {
                throw new IllegalStateException("Production startup rejected: ADMIN_API_KEY must be provided via environment variable and must be a secure random key with at least 32 characters.");
            }
        }
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
            } else {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
