/** Parse API timestamps as UTC (backend stores UTC, often without Z suffix). */
export function parseTimestamp(value: string): number {
  if (!value) return NaN;

  const normalized = value.includes('T')
    ? value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)
      ? value
      : `${value}Z`
    : `${value.replace(' ', 'T')}Z`;

  return Date.parse(normalized);
}
