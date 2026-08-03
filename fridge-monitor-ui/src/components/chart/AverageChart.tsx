import { useEffect, useRef } from 'react';

import uPlot from 'uplot';

import temperatureStore from '../../store';

import type { TemperaturePoint } from '../../types/temperature';

const HOUR_SECONDS = 3600;

interface Props {
  deviceIds: number[];
}

function toUPlotData(points: TemperaturePoint[]): uPlot.AlignedData {
  const times = new Float64Array(points.length);
  const temperatures = new Float64Array(points.length);

  points.forEach((point, index) => {
    times[index] = point.time / 1000;
    temperatures[index] = point.temperature;
  });

  return [times, temperatures];
}

function setHourWindow(chart: uPlot, points: TemperaturePoint[]) {
  const last = points.at(-1);
  if (!last) return;

  const time = last.time / 1000;
  chart.setScale('x', { min: time - HOUR_SECONDS, max: time });
}

export default function AverageChart({ deviceIds }: Props) {
  const container = useRef<HTMLDivElement | null>(null);
  const chart = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!container.current) return;

    const points = temperatureStore.getFleetAverageHistory(deviceIds);

    const options: uPlot.Options = {
      width: container.current.clientWidth,
      height: 240,
      scales: {
        x: { time: true },
        y: { auto: true },
      },
      axes: [
        {},
        {
          label: '°C',
        },
      ],
      series: [
        {},
        {
          label: 'Fleet average',
          stroke: '#10b981',
          width: 2,
          fill: 'rgba(16, 185, 129, 0.08)',
        },
      ],
    };

    chart.current = new uPlot(options, toUPlotData(points), container.current);
    setHourWindow(chart.current, points);

    const resizeObserver = new ResizeObserver(() => {
      if (container.current && chart.current) {
        chart.current.setSize({ width: container.current.clientWidth, height: 240 });
      }
    });
    resizeObserver.observe(container.current);

    const refresh = () => {
      const history = temperatureStore.getFleetAverageHistory(deviceIds);
      chart.current?.setData(toUPlotData(history));
      if (chart.current) {
        setHourWindow(chart.current, history);
      }
    };

    const unsubscribe = temperatureStore.changed.subscribe(() => refresh());

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      chart.current?.destroy();
      chart.current = null;
    };
  }, [deviceIds]);

  return (
    <div className="chart-panel">
      <div className="chart-panel__header">
        <div>
          <h3 className="chart-panel__title">Fleet Average Temperature</h3>
          <p className="chart-panel__subtitle">Mean across all monitored fridges</p>
        </div>
        <span className="chart-panel__badge">Last hour</span>
      </div>
      <div className="chart-panel__canvas" ref={container} />
    </div>
  );
}
