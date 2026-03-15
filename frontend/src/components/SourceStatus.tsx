import { useEffect, useState } from 'react';
import type { SourceInfo } from '../types';
import { formatDateTime } from '../lib/format';

const FALLBACK_REGION_DATASET_YEAR = '2023';
const FALLBACK_REGION_PUBLICATION_DATE = '2025-07-03';
const REGION_VIEWER_URL =
  'https://idt2.regione.veneto.it/idt/webgis/viewer?previewLayerId=14275';
const OSM_BASE_URL = 'https://www.openstreetmap.org';
const REGION_LICENSE_URL = 'https://www.dati.gov.it/iodl/2.0';
const OSM_LICENSE_URL = 'https://www.openstreetmap.org/copyright';

interface Props {
  sourceInfo: SourceInfo;
}

function Row({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div className="text-xs leading-relaxed text-gray-500">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-gray-600 underline underline-offset-3 hover:text-emerald-700"
      >
        {label}
      </a>
      {': '}
      <span>{value}</span>
    </div>
  );
}

export default function SourceStatus({ sourceInfo }: Props) {
  const [currentHash, setCurrentHash] = useState(() => window.location.hash);

  useEffect(() => {
    function handleHashChange() {
      setCurrentHash(window.location.hash);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const regionalYear = sourceInfo.region_dataset_year ?? FALLBACK_REGION_DATASET_YEAR;
  const publicationDate = formatDateTime(
    sourceInfo.region_metadata_publication_date ?? FALLBACK_REGION_PUBLICATION_DATE,
  );
  const osmUrl = `${OSM_BASE_URL}/${currentHash}`;

  return (
    <div className="grid gap-1.5">
      <Row
        label="Dati regionali"
        value={`${regionalYear}, pubblicato il ${publicationDate}, licenza IODL 2.0`}
        href={REGION_VIEWER_URL}
      />
      <Row
        label="Dati OSM"
        value={`${formatDateTime(sourceInfo.osm_source_pbf_mtime)}, licenza ODbL 1.0`}
        href={osmUrl}
      />
      <Row label="Licenza Regione Veneto" value="IODL 2.0" href={REGION_LICENSE_URL} />
      <Row label="Licenza OpenStreetMap" value="ODbL 1.0" href={OSM_LICENSE_URL} />
    </div>
  );
}
