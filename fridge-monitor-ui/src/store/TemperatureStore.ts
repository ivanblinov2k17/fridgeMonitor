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

  add(deviceId: number,
    point: TemperaturePoint,
  ){
    const device = this.getDevice(deviceId);

    device.lastTemperature = point.temperature;

    device.buffer.push(point);

    this.changed.emit(deviceId);
  }

  getHistory(deviceId: number) {
    return this.getDevice(deviceId).buffer.values();
  }

  getCurrentTemperature(deviceId: number) {
    return this.getDevice(deviceId).lastTemperature;
  }
}

export default new TemperatureStore();
