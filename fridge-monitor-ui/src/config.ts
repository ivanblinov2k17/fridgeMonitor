// Base URL of the backend API.
//
// Set VITE_API_URL at build time to point at a backend on another host. An
// empty value means same origin: the page is served by a proxy that forwards
// the API, so no server address needs to be known when the bundle is built.
// Left unset, it falls back to the local backend for `npm run dev`.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';


function websocketUrl(): string {

  if (API_BASE_URL) {
    // Derived from the API URL so https deployments get wss.
    return API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
  }

  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';

  return `${scheme}://${window.location.host}/ws`;
}


export const WS_URL = websocketUrl();
