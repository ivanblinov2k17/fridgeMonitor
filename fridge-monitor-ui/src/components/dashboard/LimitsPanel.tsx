import { useEffect, useState } from 'react';

import { updateDevice } from '../../api/devices';

import type { Device } from '../../types/temperature';

interface Props {
  device: Device;
  onSaved: (device: Device) => void;
}

// An empty field means that end is not watched, which the API takes as null.
function toField(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

function parseField(text: string): number | null | undefined {
  const trimmed = text.trim();

  if (trimmed === '') return null;

  const value = Number(trimmed);

  return Number.isFinite(value) ? value : undefined;
}

export default function LimitsPanel({ device, onSaved }: Props) {
  const [low, setLow] = useState(toField(device.min_temp));
  const [high, setHigh] = useState(toField(device.max_temp));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Switching chambers must not carry the previous one's numbers over.
  useEffect(() => {
    setLow(toField(device.min_temp));
    setHigh(toField(device.max_temp));
    setError(null);
    setSaved(false);
  }, [device.id, device.min_temp, device.max_temp]);

  async function save(event: React.FormEvent) {
    event.preventDefault();

    const min_temp = parseField(low);
    const max_temp = parseField(high);

    if (min_temp === undefined || max_temp === undefined) {
      setError('Enter a number, or leave empty for no limit');
      return;
    }

    if (min_temp !== null && max_temp !== null && min_temp >= max_temp) {
      setError('Lower limit must be below the upper one');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateDevice(device.id, { min_temp, max_temp });
      onSaved(updated);
      setSaved(true);
    } catch {
      setError('Could not save. Is the backend reachable?');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="chart-panel limits-panel" onSubmit={save}>
      <div className="chart-panel__header">
        <div>
          <h3 className="chart-panel__title">Alarm limits</h3>
          <p className="chart-panel__subtitle">
            For {device.name}. Leave a field empty to stop watching that end.
          </p>
        </div>
      </div>

      <div className="limits-panel__row">
        <label className="limits-panel__field">
          <span>Low, °C</span>
          <input
            id={`limit-low-${device.id}`}
            type="number"
            step="0.1"
            inputMode="decimal"
            value={low}
            onChange={(e) => {
              setLow(e.target.value);
              setSaved(false);
            }}
          />
        </label>

        <label className="limits-panel__field">
          <span>High, °C</span>
          <input
            id={`limit-high-${device.id}`}
            type="number"
            step="0.1"
            inputMode="decimal"
            value={high}
            onChange={(e) => {
              setHigh(e.target.value);
              setSaved(false);
            }}
          />
        </label>

        <button type="submit" className="limits-panel__save" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {error && <p className="limits-panel__error">{error}</p>}
      {saved && !error && <p className="limits-panel__saved">Saved</p>}
    </form>
  );
}
