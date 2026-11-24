package com.mandisaathi.ratelimit;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Thread-safe, memory-bounded sliding-window rate limiter for local development
 * and single-instance deployments. Automatically prunes stale minute windows to prevent memory exhaustion.
 */
@Component("inMemoryRateLimiter")
public class InMemoryRateLimiter implements RateLimiter {

    private static final int MAX_MAP_ENTRIES = 10000;
    private final ConcurrentHashMap<String, AtomicInteger> windowCounters = new ConcurrentHashMap<>();

    @Override
    public RateLimitResult tryAcquire(String category, String clientIdentifier, int limitPerMinute) {
        long nowEpochSec = Instant.now().getEpochSecond();
        long currentWindow = nowEpochSec / 60;
        long secondsIntoWindow = nowEpochSec % 60;
        long retryAfter = Math.max(1, 60 - secondsIntoWindow);

        String key = category + ":" + clientIdentifier + ":" + currentWindow;

        // Periodic eviction if map grows
        if (windowCounters.size() > 500) {
            pruneStaleWindows(currentWindow);
        }

        // Bounded safety check
        if (windowCounters.size() > MAX_MAP_ENTRIES) {
            windowCounters.clear(); // Emergency reset to prevent OutOfMemoryError
        }

        AtomicInteger counter = windowCounters.computeIfAbsent(key, k -> new AtomicInteger(0));
        int count = counter.incrementAndGet();

        if (count <= limitPerMinute) {
            return RateLimitResult.allow(limitPerMinute - count);
        } else {
            return RateLimitResult.reject(retryAfter, false);
        }
    }

    private void pruneStaleWindows(long currentWindow) {
        windowCounters.entrySet().removeIf(entry -> {
            String[] parts = entry.getKey().split(":");
            if (parts.length < 3) return true;
            try {
                long window = Long.parseLong(parts[2]);
                return window < currentWindow - 1;
            } catch (NumberFormatException ignored) {
                return true;
            }
        });
    }

    public void reset() {
        windowCounters.clear();
    }
}

