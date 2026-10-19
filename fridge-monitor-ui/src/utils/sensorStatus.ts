import type { SensorStatus } from '../types/temperature';

import type { TempStatus } from './temperature';

const LABELS: Record<string, string> = {
  not_ready: 'Starting…',
  disabled: 'Sensor off',
  // The module's own measuring range, not the limits set for the chamber.
  too_high: 'Above range',
  too_low: 'Below range',
  short_circuit: 'Sensor short',
  open_circuit: 'Sensor break',
  adc_failure: 'ADC failure',
  calibration: 'Calibration error',
  cold_junction: 'Cold junction',
  invalid: 'Invalid value',
  no_link: 'No link',
  // Limits configured for this chamber.
  above_limit: 'Too warm',
  below_limit: 'Too cold',
};

export function isFault(status: SensorStatus): boolean {
  return status !== 'ok';
}

export function statusLabel(status: SensorStatus): string {
  return LABELS[status] ?? 'Fault';
}

// Not ready / switched off are not alarms by themselves.
export function faultLevel(status: SensorStatus): TempStatus {
  return status === 'not_ready' || status === 'disabled' ? 'unknown' : 'critical';
}

// The backend decides what is an alarm; this only says how to show it.
// Crossing a configured limit is a warning, a broken sensor is critical:
// a chamber nobody is measuring is the worse of the two.
export function alarmLevel(alarm: string | null | undefined): TempStatus {
  if (!alarm) return 'normal';

  if (alarm === 'above_limit' || alarm === 'below_limit') return 'warning';

  return faultLevel(alarm);
}

export function alarmLabel(alarm: string): string {
  return LABELS[alarm] ?? 'Alarm';
}
