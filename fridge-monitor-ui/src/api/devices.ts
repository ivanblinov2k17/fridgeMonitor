import { api } from "./client";

import type { Device } from "../types/temperature";


export async function getDevices(): Promise<Device[]> {

    const response = await api.get<Device[]>(
        "/devices"
    );

    return response.data;
}