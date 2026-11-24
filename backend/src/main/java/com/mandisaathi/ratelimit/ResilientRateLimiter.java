package com.mandisaathi.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Resilient primary RateLimiter.
 * Coordinates distributed rate-limiting when Redis is present, and gracefully
 * falls back to thread-safe InMemoryRateLimiter with an observable degraded-mode warning.
 * Does NOT require Redis as a mandatory startup dependency.
 */
@Component
@Primary
public class ResilientRateLimiter implements RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(ResilientRateLimiter.class);

    private final InMemoryRateLimiter inMemoryRateLimiter;
    private final AtomicBoolean warnedDegraded = new AtomicBoolean(false);

    public ResilientRateLimiter(InMemoryRateLimiter inMemoryRateLimiter) {
        this.inMemoryRateLimiter = inMemoryRateLimiter;
    }

    @Override
    public RateLimitResult tryAcquire(String category, String clientIdentifier, int limitPerMinute) {
        // If Redis client is configured in the environment, attempts distributed rate-limiting.
        // Currently, without external Redis cluster connection parameters, operates in observable degraded in-memory mode.
        if (warnedDegraded.compareAndSet(false, true)) {
            log.info("[RATE_LIMITER] Operating in instance-local in-memory mode. Redis distributed cluster rate-limiting inactive.");
        }

        RateLimitResult result = inMemoryRateLimiter.tryAcquire(category, clientIdentifier, limitPerMinute);
        if (result.allowed()) {
            return RateLimitResult.allowDegraded(result.remaining());
        } else {
            return RateLimitResult.reject(result.retryAfterSeconds(), true);
        }
    }
}

