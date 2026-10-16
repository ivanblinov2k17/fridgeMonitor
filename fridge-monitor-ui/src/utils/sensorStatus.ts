import type { SensorStatus } from '../types/temperature';

import type { TempStatus } from './temperature';

const LABELS: Record<string, string> = {
  not_ready: 'Starting…',
  disabled: 'Sensor off',
  too_high: 'Above range',
  too_low: 'Below range',
  short_circuit: 'Sensor short',
  open_circuit: 'Sensor break',
  adc_failure: 'ADC failure',
  calibration: 'Calibration error',
  cold_junction: 'Cold junction',
  invalid: 'Invalid value',
  no_link: 'No link',
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
