import React from 'react';

export function F1Header({ data }) {
  const isCarDataReal = data?.car_data_received === true;
  const sessionStatus = data?.session_status || 'Race Live';

  const currentLap = data?.current_lap
    || (data?.num_laps
      ? Math.max(...Object.values(data.num_laps).map(n => parseInt(n, 10) || 0), 1)
      : 42);
  const totalLaps = data?.total_laps || 53;

  const trackTemp = data?.weather?.track_temp;
  const rain = data?.weather?.rain;

  return (
    <header className="w-full shrink-0 flex flex-col select-none relative z-10 bg-black/40 backdrop-blur-md border-b border-white/5">
      {/* Red F1 accent strip */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[var(--f1-red)] via-[#ff4d4d] to-transparent" />

      <div className="h-14 px-6 sm:px-8 flex items-center justify-between">
        
        {/* ── Left: App Title ── */}
        <div className="flex items-center gap-3">
          {/* Pill badge */}
          <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-[0.15em] uppercase bg-[var(--f1-red)]/20 text-[var(--f1-red)] border border-[var(--f1-red)]/30">
            F1
          </span>
          <span className="text-white font-semibold tracking-[0.08em] text-sm uppercase text-glow-red">
            PUSH TO GO
          </span>
          <span className="text-white/30 text-xs font-light hidden sm:inline">
            · Overtake Prediction Engine
          </span>
          {/* Live indicator */}
          <span
            className={`w-1.5 h-1.5 rounded-full ${isCarDataReal ? 'bg-[var(--f1-accent-green)]' : 'bg-[var(--f1-accent-orange)]'} dot-blink ml-1`}
            title={isCarDataReal ? 'Real car data' : 'Simulated / No car data yet'}
          />
        </div>

        {/* ── Right: Session Badges ── */}
        <div className="flex items-center gap-2.5">

          {/* Weather temperature */}
          {trackTemp && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-mono text-white/70 uppercase tracking-widest">
              <span className="text-white/40">TRK</span>
              <span className="text-white font-medium">{trackTemp}°C</span>
              {rain === '1' && <span className="text-[var(--f1-accent-blue)]">🌧</span>}
            </div>
          )}

          {/* Lap Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-mono text-white/80 uppercase tracking-widest">
            <span className="text-white/40">LAP</span>
            <span className="text-white font-medium">{currentLap}/{totalLaps}</span>
          </div>

          {/* Session Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-mono text-white/80 uppercase tracking-widest">
            <span>{sessionStatus}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
