// Схема цеха, перенесённая с чертежа заказчика (1schema.png).
//
// Координаты — пиксели исходного чертежа 1585×1120, поэтому помещения и
// камеры сохраняют взаимное расположение и пропорции: виджет ничего не
// досочиняет, он рисует то же здание. Чтобы добавить камеру (например,
// двадцатую возле ХК №15), достаточно дописать объект в PLAN_CHAMBERS:
// таблица и легенда строятся из этого же списка.

export interface PlanChamber {
  id: string;
  // Номер с чертежа. По нему камера связывается с датчиком.
  chamber: number;
  label: string;
  // Уставка, как подписана на чертеже.
  target?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Помещения без датчиков: коридоры, лестницы, подсобки. Нужны только
// для того, чтобы план читался как здание, а не как набор камер.
export interface PlanHall {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Область чертежа без пустых полей и без таблицы, которая теперь живёт
// в HTML рядом со схемой.
export const PLAN_VIEWBOX = '50 15 1470 1030';

export const PLAN_CHAMBERS: PlanChamber[] = [
  // Верхний блок.
  {
    id: 'hk16', chamber: 16, label: 'ХК №16', target: '−30 °C',
    x: 944, y: 29, w: 147, h: 64,
  },
  {
    id: 'hk4', chamber: 4, label: 'ХК №4', target: '−30 °C',
    x: 1109, y: 94, w: 88, h: 96,
  },
  {
    id: 'hk8', chamber: 8, label: 'ХК №8', target: '−30 °C',
    x: 1197, y: 94, w: 93, h: 96,
  },

  // Правая часть.
  {
    id: 'hk5', chamber: 5, label: 'ХК №5', target: '−30 °C',
    x: 1047, y: 281, w: 146, h: 119,
  },
  {
    id: 'hk6', chamber: 6, label: 'ХК №6', target: '−30 °C',
    x: 1253, y: 330, w: 81, h: 73,
  },
  {
    id: 'hk7', chamber: 7, label: 'ХК №7', target: '−18 °C',
    x: 1117, y: 502, w: 177, h: 185,
  },
  {
    id: 'hk11', chamber: 11, label: 'ХК №11', target: '−30 °C',
    x: 1347, y: 465, w: 127, h: 83,
  },
  {
    id: 'hk1', chamber: 1, label: 'ХК №1', target: '−18 °C',
    x: 889, y: 669, w: 90, h: 79,
  },
  {
    id: 'hk2', chamber: 2, label: 'ХК №2', target: '−18 °C',
    x: 980, y: 669, w: 102, h: 79,
  },
  {
    id: 'hk19', chamber: 19, label: 'ХК №19', target: '0…+4 °C',
    x: 1117, y: 696, w: 154, h: 55,
  },
  {
    id: 'hk15', chamber: 15, label: 'ХК №15', target: '−30 °C',
    x: 890, y: 754, w: 189, h: 119,
  },
  {
    id: 'hk10', chamber: 10, label: 'ХК №10', target: '−30 °C',
    x: 1385, y: 752, w: 91, h: 76,
  },

  // Центральная часть.
  {
    id: 'hk3', chamber: 3, label: 'ХК №3', target: '0…+4 °C',
    x: 782, y: 336, w: 187, h: 218,
  },

  // Левое крыло.
  {
    id: 'hk12', chamber: 12, label: 'ХК №12', target: '−18 °C',
    x: 100, y: 264, w: 36, h: 150,
  },
  {
    id: 'hk13', chamber: 13, label: 'ХК №13', target: '0…+4 °C',
    x: 281, y: 278, w: 120, h: 213,
  },
  {
    id: 'hk17', chamber: 17, label: 'ХК №17', target: '−18 °C',
    x: 178, y: 829, w: 37, h: 179,
  },
  {
    id: 'hk18', chamber: 18, label: 'ХК №18', target: '−18 °C',
    x: 218, y: 829, w: 37, h: 179,
  },
  {
    id: 'hk14', chamber: 14, label: 'ХК №14', target: '−18 °C',
    x: 255, y: 856, w: 132, h: 116,
  },
  {
    id: 'hk9', chamber: 9, label: 'ХК №9', target: '+2…+10 °C',
    x: 391, y: 860, w: 222, h: 100,
  },
];

// Не пересекаются с камерами: иначе полупрозрачная заливка камеры
// показывала бы сквозь себя чужие стены.
export const PLAN_HALLS: PlanHall[] = [
  { id: 'corr-west', x: 160, y: 249, w: 75, h: 242 },
  { id: 'hall-left', x: 404, y: 278, w: 375, h: 213 },
  { id: 'hall-left-south', x: 524, y: 494, w: 255, h: 51 },
  { id: 'notch', x: 298, y: 494, w: 80, h: 40 },
  { id: 'lobby-north', x: 782, y: 95, w: 158, h: 214 },
  { id: 'vestibule', x: 782, y: 311, w: 105, h: 67 },
  { id: 'hall-north-east', x: 1299, y: 100, w: 211, h: 163 },
  { id: 'column-east-1', x: 1347, y: 244, w: 127, h: 219 },
  { id: 'column-east-2', x: 1347, y: 559, w: 127, h: 183 },
  { id: 'hall-narrow', x: 972, y: 336, w: 74, h: 218 },
  { id: 'hall-mid', x: 837, y: 557, w: 50, h: 73 },
  { id: 'hall-south-1', x: 1274, y: 696, w: 62, h: 46 },
  { id: 'hall-south-2', x: 1082, y: 752, w: 110, h: 42 },
  { id: 'hall-south-3', x: 1203, y: 752, w: 87, h: 33 },
  { id: 'hall-south-4', x: 1299, y: 752, w: 84, h: 76 },
  { id: 'stairs-south-west-1', x: 116, y: 808, w: 42, h: 116 },
  { id: 'stairs-south-west-2', x: 69, y: 859, w: 94, h: 166 },
];


// Номер камеры из названия датчика: "ХК №3", "ХК3", "Fridge #3".
// "Sensor 2.1" намеренно не подходит — там номер модуля и входа.
const CHAMBER_IN_NAME = /(?:хк|fridge|камера)\s*[№#]?\s*(\d{1,2})\b/i;

export function chamberFromName(name: string): number | null {
  const match = CHAMBER_IN_NAME.exec(name);

  return match ? Number(match[1]) : null;
}


// Датчик на камеру. Первый выигрывает: два датчика с одним номером —
// повод поправить названия, а не причина мигать то одним, то другим.
export function devicesByChamber<T extends { name: string }>(
  devices: T[],
): Map<number, T> {
  const byChamber = new Map<number, T>();

  for (const device of devices) {
    const chamber = chamberFromName(device.name);

    if (chamber !== null && !byChamber.has(chamber)) {
      byChamber.set(chamber, device);
    }
  }

  return byChamber;
}


// Номера камер, которые есть на чертеже. Таблица берёт их как основу:
// камера без датчика всё равно остаётся в списке, но с прочерком.
export const PLAN_CHAMBER_NUMBERS: number[] = PLAN_CHAMBERS
  .map((room) => room.chamber)
  .sort((a, b) => a - b);
