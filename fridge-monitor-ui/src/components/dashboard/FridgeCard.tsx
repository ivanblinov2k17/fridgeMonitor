import type { Device } from '../../types/temperature';

import temperatureStore from '../../store';

import { faultLevel, isFault, statusLabel } from '../../utils/sensorStatus';
import { formatTemperature, getTempStatus } from '../../utils/temperature';

interface Props {
  device: Device;
  selected: boolean;
  onSelect: (id: number) => void;
}

export default function FridgeCard({ device, selected, onSelect }: Props) {
  const temp = temperatureStore.getCurrentTemperature(device.id);
  const sensorStatus = temperatureStore.getStatus(device.id);
  const fault = isFault(sensorStatus);
  const status = fault ? faultLevel(sensorStatus) : getTempStatus(temp);

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
    </button>
  );
}
