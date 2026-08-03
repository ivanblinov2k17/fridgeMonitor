import RingBuffer from "./RingBuffer";

import type {
    TemperaturePoint
} from "../types/temperature";

export default class DeviceHistory {

    readonly buffer =
        new RingBuffer<TemperaturePoint>(3600);

    lastTemperature = 0;

}