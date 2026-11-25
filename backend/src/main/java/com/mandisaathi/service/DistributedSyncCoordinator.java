package com.mandisaathi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Coordinates synchronization across multi-instance deployments.
 * Uses PostgreSQL session-level advisory locks when running on PostgreSQL,
 * and an in-memory reentrant lock fallback for embedded test environments (H2).
 *
 * Connection Overhead: Exactly 1 physical database connection is dedicated to
 * holding the session advisory lock during synchronization. The connection is
 * never returned to the pool while the lock is held.
 */
@Component
public class DistributedSyncCoordinator {

    private static final Logger log = LoggerFactory.getLogger(DistributedSyncCoordinator.class);

    // Deterministic 64-bit key for MandiSaathi price ingestion lock
    public static final long INGESTION_LOCK_KEY = 8849692485721015L;

    private final DataSource dataSource;
    private final ReentrantLock fallbackLock = new ReentrantLock();

    public DistributedSyncCoordinator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Attempts to acquire a distributed lock for mandi price ingestion.
     *
     * @return an Optional containing the DistributedSyncHandle if acquired, or empty if another instance holds the lock.
     */
    public Optional<DistributedSyncHandle> tryAcquireLock() {
        return tryAcquireLock(INGESTION_LOCK_KEY);
    }

    public Optional<DistributedSyncHandle> tryAcquireLock(long lockKey) {
        if (dataSource == null) {
            boolean acquired = fallbackLock.tryLock();
            if (!acquired) {
                return Optional.empty();
            }
            return Optional.of(new DistributedSyncHandle(null, lockKey, false, fallbackLock));
        }

        Connection conn = null;
        try {
            conn = dataSource.getConnection();
            String productName = conn.getMetaData().getDatabaseProductName();
            boolean isPostgres = productName != null && productName.toLowerCase().contains("postgres");

            if (isPostgres) {
                boolean acquired = false;
                try (PreparedStatement stmt = conn.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
                    stmt.setLong(1, lockKey);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) {
                            acquired = rs.getBoolean(1);
                        }
                    }
                }

                if (!acquired) {
                    log.debug("PostgreSQL advisory lock {} could not be acquired (held by another session)", lockKey);
                    conn.close();
                    return Optional.empty();
                }

                log.info("Acquired PostgreSQL session advisory lock {} on dedicated connection", lockKey);
                return Optional.of(new DistributedSyncHandle(conn, lockKey, true, null));
            } else {
                // Non-Postgres fallback (e.g. H2 in-memory test profile)
                conn.close(); // Close connection immediately
                boolean acquired = fallbackLock.tryLock();
                if (!acquired) {
                    log.debug("Fallback in-memory lock {} is already held", lockKey);
                    return Optional.empty();
                }
                log.info("Acquired fallback in-memory synchronization lock {}", lockKey);
                return Optional.of(new DistributedSyncHandle(null, lockKey, false, fallbackLock));
            }
        } catch (SQLException e) {
            log.error("Failed to evaluate distributed synchronization lock {}: {}", lockKey, e.getMessage(), e);
            if (conn != null) {
                try {
                    conn.close();
                } catch (SQLException closeEx) {
                    log.warn("Failed to close connection after lock acquisition failure", closeEx);
                }
            }
            return Optional.empty();
        }
    }

    /**
     * Handle representing the acquired synchronization lock.
     * Closing this handle releases the lock and returns the dedicated connection to the pool.
     */
    public static class DistributedSyncHandle implements AutoCloseable {
        private final Connection connection;
        private final long lockKey;
        private final boolean isPostgres;
        private final ReentrantLock fallbackLock;
        private final AtomicBoolean closed = new AtomicBoolean(false);

        public DistributedSyncHandle(Connection connection, long lockKey, boolean isPostgres, ReentrantLock fallbackLock) {
            this.connection = connection;
            this.lockKey = lockKey;
            this.isPostgres = isPostgres;
            this.fallbackLock = fallbackLock;
        }

        public boolean isPostgres() {
            return isPostgres;
        }

        public long getLockKey() {
            return lockKey;
        }

        @Override
        public void close() {
            if (!closed.compareAndSet(false, true)) {
                return;
            }

            if (isPostgres) {
                try {
                    if (connection != null && !connection.isClosed()) {
                        try (PreparedStatement stmt = connection.prepareStatement("SELECT pg_advisory_unlock(?)")) {
                            stmt.setLong(1, lockKey);
                            try (ResultSet rs = stmt.executeQuery()) {
                                if (rs.next()) {
                                    boolean unlocked = rs.getBoolean(1);
                                    log.info("Released PostgreSQL session advisory lock {}: {}", lockKey, unlocked);
                                }
                            }
                        }
                    }
                } catch (SQLException e) {
                    log.error("Failed to release PostgreSQL advisory lock {}: {}", lockKey, e.getMessage(), e);
                } finally {
                    if (connection != null) {
                        try {
                            connection.close(); // Cleanly returned to pool only AFTER unlock
                        } catch (SQLException e) {
                            log.error("Failed to close dedicated sync lock connection", e);
                        }
                    }
                }
            } else {
                if (fallbackLock != null && fallbackLock.isHeldByCurrentThread()) {
                    fallbackLock.unlock();
                    log.info("Released fallback in-memory synchronization lock {}", lockKey);
                }
            }
        }
    }
}
