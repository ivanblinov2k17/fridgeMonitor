import { useEffect, useState } from 'react';

import temperatureStore from '../../store';
import { alarmLevel, isFault, statusLabel } from '../../utils/sensorStatus';

import { PLAN_CHAMBERS, chamberFromName, devicesByChamber } from '../plan/planData';

import type { Device } from '../../types/temperature';

interface Props {
  devices: Device[];
  onSelect?: (deviceId: number) => void;
}

interface Row {
  key: string;
  label: string;
  target?: string;
  device?: Device;
}

// Ноль — это нормальное показание морозильной камеры, поэтому не
// formatTemperature: он считает 0 отсутствующим значением.
function formatCelsius(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toFixed(1)}°C`;
}

function buildRows(devices: Device[]): Row[] {
  const byChamber = devicesByChamber(devices);

  // Основа — камеры с чертежа: та, к которой ещё не подключили датчик,
  // остаётся в таблице с прочерком.
  const rows: Row[] = PLAN_CHAMBERS.slice()
    .sort((a, b) => a.chamber - b.chamber)
    .map((room) => ({
      key: room.id,
      label: room.label,
      target: room.target,
      device: byChamber.get(room.chamber),
    }));

  const onPlan = new Set(PLAN_CHAMBERS.map((room) => room.chamber));

  // Датчик без номера камеры или с номером, которого нет на чертеже, не
  // должен пропасть из сводки: так новая камера видна сразу, ещё до того,
  // как её нарисуют на плане.
  for (const device of devices) {
    const chamber = chamberFromName(device.name);

    if (chamber !== null && onPlan.has(chamber)) continue;

    rows.push({ key: `device-${device.id}`, label: device.name, device });
  }

  return rows;
}

function rowState(device?: Device) {
  if (!device) {
    return { fact: '—', level: 'unknown' as const };
  }

  const status = temperatureStore.getStatus(device.id);

  if (isFault(status)) {
    return {
      fact: statusLabel(status),
      level: alarmLevel(temperatureStore.getAlarm(device.id)),
    };
  }

  return {
    fact: formatCelsius(temperatureStore.getCurrentTemperature(device.id)),
    level: alarmLevel(temperatureStore.getAlarm(device.id)),
  };
}

function TableGroup({
  rows,
  onSelect,
}: {
  rows: Row[];
  onSelect?: (deviceId: number) => void;
}) {
  return (
    <table className="chamber-table__table">
      <thead>
        <tr>
          <th scope="col">№ ХК</th>
          <th scope="col">Факт</th>
          <th scope="col">Мин</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => {
          const { fact, level } = rowState(row.device);

          const clickable = row.device != null && onSelect != null;

          return (
            <tr
              key={row.key}
              className={[
                row.device ? '' : 'chamber-table__row--empty',
                clickable ? 'chamber-table__row--clickable' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={row.target ? `Уставка: ${row.target}` : undefined}
              onClick={clickable ? () => onSelect(row.device!.id) : undefined}
            >
              <th scope="row">{row.label}</th>
              <td className={`chamber-table__fact chamber-table__fact--${level}`}>
                {fact}
              </td>
              <td className="chamber-table__min">
                {formatCelsius(row.device?.min_temp)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ChamberTable({ devices, onSelect }: Props) {
  const [, tick] = useState(0);

  useEffect(() => {
    const unsubscribe = temperatureStore.changed.subscribe(() => {
      tick((n) => n + 1);
    });

    return unsubscribe;
  }, []);

  const rows = buildRows(devices);

  const withSensor = rows.filter((row) => row.device).length;

  const inAlarm = rows.filter(
    (row) => row.device && temperatureStore.getAlarm(row.device.id) !== null,
  ).length;

  return (
    <section className="chart-panel chamber-table">
      <div className="chart-panel__header">
        <div>
          <h3 className="chart-panel__title">Сводная таблица ХК</h3>
          <p className="chart-panel__subtitle">
            Фактическая температура и нижний порог каждой камеры
          </p>
        </div>
      </div>

      <p className="chamber-table__summary">
        {rows.length} камер · {withSensor} с датчиком
        {inAlarm > 0 && (
          <span className="chamber-table__summary-alert"> · {inAlarm} вне порога</span>
        )}
      </p>

      <div className="chamber-table__groups">
        <TableGroup rows={rows} onSelect={onSelect} />
      </div>
    </section>
  );
}
