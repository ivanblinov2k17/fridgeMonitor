import uPlot from 'uplot';

function isDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getChartColors() {
  const dark = isDarkMode();
  return {
    axis: dark ? '#e5e7eb' : '#374151',
    grid: dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    tick: dark ? '#9ca3af' : '#6b7280',
  };
}

export function buildChartAxes(yLabel = '°C'): uPlot.Axis[] {
  const { axis, grid, tick } = getChartColors();

  const base: Partial<uPlot.Axis> = {
    stroke: axis,
    grid: { show: true, stroke: grid, width: 1 },
    ticks: { show: true, stroke: tick, width: 1, size: 6 },
    font: '13px system-ui, sans-serif',
    labelFont: '13px system-ui, sans-serif',
    labelGap: 10,
    gap: 8,
  };

  return [
    { ...base },
    { ...base, label: yLabel, size: 60 },
  ];
}
