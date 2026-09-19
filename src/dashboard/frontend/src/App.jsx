import React, { useState, useEffect } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { F1Header } from './components/F1Header';
import { F1BattleComparison } from './components/F1BattleComparison';
import { F1DriversTable } from './components/F1DriversTable';

export default function App() {
  const { data, error } = useTelemetry(100);

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

  // ── Loading / Error Overlay ──
  const isWaiting = !data || !!data.error || !!error;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#0d1017] text-[#e6edf3]">
      {/* Header Bar */}
      <F1Header data={data} />

      {/* Loading / Error overlay */}
      {isWaiting && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 relative">
          {/* Ambient glow */}
          <div className="ambient-glow-red top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60" />

          {/* Spinner ring */}
          <div
            className="w-16 h-16 rounded-full border-2 border-white/10"
            style={{
              background: 'conic-gradient(from 0deg, #e10600 0%, transparent 70%)',
              WebkitMask: 'radial-gradient(transparent 58%, black 60%)',
              mask: 'radial-gradient(transparent 58%, black 60%)',
              animation: 'spin 1.2s linear infinite',
            }}
          />

          <div className="flex flex-col items-center gap-2 z-10 text-center">
            <span className="text-white font-semibold text-sm tracking-widest uppercase">
              {error ? 'Connection Error' : 'Waiting for live data...'}
            </span>
            <span className="text-white/40 text-xs font-mono max-w-xs">
              {error
                ? error
                : 'Start the tail streamer to begin receiving telemetry.'}
            </span>
          </div>

          {/* Spinner keyframe via inline style tag */}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Main Content */}
      {!isWaiting && (
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
      )}
    </div>
  );
}
