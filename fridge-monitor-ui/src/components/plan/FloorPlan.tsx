import { useEffect, useState } from 'react';

import temperatureStore from '../../store';
import { alarmLevel, isFault, statusLabel } from '../../utils/sensorStatus';
import { formatTemperature } from '../../utils/temperature';

import { PLAN_HEIGHT, PLAN_ROOMS, PLAN_WIDTH, chamberFromName } from './planData';

import type { PlanRoom } from './planData';
import type { Device } from '../../types/temperature';

interface Props {
  devices: Device[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function devicesByChamber(devices: Device[]): Map<number, Device> {
  const byChamber = new Map<number, Device>();

  for (const device of devices) {
    const chamber = chamberFromName(device.name);

    // Первый выигрывает: два датчика с одним номером - повод поправить
    // названия, а не причина мигать то одним, то другим.
    if (chamber !== null && !byChamber.has(chamber)) {
      byChamber.set(chamber, device);
    }
  }

  return byChamber;
}

function RoomShape({
  room,
  device,
  selected,
  onSelect,
}: {
  room: PlanRoom;
  device?: Device;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const isChamber = room.kind === 'chamber';

  const temp = device ? temperatureStore.getCurrentTemperature(device.id) : undefined;
  const sensorStatus = device ? temperatureStore.getStatus(device.id) : 'ok';
  const alarm = device ? temperatureStore.getAlarm(device.id) : null;

  const level = device ? alarmLevel(alarm) : 'unknown';

  const classes = [
    'plan__room',
    `plan__room--${room.kind}`,
    isChamber ? `plan__room--${level}` : '',
    selected ? 'plan__room--selected' : '',
    isChamber && device ? 'plan__room--clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Подпись температуры: у неисправного датчика число в модуле старое,
  // поэтому вместо него - причина.
  const reading = !device
    ? 'нет датчика'
    : isFault(sensorStatus)
      ? statusLabel(sensorStatus)
      : formatTemperature(temp);

  const centreX = room.x + room.w / 2;

  return (
    <g
      className={classes}
      onClick={device ? () => onSelect(device.id) : undefined}
      role={device ? 'button' : undefined}
      tabIndex={device ? 0 : undefined}
      onKeyDown={
        device
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(device.id);
              }
            }
          : undefined
      }
    >
      <rect x={room.x} y={room.y} width={room.w} height={room.h} rx={3} />

      {isChamber ? (
        <>
          <text
            className="plan__label"
            x={centreX}
            y={room.y + 16}
            textAnchor="middle"
          >
            {room.label}
          </text>

          <text
            className="plan__reading"
            x={centreX}
            y={room.y + room.h / 2 + 8}
            textAnchor="middle"
          >
            {reading}
          </text>

          {room.target && (
            <text
              className="plan__target"
              x={centreX}
              y={room.y + room.h - 6}
              textAnchor="middle"
            >
              {room.target}
            </text>
          )}
        </>
      ) : (
        <text
          className="plan__label"
          x={centreX}
          y={room.y + room.h / 2 + 4}
          textAnchor="middle"
        >
          {room.label}
        </text>
      )}
    </g>
  );
}

export default function FloorPlan({ devices, selectedId, onSelect }: Props) {
  const [, tick] = useState(0);

  useEffect(() => {
    const unsubscribe = temperatureStore.changed.subscribe(() => {
      tick((n) => n + 1);
    });

    return unsubscribe;
  }, []);

  const byChamber = devicesByChamber(devices);

  // Камеры рисуются последними, чтобы их рамки и подсветка не оказались
  // под соседними помещениями.
  const ordered = [...PLAN_ROOMS].sort(
    (a, b) => Number(a.kind === 'chamber') - Number(b.kind === 'chamber'),
  );

  return (
    <div className="plan">
      <svg
        className="plan__svg"
        viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="План цеха с температурами камер"
      >
        {ordered.map((room) => {
          const device =
            room.chamber !== undefined ? byChamber.get(room.chamber) : undefined;

          return (
            <RoomShape
              key={room.id}
              room={room}
              device={device}
              selected={device != null && device.id === selectedId}
              onSelect={onSelect}
            />
          );
        })}
      </svg>

      <div className="plan__legend">
        <span className="plan__legend-item plan__legend-item--normal">в норме</span>
        <span className="plan__legend-item plan__legend-item--warning">вне порога</span>
        <span className="plan__legend-item plan__legend-item--critical">неисправность</span>
        <span className="plan__legend-item plan__legend-item--unknown">нет датчика</span>
      </div>
    </div>
  );
}
