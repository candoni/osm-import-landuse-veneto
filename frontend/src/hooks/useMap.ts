import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { basemapStyle } from '../lib/map-style';

export function useMap(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const initRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (initRef.current || !containerRef.current) return;
    initRef.current = true;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basemapStyle,
      center: [11.9, 45.55],
      zoom: 8,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      minZoom: 6,
      hash: true,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    );
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'top-right',
    );

    map.on('load', () => setMapReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      initRef.current = false;
      setMapReady(false);
    };
  }, [containerRef]);

  return { mapRef, mapReady };
}
