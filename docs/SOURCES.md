# Source dossier

**Checked: September 20, 2026.** This dossier mixes implemented release inputs
with documentation-level candidates. Each section states its acquisition status.
“Checked license” means the cited publisher page states that license;
implementation must save the terms applying to the exact acquired artifact.

## S1 — Cliopatria: historical political geometry

- Pinned candidate: **v0.2.0**, published May 16, 2026; documented coverage **3400 BCE–2024 CE**.
- Format: zipped GeoJSON, EPSG:4326; inclusive `FromYear`/`ToYear`; `Name`, `Area`, `Type`, `Wikipedia`, `Wikidata`, and partial `SeshatID` links.
- License: **CC BY 4.0**, confirmed in the pinned repository license.
- Important change: this release adds `RELATION` records for supra-polity composites. They must not become extra demographic units. `POLITY` does not itself guarantee a mutually exclusive partition.
- Intended use: optional historical context overlay; not the default statistical geography for modern indicator joins.
- Acquisition result (2026-09-20): the exact tagged archive and license were
  acquired and hashed. The archive contains 13,765 records: 13,380 `POLITY` and
  385 `RELATION`. Release r2 publishes 36 lazily loaded, simplified `POLITY`-only
  snapshots. Six source year-zero endpoints are quarantined; no snapshot samples
  source year zero. Borders remain contestable context, not a population
  partition.

