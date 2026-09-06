import React from 'react';
import { TEAM_COLORS, DRIVER_TEAM, DRIVER_NUMBERS } from '../constants';

export function F1TelemetryCard({ data, selectedDriver, onClose }) {
  const team = DRIVER_TEAM[selectedDriver] || 'F1';
  const teamColor = TEAM_COLORS[team] || '#e10600';
  const driverNumber = DRIVER_NUMBERS[selectedDriver] || '1';

  // Extract sector times & best lap from live_state
  const sectors = data?.sectors?.[selectedDriver] || {};
  const s1 = sectors["1"] ? parseFloat(sectors["1"]).toFixed(3) : "32.375";
  const s2 = sectors["2"] ? parseFloat(sectors["2"]).toFixed(3) : "37.897";
  const s3 = sectors["0"] ? parseFloat(sectors["0"]).toFixed(3) : "28.106";
  const bestLap = data?.best_laps?.[selectedDriver] || "1:22.943";

  const tel = data?.telemetry?.[selectedDriver];
  const isOvertake = tel?.prediction === 1;
  const gear = tel?.gear ? tel.gear : 6;
  const drsActive = (tel?.speed || 0) > 250;

  return (
    <div className="w-[236px] shrink-0 bg-[#161a25]/95 backdrop-blur-md border-r border-[#262c3d] flex flex-col h-full z-10 px-3.5 py-3 select-none justify-between">
      {/* Top Section: Driver Header */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-[#242b3d]">
          <div className="flex items-center gap-2.5">
            {/* Driver Avatar / Number Badge */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[0.75rem] text-white shadow-inner font-mono"
              style={{ backgroundColor: teamColor }}
            >
              {driverNumber}
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[0.92rem] text-white tracking-wider leading-none">
                {selectedDriver}
              </span>
              <span className="text-[0.62rem] text-[#8690a7] font-semibold tracking-wider uppercase mt-0.5">
                {team}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#69738c] hover:text-white transition-colors p-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* F1 Circular Integrated Gauge (Throttle, Brake, Speed, RPM, Gear) */}
        <div className="relative w-[190px] h-[190px] mx-auto my-3 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background Tracks */}
            {/* Throttle Arc Background (Left half: 180deg to 360deg) */}
            <circle
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke="#212738"
              strokeWidth="8"
              strokeDasharray="180 360"
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            {/* Brake Arc Background (Right half: 0deg to 180deg) */}
            <circle
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke="#212738"
              strokeWidth="8"
              strokeDasharray="180 360"
              strokeDashoffset="-185"
              strokeLinecap="round"
            />

            {/* Dynamic Throttle Arc (Vivid Cyan/Blue) */}
            <circle
              id="arcThrottle"
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke="#1e8fff"
              strokeWidth="8"
              strokeDasharray="180 360"
              strokeDashoffset="180"
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-75 ease-linear"
              style={{ filter: 'drop-shadow(0 0 4px rgba(30,143,255,0.7))' }}
            />

            {/* Dynamic Brake Arc (Vivid Crimson Red) */}
            <circle
              id="arcBrake"
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke="#e10600"
              strokeWidth="8"
              strokeDasharray="180 360"
              strokeDashoffset="-185"
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-75 ease-linear"
              style={{ filter: 'drop-shadow(0 0 4px rgba(225,6,0,0.8))' }}
            />

            {/* Outer RPM Ring */}
            <circle
              id="arcRpm"
              cx="80"
              cy="80"
              r="72"
              fill="none"
              stroke="#ffb300"
              strokeWidth="3.5"
              strokeDasharray="360 450"
              strokeDashoffset="360"
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-75 ease-linear"
            />
          </svg>

          {/* Center Digital Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {/* Speed Readout */}
            <div id="vSpeed" className="text-[2.1rem] font-extrabold text-white font-mono leading-none tracking-tight">
              {Math.round(tel?.speed || 0)}
            </div>
            <div className="text-[0.62rem] font-bold text-[#818ba0] tracking-[1.5px] uppercase">
              KM/H
            </div>

            {/* RPM Readout */}
            <div className="text-[0.7rem] font-mono font-bold text-white mt-1">
              <span id="vRpm">{Math.round(tel?.rpm || 0)}</span> <span className="text-[#818ba0] text-[0.58rem]">RPM</span>
            </div>

            {/* DRS & Gear */}
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`text-[0.56rem] font-extrabold px-1.5 py-0.5 rounded tracking-wider ${
                  drsActive
                    ? 'bg-[#00e676] text-black shadow-[0_0_8px_rgba(0,230,118,0.7)]'
                    : 'bg-[#23293a] text-[#717b92]'
                }`}
              >
                DRS
              </span>
              <span className="text-[0.64rem] font-mono font-bold text-[#c9d1e2]">
                GEAR <strong className="text-white text-[0.74rem]">{gear}</strong>
              </span>
            </div>
          </div>

          {/* Arc Labels */}
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[0.52rem] text-[#1e8fff] font-bold tracking-wider -rotate-90">
            THROTTLE
          </span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[0.52rem] text-[#e10600] font-bold tracking-wider rotate-90">
            BRAKE
          </span>
        </div>

        {/* Sector Times Table */}
        <div className="mt-2 bg-[#10131d] rounded-lg p-2.5 border border-[#212738] text-[0.68rem] font-mono">
          <div className="flex justify-between items-center py-0.5 border-b border-[#1b202e] text-[#8690a7]">
            <span>SECTOR 1</span>
            <span className="text-white font-bold">{s1}</span>
          </div>
          <div className="flex justify-between items-center py-0.5 border-b border-[#1b202e] text-[#8690a7]">
            <span>SECTOR 2</span>
            <span className="text-white font-bold">{s2}</span>
          </div>
          <div className="flex justify-between items-center py-0.5 border-b border-[#1b202e] text-[#8690a7]">
            <span>SECTOR 3</span>
            <span className="text-white font-bold">{s3}</span>
          </div>
          <div className="flex justify-between items-center pt-1 text-[#8690a7]">
            <span>BEST LAP</span>
            <span className="text-[#00e676] font-bold text-[0.72rem]">{bestLap}</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Battle Mode & Overtake Prediction Indicator */}
      <div className="flex flex-col items-center justify-center pt-2">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all border-2 ${
            isOvertake
              ? 'bg-[#e10600] border-white shadow-[0_0_24px_rgba(225,6,0,1)] battle-active'
              : 'bg-[#1b202e] border-[#e10600]/60 hover:border-[#e10600] shadow-[0_0_12px_rgba(225,6,0,0.25)]'
          }`}
        >
          {/* Dual Helmets / Battle Mode SVG Icon */}
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="8" cy="12" r="5" strokeWidth="2" />
            <circle cx="16" cy="12" r="5" strokeWidth="2" />
            <path d="M5 12h6M13 12h6" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <span
          className={`text-[0.62rem] font-black tracking-wider uppercase mt-2 text-center ${
            isOvertake ? 'text-[#ff3838] animate-pulse font-extrabold' : 'text-[#8b95ac]'
          }`}
        >
          {isOvertake ? '⚡ OVERTAKE PREDICTED!' : 'ENTER BATTLE MODE'}
        </span>
      </div>
    </div>
  );
}
