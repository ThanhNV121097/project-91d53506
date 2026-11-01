# Test cases — Site data from the database

Module: `data`
Story: docs/data/stories/site-data-from-the-database.md
SRS: docs/data/SRS.md

## DATA-001 — Collection storage

**Scenario**: Every schema.json collection has a reachable table
**Given**: Migrations and the seed have run
**When**: GET /v1/<collection>?limit=1 is called for each of the 16 collections named in schema.json
**Then**: Every call returns 200 with items/total/page/limit
**Traces**: SC-1 (DATA-001 AC-1)
**Check**: fetch_url

**Scenario**: A seeded record survives migration unchanged
**Given**: The seed migration has run; the source JSON record for id cua-lo-beach-2n1d exists
**When**: GET /v1/products/cua-lo-beach-2n1d is called
**Then**: The response's fields match the source JSON record's values exactly
**Traces**: SC-2 (DATA-001 AC-2)
**Check**: fetch_url
