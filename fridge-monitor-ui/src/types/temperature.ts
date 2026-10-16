// Sensor state from the backend: "ok" or a fault key such as
// "open_circuit" or "no_link" (see backend/app/services/modbus.py).
export type SensorStatus = string;

export interface TemperatureEvent {
  device_id: number;
  // null when the sensor is faulty: the module then holds a stale number.
  temperature: number | null;
  status?: SensorStatus;
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
}

export interface TemperaturePoint {
  time: number;
  temperature: number;
}
