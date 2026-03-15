export type DatasetKey = 'osm' | 'base' | 'compare';
export type BasemapKey = 'osm' | 'satellite';

export interface CategoryDef {
  key: string;
  label: string;
  color: string;
}

export interface HoverFieldDef {
  key: string;
  label?: string;
}

export interface DatasetConfig {
  key: DatasetKey;
  layerName: string;
  label: string;
  legendNote: string;
  emptyInspectMessage: string;
  categories: CategoryDef[];
  hoverFields: HoverFieldDef[];
}

export interface ProvinceConfig {
  code: string;
  label: string;
  key: string;
}

export interface ArchiveMetadata {
  categories: { key: string; count: number }[];
  bounds: [number, number, number, number] | null;
  source_info?: SourceInfo;
}

export interface SourceInfo {
  built_at?: string;
  region_dataset_year?: string;
  region_metadata_publication_date?: string;
  region_imported_at?: string;
  region_latest_osm_mtime?: string;
  osm_imported_at?: string;
  osm_source_pbf_path?: string;
  osm_source_pbf_mtime?: string;
}

export interface LoadedArchive extends ProvinceConfig {
  metadata: ArchiveMetadata;
  pmtilesUrl: string;
}

export interface DatasetState {
  archives: LoadedArchive[];
  counts: Map<string, number>;
  bounds: [number, number, number, number] | null;
  sourceInfo: SourceInfo;
}