References: [release and DOI](https://zenodo.org/records/20274630), [pinned README](https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/v0.2.0/README.md), [pinned license](https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/v0.2.0/LICENSE.md).

The acquired archive SHA-256 is
`d01ae3a20d358cc5d54f69d9d725d390767d9c8759ac89ad6f90c58d106f3370`;
the pinned license SHA-256 is
`62ca7e92dee4ebe402372d5e64f87845de445a6c0e5d76fddb68b3e33739d1a6`.
A Wikidata match is evidence for a crosswalk, not proof that two statistical
populations are identical.

## S2 — HYDE: deep-time population and land use

- Current lab-listed candidate: **HYDE 3.5 (2025)**, **10,000 BCE–2025 CE**, **5 arc-minute** grid.
- Discovery: [official version directory](https://landuse.sites.uu.nl/datasets/); [3.5 archive landing page](https://public.yoda.uu.nl/geo/UU01/F45D44.html); [interactive portal](https://hyde-portal.geo.uu.nl/).
- The archive landing page was bot-protected in this research environment. Exact population files, available years, units, masks, scenario files, and archive license remain **unverified**.
- Do not inherit the paper's license as the data license. If the candidate cannot be acquired through an authorized route, select an individually verified older release and disclose that change.

The [HYDE 3.2 methods paper, §2.1](https://essd.copernicus.org/articles/9/927/2017/essd-9-927-2017.pdf) describes historical totals assigned to fixed contemporary administrative units, then spatially allocated. This warns against treating fine cells as direct archaeological observations or intrinsically boundary-neutral evidence. It is a methodological warning from 3.2, not proof that every 3.5 implementation detail is unchanged.

Implementation gate: inspect the selected release's own documentation; distinguish counts from density, zero from nodata, and scenarios from confidence intervals. Compute actual cell areas. Record population totals before and after every resampling operation. Deep-time display resolution should not imply neighborhood-level knowledge.

## S3 — World Bank: first measured condition

- Indicator: **`EG.ELC.ACCS.ZS` — access to electricity, percent of population**.
- Weights: **`SP.POP.TOTL`**, with exact country/territory coverage and date compatibility audited.
- License: electricity indicator page states **CC BY 4.0**. Preserve the original SDG7/ESMAP attribution and validate terms for every acquired series.
- [Electricity definition/download page](https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS), [population page](https://data.worldbank.org/indicator/SP.POP.TOTL), [API structure documentation](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures).

Audited MVP acquisition endpoints:

```text
https://api.worldbank.org/v2/country/all/indicator/EG.ELC.ACCS.ZS?format=json&date=1990:2025&per_page=20000
https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=1960:2025&per_page=20000
https://api.worldbank.org/v2/country?format=json&per_page=500
```

Fetch all pages; preserve the API metadata and retrieval date. Exclude region/income-group aggregates using country metadata. Audit dependent territories and statistical universes separately. Null values remain missing. Publish years only after profiling actual rows.

MVP acquisition result (2026-09-20): one-page responses were validated for
17,490 population rows covering 1960–2025 and 9,540 electricity rows covering the
requested 1990–2025 window. The last actual electricity observation year is 2024.
The publisher update date is 2026-07-13. The released universe has 217
nonaggregate entities. See `MVP_SOURCE_SELECTION.md` and the release manifest for
coverage by year, hashes, and the explicit `WLD` reconciliation residual.

This is a prevalence measure. A country-level rate supports an estimated count with access, but does not identify which local cells or households have access. A filled national polygon or recolored population grid must say **national estimate, not local measurement**. Access does not by itself measure reliability, affordability, or consumption.

## S4 — Maddison Project Database: long-run GDP per capita

- Candidate: **MPD 2023**, 169 countries, through 2022; Excel/Stata; **CC BY 4.0**.
- [Official release](https://www.rug.nl/ggdc/historicaldevelopment/maddison/releases/maddison-project-database-2023?lang=en), [dataset DOI](https://doi.org/10.34894/INZBF2).
- The publisher requires original papers from the source sheet to be cited when data are shown graphically. Ingest that sheet and associate references with observations rather than displaying only the MPD headline citation.

Audit the workbook's exact units, population scale, PPP basis, territorial definitions, and earliest actual observations before implementation. Do not silently splice it to a modern PPP series with a different base. This supports distributions of people across **economies with different average GDP per capita**, not distributions of individual income, wealth, or consumption.

## S5 — Seshat: historical institutional and technological observations

- Public-data terms: **CC BY-SA 4.0**; current website downloads require a free account and explicit agreement. Private work-in-progress entries must not be redistributed.
- [Terms](https://seshat-db.com/terms/current/), [social-complexity variable inventory](https://seshat-db.com/sc/scvars/), [downloads](https://seshat-db.com/downloads_page/), [codebook](https://seshat-db.com/codebook).
- Start with released observations such as written records, formal legal codes, roads, irrigation, or markets; first verify which fields actually exist and are populated in the chosen release.
- A stable Equinox package is referenced by the site's terms at [DOI 10.5281/zenodo.6642229](https://doi.org/10.5281/zenodo.6642229), but that archive was not successfully inspected here. Its exact artifact/terms require checking.

The public variable interface distinguishes present, absent, uncertain/unknown, and uncoded states. Preserve these. Polity coverage is a historical research sample, not a ready-made census of every human society. Use reviewed case studies before attempting global population summaries. Writing in a polity does not measure literacy among its residents; a road's existence does not measure access to transport.

## S6 — V-Dem / Historical V-Dem: modern institutional evidence

- Candidate: **v16, March 2026**, **CC BY-SA 4.0**; official ZIPs include codebooks, cautions, changes, and citation information.
- [Dataset and version cautions](https://www.v-dem.net/data/the-v-dem-dataset/), [Historical V-Dem](https://www.v-dem.net/about/historical-v-dem/).
- Historical V-Dem extends selected indicators to 1789 for roughly 80 polities, not every variable everywhere.
- Pin one complete release. Its maintainers warn against comparisons made by concatenating absolute values from different releases.

For Atlas, first evaluate concrete institutional/legal variables with explicit units and scope, such as documented franchise eligibility or legislative arrangements. Keep legal entitlement distinct from practice. Identify and link source-authored composite indexes in the source explorer rather than presenting an Atlas ranking of political systems. Do not convert a latent expert measure into a literal percentage of people enjoying a right.

## S7 — Clio Infra: historical social and economic series

- [Portal](https://clio-infra.eu/); [life-expectancy series and methodology](https://clio-infra.eu/Indicators/LifeExpectancyatBirthTotal.html).
- Critical support detail: the main portal describes historical series on **modern 2012 boundaries**. Coverage, quality codes, and observation frequency vary by indicator.
- The life-expectancy catalog reports only **137 observations for 1500–1819**. An early start date is not dense global coverage.
- Per-artifact licensing and source citations require checking; no blanket redistribution permission is assumed here.

Use as a curated expansion source, preserving original quality classifications and territorial support. Never paint a modern-boundary value over a historical polity merely because the names or regions seem related.

## S8 — UCDP: organized violence

- [Official download center](https://ucdp.uu.se/downloads/): **26.1** finalized releases; GED event series and UCDP/PRIO armed-conflict series have different temporal scopes, including modern geocoded data from 1989 and the latter's 1946–2025 coverage. **CC BY 4.0**.
- Check the selected archive/codebook rather than assuming every product's scope from the portal's version heading. Keep candidate/preliminary data separate from finalized releases.

Choose a specific definition—events, documented fatalities, or another supported measure. A conflict location is not a person-level exposure survey. Absence of an event record outside a source's scope is not evidence of peace. Do not concatenate UCDP, COW, and older conflict catalogs into a single trend without a separate harmonization study.

## S9 — Our World in Data: source discovery and processed health series

- [Life-expectancy chart and metadata](https://ourworldindata.org/grapher/life-expectancy) provides source lineage and download links; its long-run series combines historical inputs and modern UN estimates.
- [CSV](https://ourworldindata.org/grapher/life-expectancy.csv?v=1&csvType=full&useColumnShortNames=false) and [metadata JSON](https://ourworldindata.org/grapher/life-expectancy.metadata.json?v=1&csvType=full&useColumnShortNames=false) should be acquired together and content-hashed.
- Preserve underlying third-party licensing, not only OWID attribution. The inspected chart page describes Grapher software as custom-licensed; do not assume permission to clone its application code from data-download availability.

Period life expectancy is a synthetic life-table measure, not an observed distribution of ages at death. Preserve this meaning in the UI. Country totals from an OWID population series are not a substitute for HYDE's spatial reconstruction.

## S10 — Basemap and historical geography references

[Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/) place its map data in the public domain. Pin a specific acquired version. Use a quiet land/coastline basemap without modern roads or labels in deep history. A fixed modern coastline is an approximation, not a reconstructed paleocoastline.

[OpenHistoricalMap](https://www.openhistoricalmap.org/about) offers a complementary historical geography ecosystem; its default public-domain statement includes exceptions. Review item-specific provenance before importing.

[Running Reality](https://www.runningreality.org/docs/) is a substantial neighboring project with a global geo-temporal model, citations, detailed historical objects, and AI-assisted structuring. Its [discussion of historical borders](https://www.runningreality.org/docs/article/westphalianborders.jsp) is relevant to avoiding overly literal state maps. Differentiate Atlas by its population/measurement interface, not by claiming to be the first historical time map.

## S11 — Implementation documentation

- [MapLibre integration with deck.gl](https://deck.gl/docs/developer-guide/base-maps/using-with-maplibre): test the selected integration mode and actual dependency versions.
- [deck.gl GlobeView limitations](https://deck.gl/docs/api-reference/core/globe-view): experimental; HeatmapLayer, ContourLayer, and TerrainLayer are listed as unsupported. This is why a globe cannot be assumed to support the original relief design unchanged.
- [H3 cell statistics](https://h3geo.org/docs/core-library/restable/): cells are not equal-area. Use actual cell areas if H3 is adopted; it is optional, not a prerequisite.
- [PMTiles concepts](https://docs.protomaps.com/pmtiles/): optional static tile archives with range-based access. Verify hosting behavior and avoid packaging all historical states into one indiscriminately fetched layer.
- [Codex AGENTS.md guidance](https://developers.openai.com/codex/guides/agents-md): durable repository instructions belong in AGENTS.md; task-specific details remain in the prompt and linked documents.

## S12 — UN World Population Prospects 2024

- Official source: [World Population Prospects 2024](https://population.un.org/wpp/).
- Documented scope: 237 countries and areas; estimates from 1950 to the present,
  projections to 2100, and single-year age/time detail.
- Intended role: more detailed direct population expansion source after the
  modern World Bank MVP.
- Status: documented, not ingested. Before publishing, pin the exact bulk
  artifact and terms; separate estimates from projections and scenarios; audit
  country/area definitions and parent/dependency relations; and create explicit
  crosswalks rather than concatenating it with the current release.

## S13 — CShapes 2.0: dated modern state geometry

- [Official release and documentation](https://icr.ethz.ch/data/cshapes/).
- Documented coverage: independent-state and dependent-territory boundaries and
  capitals from 1886–2019 globally, with European coverage from 1816.
- Two alternative international-system universes are supplied: Gleditsch–Ward
  and Correlates of War. Atlas must select and label one rather than merge them.
- Status: candidate comparison layer. Pin the exact artifact and license, then
  audit dependent territories and undefined or disputed boundary handling.

CShapes can validate recent historical transitions but is not a universal
ontology of political belonging, and it does not solve ancient geometry.

## S14 — Reba historical urban population

- [Data descriptor and artifact entry point](https://doi.org/10.1038/sdata.2016.34).
- Documented span: city locations and historical population estimates from 3700
  BCE–2000 CE.
- Intended use: an independently sourced city/urban-population point layer, not
  rural population, a global population denominator, or a polity total.
- Status: exact data artifact and underlying Chandler/Modelski source rights must
  be pinned and audited before redistribution.

## S15 — World Historical Gazetteer

- [Public datasets](https://whgazetteer.org/public_data/) and
  [API/source documentation](https://docs.whgazetteer.org/content/technical/apis.html).
- Intended use: temporal place-name assertions, source identifiers, geometry
  variants, and cross-source reconciliation.
- Status: candidate only. WHG combines sources with different licenses, so every
  selected input requires its own terms and artifact record. It is not itself a
  single global political-boundary release.

## S16 — Pleiades

- [Official dataset downloads](https://pleiades.stoa.org/downloads), licensed CC
  BY 3.0 by the publisher.
- Intended use: ancient place names, locations, bibliographic links, and explicit
  uncertain or unlocated states.
- Status: select and pin a versioned export, then profile temporal and spatial
  certainty. Pleiades is a place gazetteer, not a polity-border source.

## S17 — U.S. Census Bureau historical world-population estimates

- [Official historical estimates table](https://www.census.gov/data/tables/time-series/demo/international-programs/historical-est-worldpop.html),
  acquired 2026-09-20 and content-hashed.
- Published span: 39 source dates from 10,000 BCE through 1950 CE. The table
  collates named published estimates and provides summary lower/upper values in
  millions.
- Atlas role: global population support only. The lower/upper summaries are
  preserved as source-disagreement ranges, not statistical confidence intervals;
  the table's blank upper value denotes a point estimate.
- The observations are never allocated to Cliopatria polygons, and the named
  underlying estimates remain available in the release artifact for inspection.
- Acquired HTML SHA-256:
  `1036e2d7cd6b6cd1715a25844fc154856a20d9a600d7675fac6a0913983bbd99`.

This provides a defensible first global timeline while HYDE access remains
blocked. It does not provide a raster, country/polity totals, annual continuity,
or statistical uncertainty.

## Deferred rather than forgotten

CHAT, WorldPop/GHSL, historical wages, education, homicide, D-PLACE, and archaeological regional datasets may be useful later. They are not preapproved integrations in this brief. Each must pass its own release, access, definition, scope, and licensing audit. Adding names to a source list is not the same as establishing a compatible data pipeline.
