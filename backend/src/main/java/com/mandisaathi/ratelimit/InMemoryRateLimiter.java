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

        // Bounded safety check: evict stale and oldest entries safely without global reset
        if (windowCounters.size() >= MAX_MAP_ENTRIES) {
            pruneStaleWindows(currentWindow);
            if (windowCounters.size() >= MAX_MAP_ENTRIES) {
                evictOldestBatch(MAX_MAP_ENTRIES / 5);
            }
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
                return window < currentWindow;
            } catch (NumberFormatException ignored) {
                return true;
            }
        });
    }

    private void evictOldestBatch(int countToEvict) {
        java.util.Iterator<String> it = windowCounters.keySet().iterator();
        int evicted = 0;
        while (it.hasNext() && evicted < countToEvict) {
            it.next();
            it.remove();
            evicted++;
        }
    }

    public void reset() {
        windowCounters.clear();
    }
}

