import { useEffect, useState } from 'react';

import { createTemperatureSocket } from '../websocket/temperatureSocket';

import type { TemperatureEvent } from '../types/temperature';

export function useTemperature() {
  const [data, setData] = useState<Record<number, TemperatureEvent[]>>({});
  useEffect(() => {
    const socket = createTemperatureSocket((event) => {
      setData((prev) => {
        const history = prev[event.device_id] ?? [];

        return {
          ...prev,
          [event.device_id]: [...history.slice(-100), event],
        };
      });
    });
    return () => {
      socket.close();
    };
  }, []);
  return data;
}
