import React from 'react';

export function F1Header({ data }) {
  const isCarDataReal = data?.car_data_received === true;
  const sessionStatus = data?.session_status || 'Race Live';

  const currentLap = data?.current_lap
    || (data?.num_laps
      ? Math.max(...Object.values(data.num_laps).map(n => parseInt(n, 10) || 0), 1)
      : 42); // mock default
  const totalLaps = data?.total_laps || 53;

  return (
    <header className="w-full shrink-0 flex flex-col select-none relative z-10 bg-black/40 backdrop-blur-md border-b border-white/5">
      <div className="h-16 px-6 sm:px-8 flex items-center justify-between">
        
        {/* ── Left: App Title ── */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-white font-medium tracking-[0.1em] text-sm uppercase">
              OVERTAKE PREDICTION ENGINE
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${isCarDataReal ? 'bg-[#00e676]' : 'bg-[#ff9100]'} dot-blink ml-1`} />
          </div>
        </div>

        {/* ── Right: Session Badges ── */}
        <div className="flex items-center gap-3">
          {/* Lap Counter */}
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-mono text-white/80 uppercase tracking-widest">
            <span>LAP</span>
            <span className="text-white font-medium">{currentLap}/{totalLaps}</span>
          </div>

          {/* Session Status */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-mono text-white/80 uppercase tracking-widest">
            <span>{sessionStatus}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
