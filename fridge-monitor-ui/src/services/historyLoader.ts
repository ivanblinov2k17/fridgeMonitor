import { getDeviceHistory, getLatestTemperatures } from '../api/temperatures';
import temperatureStore from '../store';
import { parseTimestamp } from '../utils/timestamp';

import type { Device, TemperaturePoint } from '../types/temperature';

function toPoints(history: { temperature: number; timestamp: string }[]): TemperaturePoint[] {
  return history
    .map((item) => ({
      time: parseTimestamp(item.timestamp),
      temperature: item.temperature,
    }))
    .filter((p) => Number.isFinite(p.time))
    .sort((a, b) => a.time - b.time);
}

export async function loadAllDeviceHistory(devices: Device[], hours = 1): Promise<void> {
  await Promise.all(
    devices.map(async (device) => {
      const history = await getDeviceHistory(device.id, hours);
      temperatureStore.loadHistory(device.id, toPoints(history));
    }),
  );
}

export async function seedLatestTemperatures(): Promise<void> {
  const latest = await getLatestTemperatures();

  for (const item of latest) {
    const time = parseTimestamp(item.timestamp);
    if (!Number.isFinite(time)) continue;

    temperatureStore.add(item.device_id, {
      time,
      temperature: item.temperature,
    });
  }
}
