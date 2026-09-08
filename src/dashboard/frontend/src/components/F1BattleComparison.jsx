import React, { useMemo } from 'react';
import { TEAM_COLORS, DRIVER_FULL_NAMES, DRIVER_NUMBERS, DRIVER_TEAM } from '../constants';
import { computeOvertakeProbability } from './F1DriversTable';

// Helper for tyre badge styling
function TyreIcon({ compound, laps }) {
  const c = (compound || '').toUpperCase();
  let bg = 'bg-[#3b4252] text-white border-[#4c566a]';
  let label = '?';
  if (c === 'SOFT') { bg = 'bg-[#e10600] text-white border-[#ff4d4d]'; label = 'S'; }
  else if (c === 'MEDIUM') { bg = 'bg-[#ffd600] text-black font-black border-[#ffe655]'; label = 'M'; }
  else if (c === 'HARD') { bg = 'bg-[#ffffff] text-black font-black border-[#d0d4dc]'; label = 'H'; }
  else if (c === 'INTERMEDIATE') { bg = 'bg-[#00c853] text-white border-[#69f0ae]'; label = 'I'; }
  else if (c === 'WET') { bg = 'bg-[#0091ea] text-white border-[#40c4ff]'; label = 'W'; }

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${bg} shadow-sm`}>
        {label}
      </span>
      <span className="text-xs font-mono text-[#c9d1d9]">{laps !== undefined ? `L${laps}` : ''}</span>
    </div>
  );
}

// Helper to calculate 2026 MGU-K available power (kW) based on SoC and zone
export function getAvailableMgukPower(soc, isOvertakeZone = true) {
  const maxZonePower = isOvertakeZone ? 350 : 250;
  if (soc >= 50) return maxZonePower;
  if (soc >= 15) {
    const ratio = (soc - 15) / (50 - 15);
    return Math.round(120 + ratio * (maxZonePower - 120));
  }
  return Math.round(Math.max(0, (soc / 15) * 120));
}

export function F1BattleComparison({
  data,
  driverA,
  driverB,
  onSelectDriverA,
  onSelectDriverB,
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  // Build driver options list
  const driverCodes = useMemo(() => {
    if (!data?.positions) return [];
    return Object.entries(data.positions)
      .sort((a, b) => (parseInt(a[1], 10) || 99) - (parseInt(b[1], 10) || 99))
      .map(([dc]) => dc);
  }, [data?.positions]);

  // Find closest battle on track helper
  const handleFindClosestBattle = () => {
    if (!data?.positions) return;
    const sorted = Object.entries(data.positions)
      .map(([dc, pos]) => ({ dc, pos: parseInt(pos, 10) || 99, gap: parseFloat(data?.gaps_to_ahead?.[dc] || 999) }))
      .sort((a, b) => a.pos - b.pos);

    let minGap = 999;
    let bestAttacker = null;
    let bestDefender = null;

    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i];
      const ahead = sorted[i - 1];
      if (cur.gap > 0 && cur.gap < minGap) {
        minGap = cur.gap;
        bestAttacker = cur.dc;
        bestDefender = ahead.dc;
      }
    }

    if (bestAttacker && bestDefender) {
      onSelectDriverA(bestAttacker);
      onSelectDriverB(bestDefender);
    } else if (sorted.length >= 2) {
      onSelectDriverA(sorted[1].dc);
      onSelectDriverB(sorted[0].dc);
    }
  };

  const handleSwap = () => {
    const temp = driverA;
    onSelectDriverA(driverB);
    onSelectDriverB(temp);
  };

  // Get driver details
  const getDriverData = (dc) => {
    if (!dc || !data) return null;
    const tel = data?.telemetry?.[dc] || {};
    const meta = data?.driver_meta?.[dc] || {};
    const tire = data?.tires?.[dc] || {};
    const pos = data?.positions?.[dc] || '-';
    const team = meta.team || DRIVER_TEAM[dc] || 'F1 Team';
    const teamColor = meta.team_color || TEAM_COLORS[team] || '#8b949e';
    const fullName = meta.full_name || DRIVER_FULL_NAMES[dc] || dc;
    const number = meta.number || DRIVER_NUMBERS[dc] || '';
    const rawSoc = tel.soc !== undefined && tel.soc !== null ? tel.soc : 100;

    return {
      dc,
      pos,
      team,
      teamColor,
      fullName,
      number,
      tel,
      tire,
      speed: tel.speed || 0,
      rpm: tel.rpm || 0,
      gear: tel.gear || (tel.speed > 30 ? Math.min(8, Math.max(1, Math.floor(tel.speed / 42))) : 'N'),
      throttle: Math.round(tel.throttle || 0),
      brake: Math.round(tel.brake || 0),
      soc: rawSoc,
      mgukPower: getAvailableMgukPower(rawSoc, true),
      pred: tel.prediction || 0,
      gapSeconds: tel.gap_seconds || 0,
    };
  };

  const dA = getDriverData(driverA);
  const dB = getDriverData(driverB);

  // Compute live battle analysis with dynamic Attacker vs Defender role detection
  const battleMetrics = useMemo(() => {
    if (!dA || !dB) return null;

    const posA = parseInt(dA.pos, 10) || 99;
    const posB = parseInt(dB.pos, 10) || 99;

    // Track position logic:
    // The driver with higher numerical position (e.g. P2 vs P1) is behind -> ATTACKER.
    // The driver with lower numerical position (e.g. P1 vs P2) is ahead -> DEFENDER.
    const aIsBehind = posA > posB;
    const isTied = posA === posB;
    const attacker = (aIsBehind || isTied) ? dA : dB;
    const defender = (aIsBehind || isTied) ? dB : dA;

    // Relative speed (closing speed: how much faster the chaser is than the leader in km/h)
    const speedDelta = attacker.speed - defender.speed;

    // Throttle & Brake differences
    const throttleDelta = attacker.throttle - defender.throttle;
    const brakeDelta = attacker.brake - defender.brake;

    // Battery SoC delta: Attacker SoC - Defender SoC (percentage points)
    const socDelta = attacker.soc - defender.soc;

    // Estimated gap between Driver A and Driver B
    let battleGap = Math.abs((dA.gapSeconds || 0) - (dB.gapSeconds || 0));
    if (battleGap === 0 || isNaN(battleGap)) {
      battleGap = 0.42; // default active battle delta representation
    }

    // Overtake probability calculation: Attacker attempting to pass Defender
    const ov = computeOvertakeProbability(attacker.dc, attacker.tel, battleGap, attacker.tire, defender.tire, defender.tel);

    // DRS Status
    const drsEligible = battleGap < 1.0;

    // Tactical AI Commentary - Nuanced, physically grounded analysis
    let tacticalTip = '';
    const energyAdvantageText = Math.abs(socDelta) >= 3 
      ? `(SoC ${socDelta > 0 ? '+' : ''}${socDelta.toFixed(0)} percentage points)` 
      : `(SoC parity: ${attacker.soc.toFixed(0)}% vs ${defender.soc.toFixed(0)}%)`;
    const closingSpeedText = speedDelta > 0 
      ? `closing at +${speedDelta.toFixed(1)} km/h` 
      : `trailing at ${speedDelta.toFixed(1)} km/h`;

    if (attacker.soc < 20) {
      tacticalTip = `⚠️ ${attacker.dc} (P${attacker.pos}) energy reserve is low (${attacker.soc.toFixed(0)}%); sustained MGU-K deployment is limited. Recommended: harvest before launching an attack on ${defender.dc} (P${defender.pos}).`;
    } else if (ov.pct >= 75) {
      tacticalTip = `🔥 ${attacker.dc} (P${attacker.pos}) has a significant energy advantage ${energyAdvantageText} and is ${closingSpeedText} on ${defender.dc} (P${defender.pos}). Combined with ${drsEligible ? 'DRS and slipstream' : 'acceleration profile'}, overtake probability into the next braking zone is extremely high!`;
    } else if (ov.pct >= 40) {
      tacticalTip = `⚡ ${attacker.dc} (P${attacker.pos}) is within DRS striking range (${battleGap.toFixed(2)}s) pressuring ${defender.dc} (P${defender.pos}) with ${closingSpeedText}. Energy advantage: ${energyAdvantageText}. Building attack momentum.`;
    } else {
      tacticalTip = `🛡️ ${defender.dc} (P${defender.pos}) holds track position with a ${battleGap.toFixed(2)}s buffer over ${attacker.dc}. ${attacker.dc} managing MGU-K reserves for the next push.`;
    }

    return {
      attacker,
      defender,
      isAttackerA: attacker.dc === dA.dc,
      speedDelta,
      throttleDelta,
      brakeDelta,
      socDelta,
      battleGap,
      ov,
      drsEligible,
      tacticalTip,
    };
  }, [dA, dB]);

  if (!data || !data.positions) return null;

  return (
    <div className="bg-[#111520] border-b border-[#252c3d] shadow-lg transition-all">
      {/* Header Bar */}
      <div className="px-5 py-2.5 bg-[#161b28] border-b border-[#242b3c] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e10600] animate-ping" />
            ⚔️ DRIVER BATTLE COMPARISON (2 DRIVERS HEAD-TO-HEAD)
          </span>
          {battleMetrics?.drsEligible && (
            <span className="bg-[#00e676] text-black text-[10px] font-black px-2 py-0.5 rounded shadow-[0_0_8px_rgba(0,230,118,0.6)] animate-pulse">
              DRS ACTIVE (&lt;1.0s)
            </span>
          )}
        </div>

        {/* Quick Presets & Collapse Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFindClosestBattle}
            className="px-2.5 py-1 rounded text-xs font-semibold bg-[#1f2638] text-[#c9d1d9] border border-[#2e374d] hover:bg-[#e10600] hover:text-white transition-all"
          >
            ⚡ Closest Battle
          </button>
          <button
            onClick={() => {
              if (driverCodes.length >= 2) {
                onSelectDriverA(driverCodes[0]);
                onSelectDriverB(driverCodes[1]);
              }
            }}
            className="px-2.5 py-1 rounded text-xs font-semibold bg-[#1f2638] text-[#c9d1d9] border border-[#2e374d] hover:bg-[#1e8fff] hover:text-white transition-all"
          >
            P1 vs P2
          </button>
          <button
            onClick={handleSwap}
            title="Swap Driver 1 and Driver 2"
            className="px-2 py-1 rounded text-xs font-semibold bg-[#1f2638] text-[#8b949e] border border-[#2e374d] hover:text-white transition-all"
          >
            ⇄ Swap
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="px-2 py-1 rounded text-xs text-[#8b949e] hover:text-white ml-2"
          >
            {collapsed ? '▼ Expand' : '▲ Minimize'}
          </button>
        </div>
      </div>

      {!collapsed && dA && dB && battleMetrics && (

        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* DRIVER A CARD */}
          <div className="lg:col-span-4 bg-[#141824] rounded-lg p-3.5 border-l-4 border-[#e10600] border border-[#22293a] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded text-white ${
                  battleMetrics.isAttackerA ? 'bg-[#e10600]' : 'bg-[#1e8fff]'
                }`}>
                  {battleMetrics.isAttackerA ? '⚔️ DRIVER 1 (ATTACKER)' : '🛡️ DRIVER 1 (DEFENDER / AHEAD)'}
                </span>
                <span className="text-xs font-mono font-bold text-[#ffd700]">P{dA.pos}</span>
              </div>
              {/* Selector Dropdown */}
              <select
                value={dA.dc}
                onChange={(e) => onSelectDriverA(e.target.value)}
                className="bg-[#1b2130] text-white text-xs font-mono font-bold border border-[#2e374d] rounded px-2 py-1 focus:outline-none focus:border-[#e10600]"
              >
                {driverCodes.map((dc) => (
                  <option key={dc} value={dc}>
                    P{data.positions[dc]} - {dc} ({data.driver_meta?.[dc]?.full_name || dc})
                  </option>
                ))}
              </select>
            </div>

            {/* Driver Profile Header */}
            <div className="flex items-center justify-between border-b border-[#1f2638] pb-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-mono font-black text-white">{dA.dc}</span>
                  <span className="text-xs font-mono text-[#8b949e]">#{dA.number}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: dA.teamColor }}
                  />
                </div>
                <p className="text-xs text-[#8b949e]">{dA.fullName}</p>
                <p className="text-[11px] font-semibold text-[#c9d1d9]">{dA.team}</p>
              </div>

              {/* Tyre & Gear */}
              <div className="text-right flex flex-col items-end gap-1">
                <TyreIcon compound={dA.tire.compound} laps={dA.tire.laps} />
                <span className="text-[10px] font-mono text-[#8b949e]">
                  Gear <strong className="text-white text-xs">{dA.gear}</strong>
                </span>
              </div>
            </div>

            {/* Live Telemetry Meters */}
            <div className="space-y-2.5 text-xs font-mono">
              {/* Speed */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-[#8b949e]">SPEED</span>
                  <span className="font-bold text-[#58a6ff]">
                    {dA.speed.toFixed(1)} km/h
                    {battleMetrics.speedDelta > 0 && (
                      <span className="ml-1 text-[10px] text-[#00e676]">
                        (+{battleMetrics.speedDelta.toFixed(1)})
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 bg-[#1b2130] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1e8fff] transition-all duration-200"
                    style={{ width: `${Math.min(100, (dA.speed / 350) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Throttle */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-[#8b949e]">THROTTLE</span>
                  <span className="font-bold text-[#00e676]">{dA.throttle}%</span>
                </div>
                <div className="h-1.5 bg-[#1b2130] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00e676] transition-all duration-150"
                    style={{ width: `${dA.throttle}%` }}
                  />
                </div>
              </div>

              {/* Brake */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-[#8b949e]">BRAKE</span>
                  <span className="font-bold text-[#ff5252]">{dA.brake}%</span>
                </div>
                <div className="h-1.5 bg-[#1b2130] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff5252] transition-all duration-150"
                    style={{ width: `${dA.brake}%` }}
                  />
                </div>
              </div>

              {/* Battery SoC & RPM */}
              <div className="flex items-center justify-between pt-1 border-t border-[#1e2436] text-[11px]">
                <span>
                  🔋 SoC: <strong className="text-[#00b0ff]">{dA.soc.toFixed(0)}%</strong>
                  <span className="text-[#8b949e] ml-1.5 font-normal">({dA.mgukPower} kW MGU-K)</span>
                </span>
                <span>
                  RPM: <strong className="text-white">{dA.rpm.toLocaleString()}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* CENTER: BATTLE DELTA & AI PREDICTION CORE */}
          <div className="lg:col-span-4 bg-[#141824] rounded-lg p-3.5 border border-[#262e42] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#ffd600]">
                  ⚡ {battleMetrics.attacker.dc} (P{battleMetrics.attacker.pos}) ➔ {battleMetrics.defender.dc} (P{battleMetrics.defender.pos}) OVERTAKE ENGINE
                </span>
              </div>

              {/* Central Big Meter */}
              <div className="flex flex-col items-center justify-center p-3 bg-[#191f2e] rounded-lg border border-[#2b354b] mb-3">
                <span className="text-xs text-[#8b949e] uppercase font-mono tracking-wider">
                  PREDICTED PASS PROBABILITY
                </span>
                <div className="flex items-baseline gap-1 my-1">
                  <span
                    className={`text-4xl font-mono font-black ${
                      battleMetrics.ov.pct >= 75
                        ? 'text-[#e10600] animate-pulse'
                        : battleMetrics.ov.pct >= 40
                        ? 'text-[#ff9100]'
                        : 'text-[#58a6ff]'
                    }`}
                  >
                    {battleMetrics.ov.pct}%
                  </span>
                  <span className="text-xs font-bold text-[#8b949e]">
                    ({battleMetrics.ov.label})
                  </span>
                </div>

                {/* Meter Bar */}
                <div className="w-full h-3 bg-[#111520] rounded-full overflow-hidden border border-[#2c374d] p-0.5 my-1">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      battleMetrics.ov.pct >= 75
                        ? 'bg-gradient-to-r from-[#ffd600] via-[#ff9100] to-[#e10600]'
                        : battleMetrics.ov.pct >= 40
                        ? 'bg-gradient-to-r from-[#00b0ff] to-[#ff9100]'
                        : 'bg-[#3b4252]'
                    }`}
                    style={{ width: `${battleMetrics.ov.pct}%` }}
                  />
                </div>

                {/* Head to Head Delta Gap */}
                <div className="mt-2 flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#8b949e]">LIVE GAP:</span>
                  <span className="text-white font-black text-sm bg-[#111520] px-2 py-0.5 rounded border border-[#2e394f]">
                    +{battleMetrics.battleGap.toFixed(3)}s
                  </span>
                </div>
              </div>

              {/* Advantage Badges */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-2">
                <div className="bg-[#191f2e] p-2 rounded border border-[#242c3d]">
                  <span className="text-[#8b949e] block text-[10px]">CLOSING SPEED</span>
                  <span
                    className={`font-bold ${
                      battleMetrics.speedDelta > 0 ? 'text-[#00e676]' : 'text-[#ff5252]'
                    }`}
                  >
                    {battleMetrics.speedDelta > 0
                      ? `${battleMetrics.attacker.dc} +${battleMetrics.speedDelta.toFixed(1)} km/h`
                      : `${battleMetrics.attacker.dc} ${battleMetrics.speedDelta.toFixed(1)} km/h`}
                  </span>
                </div>
                <div className="bg-[#191f2e] p-2 rounded border border-[#242c3d]">
                  <span className="text-[#8b949e] block text-[10px]">ENERGY ADVANTAGE (ΔSoC)</span>
                  <span
                    className={`font-bold ${
                      battleMetrics.socDelta > 0 ? 'text-[#00b0ff]' : 'text-[#8b949e]'
                    }`}
                  >
                    {battleMetrics.socDelta > 0
                      ? `${battleMetrics.attacker.dc} +${battleMetrics.socDelta.toFixed(0)} pp`
                      : `${battleMetrics.attacker.dc} ${battleMetrics.socDelta.toFixed(0)} pp`}
                  </span>
                </div>
              </div>
            </div>

            {/* Tactical Commentary Tip */}
            <div className="bg-[#1a2030] p-2.5 rounded border border-[#2d374d] text-xs text-[#c9d1d9] leading-relaxed">
              <span className="font-bold text-[#ffd700] mr-1">AI TACTICAL INSIGHT:</span>
              {battleMetrics.tacticalTip}
            </div>
          </div>

          {/* DRIVER B CARD */}
          <div className="lg:col-span-4 bg-[#141824] rounded-lg p-3.5 border-l-4 border-[#1e8fff] border border-[#22293a] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded text-white ${
                  !battleMetrics.isAttackerA ? 'bg-[#e10600]' : 'bg-[#1e8fff]'
                }`}>
                  {!battleMetrics.isAttackerA ? '⚔️ DRIVER 2 (ATTACKER)' : '🛡️ DRIVER 2 (DEFENDER / AHEAD)'}
                </span>
                <span className="text-xs font-mono font-bold text-[#ffd700]">P{dB.pos}</span>
              </div>
              {/* Selector Dropdown */}
              <select
                value={dB.dc}
                onChange={(e) => onSelectDriverB(e.target.value)}
                className="bg-[#1b2130] text-white text-xs font-mono font-bold border border-[#2e374d] rounded px-2 py-1 focus:outline-none focus:border-[#1e8fff]"
              >
                {driverCodes.map((dc) => (
                  <option key={dc} value={dc}>
                    P{data.positions[dc]} - {dc} ({data.driver_meta?.[dc]?.full_name || dc})
                  </option>
                ))}
              </select>
            </div>

            {/* Driver Profile Header */}
            <div className="flex items-center justify-between border-b border-[#1f2638] pb-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-mono font-black text-white">{dB.dc}</span>
                  <span className="text-xs font-mono text-[#8b949e]">#{dB.number}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: dB.teamColor }}
                  />
                </div>
                <p className="text-xs text-[#8b949e]">{dB.fullName}</p>
                <p className="text-[11px] font-semibold text-[#c9d1d9]">{dB.team}</p>
              </div>

              {/* Tyre & Gear */}
              <div className="text-right flex flex-col items-end gap-1">
                <TyreIcon compound={dB.tire.compound} laps={dB.tire.laps} />
                <span className="text-[10px] font-mono text-[#8b949e]">
                  Gear <strong className="text-white text-xs">{dB.gear}</strong>
                </span>
              </div>
            </div>

            {/* Live Telemetry Meters */}
            <div className="space-y-2.5 text-xs font-mono">
              {/* Speed */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-[#8b949e]">SPEED</span>
                  <span className="font-bold text-[#58a6ff]">
                    {dB.speed.toFixed(1)} km/h
                    {battleMetrics.speedDelta < 0 && (
                      <span className="ml-1 text-[10px] text-[#00e676]">
                        (+{Math.abs(battleMetrics.speedDelta).toFixed(1)})
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 bg-[#1b2130] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1e8fff] transition-all duration-200"
                    style={{ width: `${Math.min(100, (dB.speed / 350) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Throttle */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-[#8b949e]">THROTTLE</span>
                  <span className="font-bold text-[#00e676]">{dB.throttle}%</span>
                </div>
                <div className="h-1.5 bg-[#1b2130] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00e676] transition-all duration-150"
                    style={{ width: `${dB.throttle}%` }}
                  />
                </div>
              </div>

              {/* Brake */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-[#8b949e]">BRAKE</span>
                  <span className="font-bold text-[#ff5252]">{dB.brake}%</span>
                </div>
                <div className="h-1.5 bg-[#1b2130] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff5252] transition-all duration-150"
                    style={{ width: `${dB.brake}%` }}
                  />
                </div>
              </div>

              {/* Battery SoC & RPM */}
              <div className="flex items-center justify-between pt-1 border-t border-[#1e2436] text-[11px]">
                <span>
                  🔋 SoC: <strong className="text-[#00b0ff]">{dB.soc.toFixed(0)}%</strong>
                  <span className="text-[#8b949e] ml-1.5 font-normal">({dB.mgukPower} kW MGU-K)</span>
                </span>
                <span>
                  RPM: <strong className="text-white">{dB.rpm.toLocaleString()}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
