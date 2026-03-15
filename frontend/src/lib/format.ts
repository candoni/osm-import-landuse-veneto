const countFormatter = new Intl.NumberFormat('it-IT');
const dateFormatter = new Intl.DateTimeFormat('it-IT', {
  dateStyle: 'medium',
});
const percentFormatter = new Intl.NumberFormat('it-IT', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatCount(value: number): string {
  return countFormatter.format(value);
}

export function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  return String(value);
}

export function formatHoverValue(key: string, value: unknown): string {
  if (key === 'missing_ratio_src' && typeof value === 'number') {
    return percentFormatter.format(value);
  }
  return formatValue(value);
}

export function formatDateTime(value: string | undefined | null): string {
  if (!value) return 'n/d';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}
