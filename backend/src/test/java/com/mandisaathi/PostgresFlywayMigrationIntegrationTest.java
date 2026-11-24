package com.mandisaathi;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Validates Flyway database migrations V1 through V7 against real PostgreSQL 16.
 * Tests:
 * 1. Clean database migration from scratch (V1–V7).
 * 2. Incremental migration from pre-existing V1–V6 state with legacy token hashing.
 */
public class PostgresFlywayMigrationIntegrationTest {

    private static String jdbcUrl;
    private static final String DB_USER = "mandisaathi";
    private static final String DB_PASS = "mandisaathi_secret";
    private static boolean postgresAvailable = false;

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

    @Test
    @DisplayName("Flyway V1–V7 cleanly migrates an empty PostgreSQL database")
    void testCleanDatabaseMigration() throws Exception {
        assumeTrue(postgresAvailable, "PostgreSQL 16 is required for this integration test");

        String schemaName = "flyway_test_clean_" + System.currentTimeMillis();

        try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA " + schemaName);
        }

        try {
            Flyway flyway = Flyway.configure()
                    .dataSource(jdbcUrl, DB_USER, DB_PASS)
                    .schemas(schemaName)
                    .locations("classpath:db/migration")
                    .baselineOnMigrate(true)
                    .load();

            int applied = flyway.migrate().migrationsExecuted;
            assertTrue(applied >= 7, "All migrations V1 through V7 must execute successfully on clean schema");

            // Verify PostgreSQL schema integrity
            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {

                // Check complaints table schema
                ResultSet rs = stmt.executeQuery(
                        "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
                        "WHERE table_schema = '" + schemaName + "' AND table_name = 'complaints' AND column_name = 'tracking_token_hash'");
                assertTrue(rs.next(), "tracking_token_hash column must exist in complaints");
                assertEquals("NO", rs.getString("is_nullable"), "tracking_token_hash must be NOT NULL");

                // Check legacy plaintext column is absent
                ResultSet rsLegacy = stmt.executeQuery(
                        "SELECT column_name FROM information_schema.columns " +
                        "WHERE table_schema = '" + schemaName + "' AND table_name = 'complaints' AND column_name = 'tracking_token'");
                assertFalse(rsLegacy.next(), "Legacy tracking_token column must be dropped");

                // Check price_records variety column
                ResultSet rsVar = stmt.executeQuery(
                        "SELECT is_nullable FROM information_schema.columns " +
                        "WHERE table_schema = '" + schemaName + "' AND table_name = 'price_records' AND column_name = 'variety'");
                assertTrue(rsVar.next(), "variety column must exist in price_records");
                assertEquals("NO", rsVar.getString("is_nullable"), "variety column must be NOT NULL");
            }
        } finally {
            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE");
            }
        }
    }

    @Test
    @DisplayName("Flyway V7 successfully upgrades pre-existing V1–V6 PostgreSQL database and hashes existing tokens")
    void testIncrementalUpgradeFromV6() throws Exception {
        assumeTrue(postgresAvailable, "PostgreSQL 16 is required for this integration test");

        String schemaName = "flyway_test_v6_upgrade_" + System.currentTimeMillis();

        try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA " + schemaName);
        }

        try {
            // Step 1: Migrate up to target V6
            Flyway flywayV6 = Flyway.configure()
                    .dataSource(jdbcUrl, DB_USER, DB_PASS)
                    .schemas(schemaName)
                    .locations("classpath:db/migration")
                    .target("6")
                    .baselineOnMigrate(true)
                    .load();

            flywayV6.migrate();

            // Step 2: Insert a legacy complaint with a plaintext token
            String rawToken = "farmer_secret_token_abc_123";
            String refNum = "REF-TEST-999";

            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("SET search_path TO " + schemaName);
                stmt.execute("INSERT INTO complaints (reference_number, category, description, state, district, mandi_code, farmer_name, farmer_phone, status, tracking_token) " +
                             "VALUES ('" + refNum + "', 'WEIGHING', 'Scale discrepancy test', 'Punjab', 'Ludhiana', 'KHANNA_PB', 'Ramesh Kumar', '9876543210', 'PENDING', '" + rawToken + "')");
            }

            // Step 3: Run migration forward to V7
            Flyway flywayV7 = Flyway.configure()
                    .dataSource(jdbcUrl, DB_USER, DB_PASS)
                    .schemas(schemaName)
                    .locations("classpath:db/migration")
                    .target("7")
                    .load();

            int forwardApplied = flywayV7.migrate().migrationsExecuted;
            assertEquals(1, forwardApplied, "Only migration V7 should execute");

            // Step 4: Verify that raw token was hashed with SHA-256
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] expectedHashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            String expectedHash = HexFormat.of().formatHex(expectedHashBytes);

            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("SET search_path TO " + schemaName);
                ResultSet rs = stmt.executeQuery("SELECT tracking_token_hash FROM complaints WHERE reference_number = '" + refNum + "'");
                assertTrue(rs.next(), "Complaint record must be retained after V7 migration");
                String actualHash = rs.getString("tracking_token_hash");
                assertEquals(expectedHash, actualHash, "tracking_token_hash must equal the SHA-256 hex digest of the raw token");
            }
        } finally {
            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE");
            }
        }
    }
}
