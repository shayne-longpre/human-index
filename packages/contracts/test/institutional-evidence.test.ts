import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateAtlasReleaseManifest, validateInstitutionalEvidenceDataset,
  type AtlasReleaseManifest, type InstitutionalEvidenceDataset } from '../src';

const root = resolve('apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r12');
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8')) as AtlasReleaseManifest;

describe('r12 V-Dem institutional evidence', () => {
  it('pins four source-native variables with exact-year, missingness, and checksum contracts', () => {
    validateAtlasReleaseManifest(manifest);
    const tables = manifest.institutional_evidence!.datasets;
    expect(tables.map((item) => item.source_variable)).toEqual([
      'v2x_suffr', 'v2lgbicam', 'v2clrelig_ord', 'v2csrlgrep_ord',
    ]);
    expect(tables.reduce((sum, item) => sum + item.known_value_count, 0)).toBe(111_556);
    for (const reference of tables) {
      expect(reference.source_row_count).toBe(28_092);
      for (const file of [reference.data_file, reference.download_file]) {
        const bytes = readFileSync(resolve(root, file));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.artifacts[file].sha256);
      }
      const dataset = JSON.parse(readFileSync(resolve(root, reference.data_file), 'utf8')) as InstitutionalEvidenceDataset;
      validateInstitutionalEvidenceDataset(dataset, reference);
      expect(dataset.source_supports).toHaveLength(202);
      expect(dataset.source_rows).toHaveLength(28_092);
      expect(dataset.available_years[0]).toBe(1789);
      expect(dataset.available_years.at(-1)).toBe(2025);
    }
  });

  it('does not conflate a coded zero with missing or political borders', () => {
    const reference = manifest.institutional_evidence!.datasets[0];
    const dataset = JSON.parse(readFileSync(resolve(root, reference.data_file), 'utf8')) as InstitutionalEvidenceDataset;
    expect(dataset.observations.some((item) => item[2] === 0)).toBe(true);
    expect(dataset.source_rows.length).toBeGreaterThan(dataset.observations.length);
    expect(dataset.support_type).toContain('no automatic historical border');
    expect(manifest.institutional_evidence!.interpretation).toContain('Not religious composition');
  });

  it('rejects a value whose row locator disagrees with the pinned source row', () => {
    const reference = manifest.institutional_evidence!.datasets[0];
    const dataset = JSON.parse(readFileSync(resolve(root, reference.data_file), 'utf8')) as InstitutionalEvidenceDataset;
    const first = dataset.observations[0];
    dataset.observations[0] = [first[0], first[1], first[2], first[3] + 1];
    expect(() => validateInstitutionalEvidenceDataset(dataset, reference)).toThrow('Invalid institutional observation');
  });
});
