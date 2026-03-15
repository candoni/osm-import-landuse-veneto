import { useEffect, useCallback } from 'react';
import type maplibregl from 'maplibre-gl';
import type { DatasetKey } from '../types';

interface Params {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapReady: boolean;
  activeDataset: DatasetKey;
  activeFillLayerIds: string[];
  onFeatureClick: (properties: Record<string, unknown> | null) => void;
}

export function useMapInteraction({
  mapRef,
  mapReady,
  activeDataset,
  activeFillLayerIds,
  onFeatureClick,
}: Params) {
  const updateHover = useCallback(
    (feature: maplibregl.MapGeoJSONFeature | null) => {
      const map = mapRef.current;
      if (!map) return;
      const source = map.getSource('overlay-hover') as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData(
        feature
          ? { type: 'Feature', geometry: feature.geometry, properties: {} }
          : { type: 'FeatureCollection', features: [] },
      );
    },
    [mapRef],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || activeFillLayerIds.length === 0) return;

    function onMouseMove(e: maplibregl.MapMouseEvent) {
      const features = map!.queryRenderedFeatures(e.point, { layers: activeFillLayerIds });
      map!.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
    }

    function onClick(e: maplibregl.MapMouseEvent) {
      const features = map!.queryRenderedFeatures(e.point, { layers: activeFillLayerIds });
      if (features.length === 0) {
        updateHover(null);
        onFeatureClick(null);
        map!.getCanvas().style.cursor = '';
        return;
      }
      const feature = features[0];
      updateHover(feature);
      onFeatureClick({ ...feature.properties });
      map!.getCanvas().style.cursor = 'pointer';
    }

    map.on('mousemove', onMouseMove);
    map.on('click', onClick);

    return () => {
      map.off('mousemove', onMouseMove);
      map.off('click', onClick);
    };
  }, [mapRef, mapReady, activeFillLayerIds, onFeatureClick, updateHover]);

  // Clear selection when dataset changes
  useEffect(() => {
    updateHover(null);
    onFeatureClick(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDataset]);
}
