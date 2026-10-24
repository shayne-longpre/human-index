# Bounded evidence claims across Atlas dimensions

An inferred range is **not** a default value for an unobserved cell. It is a
reviewed, versioned claim with a metric, exact geographic support system and
ID, a source-defensible time support, possible values, semantics, and lineage.
The small shared contract is `packages/contracts/src/evidence.ts`; the resolver
matches support IDs and astronomical years exactly. It never joins by name,
extends an interval, ranks categories, chooses among conflicts, or turns
unknown into absence. Claims with overlapping support are returned together.

Two value shapes suffice for now:

- **Numeric range:** lower/upper in a named unit, with semantics of source
  disagreement, source scenarios, statistical interval, logical bound, or
  expert assessment. A confidence level is legal only for a documented
  statistical interval with an auditable method; an envelope of publications
  is not one.
- **Categorical possibility set:** one or more source-codebook values under a
  versioned vocabulary. This represents possibilities, not equal probabilities
  or an ordinal scale. A genuinely unknown cell has no claim; source-coded
  absent, disputed, uncoded, and not-applicable states remain distinct in the
  original observation contract.

Source-reported claims point to an immutable record artifact hash and original
locator. An Atlas inference additionally requires input observation IDs,
transformation ID/version, parameters, output artifact hash, rationale, and
approval. No claim enters a public release merely because it passes schema
validation: source license, date, geography, and reviewer checks still apply.
The first live use is the Census historical **world-population source
disagreement envelope** at its exact source dates. The UI labels it as an
envelope, not a confidence interval. It is world support only, never polity
population and never an intervening-year observation. There are presently no
approved Atlas-created ancient Gini, productivity, religion, or governance
ranges.

The local WRP↔CCP same-code/year record is a **candidate identity decision**,
not an `EvidenceClaim` and not a value inference. The local CCP codebook label
for a written provision is a display of the source's own category. Neither can
fill an unobserved religion or government cell. Promotion to a public bounded
claim requires a reviewed support crosswalk, variable-specific semantics,
input IDs, transform version and parameters, checksum, and source-use clearance.

## Candidate vocabularies, not prefilled history

These vocabularies should be registered only when an acquired source's
codebook and a reviewed crosswalk support them. Each claim must also state
whether it describes a polity, community, site, territory, or population; those
are not interchangeable.

| Dimension | Broad, defensible candidate claim | What cannot be inferred from it |
| --- | --- | --- |
| Subsistence/production | documented presence, absence, or possible set of foraging, pastoralism, rainfed cultivation, irrigation, craft specialization, mechanized industry | GDP, sector shares, labor productivity, everyone’s occupation |
| Exchange/finance | documented market, coinage, long-distance trade, taxation, or accounting practices | trade/GDP, real wage, household consumption |
| Distribution | source-authored quantitative bounds, or separately named evidence for social stratification/land concentration | a numerical Gini or wealth share from elite burials alone |
| Political institutions | documented assembly, executive succession rule, legal franchise criteria, office eligibility, or administrative recordkeeping | a democracy rank, actual participation rate, or rights enjoyed by all residents |
| Rights/legal status | law and practice separately, scoped by status/sex/age/group; explicit absent versus uncoded | universal person-level rights from one legal text |
| Religious practice | source-named traditions/rituals and attested plurality, with site/time and possible-set uncertainty | treating “pagan” as one religion or assigning every person a belief |
| Conflict | documented event, interval, or source-defined conflict status | peace from no recorded event, individual exposure from a battle point |

The intended historical workflow is: preserve primary records; code a narrow
claim and its scope; produce a bounded rule with complete lineage; review
counter-evidence; publish only where supported; show unknown elsewhere. A
model could eventually propose candidates for review, but cannot self-certify
coverage. “Almost every region for every stat” is not currently an evidence-
defensible target: especially GDP, Gini, productivity, and personal religious
status in early history. Richer *qualitative* coverage may be possible at some
sampled places/dates, but must not be mislabeled as those numeric indicators.
