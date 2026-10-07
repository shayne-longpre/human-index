# Population surfaces: source-native mapping contract

## Published scope

The population map has three distinct evidence supports, not one reconciled population series:

| Support | Published source | Dates | What the map may say |
| --- | --- | --- | --- |
| World | U.S. Census Bureau historical compilation | 10,000 BCE–1950 CE, sparse exact dates | Global estimate or disagreement range only; no geographic placement. |
| Modern statistical territories | World Bank WDI; separately UN WPP 2024 Country/Area | Source-specific annual dates | Source-native territorial totals on modern display geometry. |
| Source raster cells | European Commission JRC GHS-POP R2023A | 1975–2020 estimates at five-year intervals; 2025/2030 projections | Modeled residential population distribution, displayed independently of country and historical-polity accounting. |

The source raster is a model-informed disaggregation of census/administrative population informed by built-up settlement layers. It is not a direct observation of individual residences. Its underlying demographic input includes GPWv4.11; GPW is therefore documented as a lineage input, not added as a second population total. The GHSL 2025/2030 products are labeled projections, not silently appended as estimates. The app never interpolates a grid between GHSL dates, never assigns its cells to Cliopatria polities, and never sums it with World Bank or UN population.

Source: [GHS-POP R2023A product and citation](https://human-settlement.emergency.copernicus.eu/ghs_pop2023.php). Data and derived display bins retain CC BY 4.0 attribution.

## Derivation and accounting

`pipelines/atlas_etl/population_surface.py` reads each immutable, checksum-pinned 1 km Mollweide source TIFF. It treats `-200` as NODATA, rejects other negative or nonfinite population values, transforms each valid source-pixel centre to WGS84, and assigns the whole source count to exactly one 1° geographic bin. Valid zero pixels count as covered; bins with no valid source pixels remain NODATA. A source pixel whose centre falls outside the display grid is **not discarded**: its population and pixel count are recorded as an explicit outside-grid residual. The build verifies:

`source raster total = published bin total + outside-grid population + floating-point residual`

The floating-point residual must be below one part in 10 billion of source total (or 0.001 person); otherwise publication fails. The release manifest records the source ZIP SHA-256, raster dimensions/CRS/NODATA, transformation version/parameters, output checksums, source total, published total, and outside-grid residual for each date. The original rasters are ignored by Git; only compact derived JSON/CSV snapshots ship to browsers.

The one-degree bins are *display aggregation*, not exact outlines of population support. Colour is fixed-log modeled people per bin. Column height is fixed-log people divided by the physical area of the full 1° WGS84 geodesic bin, in people/km². This full-bin density includes ocean within partly coastal bins and should not be interpreted as local settlement density. A column is a marker centered in the bin, not its footprint. Valid-zero markers appear only after zooming in, because thousands of subpixel dots merged into misleading horizontal bands at world scale. Their coverage remains counted and available in the table at every zoom. Historical context is outline-only while this grid is active, avoiding translucent polygon fill artifacts. All counts, areas, and densities are downloadable, with a paginated accessible table when WebGL is unavailable.

## Rebuild

Large acquisition is explicit and never part of install, dev startup, or tests:

```sh
pnpm data:acquire:population-grids
pnpm data:derive:population-grids
pnpm data:publish:population-grids
pnpm test
pnpm build
```

The first command writes `data/registry/population-surface-lock.json`; raw ZIP files and derived intermediates stay under ignored `data/raw/` and `data/derived/`. The publisher refuses to overwrite an existing release. It copies the previous immutable release into `atlas-mvp-2026-10-06-r8` and adds only validated surface artifacts, their manifest records, and citations. To reproduce it after r8 already exists, run the publisher module with an empty comparison output path and compare its checksums with r8; it retains the r8 manifest ID. Publishing a distinct new release requires explicitly versioning the publisher's release ID and output path.

## Candidates and gaps

WorldPop Global2 R2025A v1 is a separate, annual 2015–2030 modeled reconstruction, with national totals constrained to UN WPP 2024 January 1 estimates. Its official [release statement](https://data.worldpop.org/repo/prj/Global_2015_2030/R2025A/doc/Global2_Release_Statement_R2025A_v1.pdf) cautions about input-census dates, country differences, small-area comparisons, and cross-version grid alignment. The official 2020 global BigTIFF is acquired and hashed in `data/registry/population-surface-lock.json`; a review-only derived file under ignored `data/derived/population-surfaces-worldpop-review/` conserves 7,849,969,310.541 modeled people over 15,432 covered bins, with 18 valid-zero bins and no outside-grid mass. The official [hub record](https://hub.worldpop.org/doi/10.5258/SOTON/WP00845) declares CC BY 4.0 for datasets; WorldPop's general terms also flag ODbL for derivatives of Microsoft Building Footprints, which this release statement expressly names as an input. WorldPop also uses GHSL built-settlement layers, so the two products are not statistically independent. The exact derivative terms need to be resolved before publication. When published, it must remain a separate selector, never a cross-source splice or statistical confidence interval.

The WorldPop sample is reproduced separately from publication:

```sh
.venv/bin/python -m pipelines.atlas_etl.acquire_population_surfaces --source worldpop --years 2020 --output data/raw --lockfile data/registry/population-surface-lock.json
.venv/bin/python -m pipelines.atlas_etl.population_surface --source worldpop --year 2020 --raw-root data/raw --output data/derived/population-surfaces-worldpop-review
```

The r8 publisher rejects WorldPop even if review files are accidentally placed in its input directory; resolving terms and completing source-specific QA must precede a new release.

Clio Infra's official [Total Population](https://clio-infra.eu/Indicators/TotalPopulation.html) workbook supplies 3,221 sparse country/year observations for 1500–2000 on modern 2012 geography; Seshat Equinox v1 contains 395 source-coded Polity Population rows. Both are acquired for review, not mapped: Clio's exact reuse terms, units, underlying row references, and territorial crosswalk remain unresolved; the 275 Seshat population PolIDs have no exact match to the 426 distinct Seshat IDs in published Cliopatria geometry, and many date/value fields require interpretation. Neither can be joined to a historical outline by name or used as a global partition. See [SOURCES.md](SOURCES.md).

No non-HYDE source currently establishes a verified global population grid from the dawn of civilization to 1974. The historical world total and ancient city points cannot legitimately be turned into one. HYDE remains blocked on its conflicting archive/readme terms and broader validation. GPWv4.11 and other population grids may be evaluated as alternate modern reconstructions, but duplicative lineage or inaccessible/unclear terms are not evidence of extra coverage.
