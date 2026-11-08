-- Phase 4B: Ingestion Job History Table
CREATE TABLE ingestion_runs (
    id BIGSERIAL PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    total_fetched INT DEFAULT 0,
    inserted_count INT DEFAULT 0,
    updated_count INT DEFAULT 0,
    skipped_count INT DEFAULT 0,
    message TEXT,
    error_details TEXT,
    triggered_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ingestion_runs_started_at ON ingestion_runs(started_at DESC);
