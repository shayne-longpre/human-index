# Source dossier

## Indicator-to-source roadmap

The Sources page's five-column ledger is generated from
`data/registry/sources.json`: data vertical → indicator → planned sources →
source-level acquisition and release checks. The current registry defines 49
indicators in ten verticals. An indicator is **source-set ready** if it has at
least one planned source and every listed source has all of its declared release
IDs in the selected manifest. Empty source sets are displayed as **source
selection needed**, never treated as vacuously complete. As of r12, 15 source
sets are ready and nine indicators still need a source selected.

This is an operational integration milestone, **not** a claim that an indicator
has every place, year, subgroup, or desired historical range. A source release
can contain only some variables and sparse exact years. The registry maps only
source roles already represented by the selected released slices; proposed
measures without an integrated variable remain explicit source-selection gaps.
Published metric contracts, downloadable evidence, and variable-specific
coverage remain in the release manifest and the individual source tables.
No competing source series is silently spliced when an indicator lists both.

The indicator taxonomy also corrects the previous source ledger: PIP, Penn
World Table, and direct ILOSTAT labor work belong under economics, not
population. Registry tests require unique indicator IDs, valid source links,
and at least one indicator mapping for every source listed in a vertical.

**Checked: October 24, 2026.** This dossier mixes implemented release inputs
with documentation-level candidates. Each section states its acquisition status.
“Checked license” means the cited publisher page states that license;
implementation must save the terms applying to the exact acquired artifact.

For the 2026-10-24 economic source audit, including newly published PIP
national-survey evidence and PWT/WID gates, see `ECONOMIC_INDICATORS.md`.

## S22 — World Bank Poverty and Inequality Platform

