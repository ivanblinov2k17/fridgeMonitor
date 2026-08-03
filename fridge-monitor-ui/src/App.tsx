import { useEffect } from 'react';

import TemperatureService from './services/TemperatureService';

import DeviceChart from './components/chart/DeviceChart';

export default function App() {
  useEffect(() => {
    TemperatureService.start();

    return () => {
      TemperatureService.stop();
    };
  }, []);

  return (
    <div>
      <h1>Fridge Monitor</h1>

      <DeviceChart deviceId={1} />
    </div>
  );
}
