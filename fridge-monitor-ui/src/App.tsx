import { useEffect, useMemo, useRef, useState } from 'react';

import { getDevices } from './api/devices';
import AverageChart from './components/chart/AverageChart';
import DeviceChart from './components/chart/DeviceChart';
import EventLog from './components/dashboard/EventLog';
import ExportPanel from './components/dashboard/ExportPanel';
import FridgeCard from './components/dashboard/FridgeCard';
import Header from './components/dashboard/Header';
import LimitsPanel from './components/dashboard/LimitsPanel';
import SummaryStats from './components/dashboard/SummaryStats';
import { loadAllDeviceHistory } from './services/historyLoader';
import TemperatureService from './services/TemperatureService';
import temperatureStore from './store';

import type { Device } from './types/temperature';

import './App.css';

function applyStatuses(deviceList: Device[]) {
  for (const device of deviceList) {
    temperatureStore.setStatus(device.id, device.status ?? 'ok');
    temperatureStore.setAlarm(device.id, device.alarm ?? null);
  }
}

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);
  const devicesRef = useRef<Device[]>([]);
  const hadConnectionRef = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const deviceList = await getDevices();
        if (cancelled) return;

        // Ref first: status updates emit, and the store listener treats ids
        // missing from the ref as unknown devices.
        devicesRef.current = deviceList;
        applyStatuses(deviceList);
        setDevices(deviceList);

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

    // The backend creates devices as it finds sensors on the line, so a
    // reading for an id not in the list means the list is out of date.
    async function refreshDevices() {
      if (refreshingRef.current) return;
      refreshingRef.current = true;

      try {
        const deviceList = await getDevices();
        if (cancelled) return;

        const known = new Set(devicesRef.current.map((d) => d.id));
        const added = deviceList.filter((d) => !known.has(d.id));

        devicesRef.current = deviceList;
        applyStatuses(deviceList);
        setDevices(deviceList);
        setSelectedId((current) => current ?? deviceList[0]?.id ?? null);

        await loadAllDeviceHistory(added, 1);
      } catch {
        // Next unknown reading will try again.
      } finally {
        refreshingRef.current = false;
      }
    }

    const unsubStore = temperatureStore.changed.subscribe((deviceId) => {
      if (!devicesRef.current.some((d) => d.id === deviceId)) {
        refreshDevices();
      }
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

  // Saving limits returns the device as it now stands, including whether
  // the change opened or cleared an alarm.
  function applyDeviceUpdate(updated: Device) {
    setDevices((current) =>
      current.map((device) => (device.id === updated.id ? updated : device)),
    );

    devicesRef.current = devicesRef.current.map((device) =>
      device.id === updated.id ? updated : device,
    );

    temperatureStore.setAlarm(updated.id, updated.alarm ?? null);
  }

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
            {selectedDevice && (
              <LimitsPanel device={selectedDevice} onSaved={applyDeviceUpdate} />
            )}
            <AverageChart deviceIds={deviceIds} />
            <EventLog />
            <ExportPanel devices={devices} />
          </section>
        </>
      )}
    </div>
  );
}
