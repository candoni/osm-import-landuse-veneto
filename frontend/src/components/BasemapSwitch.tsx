import type { BasemapKey } from '../types';

const options: { key: BasemapKey; label: string }[] = [
  { key: 'osm', label: 'OSM' },
  { key: 'satellite', label: 'Satellitare' },
];

interface Props {
  active: BasemapKey;
  onChange: (key: BasemapKey) => void;
}

export default function BasemapSwitch({ active, onChange }: Props) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-xs tracking-[0.02em] font-medium text-gray-500">Sfondo</h3>
      </div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Selettore sfondo">
        {options.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === active}
            onClick={() => onChange(key)}
            className={`px-3 py-2 rounded-xl border text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-900/50 focus-visible:outline-offset-2
              ${key === active
                ? 'bg-emerald-900/10 border-emerald-900/25 font-bold'
                : 'bg-white/40 border-black/10 hover:bg-emerald-900/5 hover:border-emerald-900/15'}
            `}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
