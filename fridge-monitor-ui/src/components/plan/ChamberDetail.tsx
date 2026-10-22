import { useEffect, useState } from 'react';

import DeviceChart from '../chart/DeviceChart';
import LimitsPanel from '../dashboard/LimitsPanel';
import temperatureStore from '../../store';
import { alarmLabel, alarmLevel, isFault, statusLabel } from '../../utils/sensorStatus';
import { formatTemperature } from '../../utils/temperature';

import type { Device } from '../../types/temperature';

interface Props {
  device: Device;
  onSaved: (device: Device) => void;
  onClose: () => void;
}

export default function ChamberDetail({ device, onSaved, onClose }: Props) {
  const [, tick] = useState(0);

  useEffect(() => {
    const unsubscribe = temperatureStore.changed.subscribe((id) => {
      if (id === device.id) tick((n) => n + 1);
    });

    return unsubscribe;
  }, [device.id]);

  const temp = temperatureStore.getCurrentTemperature(device.id);
  const sensorStatus = temperatureStore.getStatus(device.id);
  const alarm = temperatureStore.getAlarm(device.id);

  const level = alarmLevel(alarm);

  return (
    <section className="chamber-detail">
      <div className="chamber-detail__bar">
        <div>
          <h2 className="chamber-detail__name">{device.name}</h2>
          <p className="chamber-detail__where">
            {device.location}
            {device.unit != null && ` · модуль ${device.unit}, вход ${device.channel}`}
          </p>
        </div>

        <div className="chamber-detail__now">
          <span className={`chamber-detail__temp chamber-detail__temp--${level}`}>
            {isFault(sensorStatus)
              ? statusLabel(sensorStatus)
              : formatTemperature(temp)}
          </span>

          {alarm && (
            <span className={`chamber-detail__alarm chamber-detail__alarm--${level}`}>
              {alarmLabel(alarm)}
            </span>
          )}
        </div>

        <button
          type="button"
          className="chamber-detail__close"
          onClick={onClose}
          aria-label="Закрыть карточку"
        >
          ×
        </button>
      </div>

      <DeviceChart
        deviceId={device.id}
        deviceName={device.name}
        location={device.location}
      />

      <LimitsPanel device={device} onSaved={onSaved} />
    </section>
  );
}
