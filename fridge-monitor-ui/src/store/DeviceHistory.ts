import RingBuffer from "./RingBuffer";

import type {
    TemperaturePoint
} from "../types/temperature";

export default class DeviceHistory {

    readonly buffer =
        new RingBuffer<TemperaturePoint>(3600);

    lastTemperature = 0;

    // "ok" or a fault key; while faulty lastTemperature is stale.
    status = 'ok';

    // Alarm the backend currently has open, or null. Decided there so the
    // log and the dashboard cannot disagree about what counts as an alarm.
    alarm: string | null = null;

}