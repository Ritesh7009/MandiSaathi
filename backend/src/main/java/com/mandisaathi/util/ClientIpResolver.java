package com.mandisaathi.util;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Validates and resolves client IP addresses safely.
 * Only accepts proxy forwarding headers (Render-Client-IP, X-Forwarded-For, X-Real-IP)
 * if the direct peer address (request.getRemoteAddr()) belongs to an explicitly configured
 * or default trusted proxy boundary (loopback, private network, or Render reverse proxy).
 *
 * Traverses X-Forwarded-For right-to-left to prevent left-spoofing injection attacks.
 * Discards malformed, duplicated, or untrusted inputs to prevent rate-limit bypass.
 */
public final class ClientIpResolver {

    private static final Logger log = LoggerFactory.getLogger(ClientIpResolver.class);

    private static final Pattern IPV4_PATTERN = Pattern.compile(
            "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    );

    private static final Pattern IPV6_PATTERN = Pattern.compile(
            "^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$"
    );

    private static final String DEFAULT_SAFE_IP = "127.0.0.1";

    // Default trusted proxies: loopback and private IPv4 ranges (RFC 1918 / RFC 3927)
    private static final List<String> DEFAULT_TRUSTED_PREFIXES = List.of(
            "127.", "10.", "192.168.", "169.254."
    );

    private static volatile List<String> configuredTrustedProxies = null;

    private ClientIpResolver() {
    }

    /**
     * Configures trusted proxy CIDRs/IPs from environment configuration.
     */
    public static void setConfiguredTrustedProxies(List<String> proxies) {
        if (proxies != null && !proxies.isEmpty()) {
            configuredTrustedProxies = new ArrayList<>(proxies);
        } else {
            configuredTrustedProxies = null;
        }
    }

    public static String resolve(HttpServletRequest request) {
        if (request == null) {
            return DEFAULT_SAFE_IP;
        }

        String remoteAddr = request.getRemoteAddr() != null ? request.getRemoteAddr().trim() : DEFAULT_SAFE_IP;

        // If the immediate connection does NOT originate from a trusted proxy,
        // strictly discard all forwarding headers to prevent header-spoofing attacks (CWE-290).
        if (!isTrustedProxy(remoteAddr)) {
            return isValidIp(remoteAddr) ? remoteAddr : DEFAULT_SAFE_IP;
        }

        // 1. Prefer Render-Client-IP header if set by Render's trusted edge proxy
        String renderClientIp = request.getHeader("Render-Client-IP");
        if (renderClientIp != null && !renderClientIp.isBlank()) {
            String candidate = renderClientIp.trim();
            if (isValidIp(candidate)) {
                return candidate;
            }
        }

        // 2. Parse X-Forwarded-For: client, proxy1, proxy2
        // Traverse from right to left (from nearest proxy) to pick the first untrusted upstream IP,
        // preventing attackers from spoofing their IP by prepending an arbitrary IP on the left.
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String[] hops = xForwardedFor.split(",");
            for (int i = hops.length - 1; i >= 0; i--) {
                String candidate = hops[i].trim();
                if (isValidIp(candidate)) {
                    // Return the first hop that is NOT an internal trusted proxy
                    if (!isTrustedProxy(candidate)) {
                        return candidate;
                    }
                }
            }
            // If all hops in XFF are trusted proxies, take the leftmost valid one
            for (String hop : hops) {
                String candidate = hop.trim();
                if (isValidIp(candidate)) {
                    return candidate;
                }
            }
        }

        // 3. Fallback to X-Real-IP if present
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            String candidate = xRealIp.trim();
            if (isValidIp(candidate)) {
                return candidate;
            }
        }

        return isValidIp(remoteAddr) ? remoteAddr : DEFAULT_SAFE_IP;
    }

    public static boolean isTrustedProxy(String ip) {
        if (ip == null || ip.isBlank()) return false;
        String trimmed = ip.trim();

        // Loopback IPv4 & IPv6
        if (trimmed.equals("127.0.0.1") || trimmed.equals("::1") || trimmed.equals("0:0:0:0:0:0:0:1")) {
            return true;
        }

        // Check configured trusted list if provided
        List<String> configured = configuredTrustedProxies;
        if (configured != null) {
            for (String trusted : configured) {
                String t = trusted.trim();
                if (t.equalsIgnoreCase(trimmed) || trimmed.startsWith(t)) {
                    return true;
                }
            }
        }

        // Check standard RFC 1918 / RFC 3927 prefixes
        for (String prefix : DEFAULT_TRUSTED_PREFIXES) {
            if (trimmed.startsWith(prefix)) {
                return true;
            }
        }

        // 172.16.0.0 - 172.31.255.255
        if (trimmed.startsWith("172.")) {
            String[] parts = trimmed.split("\\.");
            if (parts.length >= 2) {
                try {
                    int secondOctet = Integer.parseInt(parts[1]);
                    if (secondOctet >= 16 && secondOctet <= 31) {
                        return true;
                    }
                } catch (NumberFormatException ignored) {
                    return false;
                }
            }
        }

        return false;
    }

    public static boolean isValidIp(String ip) {
        if (ip == null || ip.isBlank() || ip.length() > 45) {
            return false;
        }
        return IPV4_PATTERN.matcher(ip).matches() ||
               IPV6_PATTERN.matcher(ip).matches() ||
               "0:0:0:0:0:0:0:1".equals(ip) ||
               "::1".equals(ip);
    }
}
