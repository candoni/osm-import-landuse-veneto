import { formatCount } from '../lib/format';

interface Props {
  categoryKey: string;
  label: string;
  color: string;
  count: number;
  active: boolean;
  onToggle: (key: string) => void;
}

export default function LegendItem({ categoryKey, label, color, count, active, onToggle }: Props) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        title={active ? 'Clicca per nascondere questa categoria' : 'Clicca per mostrare questa categoria'}
        onClick={() => onToggle(categoryKey)}
        className={`w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-900/50 focus-visible:outline-offset-2
          ${active
            ? 'bg-white/40 border-black/10 hover:bg-emerald-900/5 hover:border-emerald-900/15'
            : 'opacity-45 bg-white/20 border-black/10'}
        `}
      >
        <span
          className={`w-4 h-4 rounded-full border border-black/15 ${!active ? 'grayscale' : ''}`}
          style={{ background: color }}
        />
        <span>{label}</span>
        <span className="tabular-nums text-gray-500">{formatCount(count)}</span>
      </button>
    </li>
  );
}
