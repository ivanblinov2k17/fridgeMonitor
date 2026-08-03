import { useEffect, useRef } from 'react';

import uPlot from 'uplot';

import type { TemperaturePoint } from '../../types/temperature';

interface Props {
  data: TemperaturePoint[];
}

export default function UPlotChart({ data }: Props) {
  const container = useRef<HTMLDivElement>(null);

  const chart = useRef<uPlot>(null);

  function convertData(points: TemperaturePoint[]): uPlot.AlignedData {
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
      },

      convertData(data),

      container.current,
    );

    return () => {
      chart.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!chart.current) return;

    chart.current.setData(convertData(data));
  }, [data]);

  return <div ref={container} />;
}
