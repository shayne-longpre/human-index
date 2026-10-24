# Institutions and religion: first source-native release

Release `atlas-mvp-2026-10-24-r12` adds a bounded institutional page at
`?page=institutions`. It deliberately separates legal structure, expert-coded
government behavior toward religion, religious affiliation, and historical
polity practices. These are different variables with different supports. No
Atlas-authored ranking or combined “civilization score” is produced.

## Published V-Dem v16 slice

The exact country-year RData and v16 codebook are pinned in
`data/registry/candidate-source-lock.json`. The ETL verifies both hashes before
parsing `vdem` with pinned `pyreadr`. The input has 28,092 unique
`country_id`/year rows over 202 source coding units; the source years run from
1789 through 2025. The four selected variables yield 111,556 non-null values.

| Source variable | Meaning in Atlas | Native scale | Important limit |
| --- | --- | --- | --- |
| `v2x_suffr` | Statutory-adult legal eligibility to vote in national elections | fraction, 0–1 | De-jure, not turnout or de-facto access; source estimates some restricted groups from other statistics. |
| `v2lgbicam` | Legislature chamber category | 0, 1, 2+ | Source uses the minimum within a country-year; 0 is a coded no-chamber value, not unknown. |
| `v2clrelig_ord` | Freedom-of-religion ordinal category | 0–4, source-authored | Expert-model-derived ordinal version, not an individual rights percentage or religious affiliation. |
| `v2csrlgrep_ord` | Government repression of religious organizations | 0–4, source-authored | Higher codes mean less repression; not a count of affected people. |

