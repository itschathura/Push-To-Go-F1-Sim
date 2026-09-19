import React, { useMemo } from 'react';
import { DRIVER_FULL_NAMES } from '../constants';

// Same logic as before, just kept for computing percentages locally
export function computeOvertakeProbability(driver, tel, gapAhead, driverTire, aheadTire, aheadTel) {
  if (!tel) return { pct: 0, label: 'CRUISING', class: 'badge-hold' };

  const pred = tel.prediction;
  const gap = gapAhead !== undefined && gapAhead !== null && !isNaN(gapAhead) ? gapAhead : tel.gap_seconds;
  
  if (gap === null || gap === undefined || gap > 5.0 || gap < 0) {
    return { pct: Math.min(10, Math.round((tel.throttle || 0) * 0.1)), label: 'CRUISING', class: 'badge-hold' };
  }

  let baseProb = 15;
  if (gap < 0.4) baseProb += 35;
  else if (gap < 0.8) baseProb += 25;
  else if (gap < 1.5) baseProb += 15;
  else if (gap < 3.0) baseProb += 6;

  if (pred === 1) baseProb += 20;

  const relativeSpeed = aheadTel ? (tel.speed - (aheadTel.speed || tel.speed)) : 0;
  if (relativeSpeed > 10) baseProb += 12;
  else if (relativeSpeed > 4) baseProb += 6;
  else if (relativeSpeed < -5) baseProb -= 8;

  const attackerSoc = tel.soc !== undefined ? tel.soc : 50;
  const defenderSoc = aheadTel?.soc !== undefined ? aheadTel.soc : 50;
  const socDelta = attackerSoc - defenderSoc;

  if (socDelta > 25) baseProb += 10;
  else if (socDelta > 10) baseProb += 5;
  else if (socDelta < -20) baseProb -= 10;
  if (attackerSoc < 20) baseProb -= 14;

  const pct = Math.min(98, Math.max(3, Math.round(baseProb)));

  if (pct >= 75) return { pct, label: 'PUSH TO GO', class: 'badge-push-to-go glow-red' };
  if (pct >= 55) return { pct, label: 'ATTACKING', class: 'badge-attacking' };
  if (pct >= 40) return { pct, label: 'IN BATTLE', class: 'badge-in-battle' };
  return { pct, label: 'CRUISING', class: 'badge-hold' };
}

