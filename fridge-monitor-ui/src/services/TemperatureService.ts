import temperatureStore from '../store';

import type { TemperaturePoint } from '../types/temperature';

interface TemperatureEvent {
  device_id: number;
  temperature: number;
  timestamp: string;
}

type ConnectionListener = (connected: boolean) => void;

class TemperatureService {
  private socket?: WebSocket;
  private stopped = false;
  private connected = false;
  private listeners = new Set<ConnectionListener>();

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.socket?.close();
  }

  isConnected() {
    return this.connected;
  }

  onConnectionChange(listener: ConnectionListener) {
    this.listeners.add(listener);
    listener(this.connected);
    return () => this.listeners.delete(listener);
  }

  private setConnected(value: boolean) {
    this.connected = value;
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  private connect() {
    if (this.stopped) return;

    this.socket = new WebSocket('ws://127.0.0.1:8000/ws');

    this.socket.onopen = () => {
      this.setConnected(true);
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as TemperatureEvent;

      const point: TemperaturePoint = {
        time: Date.parse(data.timestamp),
        temperature: data.temperature,
      };

      temperatureStore.add(data.device_id, point);
    };

    this.socket.onerror = () => {
      this.setConnected(false);
    };

    this.socket.onclose = () => {
      this.setConnected(false);

      if (!this.stopped) {
        setTimeout(() => this.connect(), 3000);
      }
    };
  }
}

export default new TemperatureService();
