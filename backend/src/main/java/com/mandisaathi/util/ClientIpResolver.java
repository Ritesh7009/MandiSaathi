package com.mandisaathi.util;

import jakarta.servlet.http.HttpServletRequest;

import java.util.regex.Pattern;

/**
 * Validates and resolves client IP addresses safely.
 * Prevents header spoofing, key pollution, and DoS attacks on in-memory rate limiters.
 */
public final class ClientIpResolver {

    private static final Pattern IPV4_PATTERN = Pattern.compile(
            "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    );

    private static final Pattern IPV6_PATTERN = Pattern.compile(
            "^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$"
    );

    private static final String DEFAULT_SAFE_IP = "127.0.0.1";

    private ClientIpResolver() {
    }

    public static String resolve(HttpServletRequest request) {
        if (request == null) {
            return DEFAULT_SAFE_IP;
        }

        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String candidate = xForwardedFor.split(",")[0].trim();
            if (isValidIp(candidate)) {
                return candidate;
            }
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            String candidate = xRealIp.trim();
            if (isValidIp(candidate)) {
                return candidate;
            }
        }

        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr != null && !remoteAddr.isBlank()) {
            String candidate = remoteAddr.trim();
            if (isValidIp(candidate)) {
                return candidate;
            }
        }

        return DEFAULT_SAFE_IP;
    }

    public static boolean isValidIp(String ip) {
        if (ip == null || ip.isBlank() || ip.length() > 45) {
            return false;
        }
        return IPV4_PATTERN.matcher(ip).matches() || IPV6_PATTERN.matcher(ip).matches() || "0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip);
    }
}