export function F1DriversTable({ data, onSelectBattleDriver }) {
  
  const parseGapVal = (gapStr) => {
    if (!gapStr) return 999;
    const clean = String(gapStr).replace('+', '').replace('s', '').replace('LAP', '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 999 : num;
  };

  const rows = useMemo(() => {
    if (!data?.positions) return [];
    const list = Object.entries(data.positions).map(([dc, posStr]) => {
      const pos = parseInt(posStr, 10) || 99;
      const tel = data?.telemetry?.[dc] || {};
      const tire = data?.tires?.[dc] || {};
      const meta = data?.driver_meta?.[dc] || {};
      const fullName = meta.full_name || DRIVER_FULL_NAMES[dc] || dc;
      const surname = fullName.split(' ').pop();
      const gapAheadRaw = data?.gaps_to_ahead?.[dc];
      const gapAheadNum = parseGapVal(gapAheadRaw !== undefined && gapAheadRaw !== "" ? gapAheadRaw : tel.gap_seconds);

      return {
        dc,
        pos,
        surname,
        tel,
        tire,
        gapAheadRaw,
        gapAheadNum,
      };
    });

    list.sort((a, b) => a.pos - b.pos);

    for (let i = 0; i < list.length; i++) {
      const current = list[i];
      const ahead = i > 0 ? list[i - 1] : null;
      current.overtake = computeOvertakeProbability(
        current.dc,
        current.tel,
        current.gapAheadNum,
        {}, {}, ahead?.tel
      );
    }
    return list;
  }, [data]);

  if (!data || !data.positions) return null;

  return (
    <div className="flex-1 px-8 pb-10 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full">
        <table className="w-full border-collapse text-left">
          {/* ── Table Header ── */}
          <thead className="sticky top-0 z-20 bg-[var(--f1-bg)]/90 backdrop-blur-md">
            <tr className="border-b border-white/5">
              <th className="py-4 px-4 text-[11px] font-medium text-white/50 uppercase tracking-widest w-16">Pos</th>
              <th className="py-4 px-4 text-[11px] font-medium text-white/50 uppercase tracking-widest">Driver</th>
              <th className="py-4 px-4 text-[11px] font-medium text-white/50 uppercase tracking-widest text-center w-40">Prediction</th>
              <th className="py-4 px-4 text-[11px] font-medium text-white/50 uppercase tracking-widest w-28">Gap</th>
              <th className="py-4 px-4 text-[11px] font-medium text-white/50 uppercase tracking-widest w-28">Speed</th>
              <th className="py-4 px-4 text-[11px] font-medium text-white/50 uppercase tracking-widest w-24">RPM</th>
              <th className="py-4 px-4 text-[11px] font-medium text-white/50 uppercase tracking-widest w-24">Tyre</th>
              <th className="py-4 px-4 text-[11px] font-medium text-white/50 uppercase tracking-widest w-40">Brake</th>
              <th className="py-4 px-4 text-[11px] font-medium text-white/50 uppercase tracking-widest w-40">Throttle</th>
            </tr>
          </thead>

          {/* ── Table Body ── */}
          <tbody className="divide-y divide-white/[0.03]">
            {rows.map((r) => {
              const tel = r.tel;
              const tire = r.tire;
              const spd = tel.speed || 0;
              const rpm = tel.rpm || 0;
              const thr = Math.round(tel.throttle || 0);
              const brk = Math.round(tel.brake || 0);
              const ov = r.overtake;

              let gapAheadDisplay = '—';
              if (r.pos === 1) gapAheadDisplay = 'LEADER';
              else if (r.gapAheadRaw) gapAheadDisplay = r.gapAheadRaw.startsWith('+') ? r.gapAheadRaw : `+${r.gapAheadRaw}`;
              else if (r.gapAheadNum !== 999) gapAheadDisplay = `+${r.gapAheadNum.toFixed(3)}s`;

              return (
                <tr 
                  key={r.dc} 
                  className="table-row-hover transition-colors cursor-pointer group"
                  onClick={() => onSelectBattleDriver && onSelectBattleDriver(r.dc, 'A')}
                >
                  {/* POS */}
                  <td className="py-3 px-4 font-mono text-sm text-white/70">
                    {r.pos}
                  </td>

                  {/* DRIVER */}
                  <td className="py-3 px-4">
                    <span className="font-medium text-[15px] text-white tracking-wide">
                      {r.surname}
                    </span>
                  </td>

                  {/* PREDICTION BADGE */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-[0.1em] uppercase ${ov.class}`}>
                        {ov.label}
                      </span>
                    </div>
                  </td>

                  {/* GAP */}
                  <td className="py-3 px-4 font-mono text-[13px] text-white/60">
                    {gapAheadDisplay}
                  </td>

                  {/* SPEED */}
                  <td className="py-3 px-4 font-mono text-[13px] text-white/80">
                    {spd.toFixed(0)} <span className="text-[10px] text-white/40">km/h</span>
                  </td>

                  {/* RPM */}
                  <td className="py-3 px-4 font-mono text-[13px] text-white/80">
                    {rpm.toLocaleString()}
                  </td>

                  {/* TYRE & AGE */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                        tire.compound === 'SOFT' ? 'bg-[#e10600] text-white' :
                        tire.compound === 'MEDIUM' ? 'bg-[#ffd600] text-black' :
                        tire.compound === 'HARD' ? 'bg-white text-black' :
                        'bg-white/10 text-white border border-white/20'
                      }`}>
                        {tire.compound ? tire.compound.charAt(0) : '?'}
                      </span>
                      <span className="font-mono text-[12px] text-white/60">
                        {tire.laps !== undefined ? `L${tire.laps}` : '-'}
                      </span>
                    </div>
                  </td>

                  {/* BRAKE BAR */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 progress-bar-bg">
                        <div className="progress-bar-fill bg-gradient-brake" style={{ width: `${brk}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] text-white/50">{brk}%</span>
                    </div>
                  </td>

                  {/* THROTTLE BAR */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 progress-bar-bg">
                        <div className="progress-bar-fill bg-gradient-throttle" style={{ width: `${thr}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] text-white/50">{thr}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
