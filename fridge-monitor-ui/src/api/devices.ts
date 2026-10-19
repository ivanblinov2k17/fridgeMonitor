import { api } from "./client";

import type { Device } from "../types/temperature";


export async function getDevices(): Promise<Device[]> {

    const response = await api.get<Device[]>(
        "/devices"
    );

    return response.data;
}


export interface DeviceUpdate {
    name?: string;
    location?: string;
    // null stops that end being watched.
    min_temp?: number | null;
    max_temp?: number | null;
}


export async function updateDevice(
    id: number,
    update: DeviceUpdate,
): Promise<Device> {

    const response = await api.patch<Device>(
        `/devices/${id}`,
        update,
    );

    return response.data;
}