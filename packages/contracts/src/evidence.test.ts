import { describe, expect, it } from 'vitest';
import { resolveEvidence, validateEvidenceClaim, type EvidenceClaim } from './evidence';

// Synthetic fixtures exercise the contract; they are not published historical evidence.
const claim: EvidenceClaim = {
  id: 'synthetic-bound', metric_id: 'synthetic-economic-metric',
  scope: { support_system: 'historical_polity', support_id: 'synthetic-polity',
    start_year: -99, end_year_exclusive: -49, temporal_basis: 'documented_valid_interval' },
  value: { kind: 'numeric_range', lower: 1, upper: 3, unit: 'synthetic units', semantics: 'logical_bound' },
  provenance: { kind: 'atlas_inference', input_observation_ids: ['synthetic-input'],
    transformation_id: 'synthetic-rule', transformation_version: '1', parameters: { threshold: 1 },
    artifact_sha256: 'a'.repeat(64), review_status: 'approved', rationale: 'Synthetic test only' },
};

describe('cross-domain evidence ranges', () => {
  it('requires bounded support and complete inference lineage', () => {
    expect(() => validateEvidenceClaim(claim)).not.toThrow();
    expect(() => validateEvidenceClaim({ ...claim, provenance: { ...claim.provenance, input_observation_ids: [] } as EvidenceClaim['provenance'] })).toThrow('lineage');
    expect(() => validateEvidenceClaim({ ...claim, scope: { ...claim.scope, end_year_exclusive: -100 } })).toThrow('scope');
  });

  it('never extrapolates in time or crosses geography systems', () => {
    expect(resolveEvidence([claim], claim.metric_id, 'historical_polity', 'synthetic-polity', -99).status).toBe('single');
    expect(resolveEvidence([claim], claim.metric_id, 'historical_polity', 'synthetic-polity', -49).status).toBe('unknown');
    expect(resolveEvidence([claim], claim.metric_id, 'statistical_unit', 'synthetic-polity', -75).status).toBe('unknown');
  });

  it('preserves disagreement and rejects false confidence', () => {
    expect(resolveEvidence([claim, { ...claim, id: 'other' }], claim.metric_id, 'historical_polity', 'synthetic-polity', -75).status).toBe('multiple');
    expect(() => validateEvidenceClaim({ ...claim, value: { ...claim.value, confidence_level: 0.95 } as EvidenceClaim['value'] })).toThrow('range');
  });

  it('supports non-ordinal categorical possibilities without forcing one answer', () => {
    const category: EvidenceClaim = { ...claim, value: { kind: 'category_set', vocabulary_id: 'synthetic-subsistence-v1',
      possible_codes: ['rainfed_arable', 'irrigated_arable'], semantics: 'inferred_possibilities' } };
    expect(() => validateEvidenceClaim(category)).not.toThrow();
    expect(() => validateEvidenceClaim({ ...category, value: { ...category.value, possible_codes: ['rainfed_arable', 'rainfed_arable'] } as EvidenceClaim['value'] })).toThrow('categorical');
  });
});
