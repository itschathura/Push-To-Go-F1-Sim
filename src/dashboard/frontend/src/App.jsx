import React, { useState, useEffect } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { F1Header } from './components/F1Header';
import { F1BattleComparison } from './components/F1BattleComparison';
import { F1DriversTable } from './components/F1DriversTable';

export default function App() {
  const { data } = useTelemetry(100);

  // 2-Driver Battle Comparison selection
  const [driverA, setDriverA] = useState('NOR');
  const [driverB, setDriverB] = useState('VER');

  // Auto-select valid drivers if available
  useEffect(() => {
    if (data?.positions) {
      const sorted = Object.entries(data.positions)
        .sort((a, b) => (parseInt(a[1], 10) || 99) - (parseInt(b[1], 10) || 99))
        .map(([dc]) => dc);

      if (sorted.length >= 2) {
        if (!data.positions[driverA]) setDriverA(sorted[1]);
        if (!data.positions[driverB]) setDriverB(sorted[0]);
      }
    }
  }, [data]);

  const handleSelectBattleDriver = (dc, slot) => {
    if (slot === 'A') {
      setDriverA(dc);
    } else if (slot === 'B') {
      setDriverB(dc);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#0d1017] text-[#e6edf3]">
      {/* Header Bar */}
      <F1Header data={data} />

      {/* Main Container: Battle Comparison (top) + Drivers Table (main) */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 2-Driver Battle Comparison */}
        <F1BattleComparison
          data={data}
          driverA={driverA}
          driverB={driverB}
          onSelectDriverA={setDriverA}
          onSelectDriverB={setDriverB}
        />

        {/* Full-Field Telemetry & Overtake Table */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <F1DriversTable
            data={data}
            onSelectBattleDriver={handleSelectBattleDriver}
            selectedA={driverA}
            selectedB={driverB}
          />
        </div>
      </main>
    </div>
  );
}
