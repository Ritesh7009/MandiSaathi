package com.mandisaathi.ratelimit;

/**
 * Common RateLimiter interface for coordinating request throttling across
 * distributed Redis clusters and single-instance in-memory fallbacks.
 */
public interface RateLimiter {

    /**
     * Checks whether an operation is allowed under the configured limit.
     *
     * @param category       The functional category (e.g. "complaint_submit", "voice_query")
     * @param clientIdentifier The client identifier (e.g. client IP address or API key)
     * @param limitPerMinute The maximum permitted requests per 60-second window
     * @return RateLimitResult containing allow status, remaining quota, retry backoff, and degraded status
     */
    RateLimitResult tryAcquire(String category, String clientIdentifier, int limitPerMinute);
}

