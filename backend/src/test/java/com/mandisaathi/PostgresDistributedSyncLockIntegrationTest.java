package com.mandisaathi;

import com.mandisaathi.service.DistributedSyncCoordinator;
import com.mandisaathi.service.DistributedSyncCoordinator.DistributedSyncHandle;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.postgresql.ds.PGSimpleDataSource;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * PostgreSQL Integration Test for Distributed Synchronization Coordination.
 * Validates session-level advisory locks against real PostgreSQL 15/16:
 * 1. Two independent application instances competing for the same advisory lock.
 * 2. Concurrent scheduled and manual synchronization contention.
 * 3. Lock release after application exceptions in try-with-resources.
 * 4. Automatic PostgreSQL server-side lock recovery upon connection termination / process failure.
 */
public class PostgresDistributedSyncLockIntegrationTest {

    private static String jdbcUrl;
    private static final String DB_USER = "mandisaathi";
    private static final String DB_PASS = "mandisaathi_secret";
    private static boolean postgresAvailable = false;
    private static final long TEST_LOCK_KEY = 9988776655443322L;

    @BeforeAll
    static void checkPostgresAvailability() {
        int[] portsToTry = new int[]{
                Integer.parseInt(System.getenv().getOrDefault("DB_PORT", "5433")),
                5432,
                5433
        };

        for (int port : portsToTry) {
            String candidateUrl = "jdbc:postgresql://localhost:" + port + "/mandisaathi";
            try (Connection conn = DriverManager.getConnection(candidateUrl, DB_USER, DB_PASS)) {
                jdbcUrl = candidateUrl;
                postgresAvailable = true;
                break;
            } catch (Exception ignored) {
            }
        }
    }

    private PGSimpleDataSource createDataSource() {
        PGSimpleDataSource ds = new PGSimpleDataSource();
        ds.setUrl(jdbcUrl);
        ds.setUser(DB_USER);
        ds.setPassword(DB_PASS);
        return ds;
    }

    @Test
    @DisplayName("Two independent synchronization instances competing for the same PostgreSQL advisory lock")
    void testTwoInstancesCompeteForAdvisoryLock() {
        assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping integration test");

        DistributedSyncCoordinator instance1 = new DistributedSyncCoordinator(createDataSource());
        DistributedSyncCoordinator instance2 = new DistributedSyncCoordinator(createDataSource());

        // Instance 1 acquires lock
        Optional<DistributedSyncHandle> handle1 = instance1.tryAcquireLock(TEST_LOCK_KEY);
        assertTrue(handle1.isPresent(), "Instance 1 should successfully acquire the lock");
        assertTrue(handle1.get().isPostgres(), "Should be using real PostgreSQL advisory locking");

        // Instance 2 attempts to acquire the exact same lock concurrently
        Optional<DistributedSyncHandle> handle2 = instance2.tryAcquireLock(TEST_LOCK_KEY);
        assertTrue(handle2.isEmpty(), "Instance 2 must fail to acquire lock while held by Instance 1");

        // Instance 1 finishes and releases lock
        handle1.get().close();

        // Instance 2 attempts again and now succeeds
        Optional<DistributedSyncHandle> handle2Retry = instance2.tryAcquireLock(TEST_LOCK_KEY);
        assertTrue(handle2Retry.isPresent(), "Instance 2 should acquire the lock after Instance 1 releases it");
        handle2Retry.get().close();
    }

    @Test
    @DisplayName("Lock release after application exceptions in try-with-resources")
    void testLockReleaseAfterException() {
        assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping integration test");

        DistributedSyncCoordinator instance = new DistributedSyncCoordinator(createDataSource());

        assertThrows(RuntimeException.class, () -> {
            try (DistributedSyncHandle handle = instance.tryAcquireLock(TEST_LOCK_KEY).orElseThrow()) {
                throw new RuntimeException("Simulated unexpected ingestion crash");
            }
        });

        // Verify lock is immediately available for subsequent acquisition
        Optional<DistributedSyncHandle> subsequent = instance.tryAcquireLock(TEST_LOCK_KEY);
        assertTrue(subsequent.isPresent(), "Lock should be released cleanly even after an uncaught exception");
        subsequent.get().close();
    }

    @Test
    @DisplayName("Lock recovery after connection termination / abrupt process failure")
    void testLockRecoveryAfterConnectionTermination() throws Exception {
        assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping integration test");

        PGSimpleDataSource ds = createDataSource();
        Connection dedicatedConn = ds.getConnection();

        // Simulate Instance 1 acquiring session advisory lock directly
        try (var stmt = dedicatedConn.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
            stmt.setLong(1, TEST_LOCK_KEY);
            var rs = stmt.executeQuery();
            assertTrue(rs.next() && rs.getBoolean(1), "Direct session advisory lock must be acquired");
        }

        // Instance 2 fails to acquire
        DistributedSyncCoordinator instance2 = new DistributedSyncCoordinator(createDataSource());
        assertTrue(instance2.tryAcquireLock(TEST_LOCK_KEY).isEmpty(), "Instance 2 must be locked out");

        // Forcefully abort / close connection without explicit unlock (simulating node crash / kill -9)
        ExecutorService executor = Executors.newSingleThreadExecutor();
        dedicatedConn.abort(executor);
        executor.shutdown();

        // Give PostgreSQL a moment to clean up terminated backend session
        Thread.sleep(100);

        // Instance 2 now attempts to acquire: PostgreSQL server must have auto-released the session lock
        Optional<DistributedSyncHandle> recoveredHandle = instance2.tryAcquireLock(TEST_LOCK_KEY);
        assertTrue(recoveredHandle.isPresent(), "PostgreSQL server must auto-release session lock when connection drops");
        recoveredHandle.get().close();
    }

    @Test
    @DisplayName("Concurrent scheduled and manual synchronization across multiple threads")
    void testConcurrentScheduledAndManualSync() throws Exception {
        assumeTrue(postgresAvailable, "PostgreSQL not reachable; skipping integration test");

        int threadCount = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        CyclicBarrier barrier = new CyclicBarrier(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        CountDownLatch latch = new CountDownLatch(threadCount);
        for (int i = 0; i < threadCount; i++) {
            pool.submit(() -> {
                DistributedSyncCoordinator coordinator = new DistributedSyncCoordinator(createDataSource());
                try {
                    barrier.await(); // ensure simultaneous execution
                    Optional<DistributedSyncHandle> handle = coordinator.tryAcquireLock(TEST_LOCK_KEY);
                    if (handle.isPresent()) {
                        successCount.incrementAndGet();
                        Thread.sleep(50); // Hold lock briefly
                        handle.get().close();
                    } else {
                        rejectedCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    fail("Unexpected concurrency exception: " + e.getMessage());
                } finally {
                    latch.countDown();
                }
            });
        }

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        pool.shutdown();

        assertEquals(1, successCount.get(), "Exactly one instance must acquire the distributed lock");
        assertEquals(threadCount - 1, rejectedCount.get(), "All other concurrent callers must be rejected");
    }
}

