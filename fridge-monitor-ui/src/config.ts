// Base URL of the backend API.
// Set VITE_API_URL at build time to point at the deployed backend.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

// Websocket endpoint, derived from the API URL so https deployments get wss.
export const WS_URL =
  API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
