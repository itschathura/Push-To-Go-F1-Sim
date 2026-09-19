import React, { useMemo } from 'react';
import { DRIVER_FULL_NAMES, DRIVER_TEAM } from '../constants';
import { computeOvertakeProbability } from './F1DriversTable';

export function F1BattleComparison({ data, driverA, driverB, onSelectDriverA, onSelectDriverB }) {
  const getDriverData = (dc) => {
    if (!dc || !data) return null;
    const tel = data?.telemetry?.[dc] || {};
    const meta = data?.driver_meta?.[dc] || {};
    const pos = data?.positions?.[dc] || '-';
    
    const fullName = meta.full_name || DRIVER_FULL_NAMES[dc] || dc;
    const surname = fullName.split(' ').pop().toUpperCase();
    
    return {
      dc,
      pos,
      surname,
      speed: tel.speed || 0,
      soc: tel.soc !== undefined && tel.soc !== null ? tel.soc : 100,
      gapSeconds: tel.gap_seconds || 0,
    };
  };

  const dA = getDriverData(driverA);
  const dB = getDriverData(driverB);

  // Sorted driver list for the selectors
  const driverOptions = useMemo(() => {
    if (!data?.positions) return [];
    return Object.entries(data.positions)
      .sort((a, b) => (parseInt(a[1], 10) || 99) - (parseInt(b[1], 10) || 99))
      .map(([dc, pos]) => ({ dc, pos }));
  }, [data]);

  const battleMetrics = useMemo(() => {
    if (!dA || !dB) return null;

    // NaN guard: fall back to 99 if pos can't be parsed
    const posA = parseInt(dA.pos, 10) || 99;
    const posB = parseInt(dB.pos, 10) || 99;

    const aIsBehind = posA > posB;
    const isTied = posA === posB;
    const attacker = (aIsBehind || isTied) ? dA : dB;
    const defender = (aIsBehind || isTied) ? dB : dA;

    const speedDelta = attacker.speed - defender.speed;
    const socDelta = attacker.soc - defender.soc;

    const getGapToLeader = (dc) => {
      const gapStr = data?.gaps_to_leader?.[dc];
      if (!gapStr) return 0;
      const clean = String(gapStr).replace('+', '').replace('s', '').replace('LAP', '').trim();
      if (clean.includes('L')) return 999;
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    const gapLeaderA = getGapToLeader(dA.dc);
    const gapLeaderB = getGapToLeader(dB.dc);
    let battleGap = Math.abs(gapLeaderA - gapLeaderB);
    
    if (battleGap === 0 || isNaN(battleGap) || battleGap > 100) {
      if (attacker.gapSeconds > 0 && Math.abs(posA - posB) === 1) {
         battleGap = attacker.gapSeconds;
      } else {
         battleGap = 0.42;
      }
    }

    const tel = data?.telemetry?.[attacker.dc] || {};
    const tire = data?.tires?.[attacker.dc] || {};
    const defTire = data?.tires?.[defender.dc] || {};
    const defTel = data?.telemetry?.[defender.dc] || {};

    const ov = computeOvertakeProbability(attacker.dc, tel, battleGap, tire, defTire, defTel);

    return {
      attacker,
      defender,
      speedDelta,
      socDelta,
      ov,
    };
  }, [dA, dB, data]);

  // Shared select styling
  const selectClass =
    'bg-[#1a1a1a] border border-white/10 text-white text-[11px] font-mono uppercase tracking-widest rounded-md px-2 py-1 outline-none focus:border-[var(--f1-red)] cursor-pointer hover:border-white/30 transition-colors';

  return (
    <div className="flex justify-center items-center py-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="ambient-glow-red top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2"></div>
      <div className="ambient-glow-blue top-1/2 right-1/4 -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="relative z-10 w-full max-w-4xl px-6">
        <div className="bg-[#121212]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 flex items-center justify-between shadow-2xl">
          
          {/* Driver A (Attacker) */}
          <div className="flex-1 flex flex-col items-start gap-4">
            {/* Driver A selector */}
            {driverOptions.length > 0 && (
              <select
                className={selectClass}
                value={driverA}
                onChange={(e) => onSelectDriverA && onSelectDriverA(e.target.value)}
                aria-label="Select Driver A"
              >
                {driverOptions.map(({ dc, pos }) => (
                  <option key={dc} value={dc}>
                    P{pos} — {dc}
                  </option>
                ))}
              </select>
            )}
            <h2 className="text-4xl font-semibold tracking-wide text-white">
              {battleMetrics?.attacker.surname ?? driverA}
            </h2>
            {battleMetrics && (
              <div className="flex gap-8">
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[11px] text-white/50 uppercase tracking-widest font-medium">Closing Speed</span>
                  <span className="text-lg text-white font-mono font-medium">
                    {battleMetrics.speedDelta > 0 ? '+' : ''}{battleMetrics.speedDelta.toFixed(1)} km/h
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[11px] text-white/50 uppercase tracking-widest font-medium">Energy Advantage</span>
                  <span className="text-lg text-white font-mono font-medium">
                    {battleMetrics.socDelta > 0 ? '+' : ''}{battleMetrics.socDelta.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Center Probability Ring */}
          {battleMetrics && (
            <div className="shrink-0 flex flex-col items-center justify-center px-12 relative">
               <div className="w-32 h-32 rounded-full border-4 border-white/5 flex items-center justify-center relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] bg-black/20">
                 <div 
                    className="absolute inset-[-4px] rounded-full" 
                    style={{
                      background: `conic-gradient(from 0deg, #ff9100 0%, #e10600 ${battleMetrics.ov.pct}%, transparent ${battleMetrics.ov.pct}%)`,
                      WebkitMask: 'radial-gradient(transparent 58%, black 60%)',
                      mask: 'radial-gradient(transparent 58%, black 60%)',
                    }}
                 ></div>
                 
                 <div className="flex flex-col items-center justify-center relative z-10">
                   <span className="text-4xl font-bold tracking-tighter text-white">
                     {battleMetrics.ov.pct}<span className="text-xl">%</span>
                   </span>
                   <span className="text-[9px] uppercase tracking-[0.2em] text-white/50 mt-1">
                     PASS PROB
                   </span>
                 </div>
               </div>
               {/* Battle label */}
               <span className={`mt-3 px-3 py-1 rounded-full text-[9px] font-bold tracking-[0.1em] uppercase ${battleMetrics.ov.class}`}>
                 {battleMetrics.ov.label}
               </span>
            </div>
          )}

          {/* Driver B (Defender) */}
          <div className="flex-1 flex flex-col items-end gap-4 text-right">
            {/* Driver B selector */}
            {driverOptions.length > 0 && (
              <select
                className={selectClass}
                value={driverB}
                onChange={(e) => onSelectDriverB && onSelectDriverB(e.target.value)}
                aria-label="Select Driver B"
              >
                {driverOptions.map(({ dc, pos }) => (
                  <option key={dc} value={dc}>
                    P{pos} — {dc}
                  </option>
                ))}
              </select>
            )}
            <h2 className="text-4xl font-semibold tracking-wide text-white">
              {battleMetrics?.defender.surname ?? driverB}
            </h2>
            {battleMetrics && (
              <div className="flex gap-8 justify-end w-full">
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-[11px] text-white/50 uppercase tracking-widest font-medium">Closing Speed</span>
                  <span className="text-lg text-white font-mono font-medium">
                    {battleMetrics.speedDelta < 0 ? '+' : ''}{-battleMetrics.speedDelta.toFixed(1)} km/h
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-[11px] text-white/50 uppercase tracking-widest font-medium">Energy Advantage</span>
                  <span className="text-lg text-white font-mono font-medium">
                    {battleMetrics.socDelta < 0 ? '+' : ''}{-battleMetrics.socDelta.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
