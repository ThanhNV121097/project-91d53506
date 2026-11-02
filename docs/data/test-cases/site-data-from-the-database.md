# Test cases — Site data from the database

## DATA-001 — Collection storage

**Scenario**: Seed migration reproduces an existing record losslessly
**Given**: The record with id `cua-lo-beach-2n1d` existed in `code/frontend/src/data/products.json` before migration
**When**: `GET /v1/products/cua-lo-beach-2n1d` is sent after the seed migration has run
**Then**: The response body's fields match the original JSON record's values exactly
Traces: SC-2 (DATA-001 AC-2)
Check: fetch_url
