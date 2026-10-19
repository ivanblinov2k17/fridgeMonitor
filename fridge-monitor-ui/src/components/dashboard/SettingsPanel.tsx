import { useEffect, useState } from 'react';

import { getSettings, setPollInterval } from '../../api/settings';

import type { AppSettings } from '../../api/settings';

function describeInterval(seconds: number): string {
  return seconds === 1 ? 'every second' : `every ${seconds} seconds`;
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getSettings()
      .then((loaded) => {
        if (!cancelled) setSettings(loaded);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load settings.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function change(seconds: number) {
    setSaving(true);
    setError(null);

    try {
      setSettings(await setPollInterval(seconds));
    } catch {
      setError('Could not save. Is the backend reachable?');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="chart-panel settings-panel">
      <div className="chart-panel__header">
        <div>
          <h3 className="chart-panel__title">Polling</h3>
          <p className="chart-panel__subtitle">
            How often every sensor is read. Takes effect on the next reading.
          </p>
        </div>
      </div>

      {!settings && !error && <p className="settings-panel__hint">Loading…</p>}

      {settings && (
        <>
          <div className="settings-panel__choices">
            {settings.poll_interval_choices.map((seconds) => (
              <button
                key={seconds}
                type="button"
                className={`settings-panel__choice${
                  seconds === settings.poll_interval_seconds
                    ? ' settings-panel__choice--active'
                    : ''
                }`}
                disabled={saving}
                onClick={() => change(seconds)}
              >
                {seconds} s
              </button>
            ))}
          </div>

          <p className="settings-panel__hint">
            Reading {describeInterval(settings.poll_interval_seconds)}. Raw
            readings are kept {settings.raw_retention_days} days, then
            summarised into {Math.round(settings.rollup_bucket_seconds / 60)}
            -minute buckets with the lowest, average and highest value, which
            are kept for good.
          </p>
        </>
      )}

      {error && <p className="settings-panel__error">{error}</p>}
    </section>
  );
}
