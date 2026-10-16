import { useState } from 'react';

import { API_BASE_URL } from '../../config';

import type { Device } from '../../types/temperature';

interface Props {
  devices: Device[];
}

const STEPS = [
  { value: 0, label: 'Every reading' },
  { value: 60, label: '1 min average' },
  { value: 300, label: '5 min average' },
  { value: 900, label: '15 min average' },
  { value: 1800, label: '30 min average' },
  { value: 3600, label: '1 hour average' },
];

const PRESETS = [
  { label: '24 h', hours: 24 },
  { label: '7 days', hours: 24 * 7 },
  { label: '30 days', hours: 24 * 30 },
];

// <input type="datetime-local"> works in local time without a zone.
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function rangeEndingNow(hours: number) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600 * 1000);

  return { start: toLocalInput(start), end: toLocalInput(end) };
}

function fileNameFrom(disposition: string | null): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match ? match[1] : 'temperatures.csv';
}

export default function ExportPanel({ devices }: Props) {
  const [range, setRange] = useState(() => rangeEndingNow(24));
  const [step, setStep] = useState(300);
  const [deviceId, setDeviceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const start = new Date(range.start);
    const end = new Date(range.end);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Set both dates.');
      return;
    }

    if (end <= start) {
      setError('The end must be after the start.');
      return;
    }

    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      step: String(step),
      // Times in the file are written in this browser's zone.
      tz_offset: String(-start.getTimezoneOffset()),
    });

    if (deviceId) params.set('device_id', deviceId);

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/export/temperatures.csv?${params}`);

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.detail ?? `Export failed (${response.status}).`);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileNameFrom(response.headers.get('Content-Disposition'));
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('No connection to the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chart-panel export-panel">
      <div className="chart-panel__header">
        <div>
          <h3 className="chart-panel__title">Export</h3>
          <p className="chart-panel__subtitle">
            Temperature table for a period, opens in Excel
          </p>
        </div>
      </div>

      <div className="export-panel__presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="export-panel__preset"
            onClick={() => setRange(rangeEndingNow(preset.hours))}
          >
            Last {preset.label}
          </button>
        ))}
      </div>

      <div className="export-panel__fields">
        <label className="export-panel__field">
          <span>From</span>
          <input
            type="datetime-local"
            value={range.start}
            onChange={(e) => setRange({ ...range, start: e.target.value })}
          />
        </label>

        <label className="export-panel__field">
          <span>To</span>
          <input
            type="datetime-local"
            value={range.end}
            onChange={(e) => setRange({ ...range, end: e.target.value })}
          />
        </label>

        <label className="export-panel__field">
          <span>Values</span>
          <select value={step} onChange={(e) => setStep(Number(e.target.value))}>
            {STEPS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="export-panel__field">
          <span>Sensors</span>
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">All sensors</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.location}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="export-panel__download"
          onClick={download}
          disabled={busy}
        >
          {busy ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>

      {error && <p className="export-panel__error">{error}</p>}
    </section>
  );
}
