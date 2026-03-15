import { useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import type { BasemapKey, DatasetKey, DatasetState } from '../types';
import { datasetConfigs } from '../lib/datasets';
import { setupPmtilesProtocol } from '../lib/pmtiles';
import { buildFillColorExpression, buildCategoryFilter, layerIds, lineWidth } from '../lib/map-style';

interface UseMapLayersParams {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapReady: boolean;
  datasets: Record<DatasetKey, DatasetState>;
  availableDatasets: DatasetKey[];
  activeDataset: DatasetKey;
  activeBasemap: BasemapKey;
  overlayOpacity: number;
  activeCategories: Record<DatasetKey, Set<string>>;
}

interface LayerRegistry {
  fillIds: string[];
  lineIds: string[];
}

export function useMapLayers({
  mapRef,
  mapReady,
  datasets,
  availableDatasets,
  activeDataset,
  activeBasemap,
  overlayOpacity,
  activeCategories,
}: UseMapLayersParams) {
  const registryRef = useRef<Record<DatasetKey, LayerRegistry>>({
    osm: { fillIds: [], lineIds: [] },
    base: { fillIds: [], lineIds: [] },
    compare: { fillIds: [], lineIds: [] },
  });
  const layersAddedRef = useRef(false);

  // Add all sources and layers once on map load
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || layersAddedRef.current) return;
    layersAddedRef.current = true;

    // Register PMTiles protocol with all archives
    const allArchives = availableDatasets.flatMap((dk) => datasets[dk].archives);
    setupPmtilesProtocol(allArchives);

    const registry = registryRef.current;

    for (const datasetKey of availableDatasets) {
      const config = datasetConfigs[datasetKey];
      const fillColor = buildFillColorExpression(config);
      const filter = buildCategoryFilter(activeCategories[datasetKey]);
      const visible = datasetKey === activeDataset;

      for (const archive of datasets[datasetKey].archives) {
        const ids = layerIds(datasetKey, archive.key);

        map.addSource(ids.source, {
          type: 'vector',
          url: `pmtiles://${window.location.origin}${archive.pmtilesUrl}`,
          attribution: 'Data © Regione Veneto; confronto con © OpenStreetMap contributors',
        });

        map.addLayer({
          id: ids.fill,
          type: 'fill',
          source: ids.source,
          'source-layer': config.layerName,
          filter,
          layout: { visibility: visible ? 'visible' : 'none' },
          paint: {
            'fill-color': fillColor,
            'fill-opacity': overlayOpacity,
            'fill-outline-color': 'rgba(44, 50, 42, 0.2)',
          },
        });

        map.addLayer({
          id: ids.line,
          type: 'line',
          source: ids.source,
          'source-layer': config.layerName,
          filter,
          layout: { visibility: visible ? 'visible' : 'none' },
          paint: {
            'line-color': 'rgba(32, 35, 30, 0.22)',
            'line-opacity': Math.min(overlayOpacity + 0.14, 1),
            'line-width': lineWidth,
          },
        });

        registry[datasetKey].fillIds.push(ids.fill);
        registry[datasetKey].lineIds.push(ids.line);
      }
    }

    // Hover highlight source + layer
    map.addSource('overlay-hover', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    map.addLayer({
      id: 'overlay-hover-line',
      type: 'line',
      source: 'overlay-hover',
      paint: {
        'line-color': '#13221c',
        'line-opacity': overlayOpacity > 0 ? 1 : 0,
        'line-width': 2.2,
      },
    });

    // Fit to active dataset bounds
    const bounds = datasets[activeDataset].bounds;
    if (bounds) {
      map.fitBounds(bounds, { padding: 48, duration: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  // Update dataset visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;
    const registry = registryRef.current;

    for (const dk of availableDatasets) {
      const vis = dk === activeDataset ? 'visible' : 'none';
      for (const id of [...registry[dk].fillIds, ...registry[dk].lineIds]) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
      }
    }
  }, [mapRef, activeDataset, availableDatasets]);

  // Update basemap visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    for (const key of ['osm', 'satellite'] as const) {
      if (map.getLayer(key)) {
        map.setLayoutProperty(key, 'visibility', key === activeBasemap ? 'visible' : 'none');
      }
    }
  }, [mapRef, mapReady, activeBasemap]);

  // Update overlay opacity
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;
    const registry = registryRef.current;

    for (const dk of availableDatasets) {
      for (const id of registry[dk].fillIds) {
        if (map.getLayer(id)) map.setPaintProperty(id, 'fill-opacity', overlayOpacity);
      }
      for (const id of registry[dk].lineIds) {
        if (map.getLayer(id)) map.setPaintProperty(id, 'line-opacity', Math.min(overlayOpacity + 0.14, 1));
      }
    }
    if (map.getLayer('overlay-hover-line')) {
      map.setPaintProperty('overlay-hover-line', 'line-opacity', overlayOpacity > 0 ? 1 : 0);
    }
  }, [mapRef, overlayOpacity, availableDatasets]);

  // Update category filters
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersAddedRef.current) return;
    const registry = registryRef.current;

    for (const dk of availableDatasets) {
      const filter = buildCategoryFilter(activeCategories[dk]);
      for (const id of [...registry[dk].fillIds, ...registry[dk].lineIds]) {
        if (map.getLayer(id)) map.setFilter(id, filter);
      }
    }
  }, [mapRef, activeCategories, availableDatasets]);

  return { registryRef };
}
