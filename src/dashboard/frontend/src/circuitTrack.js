// Hungaroring / F1 Circuit vector path and track sectors
export const TRACK_SVG_PATH = 
  "M 330 450 " +
  "L 330 160 " +
  "C 330 130, 350 110, 380 110 " +
  "C 410 110, 420 130, 410 160 " +
  "L 390 200 " +
  "C 385 215, 395 230, 415 230 " +
  "L 470 230 " +
  "C 500 230, 520 200, 560 170 " +
  "C 600 140, 640 140, 680 170 " +
  "C 720 200, 740 250, 730 280 " +
  "C 720 310, 690 320, 660 300 " +
  "C 630 280, 580 320, 560 370 " +
  "C 540 420, 550 460, 520 490 " +
  "C 490 520, 440 500, 430 460 " +
  "L 430 380 " +
  "C 430 350, 410 330, 380 340 " +
  "C 350 350, 360 400, 360 440 " +
  "C 360 470, 340 480, 330 450 Z";

// DRS Zones definitions along track percentage
export const DRS_ZONES = [
  { label: "DRS ACTIVATION ZONES 1", startPct: 0.05, endPct: 0.18 },
  { label: "DRS ACTIVATION ZONES 2", startPct: 0.35, endPct: 0.45 },
];

export const SPEED_TRAP_PCT = 0.12;

// Pseudo-realistic track position generator for 22 drivers based on positions & lap completion
export function getDriverTrackPosition(driverCode, posIndex, totalDrivers = 22) {
  // Stagger drivers along the circuit track (0.0 to 1.0)
  const baseOffset = (posIndex / totalDrivers);
  // Add a slight deterministic spread so each car is distinctly positioned
  const hash = driverCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const microVariation = (hash % 100) / 1000;
  return (baseOffset + microVariation) % 1.0;
}
