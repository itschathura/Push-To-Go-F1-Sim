import React, { useState, useRef, useEffect } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { useAnimationFrame } from './hooks/useAnimationFrame';
import { F1Header } from './components/F1Header';
import { F1TimingTower } from './components/F1TimingTower';
import { F1TelemetryCard } from './components/F1TelemetryCard';
import { F1TrackMap } from './components/F1TrackMap';

const LERP = 0.14;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export default function App() {
  const [selectedDriver, setSelectedDriver] = useState('ALO');
  const [showTelemetryCard, setShowTelemetryCard] = useState(true);
  const [activeTab, setActiveTab] = useState('DRIVER TRACKER');
  const [activeSubTab, setActiveSubTab] = useState('Telemetry');

  const { data } = useTelemetry(100);

  // Mutable ref for 60fps lerp animation
  const animRef = useRef({
    speed: { cur: 0, tgt: 0 },
    throttle: { cur: 0, tgt: 0 },
    brake: { cur: 0, tgt: 0 },
    rpm: { cur: 0, tgt: 0 },
  });

  // When new telemetry arrives, update targets
  useEffect(() => {
    if (data?.telemetry?.[selectedDriver]) {
      const tel = data.telemetry[selectedDriver];
      animRef.current.speed.tgt = tel.speed || 0;
      animRef.current.throttle.tgt = tel.throttle || 0;
      animRef.current.brake.tgt = tel.brake || 0;
      animRef.current.rpm.tgt = tel.rpm || 0;
    }
  }, [data, selectedDriver]);

  // 60fps animation loop directly modifying DOM SVG strokeDashoffset and text
  useAnimationFrame(() => {
    const anim = animRef.current;
    let dirty = false;

    for (const k in anim) {
      const a = anim[k];
      const n = lerp(a.cur, a.tgt, LERP);
      if (Math.abs(n - a.cur) > 0.05) {
        a.cur = n;
        dirty = true;
      } else {
        a.cur = a.tgt;
      }
    }

    if (!dirty) return;

    // Digital readouts
    const vSpeed = document.getElementById('vSpeed');
    if (vSpeed) vSpeed.textContent = Math.round(anim.speed.cur);

    const vRpm = document.getElementById('vRpm');
    if (vRpm) vRpm.textContent = Math.round(anim.rpm.cur);

    // Throttle arc (0 to 100% maps to strokeDashoffset 180 to 0)
    const arcThrottle = document.getElementById('arcThrottle');
    if (arcThrottle) {
      const pct = Math.min(1, Math.max(0, anim.throttle.cur / 100));
      arcThrottle.style.strokeDashoffset = 180 * (1 - pct);
    }

    // Brake arc (0 to 100% maps to strokeDashoffset -185 to -5)
    const arcBrake = document.getElementById('arcBrake');
    if (arcBrake) {
      const pct = Math.min(1, Math.max(0, anim.brake.cur / 100));
      arcBrake.style.strokeDashoffset = -185 + (180 * pct);
    }

    // Outer RPM arc (0 to 13000 rpm maps to strokeDashoffset 360 to 0)
    const arcRpm = document.getElementById('arcRpm');
    if (arcRpm) {
      const pct = Math.min(1, Math.max(0, anim.rpm.cur / 13000));
      arcRpm.style.strokeDashoffset = 360 * (1 - pct);
    }
  });

  const handleSelectDriver = (dc) => {
    setSelectedDriver(dc);
    setShowTelemetryCard(true);
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#11141e]">
      {/* Top F1 Red Header & Navigation */}
      <F1Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
      />

      {/* Main Broadcast Body */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Column: F1 Timing Tower */}
        <F1TimingTower
          data={data}
          selectedDriver={selectedDriver}
          onSelectDriver={handleSelectDriver}
        />

        {/* Selected Driver Integrated Telemetry & Battle HUD Card */}
        {showTelemetryCard && (
          <F1TelemetryCard
            data={data}
            selectedDriver={selectedDriver}
            onClose={() => setShowTelemetryCard(false)}
          />
        )}

        {/* Center & Right: Interactive Circuit Track Map (GPS Driver Tracker) */}
        <F1TrackMap
          data={data}
          selectedDriver={selectedDriver}
          onSelectDriver={handleSelectDriver}
        />
      </main>
    </div>
  );
}
