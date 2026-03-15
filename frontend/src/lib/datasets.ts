import type { DatasetConfig, DatasetKey, ProvinceConfig } from '../types';

export const provinceConfigs: ProvinceConfig[] = [
  { code: 'BL', label: 'Belluno', key: 'bl' },
  { code: 'PD', label: 'Padova', key: 'pd' },
  { code: 'RO', label: 'Rovigo', key: 'ro' },
  { code: 'TV', label: 'Treviso', key: 'tv' },
  { code: 'VE', label: 'Venezia', key: 've' },
  { code: 'VI', label: 'Vicenza', key: 'vi' },
  { code: 'VR', label: 'Verona', key: 'vr' },
];

const sharedCategories = [
  { key: 'residential', label: 'Residenziale', color: '#d97c57' },
  { key: 'industrial', label: 'Industriale', color: '#8f684d' },
  { key: 'farmland', label: 'Agricolo', color: '#d1b24d' },
  { key: 'forest', label: 'Bosco', color: '#4f7f39' },
  { key: 'vineyard', label: 'Vigneto', color: '#854f85' },
  { key: 'orchard', label: 'Frutteto', color: '#7aa64b' },
  { key: 'grass', label: 'Erboso', color: '#8cc56d' },
  { key: 'meadow', label: 'Prato', color: '#a7d17d' },
  { key: 'water', label: 'Acqua', color: '#4f98c5' },
  { key: 'park', label: 'Parco', color: '#3d8a60' },
  { key: 'sports_centre', label: 'Centro sportivo', color: '#2f7f77' },
  { key: 'cemetery', label: 'Cimitero', color: '#6d8f6c' },
  { key: 'education', label: 'Istruzione', color: '#d08e2f' },
  { key: 'construction', label: 'Cantiere', color: '#c26c50' },
  { key: 'religious', label: 'Religioso', color: '#8a5d75' },
  { key: 'retail', label: 'Commerciale', color: '#c35771' },
  { key: 'railway', label: 'Ferrovia', color: '#6c6473' },
  { key: 'quarry', label: 'Cava', color: '#9b886d' },
  { key: 'landfill', label: 'Discarica', color: '#7d7866' },
  { key: 'other', label: 'Altro', color: '#8791a0' },
];

export const datasetConfigs: Record<DatasetKey, DatasetConfig> = {
  osm: {
    key: 'osm',
    layerName: 'osm',
    label: 'OSM',
    legendNote: 'poligoni OSM estratti dal PBF',
    emptyInspectMessage: 'Clicca un poligono OSM per vedere i dettagli.',
    categories: [
      ...sharedCategories.slice(0, 8),
      sharedCategories[8], // water
      { key: 'wetland', label: 'Zona umida', color: '#5d8ab8' },
      sharedCategories[9], // park
      sharedCategories[10], // sports_centre
      sharedCategories[11], // cemetery
      sharedCategories[12], // education
      { key: 'healthcare', label: "Sanita'", color: '#b85f6a' },
      { key: 'power', label: 'Energia', color: '#6d5fb8' },
      { key: 'aeroway', label: 'Aeronautico', color: '#737a86' },
      sharedCategories[13], // construction
      sharedCategories[14], // religious
      sharedCategories[15], // retail
      sharedCategories[16], // railway
      sharedCategories[17], // quarry
      sharedCategories[18], // landfill
      sharedCategories[19], // other
    ],
    hoverFields: [
      { key: 'primary_kind' },
      { key: 'landuse' },
      { key: 'natural' },
      { key: 'leisure' },
      { key: 'amenity' },
      { key: 'aeroway' },
      { key: 'healthcare' },
      { key: 'industrial' },
      { key: 'power' },
      { key: 'water' },
      { key: 'waterway' },
      { key: 'wetland' },
    ],
  },
  base: {
    key: 'base',
    layerName: 'copsuolo',
    label: 'Regione',
    legendNote: 'tag OSM normalizzati',
    emptyInspectMessage: 'Clicca un poligono per vedere i dettagli.',
    categories: sharedCategories,
    hoverFields: [
      { key: 'primary_kind' },
      { key: 'crop' },
      { key: 'irrigated' },
      { key: 'meadow' },
      { key: 'water' },
      { key: 'waterway' },
      { key: 'plant_source' },
      { key: 'description', label: 'Descrizione' },
      { key: 'note', label: 'Nota' },
    ],
  },
  compare: {
    key: 'compare',
    layerName: 'compare',
    label: 'Diff',
    legendNote: 'verde=giallo=rosso=blu confronto topologico',
    emptyInspectMessage: 'Clicca un poligono per vedere lo stato del confronto.',
    categories: [
      { key: 'match', label: 'Corrispondenza', color: '#2f9e44' },
      { key: 'mismatch', label: 'Tag diversi', color: '#d6a400' },
      { key: 'missing_in_osm', label: 'Manca in OSM', color: '#d94841' },
    ],
    hoverFields: [
      { key: 'missing_ratio_src', label: 'Parte mancante in OSM' },
      { key: 'src_landuse' },
      { key: 'src_natural' },
      { key: 'src_leisure' },
      { key: 'src_amenity' },
      { key: 'src_aeroway' },
      { key: 'src_power' },
      { key: 'src_water' },
      { key: 'src_waterway' },
      { key: 'src_wetland' },
      { key: 'osm_landuse' },
      { key: 'osm_natural' },
      { key: 'osm_leisure' },
      { key: 'osm_amenity' },
      { key: 'osm_aeroway' },
      { key: 'osm_power' },
      { key: 'osm_water' },
      { key: 'osm_waterway' },
      { key: 'osm_wetland' },
    ],
  },
};

export function getDataUrls(datasetKey: DatasetKey, provinceKey: string) {
  const base = import.meta.env.BASE_URL;
  const prefix = `${base}data/copsuolo_2023_14275`;
  return {
    pmtiles: `${prefix}_${datasetKey === 'base' ? 'region' : datasetKey}_${provinceKey}.pmtiles`,
    metadata: `${prefix}_${datasetKey === 'base' ? 'region' : datasetKey}_${provinceKey}.metadata.json`,
  };
}
