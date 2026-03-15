import maplibregl from 'maplibre-gl';
import { Protocol, PMTiles } from 'pmtiles';
import type { LoadedArchive } from '../types';

let protocol: Protocol | null = null;

export function setupPmtilesProtocol(archives: LoadedArchive[]): void {
  if (protocol) return;

  protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);

  for (const archive of archives) {
    protocol.add(new PMTiles(archive.pmtilesUrl));
  }
}
