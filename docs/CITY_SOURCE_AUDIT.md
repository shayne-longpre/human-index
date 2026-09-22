# Companion historical-city source audit

Checked: 2026-09-21

The Reba et al. Figshare collection includes three source-authored series. Atlas
currently publishes only Modelski Ancient v2. The companion Chandler and
Modelski Modern files were acquired and profiled in this pass, but are not yet
merged into the map.

## Acquired artifacts

| Series | Exact file | SHA-256 | Rows | Date columns | Populated estimates |
|---|---|---|---:|---:|---:|
| Modelski Ancient | `modelskiAncientV2.csv` | `71beafaacbdeb8d8fc156951521e9a14e20d6704b0d77be5528511c52fad3e1d` | 154 | 41 | 621 |
| Chandler | `chandlerV2.csv` | `5b8df64e46988b216988eef18b46ebc2cba57ecc1adc8a5c2e1e6d5b78068031` | 1,597 | 806 | 9,438 |
| Modelski Modern | `modelskiModernV2.csv` | `927ee6a9122be6aded1a2f71ff5bb6f36312aae6a778574af47f4e8c65265726` | 293 | 1 | 293 |

The two new files and their official Figshare metadata are CC BY 4.0. Metadata
and artifact hashes are recorded in `data/registry/sources.json`.

## Findings that prevent an automatic merge

- Chandler contains two populated cells with numeric zero: Aleppo at 1300 CE
  and Tbilisi at 1100 CE. They remain unresolved; Atlas will not silently turn
  them into genuine zero-population observations or missing values.
- Some coordinate fields contain non-breaking spaces. They parse after explicit
  Unicode-whitespace normalization, but the raw strings must remain preserved.
- Normalized city-name overlap does not establish identity. Modelski Ancient and
  Chandler share 93 normalized names, but only 86 also have identical coordinate
  strings. Chandler and Modelski Modern share 224 names, but only 184 also have
  identical coordinate strings.
- Even matching coordinates do not prove that two rows represent the same
  source concept through all dates. Alternative names, settlement movement,
  metro-versus-city definitions, and source lineage need review.
- The series may disagree at the same city and date. Atlas must retain a
  `series_id` and source record locator and show alternatives rather than select
  or average one silently.

## Candidate-generation result

`pipelines.atlas_etl.review_city_crosswalk` now creates
`data/review/historical-city-crosswalk-candidates.json`. It compares source rows
only when normalized primary names match exactly or coordinates match after
rounding to five decimal places. It generated 353 candidates:

| Candidate basis | Count |
|---|---:|
| Exact normalized primary name and rounded coordinate | 290 |
| Exact normalized primary name only | 58 |
| Rounded coordinate only | 5 |

Every record is labeled `unreviewed_candidate`. This pass does not use fuzzy
matching, does not overwrite source names or coordinates, and does not merge any
observations. Row locators, per-row canonical hashes, date spans, and zero-value
counts are retained so a reviewer can make an evidence-backed decision.

## Minimal publication path

1. Review candidates into `matched`, `ambiguous`, and `unresolved` states;
   store rationale, reviewer, and cited evidence.
2. Decide how the UI exposes multiple estimates at one city/date. The default
   should show source alternatives, not a synthetic consensus.
3. Resolve the two Chandler zero cells from source documentation.
4. Add exact-date and disagreement tests, then publish a new immutable release.

This bounded work is preferable to a generalized gazetteer service for the MVP.
