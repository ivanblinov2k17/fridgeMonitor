import { useEffect, useState } from 'react';

import temperatureStore from '../../store';

import { formatTemperature, getTempStatus } from '../../utils/temperature';

interface Props {
  deviceIds: number[];
}

export default function SummaryStats({ deviceIds }: Props) {
  const [, tick] = useState(0);

  useEffect(() => {
    const unsubscribe = temperatureStore.changed.subscribe(() => {
      tick((n) => n + 1);
    });
    return unsubscribe;
  }, []);

  const temps = deviceIds
    .map((id) => temperatureStore.getCurrentTemperature(id))
    .filter((t) => t !== undefined && t !== 0);

  const fleetAvg =
    temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : undefined;

  const min = temps.length > 0 ? Math.min(...temps) : undefined;
  const max = temps.length > 0 ? Math.max(...temps) : undefined;

  const normalCount = temps.filter((t) => getTempStatus(t) === 'normal').length;
  const alertCount = deviceIds.length - normalCount;

  return (
    <section className="summary-stats">
      <div className="stat-card">
        <span className="stat-card__label">Monitored</span>
        <span className="stat-card__value">{deviceIds.length}</span>
        <span className="stat-card__hint">active fridges</span>
      </div>

      <div className="stat-card stat-card--accent">
        <span className="stat-card__label">Fleet average</span>
        <span className="stat-card__value">{formatTemperature(fleetAvg)}</span>
        <span className="stat-card__hint">current mean</span>
      </div>

      <div className="stat-card">
        <span className="stat-card__label">Range</span>
        <span className="stat-card__value stat-card__value--small">
          {min !== undefined && max !== undefined
            ? `${min.toFixed(1)} – ${max.toFixed(1)}°C`
            : '—'}
        </span>
        <span className="stat-card__hint">min / max</span>
      </div>

      <div className="stat-card">
        <span className="stat-card__label">Status</span>
        <span className="stat-card__value stat-card__value--small">
          <span className="stat-card__ok">{normalCount} OK</span>
          {alertCount > 0 && (
            <span className="stat-card__alert"> · {alertCount} alert</span>
          )}
        </span>
        <span className="stat-card__hint">within 2–6°C target</span>
      </div>
    </section>
  );
}
