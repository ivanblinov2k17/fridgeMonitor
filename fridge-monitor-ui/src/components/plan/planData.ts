// Схематичный план цеха, срисованный с чертежа заказчика.
//
// Это схема, а не чертёж: пропорции и размеры комнат приблизительные,
// важно взаимное расположение и то, какая камера где. Размеры в единицах
// viewBox, не в метрах.

export type RoomKind = 'chamber' | 'room' | 'yard';

export interface PlanRoom {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: RoomKind;
  // Номер ХК с чертежа. По нему комната связывается с датчиком.
  chamber?: number;
  // Уставка с чертежа, как подписано там же.
  target?: string;
}

export const PLAN_WIDTH = 1000;
export const PLAN_HEIGHT = 560;

export const PLAN_ROOMS: PlanRoom[] = [
  // ---- Левая часть: двор и камеры по периметру ----

  { id: 'substation', label: 'Подстанция', x: 20, y: 14, w: 86, h: 34, kind: 'room' },

  { id: 'hk12', label: 'ХК 12', x: 20, y: 60, w: 46, h: 96, kind: 'chamber', chamber: 12, target: '−18 °C' },

  { id: 'hk13', label: 'ХК 13', x: 96, y: 60, w: 118, h: 74, kind: 'chamber', chamber: 13, target: '0…+4 °C' },

  { id: 'shop', label: 'Цех обвалки-фасовки', x: 228, y: 60, w: 196, h: 92, kind: 'room' },

  { id: 'kpp2', label: 'КПП-2', x: 96, y: 146, w: 86, h: 32, kind: 'room' },

  { id: 'street', label: 'Улица', x: 96, y: 190, w: 328, h: 150, kind: 'yard' },

  { id: 'hk17', label: 'ХК 17', x: 20, y: 190, w: 64, h: 44, kind: 'chamber', chamber: 17, target: '−18 °C' },

  { id: 'hk18', label: 'ХК 18', x: 20, y: 246, w: 64, h: 44, kind: 'chamber', chamber: 18, target: '−18 °C' },

  { id: 'hk9', label: 'ХК 9', x: 254, y: 352, w: 170, h: 58, kind: 'chamber', chamber: 9, target: '0…+4 °C' },

  { id: 'hk14', label: 'ХК 14', x: 60, y: 352, w: 180, h: 58, kind: 'chamber', chamber: 14, target: '−18 °C' },

  { id: 'tbo', label: 'Зона ТБО', x: 60, y: 422, w: 180, h: 44, kind: 'room' },

  // ---- Правая часть: производственный блок ----

  { id: 'washing', label: 'Мойка', x: 440, y: 14, w: 74, h: 42, kind: 'room' },

  { id: 'defr', label: 'Дефр.', x: 522, y: 14, w: 78, h: 42, kind: 'room' },

  { id: 'production', label: 'Участок пр-ва', x: 608, y: 14, w: 130, h: 56, kind: 'room' },

  { id: 'hk16', label: 'ХК 16', x: 746, y: 14, w: 92, h: 56, kind: 'chamber', chamber: 16, target: '−32 °C' },

  { id: 'stairs', label: 'Лестница 1-2 эт.', x: 846, y: 14, w: 134, h: 42, kind: 'room' },

  { id: 'water', label: 'Подг. воды', x: 608, y: 80, w: 92, h: 50, kind: 'room' },

  { id: 'massir', label: 'Массир', x: 708, y: 80, w: 76, h: 50, kind: 'room' },

  { id: 'hk8', label: 'ХК 8', x: 792, y: 80, w: 76, h: 50, kind: 'chamber', chamber: 8, target: '−32 °C' },

  { id: 'wardrobe', label: 'Гардероб', x: 876, y: 64, w: 104, h: 40, kind: 'room' },

  { id: 'kpp1', label: 'КПП-1', x: 876, y: 112, w: 50, h: 36, kind: 'room' },

  { id: 'entrance', label: 'Вход', x: 932, y: 112, w: 48, h: 36, kind: 'room' },

  { id: 'hk3', label: 'ХК 3', x: 440, y: 80, w: 90, h: 62, kind: 'chamber', chamber: 3, target: '0…+4 °C' },

  { id: 'hk5', label: 'ХК 5', x: 792, y: 140, w: 76, h: 48, kind: 'chamber', chamber: 5, target: '−32 °C' },

  { id: 'hk6', label: 'ХК 6', x: 792, y: 196, w: 76, h: 48, kind: 'chamber', chamber: 6, target: '−32 °C' },

  { id: 'wc', label: 'Туалет', x: 876, y: 158, w: 104, h: 36, kind: 'room' },

  { id: 'hk4', label: 'ХК 4', x: 440, y: 152, w: 90, h: 62, kind: 'chamber', chamber: 4, target: '0…+4 °C' },

  { id: 'operators', label: 'Операторы · Зона отгрузки', x: 540, y: 152, w: 128, h: 62, kind: 'room' },

  { id: 'cps', label: 'ЦПС', x: 876, y: 206, w: 104, h: 44, kind: 'room' },

  { id: 'hk11', label: 'ХК 11', x: 792, y: 254, w: 76, h: 48, kind: 'chamber', chamber: 11 },

  { id: 'hk7', label: 'ХК 7', x: 676, y: 224, w: 104, h: 78, kind: 'chamber', chamber: 7, target: '−18 °C' },

  { id: 'hk1', label: 'ХК 1', x: 440, y: 224, w: 88, h: 60, kind: 'chamber', chamber: 1, target: '−18 °C' },

  { id: 'hk2', label: 'ХК 2', x: 540, y: 224, w: 88, h: 60, kind: 'chamber', chamber: 2, target: '−18 °C' },

  { id: 'cpf', label: 'ЦПФ', x: 876, y: 262, w: 104, h: 44, kind: 'room' },

  { id: 'hk15', label: 'ХК 15', x: 440, y: 296, w: 88, h: 62, kind: 'chamber', chamber: 15, target: '−18 °C' },

  { id: 'compressors', label: 'Возд. компрессоры', x: 540, y: 314, w: 128, h: 44, kind: 'room' },

  { id: 'hk10', label: 'ХК 10', x: 792, y: 314, w: 88, h: 58, kind: 'chamber', chamber: 10, target: '−32 °C' },

  { id: 'locksmith', label: 'Слесарка', x: 680, y: 314, w: 100, h: 44, kind: 'room' },

  { id: 'cup', label: 'ЦУП', x: 540, y: 370, w: 128, h: 40, kind: 'room' },
];


// Номер камеры из названия датчика: "ХК№3", "ХК 3", "Fridge #3".
// "Sensor 2.1" намеренно не подходит - там номер модуля и входа, а не
// камеры, и угадывать по нему нельзя.
const CHAMBER_IN_NAME = /(?:хк|fridge|камера)\s*[№#]?\s*(\d{1,2})\b/i;

export function chamberFromName(name: string): number | null {
  const match = CHAMBER_IN_NAME.exec(name);

  return match ? Number(match[1]) : null;
}
