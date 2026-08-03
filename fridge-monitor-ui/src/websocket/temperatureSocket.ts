// import type { TemperatureEvent } from '../types/temperature';

// export function createTemperatureSocket(
//   callback: (event: TemperatureEvent) => void,
// ) {
//   const socket = new WebSocket('ws://127.0.0.1:8000/ws');

//   socket.onmessage = (event) => {
//     const data = JSON.parse(event.data);

//     callback(data);
//   };

//   return socket;
// }
