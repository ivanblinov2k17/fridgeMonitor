import { useEffect, useRef } from 'react';

import uPlot from 'uplot';

import temperatureStore from '../../store';
import { buildChartAxes } from '../../utils/chartTheme';

import type { TemperaturePoint } from '../../types/temperature';

const HOUR_SECONDS = 3600;

interface Props {
  deviceId: number;
  deviceName?: string;
  location?: string;
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

function computeMean(points: TemperaturePoint[]): number | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => acc + p.temperature, 0);
  return sum / points.length;
}

function toUPlotDataWithAverage(points: TemperaturePoint[]): uPlot.AlignedData {
  const [times, temperatures] = toUPlotData(points);
  const mean = computeMean(points);

  if (mean === null) {
    return [times, temperatures];
  }

  const averageLine = new Float64Array(points.length);
  averageLine.fill(mean);

  return [times, temperatures, averageLine];
}

function setHourWindow(chart: uPlot, points: TemperaturePoint[]) {
  const last = points.at(-1);
  if (!last) return;

  const time = last.time / 1000;
  chart.setScale('x', { min: time - HOUR_SECONDS, max: time });
}

export default function DeviceChart({ deviceId, deviceName, location }: Props) {
  const container = useRef<HTMLDivElement | null>(null);
  const chart = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!container.current) return;

    const points = temperatureStore.getHistory(deviceId);

    const options: uPlot.Options = {
      width: container.current.clientWidth,
      height: 280,
      scales: {
        x: { time: true },
        y: { auto: true },
      },
      axes: buildChartAxes('°C'),
      cursor: {
        show: true,
        x: true,
        y: true,
      },
      legend: {
        show: true,
        live: true,
      },
      series: [
        {},
        {
          label: 'Temperature',
          stroke: '#2563eb',
          width: 2,
          value: (_u, v) => (v == null ? '—' : `${v.toFixed(1)}°C`),
        },
        {
          label: 'Average',
          stroke: '#f59e0b',
          width: 2,
          dash: [6, 4],
          points: { show: false },
          value: (_u, v) => (v == null ? '—' : `${v.toFixed(1)}°C`),
        },
      ],
    };

    chart.current = new uPlot(
      options,
      toUPlotDataWithAverage(points),
      container.current,
    );

    setHourWindow(chart.current, points);

    const resizeObserver = new ResizeObserver(() => {
      if (container.current && chart.current) {
        chart.current.setSize({ width: container.current.clientWidth, height: 280 });
      }
    });
    resizeObserver.observe(container.current);

    const unsubscribe = temperatureStore.changed.subscribe((id) => {
      if (id !== deviceId) return;

      const history = temperatureStore.getHistory(deviceId);
      chart.current?.setData(toUPlotDataWithAverage(history));
      if (chart.current) {
        setHourWindow(chart.current, history);
      }
    });

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      chart.current?.destroy();
      chart.current = null;
    };
  }, [deviceId]);

  const title = deviceName ?? `Fridge #${deviceId}`;

  return (
    <div className="chart-panel">
      <div className="chart-panel__header">
        <div>
          <h3 className="chart-panel__title">{title}</h3>
          {location && <p className="chart-panel__subtitle">{location}</p>}
        </div>
        <span className="chart-panel__badge">Last hour</span>
      </div>
      <div className="chart-panel__canvas chart-canvas" ref={container} />
    </div>
  );
}
