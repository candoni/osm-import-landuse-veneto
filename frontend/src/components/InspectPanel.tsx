import type { DatasetKey, HoverFieldDef } from '../types';
import { datasetConfigs } from '../lib/datasets';
import { formatHoverValue, formatValue } from '../lib/format';

const osmStyleKeys = new Set([
  'landuse', 'natural', 'leisure', 'amenity', 'aeroway', 'healthcare',
  'industrial', 'power', 'water', 'waterway', 'wetland',
  'crop', 'irrigated', 'meadow', 'plant_source',
]);
const compareSourceTagKeys = [
  'src_landuse', 'src_natural', 'src_leisure', 'src_amenity', 'src_aeroway',
  'src_power', 'src_water', 'src_waterway', 'src_wetland',
];
const compareOsmTagKeys = [
  'osm_landuse', 'osm_natural', 'osm_leisure', 'osm_amenity', 'osm_aeroway',
  'osm_power', 'osm_water', 'osm_waterway', 'osm_wetland',
];

interface Props {
  activeDataset: DatasetKey;
  properties: Record<string, unknown> | null;
}

function hasValue(v: unknown): v is string | number {
  return v !== undefined && v !== null && v !== '';
}

function TagRow({ text }: { text: string }) {
  return (
    <div className="font-mono text-sm leading-relaxed text-gray-500 break-words">{text}</div>
  );
}

function displayCompareTagKey(key: string): string {
  if (key.startsWith('src_')) return key.slice(4);
  if (key.startsWith('osm_')) return key.slice(4);
  return key;
}

function TagGroup({
  label,
  keys,
  properties,
}: {
  label: string;
  keys: string[];
  properties: Record<string, unknown>;
}) {
  const rows = keys.filter((k) => hasValue(properties[k]));
  if (rows.length === 0) return null;

  return (
    <div className="grid gap-0.5">
      <div className="text-gray-500 text-sm">{label}</div>
      {rows.map((k) => (
        <div key={k} className="pl-4 font-mono text-sm leading-relaxed text-gray-500 break-words">
          {displayCompareTagKey(k)}: {formatValue(properties[k])}
        </div>
      ))}
    </div>
  );
}

function buildRows(hoverFields: HoverFieldDef[], properties: Record<string, unknown>) {
  const seen = new Set<string>();
  const rows: { key: string; text: string }[] = [];

  for (const field of hoverFields) {
    if (
      field.key === 'osm_id'
      || compareSourceTagKeys.includes(field.key)
      || compareOsmTagKeys.includes(field.key)
    ) {
      continue;
    }

    if (field.key === 'primary_kind') {
      const kind = properties.primary_kind;
      const value = properties.primary_value;
      if (!kind || !hasValue(value)) continue;
      const text = `${kind}=${formatValue(value)}`;
      if (seen.has(text)) continue;
      seen.add(text);
      rows.push({ key: 'primary_kind', text });
      continue;
    }

    if (field.key === 'primary_value') continue;

    const value = properties[field.key];
    if (!hasValue(value)) continue;
    const formattedValue = formatHoverValue(field.key, value);

    const text = osmStyleKeys.has(field.key)
      ? `${field.key}=${formattedValue}`
      : `${field.label ?? field.key}: ${formattedValue}`;
    if (seen.has(text)) continue;
    seen.add(text);
    rows.push({ key: field.key, text });
  }

  return rows;
}

export default function InspectPanel({ activeDataset, properties }: Props) {
  const config = datasetConfigs[activeDataset];
  const hasSelection = Boolean(properties);

  return (
    <div>
      <div
        className={
          hasSelection
            ? 'max-h-56 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]'
            : ''
        }
      >
        {!properties ? (
          <p className="text-gray-500 text-sm leading-relaxed">{config.emptyInspectMessage}</p>
        ) : (
          <>
            <div className="text-lg font-bold">
              {(properties.class_label as string) || 'Altro'}
            </div>
            <div className="grid gap-2 mt-3">
              {buildRows(config.hoverFields, properties).map((r) => (
                <TagRow key={r.key} text={r.text} />
              ))}
              {activeDataset === 'compare' && (
                <>
                  <TagGroup label="Regione:" keys={compareSourceTagKeys} properties={properties} />
                  <TagGroup label="OSM:" keys={compareOsmTagKeys} properties={properties} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
