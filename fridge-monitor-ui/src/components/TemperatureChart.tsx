// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
// } from 'recharts';

// import type { TemperatureEvent } from '../types/temperature';

// interface Props {
//   title: string;
//   data: TemperatureEvent[];
// }

// export default function TemperatureChart({ title, data }: Props) {
//   return (
//     <div style={{ height: 300 }}>
//       <h3>{title}</h3>

//       <ResponsiveContainer>
//         <LineChart data={data}>
//           <XAxis dataKey="timestamp" />

//           <YAxis domain={['auto', 'auto']} />

//           <Tooltip />

//           <Line type="monotone" dataKey="temperature" stroke="#2563eb" />
//         </LineChart>
//       </ResponsiveContainer>
//     </div>
//   );
// }