- Pinned version: `20260922_2021_01_02_PROD`, 2021 PPPs, $3/day line,
  `fill_gaps=false`; official [method/citation page](https://pip.worldbank.org/about)
  and [dataset catalog/license](https://datacatalog.worldbank.org/search/dataset/0038020/poverty-and-equity-database-poverty-and-inequality-platform).
- Acquired official API CSV: 2,588 survey rows; 2,479 national rows in 171
  countries, 1963–2025 for some supports. Release r10 publishes headcount,
  poverty gap, Gini, and bottom/top decile shares as five separate tables.
- National and subnational rows, duplicate country-years, income versus
  consumption welfare, original locators, and missingness remain explicit.
  A source-wide span does not establish annual coverage for all countries.

## S23 — Penn World Table 11.0

- [Official release, methods, citation and CC BY 4.0 license](https://www.rug.nl/ggdc/productivity/pwt/?lang=en).
- Acquired publisher-linked workbook `pwt110.xlsx`, SHA-256
  `7b337e94f39dfe304bc459e433f8ce0624496c812707ae0c924888f5142b3ab3`.
  The endpoint's HEAD response was 403 but the full GET succeeded; the file
  was validated as XLSX and its Data/Legend sheets were profiled.
- Release r11 publishes seven source-native output, employment, hours, TFP,
  capital-stock, and labor-share variables over 185 source country codes and
  13,690 rows (1950–2023, variable-specific coverage). Workbook cell locators
  and quality flags survive in downloads. TFP is not output per hour. No
  country value is assigned to an ancient polity.

## S24 — ILOSTAT direct labor statistics

- The [official data portal](https://ilostat.ilo.org/data/) lists labor-force
  participation, employment, unemployment, hours, and earnings series and a
  bulk-download facility. Source/model, frequency, sex/age dimensions, and
  geography vary by exact table.
- Candidate only: no exact table release, artifact, and asset-level reuse terms
  are pinned. The WDI modeled ILO unemployment and PWT labor inputs are
  published separately; they do not stand in for direct ILOSTAT survey data.

## S25 — Pew Global Religious Composition

- [Official 2010/2020 dataset](https://www.pewresearch.org/dataset/dataset-of-global-religious-composition-estimates-for-2010-and-2020/) estimates seven affiliation groups in 201 countries and territories. Its February 2026 update added diversity fields; Atlas will not treat these as an Atlas ranking.
- The downloadable workbook requires a Pew account and terms agreement. No artifact was acquired and its republication scope has not been approved. Preserve rounded small counts rather than fabricating exact values.

## S26 — World Religion Project v1.1

- [Official COW-hosted release and codebook](https://correlatesofwar.org/data-sets/world-religion-data/), 1945–2010 at five-year dates.
- National CSV and codebook acquired on 2026-10-24, pinned in `data/registry/religion-source-lock.json`. All 84 original columns and 1,995 state-year rows are typed and staged with source row locators in an ignored, local-only derived artifact. This is a source-created reconstruction with imputation, not 1,995 direct censuses.
- The source asks for versioned citation but does not specify redistributable dataset terms. No values are in the public app release pending that review. The presentation and download policy is a tracked question in `INSTITUTIONAL_RELIGION_EVIDENCE.md`.
- The local development research view exposes the source-native rows beside exact-code/year CCP **candidates** for review; it does not assert matching territory or combine affiliation with constitutional law.

## S27 — ARDA RCS-Dem 2.0

- [Official countries-only archive and codebook](https://www.thearda.com/data-archive?fid=RCSDEM2) describes 42,747 state-years of denomination estimates, mostly 1900–2015 and sometimes earlier. Its methods include interpolation and extrapolation and some geographic overlaps.
- The download agreement has not been accepted by the user, and republication terms are unresolved. No artifact is acquired or published.

## S28 — Religion and State Project RAS3

- [Official project and downloads](https://ras.thearda.com/ras-downloads) describe 183 states and independent territories, 1990–2014, for government-religion policy.
- Candidate only. Review its download terms and noncomposite source fields; do not splice its policy index into V-Dem or religious-affiliation tables.

## S29 — Comparative Constitutions Project

- [Official downloads](https://comparativeconstitutionsproject.org/download-data/) list Constitutional Chronology v6.0 through 2025 and Characteristics v5.0 for constitutional features in over 200 countries.
- Both public ZIP archives are now acquired in ignored `data/raw/ccp` and pinned in `data/registry/ccp-source-lock.json`. The streaming local profile records 20,638 Chronology rows (1789–2025, 6 columns) and 21,735 Characteristics rows (1789–2023, 2,030 columns). Characteristics has 4,054 rows with its source `coding_imputed` flag set. Both source archives retain their embedded codebooks. The v6 ZIP's manifest still says “Version 5”; use the archive name, data member, and codebook rather than that stale line.
- Neither coded characteristics nor constitution texts are in the web release. The source page distinguishes copyrighted constitutional texts, and the dataset's republication terms remain unverified. A written provision is not evidence that it was enforced.
- A local-only staged slice preserves all Characteristics and Chronology rows with selected coded religion-policy columns and source locators. The exact-year COW-code candidate decision set and development-only inspection page are documented in `INSTITUTIONAL_RELIGION_EVIDENCE.md`; no CCP value is in the public build.

## S1 — Cliopatria: historical political geometry

- Pinned candidate: **v0.2.0**, published May 16, 2026; documented coverage **3400 BCE–2024 CE**.
- Format: zipped GeoJSON, EPSG:4326; inclusive `FromYear`/`ToYear`; `Name`, `Area`, `Type`, `Wikipedia`, `Wikidata`, and partial `SeshatID` links.
- License: **CC BY 4.0**, confirmed in the pinned repository license.
- Important change: this release adds `RELATION` records for supra-polity composites. They must not become extra demographic units. `POLITY` does not itself guarantee a mutually exclusive partition.
- Intended use: optional historical context overlay; not the default statistical geography for modern indicator joins.
- Acquisition result (2026-09-20): the exact tagged archive and license were
  acquired and hashed. The archive contains 13,765 records: 13,380 `POLITY` and
  385 `RELATION`. Release r6 publishes 36 lazily loaded, simplified `POLITY`-only
  snapshots. Six source year-zero endpoints are quarantined; no snapshot samples
  source year zero. Borders remain contestable context, not a population
  partition.
- Topology pilot (2026-09-21): an equal-area audit of 57 active features in a
  Mediterranean bounding box at 1500 CE reports 28 overlap candidates above 100
  square kilometres. A versioned decision pass identifies eight relations
  explicitly declared by the source and preserves twenty as unresolved. The
  result is a display policy, not a claim that the source is wrong or that the
  features form an exclusive partition.

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
- The provider's downloadable directory was navigated interactively. It exposes
  baseline, lower, and upper branches, large variable-level files, and smaller
  per-year population archives. Automated HTTP retrieval still receives the
  provider's Anubis challenge.
- The directory's `License.txt` was downloaded and hashed as
  `3711f963c05d0be80d53e5923308a6dee31b203da23435c9cfb7c7b6e4dd5e19`.
  It is **CC BY-NC 4.0**, so Atlas must confirm compatible noncommercial use or
  obtain permission before publishing a HYDE-derived product.
- The README and `10000BC_pop.zip` baseline sample are now acquired and profiled.
  Its population-count grid sums to about 4.487 million modeled inhabitants
  before source-total/mask reconciliation. The archive `License.txt` says CC
  BY-NC 4.0, while the README says CC BY 3.0; this conflict blocks publication.
  The README also mentions a 2025 extension while its coverage sentence ends in
  2023. See `data/review/hyde-3.5-sample-profile.json`.

The [HYDE 3.2 methods paper, §2.1](https://essd.copernicus.org/articles/9/927/2017/essd-9-927-2017.pdf) describes historical totals assigned to fixed contemporary administrative units, then spatially allocated. This warns against treating fine cells as direct archaeological observations or intrinsically boundary-neutral evidence. It is a methodological warning from 3.2, not proof that every 3.5 implementation detail is unchanged.

Implementation gate: inspect the selected release's own documentation; distinguish counts from density, zero from nodata, and scenarios from confidence intervals. Compute actual cell areas. Record population totals before and after every resampling operation. Deep-time display resolution should not imply neighborhood-level knowledge.

## S3 — World Bank: modern population and measured conditions

- Indicator: **`EG.ELC.ACCS.ZS` — access to electricity, percent of population**.
- Indicator: **`SP.DYN.LE00.IN` — life expectancy at birth, total, years**.
- Weights: **`SP.POP.TOTL`**, with exact country/territory coverage and date compatibility audited.
- License: electricity indicator page states **CC BY 4.0**. Preserve the original SDG7/ESMAP attribution and validate terms for every acquired series.
- [Electricity definition/download page](https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS), [life-expectancy page](https://data.worldbank.org/indicator/SP.DYN.LE00.IN), [population page](https://data.worldbank.org/indicator/SP.POP.TOTL), [API structure documentation](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures).

Audited MVP acquisition endpoints:

```text
https://api.worldbank.org/v2/country/all/indicator/EG.ELC.ACCS.ZS?format=json&date=1990:2025&per_page=20000
https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=1960:2025&per_page=20000
https://api.worldbank.org/v2/country/all/indicator/SP.DYN.LE00.IN?format=json&date=1960:2025&per_page=20000
https://api.worldbank.org/v2/country?format=json&per_page=500
```

Fetch all pages; preserve the API metadata and retrieval date. Exclude region/income-group aggregates using country metadata. Audit dependent territories and statistical universes separately. Null values remain missing. Publish years only after profiling actual rows.

MVP acquisition result (2026-09-20): one-page responses were validated for
17,490 population rows covering 1960–2025, 9,540 electricity rows covering the
requested 1990–2025 window, and 17,490 life-expectancy rows covering the requested
1960–2025 window. The last actual electricity and life-expectancy observation year is 2024.
The publisher update date is 2026-07-13. The released universe has 217
nonaggregate entities. See `MVP_SOURCE_SELECTION.md` and the release manifest for
coverage by year, hashes, and the explicit `WLD` reconciliation residual.

This is a prevalence measure. A country-level rate supports an estimated count with access, but does not identify which local cells or households have access. A filled national polygon or recolored population grid must say **national estimate, not local measurement**. Access does not by itself measure reliability, affordability, or consumption.

Life expectancy is a period life-table mean at national or territorial support.
The Atlas may group population by those territorial means, but must not describe
that context distribution as a distribution of individual lifespans or as a
global life-table estimate.

## S4 — Maddison Project Database: long-run GDP per capita

- Published source-native table in r9: **MPD 2023**, 169 source country/economy codes, through 2022; Excel; **CC BY 4.0**.
- [Official release](https://www.rug.nl/ggdc/historicaldevelopment/maddison/releases/maddison-project-database-2023?lang=en), [dataset DOI](https://doi.org/10.34894/INZBF2).
- The publisher requires original papers from the source sheet to be cited when data are shown graphically. The official workbook was acquired on 2026-10-24; its `Sources` and `Maddison original sources` rows are retained with locators. They are country-level citation candidates, not verified per-observation paper assignments.

The workbook `Notes` labels GDP per capita as real 2011 dollars and its companion population as mid-year thousands. The published GDP-per-capita table has only 14 known values in 1 CE; it does not extend to 10,000 BCE. Do not silently splice it to a modern PPP series with a different base or treat it as a distribution of individual income, wealth, or consumption. See `ECONOMIC_EVIDENCE.md`.

## S5 — Seshat: historical institutional and technological observations

- The acquired Equinox v1 package has conflicting license notices: Zenodo metadata says **CC BY**, its embedded README says **CC BY-NC-SA**, and its embedded LICENSE is **CC0**. Publication is blocked pending source clarification. Current website downloads require a free account and explicit agreement. Private work-in-progress entries must not be redistributed.
- [Terms](https://seshat-db.com/terms/current/), [social-complexity variable inventory](https://seshat-db.com/sc/scvars/), [downloads](https://seshat-db.com/downloads_page/), [codebook](https://seshat-db.com/codebook).
- Start with released observations such as written records, formal legal codes, roads, irrigation, or markets; first verify which fields actually exist and are populated in the chosen release.
- Equinox v1 is acquired and profiled. A local-only ignored stage now retains 11,202 religion and institution rows from `Equinox2020_CanonDat`, with all twelve source cells, original workbook row locators, and the 163-row variable inventory. It does not decode present/absent/inferred/unknown into yearly values: many source rows lack exact dates. `TSDat123` includes 100-year fillers, numeric inference encodings, and `-999` sentinels. Neither can be mapped to historical polygons or population weights without a reviewed adapter. See `INSTITUTIONAL_RELIGION_EVIDENCE.md`.

The public variable interface distinguishes present, absent, uncertain/unknown, and uncoded states. Preserve these. Polity coverage is a historical research sample, not a ready-made census of every human society. Use reviewed case studies before attempting global population summaries. Writing in a polity does not measure literacy among its residents; a road's existence does not measure access to transport.

## S6 — V-Dem / Historical V-Dem: modern institutional evidence

- Published bounded v16 source-native tables in r12: legal suffrage share, legislature chambers, freedom-of-religion ordinal category, and religious-organization repression ordinal category. **CC BY-SA 4.0**.
- [Dataset and version cautions](https://www.v-dem.net/data/the-v-dem-dataset/), [Historical V-Dem](https://www.v-dem.net/about/historical-v-dem/).
- Historical V-Dem extends selected indicators to 1789 for roughly 80 polities, not every variable everywhere.
- Pin one complete release. Its maintainers warn against comparisons made by concatenating absolute values from different releases.

The pinned RData has 28,092 country-ID/year rows over 202 coding units (1789–2025). These four variables have 111,556 known source values in total; their exact-year support varies by variable and coding unit. They appear in a separate evidence table and are not mapped to historical borders or populations. Keep legal entitlement distinct from practice. Identify and link source-authored composite indexes rather than presenting an Atlas ranking of political systems. Do not convert a latent expert measure into a literal percentage of people enjoying a right. See `INSTITUTIONAL_RELIGION_EVIDENCE.md`.

## S7 — Clio Infra: historical social and economic series

- [Portal](https://clio-infra.eu/); [total-population series](https://clio-infra.eu/Indicators/TotalPopulation.html); [life-expectancy series and methodology](https://clio-infra.eu/Indicators/LifeExpectancyatBirthTotal.html).
- Critical support detail: the main portal describes historical series on **modern 2012 boundaries**. Coverage, quality codes, and observation frequency vary by indicator.
- The life-expectancy catalog reports only **137 observations for 1500–1819**. An early start date is not dense global coverage.
- Per-artifact licensing and source citations require checking; no blanket redistribution permission is assumed here.
- Population candidate acquired 2026-10-06: the official compact XLSX is pinned at SHA-256 `fbf1c9349a10dfe115c79e5808b9b6f29631eca9c0741e0ad59d90eef435a329`. Its `Data Long Format` sheet has 3,221 unique country/year rows, 190 country codes, and exact dates from 1500–2000. There are 70 observations at 1500 and 190 at 1950. The workbook incorrectly declares worksheet dimensions as `A1`, so readers must inspect actual XML rows rather than trusting `max_row` in read-only mode. The metadata sheet supplies a dataset-level citation, but not row-level underlying-source references; the portal asks users to consult the working paper. Units and per-artifact reuse terms are not yet independently settled. No Clio population observations are published.

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
- Acquisition result (2026-09-21): the official medium demographic-indicators
  CSV gzip is pinned at SHA-256
  `286ac36bb1415e2e1ade03acfef0a29f0e4c087e2f78e38c48f50c5df89082bc`.
  It contains 84,360 rows, 67 columns, 555 location IDs, 237 ISO3 codes, and no
  duplicate location/year/variant keys. `Country/Area` accounts for 36,024 rows;
  the file also includes regional and special aggregates.
- Published status (release r6): the official download page states that July
  population is in thousands and makes WPP 2024 available under CC BY 3.0 IGO.
  Atlas publishes only the 237 `Country/Area` series from 1950–2100, converts
  exactly to people, excludes all aggregates and 2101 boundary rows, and labels
  1950–2023 estimates separately from 2024–2100 Medium projections. The signed
  World-row rounding residual is retained. WPP remains a parallel source-native
  metric and is not spliced into World Bank population.

## S13 — CShapes 2.0: dated modern state geometry

- [Official release and documentation](https://icr.ethz.ch/data/cshapes/).
- Documented coverage: independent-state and dependent-territory boundaries and
  capitals from 1886–2019 globally, with European coverage from 1816.
- Two alternative international-system universes are supplied: Gleditsch–Ward
  and Correlates of War. Atlas must select and label one rather than merge them.
- Status: the official Gleditsch–Ward GeoJSON and codebook are pinned for a
  comparison-only audit. The profile finds 710 dated features, 252 GW codes,
  coverage from 1886-01-01 through 2019-12-31, and 11 invalid geometries. The
  GeoJSON omits status, ruler, border-definition, and feature-ID fields described
  by the codebook. CC BY-NC-SA 4.0 product-use review, geometry repair policy,
  and Cliopatria precedence remain publication gates.

CShapes can validate recent historical transitions but is not a universal
ontology of political belonging, and it does not solve ancient geometry.

## S14 — Reba historical urban population

- [Data descriptor](https://doi.org/10.1038/sdata.2016.34) and pinned
  [Modelski Ancient v2 artifact](https://doi.org/10.6084/m9.figshare.2059497.v2).
- The implemented table spans 3700 BCE–1000 CE: 154 city points, 41 sparse exact
  dates, and 621 published population estimates. Figshare metadata declares CC BY
  4.0; the exact CSV and metadata record are content-hashed in the source lock.
- Intended use: an independently sourced city/urban-population point layer, not
  rural population, a global population denominator, or a polity total.
- Status: Modelski Ancient v2 is implemented. Source coordinates, modern-country
  labels, and certainty codes are preserved without reinterpretation. Companion
  Chandler and Modelski Modern tables remain deferred until city identity and
  competing-estimate handling are designed explicitly.

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

## S19 — European Commission JRC GHS-POP R2023A

- [Official product and citation](https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php): modeled residential people per cell, global 1 km Mollweide product. Estimates are released every five years from 1975 through 2020; 2025 and 2030 are separate projections. The input demographic geography includes GPWv4.11, so Atlas does not count that input again as an independent population series.
- License: [GHSL citation and reuse page](https://human-settlement.emergency.copernicus.eu/GHSLhowToCite.php), CC BY 4.0. The ten exact estimate-year ZIP archives and separately labeled 2025/2030 projection archives are acquired and checksummed in `data/registry/population-surface-lock.json`; large ZIPs remain ignored by Git.
- Atlas role: source-native spatial population, kept separate from World Bank country totals, UN WPP Country/Area estimates, and Cliopatria polity geometry. The 1° display-bin method, source totals, zero/NODATA distinction, physical areas, and residual audit are in [POPULATION_SURFACES.md](POPULATION_SURFACES.md).
- Limit: no pre-1975 spatial reconstruction is implied. GHSL is model-informed disaggregation, not an observation of exact individual locations.

## S20 — WorldPop Global2 R2025A v1

- [Official hub record](https://hub.worldpop.org/doi/10.5258/SOTON/WP00845) and [release statement](https://data.worldpop.org/repo/prj/Global_2015_2030/R2025A/doc/Global2_Release_Statement_R2025A_v1.pdf): separate annual modeled 1 km global population reconstruction for 2015–2030, constrained to UN WPP 2024 January 1 national totals.
- Candidate status: the official constrained global 2020 BigTIFF is acquired and pinned at SHA-256 `c6f977bf5e43b7d607ac41892e0dbb04879c487f48443711d882d39b8b16c689`. A review-only aggregation conserves 7,849,969,310.541 modeled people in 15,432 covered 1° bins, including 18 valid-zero bins; there is no outside-grid mass and only a 0.0000038-person floating residual. The raster is EPSG:4326, 43,200 × 17,280 cells, with -99999 NODATA. It is **not published**. The hub labels WorldPop datasets CC BY 4.0, but the general WorldPop terms distinguish ODbL derivatives involving Microsoft inputs; the R2025A statement explicitly names Microsoft Building Footprints as a model input. Exact applicability needs review before a redistributable derived grid enters the app.
- This source is for comparison, not a GHSL extension, WPP replacement, or cross-release splice. Its own release statement warns about small-area patterns and non-aligned Global1/Global2 grids.

## Deferred rather than forgotten

CHAT, historical wages, education, homicide, D-PLACE, and archaeological regional datasets may be useful later. They are not preapproved integrations in this brief. Each must pass its own release, access, definition, scope, and licensing audit. Adding names to a source list is not the same as establishing a compatible data pipeline.
