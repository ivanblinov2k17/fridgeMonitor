import DeviceHistory from './DeviceHistory';

import EventBus from './EventBus';

import type { TemperaturePoint } from '../types/temperature';

export class TemperatureStore {
  private readonly devices = new Map<number, DeviceHistory>();

  readonly changed = new EventBus<number>();

  private getDevice(id: number) {
    let device = this.devices.get(id);

    if (!device) {
      device = new DeviceHistory();

      this.devices.set(id, device);
    }

    return device;
  }
  getDevices(): number[] {
    return Array.from(
        this.devices.keys()
    );
  }

  add(deviceId: number, point: TemperaturePoint) {
    const device = this.getDevice(deviceId);

    device.lastTemperature = point.temperature;
    device.buffer.push(point);

    this.changed.emit(deviceId);
  }

  loadHistory(deviceId: number, points: TemperaturePoint[]) {
    if (points.length === 0) return;

    const device = this.getDevice(deviceId);

    for (const point of points) {
      device.buffer.push(point);
    }

    device.lastTemperature = points.at(-1)!.temperature;
    this.changed.emit(deviceId);
  }

  getHistory(deviceId: number) {
    return this.getDevice(deviceId).buffer.values();
  }

  getCurrentTemperature(deviceId: number) {
    return this.getDevice(deviceId).lastTemperature;
  }

  getFleetAverageHistory(deviceIds: number[]): TemperaturePoint[] {
    if (deviceIds.length === 0) return [];

    const buckets = new Map<number, number[]>();

    for (const id of deviceIds) {
      for (const point of this.getHistory(id)) {
        const bucket = Math.floor(point.time / 5000) * 5000;
        const temps = buckets.get(bucket) ?? [];
        temps.push(point.temperature);
        buckets.set(bucket, temps);
      }
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([time, temps]) => ({
        time,
        temperature: temps.reduce((sum, t) => sum + t, 0) / temps.length,
      }));
  }
}

export default new TemperatureStore();
