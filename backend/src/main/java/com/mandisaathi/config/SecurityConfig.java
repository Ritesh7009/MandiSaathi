package com.mandisaathi.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mandisaathi.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfigurationSource;
import jakarta.annotation.PostConstruct;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;
    private final ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    private final ObjectMapper objectMapper;
    private final String trustedProxiesConfig;

    public SecurityConfig(
            CorsConfigurationSource corsConfigurationSource,
            ApiKeyAuthenticationFilter apiKeyAuthenticationFilter,
            ObjectMapper objectMapper,
            @Value("${app.security.trusted-proxies:}") String trustedProxiesConfig
    ) {
        this.corsConfigurationSource = corsConfigurationSource;
        this.apiKeyAuthenticationFilter = apiKeyAuthenticationFilter;
        this.objectMapper = objectMapper;
        this.trustedProxiesConfig = trustedProxiesConfig;
    }

    @PostConstruct
    public void initTrustedProxies() {
        if (trustedProxiesConfig != null && !trustedProxiesConfig.isBlank()) {
            java.util.List<String> proxies = Arrays.stream(trustedProxiesConfig.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
            com.mandisaathi.util.ClientIpResolver.setConfiguredTrustedProxies(proxies);
        }
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                        .contentTypeOptions(Customizer.withDefaults())
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                )
                .exceptionHandling(ex -> ex
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            ErrorResponse body = ErrorResponse.of(
                                    HttpStatus.FORBIDDEN.value(),
                                    HttpStatus.FORBIDDEN.getReasonPhrase(),
                                    "Administrative authorization required to access this resource.",
                                    request.getRequestURI()
                            );
                            objectMapper.writeValue(response.getOutputStream(), body);
                        })
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            ErrorResponse body = ErrorResponse.of(
                                    HttpStatus.FORBIDDEN.value(),
                                    HttpStatus.FORBIDDEN.getReasonPhrase(),
                                    "Administrative authorization required to access this resource.",
                                    request.getRequestURI()
                            );
                            objectMapper.writeValue(response.getOutputStream(), body);
                        })
                )
                .addFilterBefore(apiKeyAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        // Browser CORS preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Administrative endpoints requiring ROLE_ADMIN
                        .requestMatchers(HttpMethod.GET, "/api/v1/complaints").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/prices/sync").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/prices/sync/status").hasRole("ADMIN")

                        // Publicly accessible endpoints
                        .requestMatchers(
                                "/api/v1/health/**",
                                "/actuator/health/**",
                                "/actuator/info/**",
                                "/api/v1/commodities/**",
                                "/api/v1/mandis/**",
                                "/api/v1/schemes/**",
                                "/api/v1/voice/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/prices", "/api/v1/prices/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/prices/compare").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/complaints").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/complaints/*").permitAll()

                        // Fail-safe default: deny any unexpected endpoint
                        .anyRequest().denyAll()
                );

        return http.build();
    }
}
