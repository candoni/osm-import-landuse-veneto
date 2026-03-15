import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { DatasetKey, DatasetState, BasemapKey } from './types';
import { combineSourceInfo, loadAllDatasets } from './lib/metadata';
import MapView from './components/MapView';
import Panel, { PanelBlock } from './components/Panel';
import DatasetSwitch from './components/DatasetSwitch';
import BasemapSwitch from './components/BasemapSwitch';
import OpacitySlider from './components/OpacitySlider';
import Legend from './components/Legend';
import InspectPanel from './components/InspectPanel';
import SourceStatus from './components/SourceStatus';

type DatasetsRecord = Record<DatasetKey, DatasetState>;

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  className = '',
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-0 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="mb-3 flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm uppercase tracking-wide font-semibold">{title}</h2>
        <span className="text-base leading-none text-gray-500">{open ? '−' : '+'}</span>
      </button>
      {open ? children : null}
    </div>
  );
}

function App() {
  const [datasets, setDatasets] = useState<DatasetsRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<DatasetKey>('base');
  const [activeBasemap, setActiveBasemap] = useState<BasemapKey>('osm');
  const [overlayOpacity, setOverlayOpacity] = useState(0.66);
  const [activeCategories, setActiveCategories] = useState<Record<DatasetKey, Set<string>>>({
    osm: new Set(),
    base: new Set(),
    compare: new Set(),
  });
  const [selectedFeature, setSelectedFeature] = useState<Record<string, unknown> | null>(null);
  const [openSections, setOpenSections] = useState({
    controls: true,
    legend: true,
    info: true,
  });

  useEffect(() => {
    loadAllDatasets()
      .then((result) => {
        setDatasets(result);
        setActiveCategories({
          osm: new Set(result.osm.counts.keys()),
          base: new Set(result.base.counts.keys()),
          compare: new Set(result.compare.counts.keys()),
        });
        const available = (Object.keys(result) as DatasetKey[]).filter(
          (k) => result[k].archives.length > 0,
        );
        if (available.length > 0 && result.base.archives.length === 0) {
          setActiveDataset(available[0]);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleToggleCategory = useCallback(
    (categoryKey: string) => {
      setActiveCategories((prev) => {
        const current = prev[activeDataset];
        const next = new Set(current);
        if (next.has(categoryKey)) {
          next.delete(categoryKey);
        } else {
          next.add(categoryKey);
        }
        return { ...prev, [activeDataset]: next };
      });
      setSelectedFeature(null);
    },
    [activeDataset],
  );

  const handleDatasetChange = useCallback((key: DatasetKey) => {
    setActiveDataset(key);
    setSelectedFeature(null);
  }, []);

  const handleFeatureClick = useCallback((props: Record<string, unknown> | null) => {
    setSelectedFeature(props);
  }, []);

  const toggleSection = useCallback((key: 'controls' | 'legend' | 'info') => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }
  if (!datasets) {
    return <div className="p-8 text-gray-500">Loading metadata...</div>;
  }

  const availableDatasets = (Object.keys(datasets) as DatasetKey[]).filter(
    (k) => datasets[k].archives.length > 0,
  );
  const footerSourceInfo = combineSourceInfo(
    (Object.keys(datasets) as DatasetKey[]).flatMap((key) => datasets[key].archives),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(20rem,25rem)_1fr] min-h-screen gap-4 p-3 sm:p-4">
      <Panel>
        <PanelBlock>
          <h1 className="text-[2.1rem] font-bold leading-[0.95] tracking-tight">
            Veneto Copertura del Suolo 2023
          </h1>
          <div className="mt-3 text-sm leading-snug text-gray-600">
            <div className="font-medium text-emerald-900">Download e progetto:</div>
            <a
              href="https://github.com/candoni/osm-import-landuse-veneto"
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block break-all underline underline-offset-3 hover:text-emerald-700"
            >
              https://github.com/candoni/osm-import-landuse-veneto
            </a>
          </div>
        </PanelBlock>

        <PanelBlock>
          <CollapsibleSection
            title="Opzioni"
            open={openSections.controls}
            onToggle={() => toggleSection('controls')}
          >
            <div className="grid gap-6">
              <BasemapSwitch active={activeBasemap} onChange={setActiveBasemap} />
              <DatasetSwitch
                active={activeDataset}
                available={availableDatasets}
                onChange={handleDatasetChange}
              />
              <OpacitySlider value={overlayOpacity} onChange={setOverlayOpacity} />
            </div>
          </CollapsibleSection>
        </PanelBlock>

        <PanelBlock className="flex-[1.35] shrink min-h-0 overflow-hidden">
          <CollapsibleSection
            title="Legenda"
            open={openSections.legend}
            onToggle={() => toggleSection('legend')}
            className="flex h-full flex-col"
          >
            <Legend
              activeDataset={activeDataset}
              counts={datasets[activeDataset].counts}
              activeCategories={activeCategories[activeDataset]}
              onToggleCategory={handleToggleCategory}
            />
          </CollapsibleSection>
        </PanelBlock>

        <PanelBlock className="shrink-0">
          <CollapsibleSection
            title="Info"
            open={openSections.info}
            onToggle={() => toggleSection('info')}
          >
            <InspectPanel activeDataset={activeDataset} properties={selectedFeature} />
          </CollapsibleSection>
        </PanelBlock>

        <PanelBlock className="shrink-0">
          <SourceStatus sourceInfo={footerSourceInfo} />
        </PanelBlock>
      </Panel>

      <main className="order-1 lg:order-0 relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl min-h-[60vh] lg:min-h-[calc(100vh-2rem)]">
        <MapView
          datasets={datasets}
          availableDatasets={availableDatasets}
          activeDataset={activeDataset}
          activeBasemap={activeBasemap}
          overlayOpacity={overlayOpacity}
          activeCategories={activeCategories}
          onFeatureClick={handleFeatureClick}
        />
      </main>
    </div>
  );
}

export default App;
