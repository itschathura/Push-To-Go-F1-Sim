import React, { useState, useMemo } from 'react';
import { TEAM_COLORS, DRIVER_FULL_NAMES, DRIVER_NUMBERS, DRIVER_TEAM } from '../constants';

// Helper for tyre badge styling
function getTyreStyle(compound) {
  const c = (compound || '').toUpperCase();
  switch (c) {
    case 'SOFT':
      return { bg: 'bg-[#e10600]', text: 'text-white', border: 'border-[#ff4d4d]', label: 'S' };
    case 'MEDIUM':
      return { bg: 'bg-[#ffd600]', text: 'text-black font-black', border: 'border-[#ffe655]', label: 'M' };
    case 'HARD':
      return { bg: 'bg-[#ffffff]', text: 'text-black font-black', border: 'border-[#d0d4dc]', label: 'H' };
    case 'INTERMEDIATE':
      return { bg: 'bg-[#00c853]', text: 'text-white font-bold', border: 'border-[#69f0ae]', label: 'I' };
    case 'WET':
      return { bg: 'bg-[#0091ea]', text: 'text-white font-bold', border: 'border-[#40c4ff]', label: 'W' };
    default:
      return { bg: 'bg-[#3b4252]', text: 'text-[#d8dee9]', border: 'border-[#4c566a]', label: '?' };
  }
}

// Compute a realistic overtake probability percentage (0 - 100%)
export function computeOvertakeProbability(driver, tel, gapAhead, driverTire, aheadTire, aheadTel) {
  if (!tel) return { pct: 0, label: 'UNLIKELY', color: 'slate', alert: false };

  const pred = tel.prediction;
  const gap = gapAhead !== undefined && gapAhead !== null && !isNaN(gapAhead) ? gapAhead : tel.gap_seconds;
  
  // If no car ahead or huge gap
  if (gap === null || gap === undefined || gap > 5.0 || gap < 0) {
    return { pct: Math.min(10, Math.round((tel.throttle || 0) * 0.1)), label: 'CRUISING', color: 'slate', alert: false };
  }

  let baseProb = 15;

  // 1. Proximity / Gap factor (continuous inverse scaling)
  if (gap < 0.4) baseProb += 35;
  else if (gap < 0.8) baseProb += 25; // Direct DRS / slipstream draft
  else if (gap < 1.5) baseProb += 15;
  else if (gap < 3.0) baseProb += 6;

  // 2. Machine Learning Model prediction signal
  if (pred === 1) baseProb += 20;

  // 3. Speed & closing delta
  const relativeSpeed = aheadTel ? (tel.speed - (aheadTel.speed || tel.speed)) : 0;
  if (relativeSpeed > 10) baseProb += 12;
  else if (relativeSpeed > 4) baseProb += 6;
  else if (relativeSpeed < -5) baseProb -= 8;

  // 4. Energy Available & SoC Delta (2026 MGU-K Dynamics)
  const attackerSoc = tel.soc !== undefined ? tel.soc : 50;
  const defenderSoc = aheadTel?.soc !== undefined ? aheadTel.soc : 50;
  const socDelta = attackerSoc - defenderSoc;

  // Continuous scaling of energy advantage/deficit
  if (socDelta > 25) baseProb += 10;
  else if (socDelta > 10) baseProb += 5;
  else if (socDelta < -20) baseProb -= 10;

  // Low reserve constraint: limited sustainable MGU-K deploy
  if (attackerSoc < 20) baseProb -= 14;

  // 5. Tyre compound delta
  if (driverTire?.compound === 'SOFT' && aheadTire?.compound === 'HARD') baseProb += 8;
  if (driverTire?.compound === 'MEDIUM' && aheadTire?.compound === 'HARD') baseProb += 4;

  const pct = Math.min(98, Math.max(3, Math.round(baseProb)));

  // Battle Engine States: >75% PUSH TO GO 🔥, 40-74% IN BATTLE ⚡, <40% HOLD / RECHARGE 🔋
  if (pct >= 75) return { pct, label: 'PUSH TO GO', color: 'red', alert: true };
  if (pct >= 55) return { pct, label: 'ATTACKING', color: 'orange', alert: true };
  if (pct >= 40) return { pct, label: 'IN BATTLE', color: 'yellow', alert: false };
  return { pct, label: 'HOLD / RECHARGE', color: 'slate', alert: false };
}