The original source variable remains named in the manifest, JSON, CSV, and UI.
The CSV retains every source row, including blank values, source `country_id`
and `country_text_id`, `historical`, `histname`, `project`, and a 1-based RData
row locator. The browser table lists only source rows for the selected year;
within those rows a blank stays unknown. A coding unit absent that year is
outside source coverage, not a zero. The page never joins these records to
Cliopatria borders or modern population totals. [V-Dem's official dataset
page](https://v-dem.net/data/the-v-dem-dataset/) gives its v16 citation,
CC BY-SA 4.0 terms, and cross-release comparison caution; the [v16
codebook](https://v-dem.net/documents/70/codebook_v16.pdf) defines these
variables on printed pages 50, 164, 205, and 224. This release does not
publish the continuous expert latent scores or their uncertainty fields.

## Central source queue, with actual gates

| Construct | Priority source | State | Gate before publication |
| --- | --- | --- | --- |
| Current affiliation composition | [Pew 2010/2020](https://www.pewresearch.org/dataset/dataset-of-global-religious-composition-estimates-for-2010-and-2020/) | Official page reviewed; no dataset acquired | Pew account and data-use terms require the user's consent; verify redistribution. Keep seven groups and rounded small counts source-native. |
| Postwar affiliation composition | [World Religion Project v1.1](https://correlatesofwar.org/data-sets/world-religion-data/) | National CSV and codebook acquired; all national fields staged locally, unpublished | Clarify republication terms and retain the source's own imputation, religion tree, `sourcecode`, and dual-religion semantics. Do not treat 1,995 rows as direct census observations. |
| Longer-run denomination estimates | [ARDA RCS-Dem 2.0](https://www.thearda.com/data-archive?fid=RCSDEM2) | Official documentation reviewed; no artifact acquired | ARDA download agreement and reuse scope; audit overlapping dependencies and source interpolation/extrapolation. |
| State religion policy | [Religion and State Project RAS3](https://ras.thearda.com/ras-downloads) | Official page reviewed; no artifact acquired | ARDA terms and variable-level codebook review; distinguish official religion, restrictions, and societal hostility. |
| Ancient polity institutions and normative practices | [Seshat Equinox v1](https://zenodo.org/records/6642230) | Archive acquired; relevant canonical rows staged locally, publication blocked | Zenodo metadata says CC BY, embedded README says CC BY-NC-SA, embedded LICENSE is CC0. Obtain authoritative clarification. CanonDat dates and source-native uncertainty must be resolved; TSDat123 has century fillers and numerical codes, not standalone original observations. No exact PolID-to-Cliopatria join exists for the reviewed population rows. |
| Written constitutional provisions | [Comparative Constitutions Project](https://comparativeconstitutionsproject.org/download-data/) | Chronology v6 / Characteristics v5 ZIPs acquired, pinned and profiled locally; unpublished | Verify data/text reuse separately, preserve source imputation and multiple same-year records, distinguish legal text from practice. |

The research registry in `data/registry/sources.json` is the Sources page's
vertical ledger. Only V-Dem has a published institutional/religion-policy slice.
Acquired WRP, CCP and Seshat files are review inputs, not silently promoted data.

## Local research use and user-facing review

The full WRP national CSV is now available to offline Atlas analysis through
`data/derived/religion/wrp-national-v1.1.json` after running
`npm run data:stage:world-religion`. This ignored file is not part of Git, the
public release, or the browser bundle. The adjacent `.receipt.json` records
both pinned input hashes, the transform version and parameters, and the output
checksum. Every one of the source's 84 columns and 1,995 rows survives in
original column order; the 1-based CSV row locator is retained. Source blanks
remain null and numeric zero remains zero. No percentage is treated as
mutually exclusive population share: `dualrelig` can be one and the source
`sumreligpct` can exceed one. Source `datatype`, reliability and `sourcecode`
values remain source codes, including codes that the available codebook does
not fully explain. The source is a reconstruction with its own imputation.

**Visibility decision to revisit before a public UI:** decide which source
columns may be shown and downloaded, whether a source-link-only or subset
display meets the provider's terms, and how to label source reconstruction,
overlapping adherence, and category hierarchy. Do not make a choropleth until
a dated COW-state-to-display-geometry crosswalk is reviewed. Keep WRP, Pew,
ARDA, and V-Dem as separate source views; do not silently merge their religion
taxonomies. Verify the WRP codebook's conflicting Jain/Confucian column labels
against the CSV and authors before displaying those names. The public app
continues to show only the published V-Dem slice until these gates are closed.

CCP Chronology v6 and Characteristics v5 are also available from pinned
ignored ZIPs without extracting or copying the large CSVs into Git. Running
`npm run data:review:ccp` streams the source CSV members and verifies the ZIP
hashes and embedded codebooks. The current profile finds 20,638 event/year
rows and 21,735 characteristics/year rows. Characteristics has 2,030 source
columns; 4,054 rows carry `coding_imputed=1`. The ZIP chronology manifest
contains a stale “Version 5” line despite the official v6 download and v6
filenames, so the lock identifies the exact URL, archive hash, CSV member,
and codebook member. **Separate public-display decision:** choose source
variables and source-native category labels after codebook review, and decide
what, if any, data may be downloadable. Do not display copyrighted constitution
texts or infer enforcement from a coded written provision.

`npm run data:stage:ccp-religion` now creates an ignored, local-only slice with
all 21,735 Characteristics source rows and all 20,638 Chronology rows, but only
the identity, year, coding, and two narrowly reviewed religion-policy columns.
It keeps raw code strings, missing cells, original CSV row locators, multiple
same-year records, and archive checksums. The full 2,030-column original remains
in the ignored source ZIP. The v5 codebook defines `FREEREL` codes 1 and 2 as
whether the **written constitution** provides freedom of religion; 96 means
other and 97 unable to determine. The browser interprets only these source
codes and shows `coding_available` and `coding_imputed` separately. It never
infers actual religious liberty, population prevalence, or institutional quality.

`npm run data:reconcile:religion-institutions` records 1,960 WRP rows with at
least one CCP Characteristics row sharing an integer-normalized COW-style code
and exact source year. Its ignored decision artifact pins both staged file hashes,
versioned matching parameters, source row locators, every same-year CCP match,
and `same_code_year_candidate_support_not_reviewed` disposition. The remaining
35 WRP rows have no exact candidate. Code/year identity is useful for review,
but it does **not** establish equivalent territorial support, nor a V-Dem,
Seshat, or Cliopatria crosswalk. No metric values are mathematically merged.

The Equinox `Equinox2020_CanonDat` source is locally staged as
`data/derived/institutions/seshat-equinox-local.json` by running
`npm run data:stage:seshat-institutions`. The stage retains 11,202 rows from
the source's Religion and Normative Ideology and Institutional Variables
sections, its `government`-category Social Complexity variables, and three
named religious-complexity variables. Every selected row keeps its twelve
original cells and 1-based workbook row locator. The separate Variables sheet
inventory is included. The receipt pins the archive and embedded workbook
hashes and the transformation parameters. This is **not** an annual time
series: no date filling, sentinel conversion, source-code interpretation, or
geographic crosswalk has occurred. The conflicting embedded license notices
still prevent public publication. Revisit which variables and precise values
should be visible only after that and the temporal/coding audit.

In the local development server, `?page=research` presents these three ignored
artifacts in separate source-native tables and places exact-code/year CCP
candidates next to selected WRP rows. This is a research inspector, not a public
release: the route is unavailable in production, its four allowlisted artifact
endpoints accept loopback clients only, and the generic Vite file-server path
denies `data/raw` and `data/derived`. The browser renders source text as text,
not markup. Missing local stages produce a visible unavailable message. This
gives the research team a concrete view of the data while republication terms,
Seshat archive notices, codebook ambiguities, and geography are resolved.

## Reconciliation rule

Source-native IDs and units are mandatory. `V-Dem country_id`, WRP `state`,
RCS state/dependency IDs, a Pew country/territory, and a Seshat `PolID` are
not one geographic key. A future crosswalk requires a reviewed date, source
support, and unresolved/ambiguous disposition. A constitution's legal text
does not override a V-Dem practice code. A religious group's category is not
equivalent across source taxonomies just because the English label matches.
The app currently makes no cross-source or map-level institutional aggregate.

No inferred belief, religion, or institution is backfilled for uncoded years.
`docs/INFERRED_EVIDENCE.md` describes the bounded claim contract for any future
expert-reviewed qualitative reconstruction; it cannot manufacture observations
or turn unknown into inferred absence.

## Reproduction

`npm run data:derive:institutions` validates the two pinned V-Dem artifacts and
regenerates source-native JSON/CSV under ignored `data/derived/institutions`.
`npm run data:publish:institutions` creates r12 from immutable r11 and refuses
to overwrite it. `npm run data:acquire:religion-candidates` explicitly fetches
the two public WRP files into ignored `data/raw`; the corresponding lock pins
their hashes. `npm run data:review:religion-candidates` regenerates the small
review-only WRP profile. None of these commands runs at app startup.
