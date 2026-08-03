export type TempStatus = 'normal' | 'warning' | 'critical' | 'unknown';

export function getTempStatus(temp: number | undefined): TempStatus {
  if (temp === undefined || temp === 0) return 'unknown';
  if (temp >= 2 && temp <= 6) return 'normal';
  if ((temp >= 1 && temp < 2) || (temp > 6 && temp <= 8)) return 'warning';
  return 'critical';
}

export function formatTemperature(temp: number | undefined): string {
  if (temp === undefined || temp === 0) return '—';
  return `${temp.toFixed(1)}°C`;
}
