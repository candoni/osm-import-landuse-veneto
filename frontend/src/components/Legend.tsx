import type { DatasetKey } from '../types';
import { datasetConfigs } from '../lib/datasets';
import LegendItem from './LegendItem';

interface Props {
  activeDataset: DatasetKey;
  counts: Map<string, number>;
  activeCategories: Set<string>;
  onToggleCategory: (key: string) => void;
}

export default function Legend({ activeDataset, counts, activeCategories, onToggleCategory }: Props) {
  const config = datasetConfigs[activeDataset];
  const visibleCategories = config.categories.filter((c) => counts.has(c.key));

  return (
    <div className="flex h-full flex-col min-h-0">
      <ul className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable] grid gap-2 list-none p-0">
        {visibleCategories.map((cat) => (
          <LegendItem
            key={cat.key}
            categoryKey={cat.key}
            label={cat.label}
            color={cat.color}
            count={counts.get(cat.key) ?? 0}
            active={activeCategories.has(cat.key)}
            onToggle={onToggleCategory}
          />
        ))}
      </ul>
    </div>
  );
}
