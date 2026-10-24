/** Cross-domain claims that are broader than an exact source observation.
 * They never replace immutable observations or imply coverage outside their support.
 */
export type EvidenceSupportSystem = 'world' | 'statistical_unit' | 'historical_polity' | 'site' | 'reviewed_region';

export interface EvidenceScope {
  support_system: EvidenceSupportSystem;
  support_id: string;
  start_year: number; // astronomical, inclusive
  end_year_exclusive: number;
  temporal_basis: 'exact_source_year' | 'documented_valid_interval';
}

export type EvidenceValue =
  | {
    kind: 'numeric_range';
    lower: number;
    upper: number;
    unit: string;
    semantics: 'source_disagreement' | 'source_scenarios' | 'statistical_interval' | 'logical_bound' | 'expert_assessment';
    confidence_level?: number; // legal only for a documented statistical interval, never an envelope
  }
  | {
    kind: 'category_set';
    vocabulary_id: string;
    possible_codes: string[]; // set of supported possibilities, not probabilities or an ordinal score
    semantics: 'source_uncertainty' | 'documented_possibilities' | 'inferred_possibilities';
  };

export type EvidenceProvenance =
  | {
    kind: 'source_reported';
    source_release_id: string;
    original_record_locator: string;
    record_artifact_sha256: string; // hash of the immutable artifact containing this record
  }
  | {
    kind: 'atlas_inference';
    input_observation_ids: string[];
    transformation_id: string;
    transformation_version: string;
    parameters: Record<string, string | number | boolean>;
    artifact_sha256: string;
    review_status: 'approved';
    rationale: string;
  };

export interface EvidenceClaim {
  id: string;
  metric_id: string;
  scope: EvidenceScope;
  value: EvidenceValue;
  provenance: EvidenceProvenance;
}

const isChecksum = (value: string) => /^[a-f0-9]{64}$/.test(value);

export function validateEvidenceClaim(claim: EvidenceClaim): void {
  const { scope, value, provenance } = claim;
  if (!claim.id || !claim.metric_id || !scope.support_id || !Number.isInteger(scope.start_year)
    || !Number.isInteger(scope.end_year_exclusive) || scope.start_year >= scope.end_year_exclusive
    || !['world', 'statistical_unit', 'historical_polity', 'site', 'reviewed_region'].includes(scope.support_system)
    || !['exact_source_year', 'documented_valid_interval'].includes(scope.temporal_basis)
    || (scope.temporal_basis === 'exact_source_year' && scope.end_year_exclusive !== scope.start_year + 1)) {
    throw new Error(`Invalid evidence scope: ${claim.id}`);
  }
  if (value.kind === 'numeric_range') {
    if (!Number.isFinite(value.lower) || !Number.isFinite(value.upper) || value.lower > value.upper || !value.unit
      || !['source_disagreement', 'source_scenarios', 'statistical_interval', 'logical_bound', 'expert_assessment'].includes(value.semantics)
      || (value.confidence_level !== undefined && (value.semantics !== 'statistical_interval'
        || value.confidence_level <= 0 || value.confidence_level >= 1))) {
      throw new Error(`Invalid numeric evidence range: ${claim.id}`);
    }
  } else if (!value.vocabulary_id || !value.possible_codes.length
    || !['source_uncertainty', 'documented_possibilities', 'inferred_possibilities'].includes(value.semantics)
    || new Set(value.possible_codes).size !== value.possible_codes.length
    || value.possible_codes.some((code) => !code)) {
    throw new Error(`Invalid categorical evidence: ${claim.id}`);
  }
  if (provenance.kind === 'source_reported') {
    if (!provenance.source_release_id || !provenance.original_record_locator || !isChecksum(provenance.record_artifact_sha256)) {
      throw new Error(`Invalid source provenance: ${claim.id}`);
    }
  } else if (provenance.review_status !== 'approved' || !provenance.input_observation_ids.length
    || provenance.input_observation_ids.some((id) => !id)
    || new Set(provenance.input_observation_ids).size !== provenance.input_observation_ids.length
    || !provenance.transformation_id
    || !provenance.transformation_version || !provenance.rationale
    || !isChecksum(provenance.artifact_sha256)) {
    throw new Error(`Invalid inference lineage: ${claim.id}`);
  }
}

/** No matching claim means unknown; overlapping claims remain contested, never averaged. */
export function resolveEvidence(
  claims: readonly EvidenceClaim[], metricId: string,
  supportSystem: EvidenceSupportSystem, supportId: string, year: number,
): { status: 'unknown' | 'single' | 'multiple'; claims: EvidenceClaim[] } {
  if (!Number.isInteger(year)) throw new Error('Evidence year must be an astronomical integer');
  const matches = claims.filter((claim) => {
    validateEvidenceClaim(claim);
    return claim.metric_id === metricId && claim.scope.support_system === supportSystem
      && claim.scope.support_id === supportId && claim.scope.start_year <= year
      && year < claim.scope.end_year_exclusive;
  });
  return { status: matches.length === 0 ? 'unknown' : matches.length === 1 ? 'single' : 'multiple', claims: matches };
}
