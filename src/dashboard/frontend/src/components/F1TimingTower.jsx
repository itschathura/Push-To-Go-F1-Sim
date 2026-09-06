import React from 'react';
import { TEAM_COLORS, DRIVER_TEAM } from '../constants';

export function F1TimingTower({ data, selectedDriver, onSelectDriver }) {
  // Sort drivers by position
  const drivers = Object.keys(DRIVER_TEAM).map((dc) => {
    const posStr = data?.positions?.[dc];
    const pos = posStr ? parseInt(posStr, 10) : 99;
    return {
      dc,
      pos,
      gap: data?.gaps_to_leader?.[dc] || '',
      team: DRIVER_TEAM[dc] || '',
    };
  }).sort((a, b) => (a.pos !== b.pos ? a.pos - b.pos : a.dc.localeCompare(b.dc)));

  return (
    <aside className="w-[84px] shrink-0 bg-[#0c0f16] border-r border-[#1e2333] flex flex-col h-full z-10 select-none">
      {/* Column Title */}
      <div className="h-[28px] flex items-center justify-center border-b border-[#1e2333] bg-[#090b10]">
        <span className="text-[0.58rem] font-bold tracking-[1.5px] text-[#6b7280] uppercase font-mono">
          POSITION
        </span>
      </div>

      {/* Driver List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-custom">
        {drivers.map((d, index) => {
          const isSelected = d.dc === selectedDriver;
          const teamColor = TEAM_COLORS[d.team] || '#555';
          const posNum = d.pos === 99 ? index + 1 : d.pos;

          return (
            <div
              key={d.dc}
              onClick={() => onSelectDriver(d.dc)}
              className={`h-[29px] flex items-center px-1.5 cursor-pointer transition-all border-b border-[#141824] ${
                isSelected
                  ? 'bg-[#1e2436]'
                  : 'hover:bg-[#151a27] bg-[#0c0f16]'
              }`}
            >
              {/* Position Number */}
              <div
                className={`w-[20px] h-[20px] rounded-[2px] flex items-center justify-center text-[0.68rem] font-mono font-bold shrink-0 ${
                  isSelected
                    ? 'bg-white text-black font-extrabold shadow'
                    : 'text-[#8890a5]'
                }`}
              >
                {posNum}
              </div>

              {/* Team Color Bar */}
              <div
                className="w-[3px] h-[16px] rounded-full mx-1.5 shrink-0"
                style={{ backgroundColor: teamColor }}
              />

              {/* Driver 3-Letter Code */}
              <div
                className={`text-[0.74rem] font-mono font-bold tracking-wide flex-1 ${
                  isSelected ? 'text-white' : 'text-[#c6ccd9]'
                }`}
              >
                {d.dc}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
