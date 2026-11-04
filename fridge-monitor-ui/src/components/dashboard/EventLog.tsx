import { useCallback, useEffect, useState } from 'react';

import { getEvents } from '../../api/events';
import temperatureStore from '../../store';
import { alarmLabel, alarmLevel } from '../../utils/sensorStatus';

import type { AlarmEvent } from '../../types/temperature';

function formatMoment(iso: string): string {
  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function formatDuration(event: AlarmEvent): string {
  const started = new Date(event.started_at).getTime();
  const ended = event.ended_at ? new Date(event.ended_at).getTime() : Date.now();

  if (Number.isNaN(started) || Number.isNaN(ended)) return '—';

  const minutes = Math.max(0, Math.round((ended - started) / 60000));

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);

  return `${hours} h ${minutes % 60} min`;
}

export default function EventLog() {
  const [events, setEvents] = useState<AlarmEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvents(await getEvents({ limit: 50 }));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // The store emits on every reading, several times a second across the
    // line. Reload only when the set of open alarms actually changes,
    // otherwise the log would hammer the API for an unchanged answer.
    const signature = () =>
      temperatureStore
        .getDevices()
        .map((id) => `${id}:${temperatureStore.getAlarm(id) ?? ''}`)
        .join('|');

    let previous = signature();

    const unsubscribe = temperatureStore.changed.subscribe(() => {
      const current = signature();

      if (current === previous) return;

      previous = current;
      load();
    });

    // Keeps "for 12 min" on an open alarm from standing still.
    const timer = window.setInterval(load, 60000);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [load]);

  return (
    <section className="chart-panel event-log">
      <div className="chart-panel__header">
        <div>
          <h3 className="chart-panel__title">Alarm log</h3>
          <p className="chart-panel__subtitle">
            What went wrong, when it started and how long it lasted
          </p>
        </div>
      </div>

      {loading && <p className="event-log__empty">Loading…</p>}

      {error && !loading && (
        <p className="event-log__empty">Could not load the log.</p>
      )}

      {!loading && !error && events.length === 0 && (
        <p className="event-log__empty">Nothing has gone wrong yet.</p>
      )}

      {events.length > 0 && (
        <div className="event-log__scroll">
          <table className="event-log__table">
            <thead>
              <tr>
                <th>Chamber</th>
                <th>What</th>
                <th>Started</th>
                <th>For</th>
                <th>Peak</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className={event.ended_at ? '' : 'event-log__row--open'}
                >
                  <td>{event.device_name}</td>
                  <td>
                    <span
                      className={`event-log__kind event-log__kind--${alarmLevel(event.kind)}`}
                    >
                      {alarmLabel(event.kind)}
                    </span>
                  </td>
                  <td>{formatMoment(event.started_at)}</td>
                  <td>
                    {formatDuration(event)}
                    {!event.ended_at && <span className="event-log__now"> · now</span>}
                  </td>
                  <td>{event.peak == null ? '—' : `${event.peak.toFixed(1)}°C`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
