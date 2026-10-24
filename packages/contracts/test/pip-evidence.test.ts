import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateAtlasReleaseManifest, validateEconomicEvidenceDataset,
  type AtlasReleaseManifest, type EconomicEvidenceDataset } from '../src';

const root = resolve('apps/web/public/atlas/releases/atlas-mvp-2026-10-24-r10');
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8')) as AtlasReleaseManifest;
const lock = JSON.parse(readFileSync(resolve('data/registry/pip-source-lock.json'), 'utf8')) as { sha256: string };

describe('r10 PIP survey evidence', () => {
  it('pins five genuine survey tables and their artifact hashes', () => {
    validateAtlasReleaseManifest(manifest);
    const tables = manifest.economic_evidence!.datasets.filter((item) => item.source_release_id.startsWith('world-bank-pip'));
    expect(tables).toHaveLength(5);
    for (const reference of tables) {
      expect(reference.source_artifact_sha256).toBe(lock.sha256);
      expect(reference.source_row_count).toBe(2588);
      expect(reference.known_value_count).toBe(2479);
      for (const file of [reference.data_file, reference.download_file]) {
        const bytes = readFileSync(resolve(root, file));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.artifacts[file].sha256);
      }
      const dataset = JSON.parse(readFileSync(resolve(root, reference.data_file), 'utf8')) as EconomicEvidenceDataset;
      validateEconomicEvidenceDataset(dataset, reference);
      expect(dataset.observation_grain).toBe('survey_record');
      expect(dataset.known_by_year['2025']).toBe(4);
    }
  });

  it('retains duplicate country-years and welfare distinctions', () => {
    const reference = manifest.economic_evidence!.datasets.find((item) => item.id === 'pip-gini-2021-ppp')!;
    const dataset = JSON.parse(readFileSync(resolve(root, reference.data_file), 'utf8')) as EconomicEvidenceDataset;
    const pairs = dataset.source_supports.map((support) => `${support.country_code}:${support.reporting_year}`);
    expect(pairs.length - new Set(pairs).size).toBe(88);
    expect(new Set(dataset.source_supports.map((support) => support.welfare_type))).toEqual(new Set(['income', 'consumption']));
    expect(dataset.observations.every((item) => item[2] >= 0 && item[2] <= 1)).toBe(true);
  });
});
