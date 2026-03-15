import type { DatasetKey } from '../types';
import { datasetConfigs } from '../lib/datasets';

interface Props {
  active: DatasetKey;
  available: DatasetKey[];
  onChange: (key: DatasetKey) => void;
}

export default function DatasetSwitch({ active, available, onChange }: Props) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-xs tracking-[0.02em] font-medium text-gray-500">Landuse</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-label="Selettore dataset">
        {available.map((key) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(key)}
              className={`px-3 py-2 rounded-xl border text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-900/50 focus-visible:outline-offset-2
                ${isActive
                  ? 'bg-emerald-900/10 border-emerald-900/25 font-bold'
                  : 'bg-white/40 border-black/10 hover:bg-emerald-900/5 hover:border-emerald-900/15'}
              `}
            >
              {datasetConfigs[key].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
