# MVP source selection

Updated: 2026-09-22

## Published now

The MVP combines separately versioned sources without presenting them as one
homogeneous series. The World Development Indicators snapshot was updated by the
publisher on 2026-07-13 and retrieved on 2026-09-20.

| Dimension | Published source | Actual release coverage | Why this source now |
|---|---|---|---|
| Deep-time population | U.S. Census Bureau historical world-population comparison table | 39 dates, 10,000 BCE–1950 CE; world support only | Official compact table retaining multiple named estimates and explicit summary ranges; defensible while a gridded artifact remains blocked |
| Population | World Bank `SP.POP.TOTL` | 1960–2025, annual; 217 nonaggregate metadata entities, with 216 known before 1990 and 217 from 1990 onward | CC BY 4.0, complete small download, and the same statistical geography used for electricity weights |
| Population outlook | UN WPP 2024, Medium variant | 1950–2100 annual; 237 Country/Area series; estimates through 2023 and Medium projections from 2024 | Authoritative detailed UN source, published as a separate universe and evidence mode instead of an undocumented splice |
| Electricity access | World Bank `EG.ELC.ACCS.ZS` | 1990–2024, annual source years; known-entity coverage grows from 98 in 1990 to 215 in 2024 | The authoritative World Bank/ESMAP SDG 7.1.1 publication path, with explicit nulls and compatible annual population weights |
| Display geometry | Natural Earth admin 0 v5.1.2 | 170 of the 217 statistical supports at 1:110m | Small public-domain geometry used only for display, never population accounting |
| Historical political context | Cliopatria v0.2.0 | 36 published snapshots, 3400 BCE–2024 CE | Global, openly licensed source with dated geometry and names; used only as contestable context |

`WLD` is a reference aggregate only. It is not summed with entity series. The
release preserves the difference between the reference and the covered entity
sum as an unassigned residual. It also preserves the population of entities that
are too small for the coarse map as unplaced rather than dropping them.

## Detailed population source added without a silent splice

UN World Population Prospects 2024 is now published as its own metric. The
official page establishes CC BY 3.0 IGO and thousand-person July units. The
release selects only `Country/Area`, excludes aggregates and 2101, preserves the
World-row rounding residual, and labels estimates versus the Medium projection.
It does not overwrite or concatenate the World Bank series.

HYDE 3.5 remains the candidate for genuinely gridded deep-time population. A
10,000 BCE baseline bundle and README are acquired, but conflicting license
statements and unfinished mask/scenario/mass checks keep it blocked. The Census
historical values must not be described as local density or population by
country/empire. Likewise, Cliopatria boundaries must not be treated as population
supports or a nonoverlapping global partition.

## Reproducibility boundary

The application ships the small published release. Raw downloads remain ignored
by Git. `pnpm data:acquire` is the explicit network step; `pnpm data:build`
validates source metadata and page counts, normalizes immutable observations, and
recreates the release and source lock. Each output has a SHA-256 checksum in the
manifest. No source download occurs during installation, development startup, or
tests. Electricity CSV rows include the matching population weight and both
source-record locators so the prevalence summary can be reproduced from the
download itself; the linked release manifest supplies methods, citations, terms,
and artifact hashes.
