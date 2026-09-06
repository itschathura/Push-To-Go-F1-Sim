import React, { useEffect, useRef, useState } from 'react';
import { TRACK_SVG_PATH } from '../circuitTrack';
import { TEAM_COLORS, DRIVER_TEAM } from '../constants';

export function F1TrackMap({ data, selectedDriver, onSelectDriver }) {
  const pathRef = useRef(null);
  const [trackLength, setTrackLength] = useState(1000);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (pathRef.current) {
      setTrackLength(pathRef.current.getTotalLength());
    }
  }, []);

  // Compute (x, y) coordinates along the circuit SVG path for each driver
  const getCoordinatesAtPct = (pct) => {
    if (!pathRef.current) return { x: 330, y: 300 };
    const clamped = Math.max(0, Math.min(1, pct));
    const point = pathRef.current.getPointAtLength(clamped * trackLength);
    return { x: point.x, y: point.y };
  };

  // Drivers sorted by position
  const drivers = Object.keys(DRIVER_TEAM).map((dc, index) => {
    const posStr = data?.positions?.[dc];
    const pos = posStr ? parseInt(posStr, 10) : index + 1;
    // Map position to a spot on the circuit track
    // P1 near start/finish, P2-P22 spread around
    const basePct = ((pos - 1) / 22) * 0.92 + 0.04;
    return {
      dc,
      pos,
      team: DRIVER_TEAM[dc],
      color: TEAM_COLORS[DRIVER_TEAM[dc]] || '#ffffff',
      pct: basePct,
    };
  });

  const weather = data?.weather || { air_temp: '22', track_temp: '38', rain: '0' };

  return (
    <div className="flex-1 relative h-full bg-[#11141e] overflow-hidden flex items-center justify-center select-none">
      {/* Circuit Map Canvas (SVG) */}
      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox="200 60 620 480"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      >
        {/* Shadow/Glow under track */}
        <path
          d={TRACK_SVG_PATH}
          fill="none"
          stroke="#090c13"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Base Track Asphalt */}
        <path
          d={TRACK_SVG_PATH}
          fill="none"
          stroke="#262c3b"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Guide Line */}
        <path
          ref={pathRef}
          d={TRACK_SVG_PATH}
          fill="none"
          stroke="#3b445b"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />

        {/* DRS Activation Zone 1 (Vivid Yellow overlay on main straight) */}
        <path
          d="M 330 450 L 330 160"
          fill="none"
          stroke="#ffd600"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray="14 10"
          style={{ filter: 'drop-shadow(0 0 8px rgba(255,214,0,0.6))' }}
        />

        {/* Sector 2 Flow Highlight */}
        <path
          d="M 470 230 C 500 230, 520 200, 560 170 C 600 140, 640 140, 680 170 C 720 200, 740 250, 730 280"
          fill="none"
          stroke="#ffd600"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray="14 10"
          style={{ filter: 'drop-shadow(0 0 8px rgba(255,214,0,0.6))' }}
        />

        {/* Start/Finish Line Indicator */}
        <line x1="315" y1="445" x2="345" y2="445" stroke="#ffffff" strokeWidth="4" strokeDasharray="3 3" />

        {/* Track Labels */}
        <text x="310" y="300" fill="#8c97af" fontSize="9" fontWeight="bold" fontFamily="Inter" textAnchor="end">
          SPEED TRAP
        </text>
        <circle cx="330" cy="300" r="3.5" fill="#ffffff" />

        <text x="350" y="225" fill="#ffd600" fontSize="8" fontWeight="bold" fontFamily="Inter">
          DRS ACTIVATION
        </text>
        <text x="350" y="235" fill="#ffd600" fontSize="7" fontWeight="bold" fontFamily="Inter">
          ZONES 1
        </text>

        <text x="590" y="325" fill="#69748e" fontSize="9" fontWeight="bold" fontFamily="Inter">
          SECTOR 1
        </text>
        <text x="670" y="445" fill="#69748e" fontSize="9" fontWeight="bold" fontFamily="Inter">
          SECTOR 2
        </text>
        <text x="460" y="435" fill="#69748e" fontSize="9" fontWeight="bold" fontFamily="Inter">
          SECTOR 3
        </text>

        {/* Live Driver Dots on Track */}
        {pathRef.current &&
          drivers.map((d) => {
            const { x, y } = getCoordinatesAtPct(d.pct);
            const isSelected = d.dc === selectedDriver;

            return (
              <g
                key={d.dc}
                className="cursor-pointer transition-transform"
                onClick={() => onSelectDriver(d.dc)}
              >
                {/* Selected Driver Radar Halo */}
                {isSelected && (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r="18"
                      fill={d.color}
                      className="pulsing-radar"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="10"
                      fill={d.color}
                      opacity="0.9"
                      style={{ filter: `drop-shadow(0 0 10px ${d.color})` }}
                    />
                  </>
                )}

                {/* Normal Driver Dot */}
                {!isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r="5.5"
                    fill={d.color}
                    stroke="#0b0e14"
                    strokeWidth="1.5"
                  />
                )}

                {/* Driver Tag Pill */}
                {isSelected ? (
                  <g transform={`translate(${x + 10}, ${y - 12})`}>
                    <rect
                      x="0"
                      y="0"
                      width="48"
                      height="20"
                      rx="10"
                      fill="#ffffff"
                      filter="drop-shadow(0 2px 5px rgba(0,0,0,0.5))"
                    />
                    <rect x="5" y="4" width="3" height="12" rx="1.5" fill={d.color} />
                    <text
                      x="12"
                      y="14"
                      fill="#000000"
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                    >
                      {d.dc}
                    </text>
                  </g>
                ) : (
                  <text
                    x={x + 8}
                    y={y + 3}
                    fill="#c5cde0"
                    fontSize="8"
                    fontFamily="JetBrains Mono"
                    fontWeight="bold"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                  >
                    {d.dc}
                  </text>
                )}
              </g>
            );
          })}
      </svg>

      {/* Top Left Compass & Reset Widgets */}
      <div className="absolute top-4 left-4 flex flex-col gap-2.5 z-10">
        {/* Compass */}
        <div className="w-10 h-10 rounded-full bg-[#1c2230]/90 border border-[#2e374d] flex items-center justify-center shadow-lg backdrop-blur-sm">
          <svg className="w-5 h-5 text-[#8fa0c2]" viewBox="0 0 24 24" fill="none">
            <polygon points="12,3 15,12 12,10 9,12" fill="#e10600" />
            <polygon points="12,21 15,12 12,14 9,12" fill="#8fa0c2" />
            <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
          </svg>
        </div>

        {/* Reset View */}
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="w-10 h-10 rounded-full bg-[#1c2230]/90 border border-[#2e374d] flex items-center justify-center text-[#8fa0c2] hover:text-white shadow-lg backdrop-blur-sm transition-colors"
          title="Reset Orientation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Right Navigation & Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        {/* Target Driver */}
        <button
          onClick={() => {
            setZoom(1.3);
            setPan({ x: -20, y: -20 });
          }}
          className="w-9 h-9 rounded-lg bg-[#1c2230]/90 border border-[#2e374d] flex items-center justify-center text-[#8fa0c2] hover:text-white shadow backdrop-blur-sm transition-colors"
          title="Focus Selected Driver"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>

        {/* Zoom In */}
        <button
          onClick={() => setZoom((z) => Math.min(2.2, z + 0.2))}
          className="w-9 h-9 rounded-lg bg-[#1c2230]/90 border border-[#2e374d] flex items-center justify-center text-[#8fa0c2] hover:text-white shadow backdrop-blur-sm transition-colors"
          title="Zoom In"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
          className="w-9 h-9 rounded-lg bg-[#1c2230]/90 border border-[#2e374d] flex items-center justify-center text-[#8fa0c2] hover:text-white shadow backdrop-blur-sm transition-colors"
          title="Zoom Out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* Bottom Right Session Time & Weather Pills */}
      <div className="absolute bottom-4 right-4 flex items-center gap-3 z-10 font-mono">
        {/* Session Time Capsule */}
        <div className="bg-[#191f2c]/95 backdrop-blur-md border border-[#2a3347] rounded-md px-3 py-1.5 flex flex-col shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-[#e10600] font-black text-[0.68rem]">Q2</span>
            <span className="text-white font-extrabold text-[0.84rem]">0:07:41</span>
          </div>
          {/* Progress Red Line */}
          <div className="w-full h-[2px] bg-[#2d374d] mt-1 rounded-full overflow-hidden">
            <div className="w-[65%] h-full bg-[#e10600]"></div>
          </div>
        </div>

        {/* Weather Capsule */}
        <div className="bg-[#191f2c]/95 backdrop-blur-md border border-[#2a3347] rounded-md px-3.5 py-2 flex items-center gap-2.5 shadow-lg text-[0.74rem] text-[#c0c8db]">
          <span>🌡️ Air: <strong className="text-white font-bold">{weather.air_temp}°C</strong></span>
          <span className="text-[#414b63]">|</span>
          <span>Track: <strong className="text-white font-bold">{weather.track_temp}°C</strong></span>
        </div>

        {/* Rolex Official Graphic */}
        <div className="bg-[#191f2c]/95 backdrop-blur-md border border-[#2a3347] rounded-md px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <span className="text-[0.68rem] font-bold text-emerald-400 tracking-wider">ROLEX</span>
        </div>
      </div>
    </div>
  );
}
