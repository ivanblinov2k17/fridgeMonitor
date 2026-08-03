export interface TemperatureEvent {
  device_id: number;
  temperature: number;
  timestamp: string;
}

export interface Device {
  id: number;
  name: string;
  address: number;
  location: string;
}

export interface TemperaturePoint {
  time: number;
  temperature: number;
}