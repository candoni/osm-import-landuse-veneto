import type { DatasetConfig, DatasetKey } from '../types';
import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';

export const basemapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
    satellite: {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [
    { id: 'osm', type: 'raster', source: 'osm' },
    { id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: 'none' } },
  ],
};

export function buildFillColorExpression(config: DatasetConfig): ExpressionSpecification {
  const expr: unknown[] = ['match', ['get', 'class_key']];
  for (const cat of config.categories) {
    expr.push(cat.key, cat.color);
  }
  expr.push('#8791a0');
  return expr as ExpressionSpecification;
}

export function buildCategoryFilter(activeKeys: Set<string>): ExpressionSpecification {
  if (activeKeys.size === 0) {
    return ['==', ['get', 'class_key'], ''] as ExpressionSpecification;
  }
  return ['in', ['get', 'class_key'], ['literal', Array.from(activeKeys)]] as ExpressionSpecification;
}

export function layerIds(datasetKey: DatasetKey, provinceKey: string) {
  const source = `${datasetKey}-${provinceKey}`;
  return { source, fill: `${source}-fill`, line: `${source}-line` };
}

export const lineWidth: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  7, 0.25,
  12, 0.8,
  15, 1.2,
];
