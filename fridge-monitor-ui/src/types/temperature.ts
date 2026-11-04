// Sensor state from the backend: "ok" or a fault key such as
// "open_circuit" or "no_link" (see backend/app/services/modbus.py).
export type SensorStatus = string;

// What is wrong right now: a sensor fault key, "above_limit"/"below_limit"
// when a configured limit is crossed, or null when all is well.
export type AlarmKind = string | null;

export interface TemperatureEvent {
  device_id: number;
  // null when the sensor is faulty: the module then holds a stale number.
  temperature: number | null;
  status?: SensorStatus;
  alarm?: AlarmKind;
  timestamp: string;
}

export interface Device {
  id: number;
  name: string;
  address: number;
  location: string;
  // MV110 address and input, set for real sensors only.
  unit?: number | null;
  channel?: number | null;
  status?: SensorStatus;
  // Alarm limits, null when that end is not watched.
  min_temp?: number | null;
  max_temp?: number | null;
  alarm?: AlarmKind;
}

export interface AlarmEvent {
  id: number;
  device_id: number;
  device_name: string;
  kind: string;
  started_at: string;
  // null while the alarm is still going.
  ended_at: string | null;
  value: number | null;
  peak: number | null;
}

export interface TemperaturePoint {
  time: number;
  temperature: number;
}
