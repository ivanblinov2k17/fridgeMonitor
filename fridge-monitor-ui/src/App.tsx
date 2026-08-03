import { useEffect, useMemo, useRef, useState } from 'react';

import { getDevices } from './api/devices';
import AverageChart from './components/chart/AverageChart';
import DeviceChart from './components/chart/DeviceChart';
import FridgeCard from './components/dashboard/FridgeCard';
import Header from './components/dashboard/Header';
import SummaryStats from './components/dashboard/SummaryStats';
import { loadAllDeviceHistory } from './services/historyLoader';
import TemperatureService from './services/TemperatureService';
import temperatureStore from './store';

import type { Device } from './types/temperature';

import './App.css';

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);
  const devicesRef = useRef<Device[]>([]);
  const hadConnectionRef = useRef(false);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const deviceList = await getDevices();
        if (cancelled) return;

        setDevices(deviceList);
        devicesRef.current = deviceList;

        if (deviceList.length > 0) {
          setSelectedId(deviceList[0].id);
        }

        await loadAllDeviceHistory(deviceList, 1);
      } finally {
        if (!cancelled) setLoading(false);
      }

      TemperatureService.start();
    }

    init();

    const unsubConnection = TemperatureService.onConnectionChange(async (isConnected) => {
      setConnected(isConnected);

      if (isConnected && hadConnectionRef.current && devicesRef.current.length > 0) {
        await loadAllDeviceHistory(devicesRef.current, 1);
      }

      if (isConnected) {
        hadConnectionRef.current = true;
      }
    });

    const unsubStore = temperatureStore.changed.subscribe(() => {
      tick((n) => n + 1);
    });

    return () => {
      cancelled = true;
      unsubConnection();
      unsubStore();
      TemperatureService.stop();
    };
  }, []);

  const selectedDevice = devices.find((d) => d.id === selectedId);
  const deviceIds = useMemo(() => devices.map((d) => d.id), [devices]);

  return (
    <div className="dashboard">
      <Header connected={connected} />

      {loading ? (
        <div className="dashboard-loading">Loading fridge data…</div>
      ) : (
        <>
          <SummaryStats deviceIds={deviceIds} />

          <section className="dashboard-section">
            <h2 className="dashboard-section__title">All Fridges</h2>
            <div className="fridge-grid">
              {devices.map((device) => (
                <FridgeCard
                  key={device.id}
                  device={device}
                  selected={device.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          </section>

          <section className="dashboard-section dashboard-charts">
            {selectedDevice && (
              <DeviceChart
                deviceId={selectedDevice.id}
                deviceName={selectedDevice.name}
                location={selectedDevice.location}
              />
            )}
            <AverageChart deviceIds={deviceIds} />
          </section>
        </>
      )}
    </div>
  );
}
