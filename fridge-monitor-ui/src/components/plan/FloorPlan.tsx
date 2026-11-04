import { useEffect, useState } from 'react';

import temperatureStore from '../../store';
import { alarmLevel, isFault, statusLabel } from '../../utils/sensorStatus';
import { formatTemperature } from '../../utils/temperature';

import {
  PLAN_CHAMBERS,
  PLAN_HALLS,
  PLAN_VIEWBOX,
  devicesByChamber,
} from './planData';

import type { PlanChamber } from './planData';
import type { Device } from '../../types/temperature';

interface Props {
  devices: Device[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

// Уже этого подпись внутри комнаты не помещается — поворачиваем её.
const NARROW_ROOM = 70;

// Ниже этой высоты номер и уставка идут одной строкой: на три строки
// места уже не остаётся.
const SHORT_ROOM = 72;

// Ширина символа примерно 0.55 высоты шрифта, поэтому размер подбирается
// под комнату: иначе «нет датчика» на узкой камере залезало бы на соседей.
function fitFont(text: string, maxWidth: number, maxHeight: number): number {
  const byWidth = maxWidth / Math.max(1, text.length * 0.55);

  return Math.max(7, Math.min(maxHeight, byWidth));
}

function ChamberShape({
  room,
  device,
  selected,
  onSelect,
}: {
  room: PlanChamber;
  device?: Device;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const temperature = device
    ? temperatureStore.getCurrentTemperature(device.id)
    : undefined;

  const sensorStatus = device ? temperatureStore.getStatus(device.id) : 'ok';
  const alarm = device ? temperatureStore.getAlarm(device.id) : null;

  const level = device ? alarmLevel(alarm) : 'unknown';

  // У неисправного датчика число в модуле старое, поэтому вместо него —
  // причина: показывать устаревшую температуру было бы обманом.
  const reading = !device
    ? 'нет датчика'
    : isFault(sensorStatus)
      ? statusLabel(sensorStatus)
      : formatTemperature(temperature);

  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;

  const narrow = room.w < NARROW_ROOM;
  const short = room.h < SHORT_ROOM;

  const target = room.target;

  const labelText =
    narrow || short ? `${room.label}${target ? ` · ${target}` : ''}` : room.label;

  const label = narrow
    ? fitFont(labelText, room.h - 12, 11)
    : Math.min(
        fitFont(labelText, room.w - 8, 18),
        Math.max(9, room.h * 0.3),
      );

  // Сколько высоты уже заняли номер и уставка — остаток отдаём числу.
  const header = label + (target && !short && !narrow ? label * 0.8 + 3 : 0) + 6;

  const big = narrow
    ? fitFont(reading, room.h - 14, Math.max(9, Math.min(24, room.w - label - 10)))
    : fitFont(
        reading,
        room.w - 10,
        Math.min(38, room.h * 0.45, Math.max(9, room.h - header - 4)),
      );

  // Число стоит по центру свободной части комнаты, а не у самого низа:
  // в высоких камерах иначе остаётся пустая полоса.
  const readingBaseline =
    room.y + header + (room.h - header - 4) / 2 + big * 0.35;

  const classes = [
    'plan__room',
    'plan__room--chamber',
    `plan__room--${level}`,
    selected ? 'plan__room--selected' : '',
    device ? 'plan__room--clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const gap = 4;

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

      {narrow ? (
        // Узкие камеры (12, 17, 18): подпись и число стоят вдоль комнаты.
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <text
            className="plan__label"
            x={cx}
            y={cy - gap / 2 - big / 2 + label * 0.35}
            textAnchor="middle"
            style={{ fontSize: label }}
          >
            {labelText}
          </text>

          <text
            className="plan__reading"
            x={cx}
            y={cy + gap / 2 + label / 2 + big * 0.35}
            textAnchor="middle"
            style={{ fontSize: big }}
          >
            {reading}
          </text>
        </g>
      ) : (
        <>
          <text
            className="plan__label"
            x={cx}
            y={room.y + label + 3}
            textAnchor="middle"
            style={{ fontSize: label }}
          >
            {labelText}
          </text>

          {target && !short && (
            <text
              className="plan__target"
              x={cx}
              y={room.y + label + 3 + label * 0.8 + 3}
              textAnchor="middle"
              style={{ fontSize: label * 0.8 }}
            >
              {target}
            </text>
          )}

          <text
            className="plan__reading"
            x={cx}
            y={readingBaseline}
            textAnchor="middle"
            style={{ fontSize: big }}
          >
            {reading}
          </text>
        </>
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

  return (
    <div className="plan">
      <svg
        className="plan__svg"
        viewBox={PLAN_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="План цеха с температурами холодильных камер"
      >
        {/* Помещения без датчиков — фон, чтобы план читался как здание. */}
        {PLAN_HALLS.map((hall) => (
          <g className="plan__room plan__room--hall" key={hall.id}>
            <rect x={hall.x} y={hall.y} width={hall.w} height={hall.h} rx={2} />
          </g>
        ))}

        {PLAN_CHAMBERS.map((room) => {
          const device = byChamber.get(room.chamber);

          return (
            <ChamberShape
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
