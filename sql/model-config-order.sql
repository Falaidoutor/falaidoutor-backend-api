-- Execute once before deploying the version that allows model ordering.
ALTER TABLE falaidoutor.model_parameter_versions
  ADD COLUMN IF NOT EXISTS model_order JSONB NOT NULL DEFAULT '["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]'::jsonb;

UPDATE falaidoutor.model_parameter_versions
SET model_order = '["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]'::jsonb
WHERE model_order = '[]'::jsonb;
