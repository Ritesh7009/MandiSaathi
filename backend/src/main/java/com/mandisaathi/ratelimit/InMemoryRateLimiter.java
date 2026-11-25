package com.mandisaathi.ratelimit;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
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
    private Clock clock = Clock.systemUTC();

    public void setClock(Clock clock) {
        this.clock = clock;
    }

    @Override
    public RateLimitResult tryAcquire(String category, String clientIdentifier, int limitPerMinute) {
        long nowEpochSec = Instant.now(clock).getEpochSecond();
        long currentWindow = nowEpochSec / 60;
        long secondsIntoWindow = nowEpochSec % 60;
        long retryAfter = Math.max(1, 60 - secondsIntoWindow);

        String key = category + ":" + clientIdentifier + ":" + currentWindow;

        // Bounded capacity check: evict stale and excess entries safely without resetting blocked clients
        if (windowCounters.size() >= MAX_MAP_ENTRIES) {
            evictExcessEntries(MAX_MAP_ENTRIES / 5, currentWindow);
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

    private void evictExcessEntries(int countToEvict, long currentWindow) {
        // Step 1: Remove entries from past windows
        pruneStaleWindows(currentWindow);
        if (windowCounters.size() < MAX_MAP_ENTRIES) {
            return;
        }

        // Step 2: Under flood in the current window, evict single-request probe keys first,
        // strictly preserving keys that are currently blocked (count > 1) so attackers cannot reset blocks!
        List<String> lowActivityKeys = windowCounters.entrySet().stream()
                .filter(e -> e.getValue().get() == 1)
                .map(Map.Entry::getKey)
                .limit(countToEvict)
                .toList();

        for (String k : lowActivityKeys) {
            windowCounters.remove(k);
        }

        // Step 3: If still over capacity, evict entries with lowest counts, but NEVER evict blocked violators
        if (windowCounters.size() >= MAX_MAP_ENTRIES) {
            List<String> secondaryKeys = windowCounters.entrySet().stream()
                    .filter(e -> e.getValue().get() <= 5)
                    .sorted(Comparator.comparingInt(e -> e.getValue().get()))
                    .map(Map.Entry::getKey)
                    .limit(countToEvict)
                    .toList();
            for (String k : secondaryKeys) {
                windowCounters.remove(k);
            }
        }
    }

    public void reset() {
        windowCounters.clear();
        this.clock = Clock.systemUTC();
    }
}

