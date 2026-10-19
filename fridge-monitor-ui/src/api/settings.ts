import { api } from "./client";


export interface AppSettings {
    poll_interval_seconds: number;
    poll_interval_choices: number[];
    raw_retention_days: number;
    rollup_bucket_seconds: number;
}


export async function getSettings(): Promise<AppSettings> {

    const response = await api.get<AppSettings>("/settings");

    return response.data;
}


export async function setPollInterval(
    seconds: number,
): Promise<AppSettings> {

    const response = await api.patch<AppSettings>(
        "/settings",
        { poll_interval_seconds: seconds },
    );

    return response.data;
}
