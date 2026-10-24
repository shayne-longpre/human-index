import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateAtlasReleaseManifest, validateEconomicEvidenceDataset,
  type AtlasReleaseManifest, type EconomicEvidenceDataset } from '../src';

const root = resolve('apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r11');
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8')) as AtlasReleaseManifest;
const lock = JSON.parse(readFileSync(resolve('data/registry/pwt-source-lock.json'), 'utf8')) as { sha256: string };

describe('r11 Penn World Table 11 evidence', () => {
  it('publishes seven separate source variables with exact workbook and output checksums', () => {
    validateAtlasReleaseManifest(manifest);
    const tables = manifest.economic_evidence!.datasets.filter((item) => item.source_release_id === 'penn-world-table-11.0');
    expect(tables).toHaveLength(7);
    expect(tables.reduce((sum, item) => sum + item.known_value_count, 0)).toBe(63_955);
    for (const reference of tables) {
      expect(reference.source_artifact_sha256).toBe(lock.sha256);
      expect(reference.source_row_count).toBe(13_690);
      for (const file of [reference.data_file, reference.download_file]) {
        const bytes = readFileSync(resolve(root, file));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.artifacts[file].sha256);
      }
      const dataset = JSON.parse(readFileSync(resolve(root, reference.data_file), 'utf8')) as EconomicEvidenceDataset;
      validateEconomicEvidenceDataset(dataset, reference);
      expect(dataset.source_sheet).toBe('Data');
      expect(dataset.source_column).toMatch(/^[A-Z]+$/);
      expect(dataset.source_supports).toHaveLength(185);
    }
  });

  it('does not claim uncomputed labor productivity or pre-1950 coverage', () => {
    const tables = manifest.economic_evidence!.datasets.filter((item) => item.source_release_id === 'penn-world-table-11.0');
    expect(tables.some((item) => item.indicator === 'labor_productivity')).toBe(false);
    expect(tables.every((item) => item.available_years[0] >= 1950)).toBe(true);
    expect(tables.find((item) => item.indicator === 'ctfp')!.available_years[0]).toBe(1954);
  });
});
