# Test cases — Site data from the database

Module: `data`. Covers DATA-001 (`docs/data/SRS.md` §4.1).

## DATA-001 — Collection storage

**Scenario**: Every collection's record endpoint returns exactly schema.json's own fields, under their own names
**Given**: Migrations and seed have run; `products` table exists with the `cua-lo-beach-2n1d` row
**When**: `GET /v1/products/cua-lo-beach-2n1d` is called
**Then**: `200` is returned with a top-level field for every key `schema.json` lists under `products` plus `id`, under exactly those field names
**Traces**: SC-1 (DATA-001 AC-1)
**Check**: fetch_url
