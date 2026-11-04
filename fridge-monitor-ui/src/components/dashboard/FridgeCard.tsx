import type { Device } from '../../types/temperature';

import temperatureStore from '../../store';

import { alarmLevel, isFault, statusLabel } from '../../utils/sensorStatus';
import { formatTemperature } from '../../utils/temperature';

interface Props {
  device: Device;
  selected: boolean;
  onSelect: (id: number) => void;
}

function formatLimits(device: Device): string {
  const { min_temp: low, max_temp: high } = device;

  if (low == null && high == null) return 'No limits';
  if (low == null) return `≤ ${high}°`;
  if (high == null) return `≥ ${low}°`;

  return `${low}…${high}°`;
}

export default function FridgeCard({ device, selected, onSelect }: Props) {
  const temp = temperatureStore.getCurrentTemperature(device.id);
  const sensorStatus = temperatureStore.getStatus(device.id);
  const fault = isFault(sensorStatus);

  // The backend owns the alarm decision, so the card and the event log
  // can never disagree about whether a chamber is in alarm.
  const status = alarmLevel(temperatureStore.getAlarm(device.id));

  return (
    <button
      type="button"
      className={`fridge-card fridge-card--${status}${selected ? ' fridge-card--selected' : ''}`}
      onClick={() => onSelect(device.id)}
    >
      <div className="fridge-card__top">
        <span className="fridge-card__name">{device.name}</span>
        <span className={`fridge-card__status fridge-card__status--${status}`} />
      </div>

      <div className={`fridge-card__temp${fault ? ' fridge-card__temp--fault' : ''}`}>
        {fault ? statusLabel(sensorStatus) : formatTemperature(temp)}
      </div>

      <div className="fridge-card__meta">
        <span>{device.location}</span>
        <span>{device.unit != null ? `In ${device.channel}` : `Addr ${device.address}`}</span>
      </div>

      <div className="fridge-card__limits">{formatLimits(device)}</div>
    </button>
  );
}
