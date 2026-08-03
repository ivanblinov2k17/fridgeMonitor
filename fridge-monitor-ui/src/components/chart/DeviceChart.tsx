/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef } from 'react';

import uPlot from 'uplot';

import temperatureStore from '../../store';

interface Props {
  deviceId: number;
}

export default function DeviceChart({ deviceId }: Props) {
  const container = useRef<HTMLDivElement>(null);

  const chart = useRef<uPlot>(null);

  function getData(): uPlot.AlignedData {
    const points = temperatureStore.getHistory(deviceId);

    const times = new Float64Array(points.length);

    const temperatures = new Float64Array(points.length);

    points.forEach((point, index) => {
      times[index] = point.time / 1000;

      temperatures[index] = point.temperature;
    });

    return [times, temperatures];
  }

  useEffect(() => {
    if (!container.current) return;

    chart.current = new uPlot(
      {
        width: 900,

        height: 300,

        scales: {
          x: {
            time: true,

            range: (u, min, max) => {
              const now = Date.now() / 1000;

              return [now - 3600, now];
            },
          },
        },

        series: [
          {},

          {
            label: '°C',

            stroke: '#2563eb',

            width: 2,
          },
        ],
      },

      getData(),

      container.current,
    );

    const unsubscribe = temperatureStore.changed.subscribe((id) => {
      if (id !== deviceId) return;

      chart.current?.setData(getData());
    });

    return () => {
      unsubscribe();

      chart.current?.destroy();
    };
  }, []);

  return (
    <div>
      <h3>Fridge {deviceId}</h3>

      <div ref={container} />
    </div>
  );
}
