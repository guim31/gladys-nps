# Test fixtures

- `gladys-feature-table.json`: the category/type couples the Gladys front knows
  (see the header of `test/gladys-rules.test.js`).
- `api/alerts.json`, `api/events.json`: real answers of the NPS API for
  `parkCode=yose,yell,grca,acad,zion`, captured on 2026-11-12 at 08:06 UTC with
  `DEMO_KEY` (events from 2026-11-12 to 2026-12-12). Public data, unchanged.
- `api/parks-other.json`: the `/parks` entries of `alca` and `stli` from the
  same day, cut down to the fields the integration reads.
- `api/error-api-key-invalid.json`, `api/error-over-rate-limit.json`: the
  bodies of the 403 and 429 answers of api.data.gov, captured the same day.

The test helper (`test/helpers/world.js`) serves them filtered by the
`parkCode` of each request; the other cases are derived from them in the tests.
