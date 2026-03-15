import type { ArchiveMetadata, DatasetKey, DatasetState, LoadedArchive, SourceInfo } from '../types';
import { provinceConfigs, getDataUrls } from './datasets';

export async function loadArchivesForDataset(datasetKey: DatasetKey): Promise<LoadedArchive[]> {
  const results = await Promise.allSettled(
    provinceConfigs.map(async (province) => {
      const urls = getDataUrls(datasetKey, province.key);
      const response = await fetch(urls.metadata);
      if (!response.ok) {
        throw new Error(`${province.code}: metadata ${response.status}`);
      }
      const metadata: ArchiveMetadata = await response.json();
      return { ...province, metadata, pmtilesUrl: urls.pmtiles };
    }),
  );

  const loaded: LoadedArchive[] = [];
  const failures: string[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      loaded.push(result.value);
    } else {
      failures.push(result.reason?.message || 'Unknown archive error');
    }
  }
  if (failures.length) {
    console.warn(`Some ${datasetKey} archives failed to load:`, failures);
  }
  return loaded;
}

export function combineCategoryCounts(archives: LoadedArchive[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const archive of archives) {
    for (const item of archive.metadata.categories ?? []) {
      counts.set(item.key, (counts.get(item.key) ?? 0) + item.count);
    }
  }
  return counts;
}

export function combineBounds(archives: LoadedArchive[]): [number, number, number, number] | null {
  const allBounds = archives
    .map((a) => a.metadata.bounds)
    .filter((b): b is [number, number, number, number] => Array.isArray(b) && b.length === 4);
  if (allBounds.length === 0) return null;
  return [
    Math.min(...allBounds.map((b) => b[0])),
    Math.min(...allBounds.map((b) => b[1])),
    Math.max(...allBounds.map((b) => b[2])),
    Math.max(...allBounds.map((b) => b[3])),
  ];
}

function latestIso(values: Array<string | undefined>): string | undefined {
  const valid = values.filter((value): value is string => Boolean(value));
  if (valid.length === 0) return undefined;
  return valid.reduce((latest, current) => (
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest
  ));
}

export function combineSourceInfo(archives: LoadedArchive[]): SourceInfo {
  return {
    built_at: latestIso(archives.map((archive) => archive.metadata.source_info?.built_at)),
    region_imported_at: latestIso(archives.map((archive) => archive.metadata.source_info?.region_imported_at)),
    region_latest_osm_mtime: latestIso(archives.map((archive) => archive.metadata.source_info?.region_latest_osm_mtime)),
    osm_imported_at: latestIso(archives.map((archive) => archive.metadata.source_info?.osm_imported_at)),
    osm_source_pbf_mtime: latestIso(archives.map((archive) => archive.metadata.source_info?.osm_source_pbf_mtime)),
    region_dataset_year: archives.find((archive) => archive.metadata.source_info?.region_dataset_year)?.metadata.source_info?.region_dataset_year,
    region_metadata_publication_date: archives.find((archive) => archive.metadata.source_info?.region_metadata_publication_date)?.metadata.source_info?.region_metadata_publication_date,
    osm_source_pbf_path: archives.find((archive) => archive.metadata.source_info?.osm_source_pbf_path)?.metadata.source_info?.osm_source_pbf_path,
  };
}

export async function loadAllDatasets(): Promise<Record<DatasetKey, DatasetState>> {
  const [osmArchives, baseArchives, compareArchives] = await Promise.all([
    loadArchivesForDataset('osm'),
    loadArchivesForDataset('base'),
    loadArchivesForDataset('compare'),
  ]);

  return {
    osm: {
      archives: osmArchives,
      counts: combineCategoryCounts(osmArchives),
      bounds: combineBounds(osmArchives),
      sourceInfo: combineSourceInfo(osmArchives),
    },
    base: {
      archives: baseArchives,
      counts: combineCategoryCounts(baseArchives),
      bounds: combineBounds(baseArchives),
      sourceInfo: combineSourceInfo(baseArchives),
    },
    compare: {
      archives: compareArchives,
      counts: combineCategoryCounts(compareArchives),
      bounds: combineBounds(compareArchives),
      sourceInfo: combineSourceInfo(compareArchives),
    },
  };
}
