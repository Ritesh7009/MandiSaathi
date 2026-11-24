package com.mandisaathi.ratelimit;

public record RateLimitResult(
        boolean allowed,
        int remaining,
        long retryAfterSeconds,
        boolean degraded
) {
    public static RateLimitResult allow(int remaining) {
        return new RateLimitResult(true, remaining, 0L, false);
    }

    public static RateLimitResult allowDegraded(int remaining) {
        return new RateLimitResult(true, remaining, 0L, true);
    }

    public static RateLimitResult reject(long retryAfterSeconds, boolean degraded) {
        return new RateLimitResult(false, 0, retryAfterSeconds, degraded);
    }
}

