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
            assertTrue(applied >= 15, "All migrations V1 through V15 must execute successfully on clean schema");

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

                // Check V14 correction: check constraint exists
                ResultSet rsChk = stmt.executeQuery(
                        "SELECT constraint_name FROM information_schema.check_constraints " +
                        "WHERE constraint_name = 'chk_price_records_provenance'");
                assertTrue(rsChk.next(), "chk_price_records_provenance constraint must exist in clean schema");
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

    @Test
    @DisplayName("Flyway V14 successfully upgrades pre-existing V12/V13 PostgreSQL database and corrects unsupported verification")
    void testIncrementalUpgradeFromV13ToV14() throws Exception {
        assumeTrue(postgresAvailable, "PostgreSQL 16 is required for this integration test");

        String schemaName = "flyway_test_v13_upgrade_" + System.currentTimeMillis();

        try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA " + schemaName);
        }

        try {
            // Step 1: Migrate up to target V13
            Flyway flywayV13 = Flyway.configure()
                    .dataSource(jdbcUrl, DB_USER, DB_PASS)
                    .schemas(schemaName)
                    .locations("classpath:db/migration")
                    .target("13")
                    .baselineOnMigrate(true)
                    .load();

            flywayV13.migrate();

            // Step 2: Insert a seeded record with synthetic HISTORICAL_VERIFIED status (as created by V12)
            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("SET search_path TO " + schemaName);
                stmt.execute("INSERT INTO price_records (commodity_code, mandi_code, min_price, max_price, modal_price, price_date, variety, provenance_type, verified, data_source) " +
                             "VALUES ('WHEAT', 'SIRSA_HR', 2200, 2400, 2300, '2024-11-20', 'Standard', 'HISTORICAL_VERIFIED', true, 'Agmarknet Official Archive (DES/MoAFW)')");
            }

            // Step 3: Migrate forward to V14
            Flyway flywayV14 = Flyway.configure()
                    .dataSource(jdbcUrl, DB_USER, DB_PASS)
                    .schemas(schemaName)
                    .locations("classpath:db/migration")
                    .target("14")
                    .load();

            int forwardApplied = flywayV14.migrate().migrationsExecuted;
            assertEquals(1, forwardApplied, "Only migration V14 should execute");

            // Step 4: Verify record was corrected to DEMO_BENCHMARK and verified=false
            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("SET search_path TO " + schemaName);
                ResultSet rs = stmt.executeQuery("SELECT provenance_type, verified, data_source FROM price_records WHERE commodity_code = 'WHEAT' AND mandi_code = 'SIRSA_HR'");
                assertTrue(rs.next(), "Record must exist after V14 migration");
                assertEquals("DEMO_BENCHMARK", rs.getString("provenance_type"), "Must be reclassified to DEMO_BENCHMARK");
                assertFalse(rs.getBoolean("verified"), "Must be marked unverified");
                assertEquals("MandiSaathi Demonstration Benchmark", rs.getString("data_source"));
            }
        } finally {
            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE");
            }
        }
    }

    @Test
    @DisplayName("Flyway V15 safely corrects overly broad V14 classification and preserves authentic official ingestion")
    void testIncrementalUpgradeFromV14ToV15() throws Exception {
        assumeTrue(postgresAvailable, "PostgreSQL 16 is required for this integration test");

        String schemaName = "flyway_test_v14_upgrade_" + System.currentTimeMillis();

        try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA " + schemaName);
        }

        try {
            // Step 1: Migrate up to V14
            Flyway flywayV14 = Flyway.configure()
                    .dataSource(jdbcUrl, DB_USER, DB_PASS)
                    .schemas(schemaName)
                    .locations("classpath:db/migration")
                    .target("14")
                    .baselineOnMigrate(true)
                    .load();

            flywayV14.migrate();

            // Step 2: Insert two records:
            // a) Erroneously promoted record with DAC&FW source
            // b) Genuine authentic record with data.gov.in API source
            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("SET search_path TO " + schemaName);
                stmt.execute("INSERT INTO price_records (commodity_code, mandi_code, min_price, max_price, modal_price, price_date, variety, provenance_type, verified, data_source) " +
                             "VALUES ('WHEAT', 'SIRSA_HR', 2200, 2400, 2300, '2024-11-20', 'Standard', 'OFFICIAL_INGESTION', true, 'Agmarknet (DAC&FW)')");
                stmt.execute("INSERT INTO price_records (commodity_code, mandi_code, min_price, max_price, modal_price, price_date, variety, provenance_type, verified, data_source) " +
                             "VALUES ('WHEAT', 'KHANNA_PB', 2300, 2500, 2400, '2024-11-20', 'Standard', 'OFFICIAL_INGESTION', true, 'Agmarknet (data.gov.in API)')");
            }

            // Step 3: Migrate forward to V15
            Flyway flywayV15 = Flyway.configure()
                    .dataSource(jdbcUrl, DB_USER, DB_PASS)
                    .schemas(schemaName)
                    .locations("classpath:db/migration")
                    .target("15")
                    .load();

            int forwardApplied = flywayV15.migrate().migrationsExecuted;
            assertEquals(1, forwardApplied, "Only migration V15 should execute");

            // Step 4: Verify DAC&FW record was reverted to DEMO_BENCHMARK / unverified,
            // while authentic data.gov.in API record remains OFFICIAL_INGESTION / verified!
            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("SET search_path TO " + schemaName);

                // Verify unverified DAC&FW record reverted
                ResultSet rsDac = stmt.executeQuery("SELECT provenance_type, verified, data_source FROM price_records WHERE mandi_code = 'SIRSA_HR'");
                assertTrue(rsDac.next());
                assertEquals("DEMO_BENCHMARK", rsDac.getString("provenance_type"));
                assertFalse(rsDac.getBoolean("verified"));

                // Verify authentic official record preserved
                ResultSet rsApi = stmt.executeQuery("SELECT provenance_type, verified, data_source FROM price_records WHERE mandi_code = 'KHANNA_PB' AND data_source = 'Agmarknet (data.gov.in API)'");
                assertTrue(rsApi.next());
                assertEquals("OFFICIAL_INGESTION", rsApi.getString("provenance_type"));
                assertTrue(rsApi.getBoolean("verified"));
                assertEquals("Agmarknet (data.gov.in API)", rsApi.getString("data_source"));
            }
        } finally {
            try (Connection conn = DriverManager.getConnection(jdbcUrl, DB_USER, DB_PASS);
                 Statement stmt = conn.createStatement()) {
                stmt.execute("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE");
            }
        }
    }
}
