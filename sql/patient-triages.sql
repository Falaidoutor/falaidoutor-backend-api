CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS falaidoutor;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'patient_triage_status'
      AND n.nspname = 'falaidoutor'
  ) THEN
    CREATE TYPE falaidoutor.patient_triage_status AS ENUM (
      'PENDING',
      'AI_PROCESSING',
      'WAITING_PROFESSIONAL_REVIEW',
      'COMPLETED'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS falaidoutor.patient_triages (
  id SERIAL PRIMARY KEY,

  patient_id INTEGER NOT NULL REFERENCES falaidoutor.patient(id),
  queue_triage_id INTEGER NULL REFERENCES falaidoutor.queue_triage(id),
  queue_ticket VARCHAR(30) NOT NULL,

  symptoms TEXT NOT NULL,
  status falaidoutor.patient_triage_status NOT NULL DEFAULT 'PENDING',

  ai_processed BOOLEAN NOT NULL DEFAULT FALSE,
  ai_processing BOOLEAN NOT NULL DEFAULT FALSE,
  ai_attempts INTEGER NOT NULL DEFAULT 0,
  last_ai_attempt_at TIMESTAMP NULL,
  next_ai_retry_at TIMESTAMP NULL,
  ai_error TEXT NULL,

  ai_result JSONB NULL,
  ai_summary TEXT NULL,
  ai_suggested_risk_classification VARCHAR(50) NULL,
  ai_suggested_risk_color VARCHAR(30) NULL,
  ai_recommended_action TEXT NULL,
  ai_processed_at TIMESTAMP NULL,

  professional_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  professional_id INTEGER NULL,
  professional_notes TEXT NULL,
  final_result JSONB NULL,
  final_risk_classification VARCHAR(50) NULL,
  final_risk_color VARCHAR(30) NULL,
  professional_reviewed_at TIMESTAMP NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE falaidoutor.patient_triages
ADD COLUMN IF NOT EXISTS queue_ticket VARCHAR(30);

UPDATE falaidoutor.patient_triages
SET queue_ticket = 'FD-' || LPAD(id::TEXT, 6, '0')
WHERE queue_ticket IS NULL;

ALTER TABLE falaidoutor.patient_triages
ALTER COLUMN queue_ticket SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patient_triages_patient_id
ON falaidoutor.patient_triages (patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_triages_queue_triage_id
ON falaidoutor.patient_triages (queue_triage_id);

CREATE INDEX IF NOT EXISTS idx_patient_triages_status
ON falaidoutor.patient_triages (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_triages_queue_ticket
ON falaidoutor.patient_triages (queue_ticket);

CREATE INDEX IF NOT EXISTS idx_patient_triages_ai_retry
ON falaidoutor.patient_triages (ai_processed, ai_processing, next_ai_retry_at);

CREATE INDEX IF NOT EXISTS idx_patient_triages_created_at
ON falaidoutor.patient_triages (created_at DESC);

CREATE OR REPLACE FUNCTION falaidoutor.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_triages_updated_at ON falaidoutor.patient_triages;

CREATE TRIGGER trg_patient_triages_updated_at
BEFORE UPDATE ON falaidoutor.patient_triages
FOR EACH ROW
EXECUTE FUNCTION falaidoutor.set_updated_at();

-- Query de referencia para retry da IA:
-- SELECT *
-- FROM falaidoutor.patient_triages
-- WHERE ai_processed = FALSE
--   AND ai_processing = FALSE
--   AND status IN ('PENDING', 'AI_PROCESSING')
--   AND (
--     next_ai_retry_at IS NULL
--     OR next_ai_retry_at <= NOW()
--   )
-- ORDER BY created_at ASC
-- LIMIT 20;
