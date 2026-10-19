import { api } from "./client";

import type { AlarmEvent } from "../types/temperature";


export interface EventQuery {
    device_id?: number;
    since?: string;
    until?: string;
    open_only?: boolean;
    limit?: number;
}


export async function getEvents(
    query: EventQuery = {},
): Promise<AlarmEvent[]> {

    const response = await api.get<AlarmEvent[]>(
        "/events",
        { params: query },
    );

    return response.data;
}
