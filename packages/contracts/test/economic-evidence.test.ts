import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateAtlasReleaseManifest, validateEconomicEvidenceDataset, type AtlasReleaseManifest, type EconomicEvidenceDataset } from '../src';

const root = resolve('apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r9');
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8')) as AtlasReleaseManifest;
const sourceLock = JSON.parse(readFileSync(resolve('data/registry/economic-source-lock.json'), 'utf8')) as {
  artifacts: Array<{ id: string; sha256: string }>;
};

describe('r9 economic evidence publication', () => {
  it('pins fourteen independent source-native datasets with checksummed outputs', () => {
    validateAtlasReleaseManifest(manifest);
    const references = manifest.economic_evidence?.datasets ?? [];
    expect(references).toHaveLength(14);
    expect(new Set(references.map((item) => item.id)).size).toBe(14);
    expect(references.reduce((total, item) => total + item.known_value_count, 0)).toBe(119_987);
    const inputHashes = new Map(sourceLock.artifacts.map((item) => [item.id, item.sha256]));
    for (const reference of references) {
      expect(reference.source_artifact_sha256).toBe(inputHashes.get(reference.source_artifact_id));
      const data = readFileSync(resolve(root, reference.data_file));
      const csv = readFileSync(resolve(root, reference.download_file));
      expect(createHash('sha256').update(data).digest('hex')).toBe(manifest.artifacts[reference.data_file].sha256);
      expect(createHash('sha256').update(csv).digest('hex')).toBe(manifest.artifacts[reference.download_file].sha256);
      validateEconomicEvidenceDataset(JSON.parse(data.toString('utf8')) as EconomicEvidenceDataset, reference);
    }
  });

  it('keeps Maddison and WDI separated and never treats sparse years as complete', () => {
    const maddison = manifest.economic_evidence!.datasets.find((item) => item.id.startsWith('maddison-'))!;
    const gini = manifest.economic_evidence!.datasets.find((item) => item.indicator === 'SI.POV.GINI')!;
    expect(maddison.source_release_id).not.toBe(gini.source_release_id);
    expect(maddison.available_years[0]).toBe(1);
    expect(maddison.available_years.at(-1)).toBe(2022);
    expect(gini.known_value_count).toBeLessThan(gini.source_row_count);
    const giniData = JSON.parse(readFileSync(resolve(root, gini.data_file), 'utf8')) as EconomicEvidenceDataset;
    expect(giniData.known_by_year['2025']).toBe(4);
    const data = JSON.parse(readFileSync(resolve(root, maddison.data_file), 'utf8')) as EconomicEvidenceDataset;
    expect(data.known_by_year['1']).toBe(14);
    expect(data.known_by_year['1820']).toBe(55);
    expect(data.source_references.length).toBeGreaterThan(100);
  });
});
