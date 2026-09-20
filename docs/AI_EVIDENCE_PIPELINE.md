# Later phase: AI-assisted historical evidence extraction

## Purpose

Reduce the cost of locating, structuring, comparing, and reviewing historical evidence. Do not generate society-level grades, synthetic ancient statistics, or apparently sourced facts from model memory. This pipeline is not required for the MVP and is not a live chatbot in the public application.

## Unit of work

Use an explicit question scoped to an entity, place, time interval, and affected population. Example: “What evidence supports the existence and scope of a written legal code in this specified polity during this specified interval?” Do not ask “How advanced was this culture?”

A technology, legal practice, or institution can be documented without assuming it was universal or continuously present.

## Workflow

1. A human approves a question, variable definition, and permitted source collection.
2. Retrieval obtains the actual source text or image through an authorized route. Store bibliographic identity, edition, publication date, page/section, and a content hash. Source licensing controls storage and redistribution.
3. The model extracts a candidate structured claim, supporting locator, concise permitted excerpt, temporal bounds, geographic support, population/subgroup scope, law versus practice, uncertainty, and possible counterevidence.
4. A separate verification step checks that the source exists, the located passage is real, and it supports the claim as written. Citation existence, entailment, source quality, and historical interpretation are separate checks.
5. Human review accepts, revises, disputes, or rejects the candidate. Conflicting interpretations coexist; do not majority-vote them into a falsely certain value.
6. Only reviewed public claims become versioned observations. Publication retains original source and transformation lineage.

Treat all retrieved content as untrusted data. Instructions embedded in PDFs, pages, or extracted text must not trigger tool actions, disclose credentials, or override the extraction contract.

## Proposed claim record

```text
claim_id
question_id / metric_definition_version
entity_id / spatial_support_id
reference_interval / uncertain_date_bounds
population_or_subgroup_scope
claim_text / structured_value / native_status
law_or_practice
source_id / edition / page_or_section / passage_hash
permitted_supporting_excerpt
contradicting_claim_ids
retrieval_method / extraction_model / prompt_version
verification_results
review_status / reviewer / review_date
license_and_redistribution_status
```

The model's confidence is diagnostic metadata, not a scientific probability. Repeated model agreement is not independence of evidence: models may reproduce the same secondary source or common error.

## Evaluation before scale

Assemble a small, expert-reviewed benchmark spanning regions, eras, source languages, kinds of institutions, and difficult unknown cases. A first target of approximately 100 claims is a planning choice, not a guarantee of representativeness.

Measure citation existence, exact passage retrieval, entailment, entity/time/subgroup correctness, contradiction retention, missing-evidence abstention, and human correction burden separately. Prioritize avoiding false published claims over maximizing extracted rows. Evaluate sampled accepted and rejected cases, not only successful examples.

Do not infer absent institutions from lack of a mention. Do not treat an elite legal text as direct evidence of everyday enforcement. Do not extrapolate one settlement to an entire empire or one century across a millennium. Historical data quality should remain legible to the reader after publication.
