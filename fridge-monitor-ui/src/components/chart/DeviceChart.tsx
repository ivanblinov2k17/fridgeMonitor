import { useEffect, useRef } from 'react';

import uPlot from 'uplot';

import temperatureStore from '../../store';

interface Props {
  deviceId: number;
}

function convertToUPlotData(deviceId: number): uPlot.AlignedData {
  const points = temperatureStore.getHistory(deviceId);

  const times = new Float64Array(points.length);

  const temperatures = new Float64Array(points.length);

  points.forEach((point, index) => {
    times[index] = point.time / 1000;

    temperatures[index] = point.temperature;
  });

  return [times, temperatures];
}

export default function DeviceChart({ deviceId }: Props) {
  const container = useRef<HTMLDivElement | null>(null);

  const chart = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!container.current) return;

    const options: uPlot.Options = {
      width: 900,

      height: 300,

      scales: {
        x: {
          time: true,
        },

        y: {
          auto: true,
        },
      },

      series: [
        {},

        {
          label: 'Temperature',
          stroke: '#2563eb',

          width: 2,
        },
      ],
    };

    chart.current = new uPlot(
      options,

      convertToUPlotData(deviceId),

      container.current,
    );

    /*
            Обновление данных
        */

    const unsubscribe = temperatureStore.changed.subscribe((id) => {
      if (id !== deviceId) return;

      const data = convertToUPlotData(deviceId);

      chart.current?.setData(data);

      const points = temperatureStore.getHistory(deviceId);

      const last = points.at(-1);

      if (last) {
        const time = last.time / 1000;

        chart.current?.setScale('x', {
          min: time - 3600,

          max: time,
        });
      }
    });

    return () => {
      unsubscribe();
      chart.current?.destroy();
      chart.current = null;
    };
  }, [deviceId]);

  return (
    <div>
      <h3>Fridge {deviceId}</h3>

      <div ref={container} />
    </div>
  );
}