export function F1DriversTable({ data, onSelectBattleDriver, selectedA, selectedB }) {
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, BATTLE, HIGH_PRED, TOP10
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('pos'); // pos, pred, speed, gap
  const [sortAsc, setSortAsc] = useState(true);

  // Parse gap helper
  const parseGapVal = (gapStr) => {
    if (!gapStr) return 999;
    const clean = String(gapStr).replace('+', '').replace('s', '').replace('LAP', '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 999 : num;
  };

  // Build driver rows
  const rows = useMemo(() => {
    if (!data?.positions) return [];
    const list = Object.entries(data.positions).map(([dc, posStr]) => {
      const pos = parseInt(posStr, 10) || 99;
      const tel = data?.telemetry?.[dc] || {};
      const meta = data?.driver_meta?.[dc] || {};
      const tire = data?.tires?.[dc] || {};
      const fullName = meta.full_name || DRIVER_FULL_NAMES[dc] || dc;
      const team = meta.team || DRIVER_TEAM[dc] || 'F1 Team';
      const teamColor = meta.team_color || TEAM_COLORS[team] || '#8b949e';
      const number = meta.number || DRIVER_NUMBERS[dc] || '-';
      
      const gapAheadRaw = data?.gaps_to_ahead?.[dc];
      const gapLeaderRaw = data?.gaps_to_leader?.[dc];
      const gapAheadNum = parseGapVal(gapAheadRaw !== undefined && gapAheadRaw !== "" ? gapAheadRaw : tel.gap_seconds);

      return {
        dc,
        pos,
        fullName,
        team,
        teamColor,
        number,
        tel,
        tire,
        gapAheadRaw,
        gapAheadNum,
        gapLeaderRaw,
      };
    });

    // Sort initially by position
    list.sort((a, b) => a.pos - b.pos);

    // Calculate overtake probability with context of car ahead
    for (let i = 0; i < list.length; i++) {
      const current = list[i];
      const ahead = i > 0 ? list[i - 1] : null;
      current.aheadDriver = ahead;
      current.overtake = computeOvertakeProbability(
        current.dc,
        current.tel,
        current.gapAheadNum,
        current.tire,
        ahead?.tire,
        ahead?.tel
      );
    }

    return list;
  }, [data]);

  // Filtering
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.fullName.toLowerCase().includes(q) || r.dc.toLowerCase().includes(q);
        const matchesTeam = r.team.toLowerCase().includes(q);
        const matchesNum = String(r.number).includes(q);
        if (!matchesName && !matchesTeam && !matchesNum) return false;
      }

      // Filter modes
      if (filterMode === 'BATTLE') {
        return r.gapAheadNum < 1.0 && r.pos > 1;
      }
      if (filterMode === 'HIGH_PRED') {
        return r.overtake.pct >= 55;
      }
      if (filterMode === 'TOP10') {
        return r.pos <= 10;
      }

      return true;
    });
  }, [rows, searchQuery, filterMode]);

  // Sorting
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((a, b) => {
      let diff = 0;
      if (sortField === 'pos') diff = a.pos - b.pos;
      else if (sortField === 'pred') diff = b.overtake.pct - a.overtake.pct;
      else if (sortField === 'speed') diff = (b.tel.speed || 0) - (a.tel.speed || 0);
      else if (sortField === 'gap') diff = a.gapAheadNum - b.gapAheadNum;
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [filteredRows, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'pos' || field === 'gap');
    }
  };

  if (!data || !data.positions) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-[#8b949e] font-mono">
        <div className="w-12 h-12 border-4 border-[#e10600] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-lg font-bold text-white tracking-wider uppercase">Loading Live Telemetry Stream...</p>
        <p className="text-xs text-[#6e7681] mt-1">Connecting to FastAPI and Cassandra telemetry feeds</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1017] text-[#e6edf3] overflow-hidden font-sans border-t border-[#21262d]">
      {/* Control / Filter Bar */}
      <div className="px-5 py-3 bg-[#131722] border-b border-[#262c3b] flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#e10600] flex items-center gap-1.5 mr-1">
            <span className="w-2 h-2 rounded-full bg-[#e10600] animate-pulse" />
            LIVE TELEMETRY & OVERTAKE PROBABILITY
          </span>
          <span className="bg-[#1f2638] text-[#ffd600] border border-[#2e384e] px-2 py-0.5 rounded text-[11px] font-mono font-bold mr-2">
            LAP {data?.current_lap || (data?.num_laps ? Math.max(...Object.values(data.num_laps).map(n => parseInt(n, 10) || 0), 1) : 14)} / {data?.total_laps || 53}
          </span>

          {/* Quick Filter Buttons */}
          <div className="flex items-center bg-[#1b202e] p-0.5 rounded-md border border-[#2d3548]">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all ${
                filterMode === 'ALL'
                  ? 'bg-[#e10600] text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              All Drivers ({rows.length})
            </button>
            <button
              onClick={() => setFilterMode('BATTLE')}
              className={`px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all flex items-center gap-1 ${
                filterMode === 'BATTLE'
                  ? 'bg-[#00e676] text-black font-bold shadow-sm'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              ⚔️ In Battle &lt;1.0s ({rows.filter((r) => r.gapAheadNum < 1.0 && r.pos > 1).length})
            </button>
            <button
              onClick={() => setFilterMode('HIGH_PRED')}
              className={`px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all flex items-center gap-1 ${
                filterMode === 'HIGH_PRED'
                  ? 'bg-[#ff9100] text-black font-bold shadow-sm'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              🔥 Push to Go ({rows.filter((r) => r.overtake.pct >= 55).length})
            </button>
            <button
              onClick={() => setFilterMode('TOP10')}
              className={`px-3 py-1 rounded text-xs font-semibold tracking-wide transition-all ${
                filterMode === 'TOP10'
                  ? 'bg-[#1e8fff] text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              Top 10
            </button>
          </div>
        </div>

        {/* Search Input & Sort Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search driver, # or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1a1f2c] border border-[#2d3548] rounded-md px-3 py-1 pl-8 text-xs text-white placeholder-[#6e7681] focus:outline-none focus:border-[#e10600] w-52 transition-all"
            />
            <svg
              className="w-3.5 h-3.5 text-[#6e7681] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#8b949e] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <span className="text-[11px] font-mono text-[#6e7681]">
            Showing <span className="text-white font-bold">{sortedRows.length}</span> of {rows.length} drivers
          </span>
        </div>
      </div>

      {/* Main Table Viewport */}
      <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
        <table className="w-full border-collapse text-left text-xs font-mono select-none min-w-[1240px]">
          {/* Table Header */}
          <thead className="sticky top-0 z-20 bg-[#141824] text-[#8b949e] uppercase text-[11px] font-bold tracking-wider border-b border-[#282f42] shadow-sm">
            <tr>
              <th
                onClick={() => handleSort('pos')}
                className="py-3 px-3 w-16 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  POS {sortField === 'pos' && (sortAsc ? '▲' : '▼')}
                </div>
              </th>
              <th className="py-3 px-4 min-w-[180px]">DRIVER</th>
              <th
                onClick={() => handleSort('pred')}
                className="py-3 px-4 min-w-[180px] cursor-pointer hover:text-white transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-1 text-[#ff5252]">
                  OVERTAKE PREDICTION {sortField === 'pred' && (sortAsc ? '▲' : '▼')}
                </div>
              </th>
              <th
                onClick={() => handleSort('gap')}
                className="py-3 px-3 w-28 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  GAP AHEAD {sortField === 'gap' && (sortAsc ? '▲' : '▼')}
                </div>
              </th>
              <th className="py-3 px-3 w-24 text-center">TYRE</th>
              <th
                onClick={() => handleSort('speed')}
                className="py-3 px-3 w-32 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  SPEED {sortField === 'speed' && (sortAsc ? '▲' : '▼')}
                </div>
              </th>
              <th className="py-3 px-3 w-28">RPM</th>
              <th className="py-3 px-3 w-32">BRAKE</th>
              <th className="py-3 px-3 w-32">THROTTLE</th>
              <th className="py-3 px-3 w-28">GAP INTERVAL</th>
              <th className="py-3 px-3 w-20 text-center">SOC</th>
              <th className="py-3 px-4 w-32 text-center">BATTLE ACTION</th>
            </tr>
          </thead>


          {/* Table Body */}
          <tbody className="divide-y divide-[#1c2230]">
            {sortedRows.map((r, idx) => {
              const tel = r.tel;
              const spd = tel.speed || 0;
              const rpm = tel.rpm || 0;
              const thr = Math.round(tel.throttle || 0);
              const brk = Math.round(tel.brake || 0);
              const soc = tel.soc !== undefined && tel.soc !== null ? tel.soc.toFixed(0) : '100';
              const gear = tel.gear !== undefined && tel.gear !== 0 ? tel.gear : (spd > 30 ? Math.min(8, Math.max(1, Math.floor(spd / 42))) : 'N');
              const tireStyle = getTyreStyle(r.tire.compound);
              const isSelectedA = selectedA === r.dc;
              const isSelectedB = selectedB === r.dc;
              const isCloseBattle = r.gapAheadNum < 1.0 && r.pos > 1;

              // Gap display logic
              let gapAheadDisplay = '—';
              if (r.pos === 1) {
                gapAheadDisplay = 'LEADER';
              } else if (r.gapAheadRaw && r.gapAheadRaw !== "") {
                gapAheadDisplay = r.gapAheadRaw.startsWith('+') ? r.gapAheadRaw : `+${r.gapAheadRaw}`;
              } else if (r.gapAheadNum !== 999) {
                gapAheadDisplay = `+${r.gapAheadNum.toFixed(3)}s`;
              }

              let gapIntervalDisplay = '—';
              if (r.pos === 1) {
                gapIntervalDisplay = 'INTERVAL';
              } else if (r.gapLeaderRaw && r.gapLeaderRaw !== "") {
                gapIntervalDisplay = r.gapLeaderRaw.startsWith('+') ? r.gapLeaderRaw : `+${r.gapLeaderRaw}`;
              } else if (r.gapAheadDisplay !== '—') {
                gapIntervalDisplay = gapAheadDisplay;
              }

              // Overtake badge color themes
              const ov = r.overtake;
              let badgeColor = 'bg-[#1e2330] text-[#8b949e] border-[#2c3447]';
              let badgeGlow = '';
              if (ov.color === 'red') {
                badgeColor = 'bg-[#e10600] text-white border-[#ff3b30] shadow-[0_0_12px_rgba(225,6,0,0.5)]';
                badgeGlow = 'animate-pulse';
              } else if (ov.color === 'orange') {
                badgeColor = 'bg-[#ff9100] text-black font-extrabold border-[#ffa726] shadow-[0_0_10px_rgba(255,145,0,0.4)]';
              } else if (ov.color === 'yellow') {
                badgeColor = 'bg-[#ffd600]/20 text-[#ffd600] border-[#ffd600]/40';
              }

              // Row background styling
              let rowBg = idx % 2 === 0 ? 'bg-[#0f121a]' : 'bg-[#121622]';
              if (isSelectedA) rowBg = 'bg-[#e10600]/15 border-l-4 border-l-[#e10600]';
              else if (isSelectedB) rowBg = 'bg-[#1e8fff]/15 border-l-4 border-l-[#1e8fff]';
              else if (isCloseBattle) rowBg = 'bg-[#00e676]/5 hover:bg-[#00e676]/10';

              return (
                <tr
                  key={r.dc}
                  className={`${rowBg} hover:bg-[#1b2234] transition-colors group cursor-default`}
                >
                  {/* Position */}
                  <td className="py-2.5 px-3 font-black text-sm">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-7 h-6 flex items-center justify-center rounded text-xs font-black ${
                          r.pos === 1
                            ? 'bg-[#ffd700] text-black shadow-[0_0_8px_rgba(255,215,0,0.6)]'
                            : r.pos === 2
                            ? 'bg-[#c0c0c0] text-black'
                            : r.pos === 3
                            ? 'bg-[#cd7f32] text-white'
                            : 'bg-[#1d2333] text-[#c9d1d9]'
                        }`}
                      >
                        P{r.pos}
                      </span>
                    </div>
                  </td>

                  {/* Driver Name & Team */}
                  <td className="py-2.5 px-4 font-sans">
                    <div className="flex items-center gap-2.5">
                      {/* Livery Team Strip */}
                      <span
                        className="w-1.5 h-8 rounded-sm shrink-0"
                        style={{ backgroundColor: r.teamColor }}
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-white tracking-wide">
                            {r.dc}
                          </span>
                          <span className="text-[10px] font-mono text-[#8b949e] bg-[#1a2030] px-1 py-0.5 rounded">
                            #{r.number}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#8b949e] truncate leading-tight">
                          {r.fullName}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* OVERTAKE PREDICTION (Dedicated Column) */}
                  <td className="py-2.5 px-4">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border flex items-center gap-1.5 ${badgeColor} ${badgeGlow}`}
                      >
                        {ov.color === 'red' && <span>🔥</span>}
                        {ov.color === 'orange' && <span>⚡</span>}
                        {ov.color === 'yellow' && <span>⚔️</span>}
                        <span>{ov.label}</span>
                        <span className="font-mono font-bold">({ov.pct}%)</span>
                      </div>

                      {/* Mini Probability Bar */}
                      <div className="w-28 h-1.5 bg-[#1a202c] rounded-full overflow-hidden border border-[#2d3748]">
                        <div
                          className={`h-full transition-all duration-300 ${
                            ov.pct >= 75
                              ? 'bg-gradient-to-r from-[#ff9100] to-[#e10600]'
                              : ov.pct >= 50
                              ? 'bg-gradient-to-r from-[#ffd600] to-[#ff9100]'
                              : 'bg-[#3b4252]'
                          }`}
                          style={{ width: `${ov.pct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Gap Ahead */}
                  <td className="py-2.5 px-3 font-mono font-bold">
                    <span
                      className={`text-xs ${
                        r.pos === 1
                          ? 'text-[#8b949e]'
                          : isCloseBattle
                          ? 'text-[#00e676] bg-[#00e676]/10 px-1.5 py-0.5 rounded border border-[#00e676]/30 font-black flex items-center gap-1 w-fit'
                          : 'text-[#e6edf3]'
                      }`}
                    >
                      {isCloseBattle && <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-ping" />}
                      {gapAheadDisplay}
                    </span>
                  </td>

                  {/* Tyre */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border ${tireStyle.bg} ${tireStyle.text} ${tireStyle.border} shadow-sm`}
                        title={`Compound: ${r.tire.compound || 'Unknown'}`}
                      >
                        {tireStyle.label}
                      </span>
                      <div className="flex flex-col text-[10px] leading-tight text-[#8b949e]">
                        <span className="font-bold text-[#c9d1d9]">{r.tire.laps ? `L${r.tire.laps}` : '—'}</span>
                        <span className="text-[9px] uppercase">{r.tire.new === 'true' ? 'NEW' : 'USED'}</span>
                      </div>
                    </div>
                  </td>

                  {/* Speed */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-xs text-[#58a6ff]">
                        {spd.toFixed(1)} <span className="text-[10px] text-[#8b949e]">km/h</span>
                      </span>
                      <div className="w-20 h-1 bg-[#1a2130] rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-[#1e8fff] transition-all duration-200"
                          style={{ width: `${Math.min(100, (spd / 350) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* RPM */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span
                        className={`font-mono text-xs font-bold ${
                          rpm > 11500 ? 'text-[#ff5252]' : rpm > 9500 ? 'text-[#ffb74d]' : 'text-[#c9d1d9]'
                        }`}
                      >
                        {rpm > 0 ? rpm.toLocaleString() : '—'}
                      </span>
                      {rpm > 0 && (
                        <div className="w-16 h-1 bg-[#1a2130] rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full transition-all duration-150 ${
                              rpm > 11500 ? 'bg-[#ff5252]' : 'bg-[#00e676]'
                            }`}
                            style={{ width: `${Math.min(100, (rpm / 13000) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Brake Bar */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[#161c28] rounded overflow-hidden border border-[#232d40]">
                        <div
                          className="h-full bg-gradient-to-r from-[#ff5252] to-[#e10600] transition-all duration-150"
                          style={{ width: `${brk}%` }}
                        />
                      </div>
                      <span className="w-7 text-right font-mono text-[11px] text-[#ff5252] font-bold">
                        {brk}%
                      </span>
                    </div>
                  </td>

                  {/* Throttle Bar */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[#161c28] rounded overflow-hidden border border-[#232d40]">
                        <div
                          className="h-full bg-gradient-to-r from-[#00b0ff] to-[#00e676] transition-all duration-150"
                          style={{ width: `${thr}%` }}
                        />
                      </div>
                      <span className="w-7 text-right font-mono text-[11px] text-[#00e676] font-bold">
                        {thr}%
                      </span>
                    </div>
                  </td>

                  {/* Gap Interval */}
                  <td className="py-2.5 px-3 font-mono text-xs text-[#8b949e]">
                    {gapIntervalDisplay}
                  </td>

                  {/* Battery SoC */}
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-mono font-bold text-xs text-[#00b0ff]">
                      {soc}%
                    </span>
                  </td>


                  {/* Compare Action Button */}
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onSelectBattleDriver && onSelectBattleDriver(r.dc, 'A')}
                        title="Set as Driver 1 (Slot 1)"
                        className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase border transition-all ${
                          isSelectedA
                            ? 'bg-[#e10600] text-white border-[#ff4d4d]'
                            : 'bg-[#1b2130] text-[#8b949e] border-[#2c354a] hover:bg-[#e10600]/20 hover:text-white hover:border-[#e10600]'
                        }`}
                      >
                        {isSelectedA ? '🔴 DRV 1' : 'VS 1'}
                      </button>
                      <button
                        onClick={() => onSelectBattleDriver && onSelectBattleDriver(r.dc, 'B')}
                        title="Set as Driver 2 (Slot 2)"
                        className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase border transition-all ${
                          isSelectedB
                            ? 'bg-[#1e8fff] text-white border-[#40a9ff]'
                            : 'bg-[#1b2130] text-[#8b949e] border-[#2c354a] hover:bg-[#1e8fff]/20 hover:text-white hover:border-[#1e8fff]'
                        }`}
                      >
                        {isSelectedB ? '🔵 DRV 2' : 'VS 2'}
                      </button>
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
