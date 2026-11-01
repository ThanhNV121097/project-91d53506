-- Baseline: the extension later migrations rely on for generated ids.
-- No product tables here — the ERD phase designs those against
-- code/frontend/src/data/schema.json and adds its own migration.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
