import React from 'react';

export function F1Header({ data }) {
  const weather = data?.weather || {};
  const isRaining = weather.rain === '1';

  return (
    <header className="w-full shrink-0 flex flex-col bg-[#0d1017] border-b border-[#212635] shadow-lg select-none">
      {/* Top Clean F1 Banner */}
      <div className="h-12 bg-[#e10600] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* F1 Logo SVG */}
          <svg className="h-5 w-auto fill-white" viewBox="0 0 100 24">
            <path d="M 0 20 L 12 0 L 28 0 L 16 20 Z M 20 20 L 32 0 L 48 0 L 36 20 Z M 52 0 L 38 20 L 52 20 L 60 8 L 84 8 L 82 12 L 68 12 L 64 16 L 80 16 L 76 20 L 96 20 L 100 0 Z" />
          </svg>
          <div className="h-4 w-[1px] bg-white/30" />
          <div className="flex items-center gap-2">
            <span className="text-white font-mono font-black text-sm tracking-wider uppercase">
              PUSH TO GO
            </span>
            <span className="text-white/80 font-sans text-xs font-semibold uppercase tracking-wider hidden sm:inline">
              LIVE OVERTAKE & TELEMETRY DASHBOARD
            </span>
          </div>
        </div>

        {/* Right Badges: Current Lap + Live Status */}
        <div className="flex items-center gap-3">
          {/* Current Lap Display */}
          <div className="flex items-center gap-2 bg-black/40 px-3.5 py-1 rounded-full text-xs font-mono font-bold text-white border border-white/20 shadow-inner">
            <span className="text-[#ffd600] font-black uppercase tracking-wider">LAP</span>
            <span className="text-white font-black text-sm tracking-wide">
              {data?.current_lap || (data?.num_laps ? Math.max(...Object.values(data.num_laps).map(n => parseInt(n, 10) || 0), 1) : 14)}
              <span className="text-[#8b949e] font-normal text-xs ml-1">/ {data?.total_laps || 53}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-full text-xs font-mono font-bold text-white border border-white/10">
            <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
            <span>SESSION LIVE</span>
          </div>
        </div>
      </div>

      {/* Environmental & Weather Telemetry Bar */}
      <div className="h-9 bg-[#121622] px-6 flex items-center justify-between text-xs font-mono text-[#8b949e] border-t border-[#1c2230]">
        <div className="flex items-center gap-6">
          <span className="text-white font-bold">
            TRACK: <span className="text-[#ff9100]">{weather.track_temp ? `${weather.track_temp}°C` : '56.2°C'}</span>
          </span>
          <span className="text-white font-bold">
            AIR: <span className="text-[#58a6ff]">{weather.air_temp ? `${weather.air_temp}°C` : '31.5°C'}</span>
          </span>
          <span className="hidden sm:inline text-white font-bold">
            HUMIDITY: <span className="text-[#c9d1d9]">{weather.humidity ? `${weather.humidity}%` : '38%'}</span>
          </span>
          <span className="text-white font-bold">
            TRACK COND: <span className={isRaining ? 'text-[#ff5252] font-black' : 'text-[#00e676] font-bold'}>{isRaining ? '🌧️ WET' : '☀️ DRY'}</span>
          </span>
        </div>

        <div className="text-[11px] text-[#6e7681]">
          <span>STREAM: <strong className="text-[#58a6ff] font-bold">MONZA 2026</strong></span>
        </div>
      </div>
    </header>
  );
}
