export interface RoadmapSourceLink {
  source_id: string;
  role: string;
  release_ids: string[];
}

export interface RoadmapIndicator {
  id: string;
  label: string;
  scope: string;
  source_ids: string[];
}

export function sourceInRelease(link: RoadmapSourceLink, publishedReleaseIds: ReadonlySet<string>): boolean {
  return link.release_ids.length > 0 && link.release_ids.every((id) => publishedReleaseIds.has(id));
}

export function indicatorProgress(
  indicator: RoadmapIndicator,
  links: readonly RoadmapSourceLink[],
  publishedReleaseIds: ReadonlySet<string>,
): { inRelease: number; required: number; ready: boolean } {
  const byId = new Map(links.map((link) => [link.source_id, link]));
  const required = indicator.source_ids.length;
  let inRelease = 0;
  for (const id of indicator.source_ids) {
    const link = byId.get(id);
    if (!link) throw new Error(`Indicator ${indicator.id} references source ${id} outside its vertical`);
    if (sourceInRelease(link, publishedReleaseIds)) inRelease += 1;
  }
  return { inRelease, required, ready: required > 0 && inRelease === required };
}
