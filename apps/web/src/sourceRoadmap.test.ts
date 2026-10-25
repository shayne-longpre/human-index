import { describe, expect, it } from 'vitest';
import { indicatorProgress, sourceInRelease, type RoadmapSourceLink } from './sourceRoadmap';

const links: RoadmapSourceLink[] = [
  { source_id: 'published', role: 'test fixture', release_ids: ['one'] },
  { source_id: 'multiple', role: 'test fixture', release_ids: ['one', 'two'] },
  { source_id: 'planned', role: 'test fixture', release_ids: [] },
];

describe('indicator source-set roadmap', () => {
  it('requires every declared release ID for a source and does not treat an empty set as published', () => {
    expect(sourceInRelease(links[0], new Set(['one']))).toBe(true);
    expect(sourceInRelease(links[1], new Set(['one']))).toBe(false);
    expect(sourceInRelease(links[2], new Set(['one', 'two']))).toBe(false);
  });

  it('marks an indicator ready only when every mapped source is in release', () => {
    const indicator = { id: 'fixture', label: 'Fixture', scope: 'Synthetic test only', source_ids: ['published', 'multiple'] };
    expect(indicatorProgress(indicator, links, new Set(['one']))).toEqual({ inRelease: 1, required: 2, ready: false });
    expect(indicatorProgress(indicator, links, new Set(['one', 'two']))).toEqual({ inRelease: 2, required: 2, ready: true });
  });

  it('rejects missing source mappings and never treats an empty indicator as complete', () => {
    expect(indicatorProgress({ id: 'empty', label: 'Empty', scope: '', source_ids: [] }, links, new Set(['one'])).ready).toBe(false);
    expect(() => indicatorProgress({ id: 'bad', label: 'Bad', scope: '', source_ids: ['missing'] }, links, new Set())).toThrow('outside its vertical');
  });
});
