import { useRef, useMemo } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { DatasetKey, DatasetState, BasemapKey } from '../types';
import { useMap } from '../hooks/useMap';
import { useMapLayers } from '../hooks/useMapLayers';
import { useMapInteraction } from '../hooks/useMapInteraction';
import { layerIds } from '../lib/map-style';

interface MapViewProps {
  datasets: Record<DatasetKey, DatasetState>;
  availableDatasets: DatasetKey[];
  activeDataset: DatasetKey;
  activeBasemap: BasemapKey;
  overlayOpacity: number;
  activeCategories: Record<DatasetKey, Set<string>>;
  onFeatureClick: (properties: Record<string, unknown> | null) => void;
}

export default function MapView({
  datasets,
  availableDatasets,
  activeDataset,
  activeBasemap,
  overlayOpacity,
  activeCategories,
  onFeatureClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mapRef, mapReady } = useMap(containerRef);

  useMapLayers({
    mapRef,
    mapReady,
    datasets,
    availableDatasets,
    activeDataset,
    activeBasemap,
    overlayOpacity,
    activeCategories,
  });

  const activeFillLayerIds = useMemo(
    () => datasets[activeDataset].archives.map((a) => layerIds(activeDataset, a.key).fill),
    [datasets, activeDataset],
  );

  useMapInteraction({
    mapRef,
    mapReady,
    activeDataset,
    activeFillLayerIds,
    onFeatureClick,
  });

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
