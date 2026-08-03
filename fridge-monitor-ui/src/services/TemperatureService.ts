import temperatureStore from '../store';

import type { TemperaturePoint } from '../types/temperature';

interface TemperatureEvent {
  device_id: number;

  temperature: number;

  timestamp: string;
}

class TemperatureService {
  private socket?: WebSocket;

  private stopped = false;

  start() {
    this.stopped = false;

    this.connect();
  }

  stop() {
    this.stopped = true;

    this.socket?.close();
  }

  private connect() {
    if (this.stopped) return;

    console.log('Connecting websocket...');

    this.socket = new WebSocket('ws://127.0.0.1:8000/ws');

    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as TemperatureEvent;

      const point: TemperaturePoint = {
        time: Date.parse(data.timestamp),

        temperature: data.temperature,
      };

      temperatureStore.add("STORE ADD", data.device_id, point);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error', error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket closed');

      if (!this.stopped) {
        setTimeout(() => this.connect(), 3000);
      }
    };
  }
}

export default new TemperatureService();
