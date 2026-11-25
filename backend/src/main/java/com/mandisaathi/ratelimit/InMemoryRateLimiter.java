package com.mandisaathi.ratelimit;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Thread-safe, memory-bounded sliding-window rate limiter for local development
 * and single-instance deployments.
 *
 * Enforces strict capacity limits without evicting active counters:
 * - Only expired windows are pruned.
 * - New identifiers are rejected when capacity is exhausted.
 * - Key structure is strongly typed, natively supporting IPv6.
 */
@Component("inMemoryRateLimiter")
public class InMemoryRateLimiter implements RateLimiter {

    public static final int MAX_MAP_ENTRIES = 10000;

    public record RateLimitWindowKey(String category, String clientIdentifier, long window) {
        public RateLimitWindowKey {
            Objects.requireNonNull(category, "category cannot be null");
            Objects.requireNonNull(clientIdentifier, "clientIdentifier cannot be null");
        }
    }

    private final ConcurrentHashMap<RateLimitWindowKey, AtomicInteger> windowCounters = new ConcurrentHashMap<>();
    private Clock clock = Clock.systemUTC();

    public void setClock(Clock clock) {
        this.clock = clock;
    }

    public int getCurrentEntryCount() {
        return windowCounters.size();
    }

    @Override
    public RateLimitResult tryAcquire(String category, String clientIdentifier, int limitPerMinute) {
        long nowEpochSec = Instant.now(clock).getEpochSecond();
        long currentWindow = nowEpochSec / 60;
        long secondsIntoWindow = nowEpochSec % 60;
        long retryAfter = Math.max(1, 60 - secondsIntoWindow);

        RateLimitWindowKey key = new RateLimitWindowKey(
                category != null ? category : "default",
                clientIdentifier != null ? clientIdentifier : "unknown",
                currentWindow
        );

        // Lock-free path for existing active identifiers in this window
        AtomicInteger counter = windowCounters.get(key);
        if (counter == null) {
            // Atomic check-and-insert path for new identifiers
            synchronized (this) {
                counter = windowCounters.get(key);
                if (counter == null) {
                    if (windowCounters.size() >= MAX_MAP_ENTRIES) {
                        pruneStaleWindows(currentWindow);
                    }
                    if (windowCounters.size() >= MAX_MAP_ENTRIES) {
                        // Strict capacity exhausted: reject new identifiers without evicting active clients
                        return RateLimitResult.reject(retryAfter, true);
                    }
                    counter = new AtomicInteger(0);
                    windowCounters.put(key, counter);
                }
            }
        }

        int count = counter.incrementAndGet();

        if (count <= limitPerMinute) {
            return RateLimitResult.allow(limitPerMinute - count);
        } else {
            return RateLimitResult.reject(retryAfter, false);
        }
    }

    private void pruneStaleWindows(long currentWindow) {
        windowCounters.entrySet().removeIf(entry -> entry.getKey().window() < currentWindow);
    }

    public void reset() {
        windowCounters.clear();
        this.clock = Clock.systemUTC();
    }
}

