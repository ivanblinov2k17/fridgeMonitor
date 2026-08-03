import { api } from './client';

export interface HistoryPoint {
  temperature: number;
  timestamp: string;
}

export interface LatestTemperature {
  device_id: number;
  temperature: number;
  timestamp: string;
}

export async function getDeviceHistory(
  deviceId: number,
  hours = 1,
): Promise<HistoryPoint[]> {
  const response = await api.get<HistoryPoint[]>(
    `/temperatures/devices/${deviceId}/history`,
    { params: { hours } },
  );
  return response.data;
}

export async function getLatestTemperatures(): Promise<LatestTemperature[]> {
  const response = await api.get<LatestTemperature[]>('/temperatures/latest');
  return response.data;
}
