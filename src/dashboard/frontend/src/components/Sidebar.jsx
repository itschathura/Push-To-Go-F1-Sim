import { TEAM_COLORS, DRIVER_TEAM } from '../constants';

export function Sidebar({ data, selectedDriver, onSelectDriver }) {
  const sorted = Object.keys(DRIVER_TEAM)
    .map((dc) => ({
      dc,
      pos: data?.positions?.[dc] ? parseInt(data.positions[dc]) : 99,
    }))
    .sort((a, b) => (a.pos !== b.pos ? a.pos - b.pos : a.dc.localeCompare(b.dc)));

  return (
    <div className="w-[172px] bg-[var(--color-f1-bg2)] border-r border-[var(--color-f1-border)] flex flex-col shrink-0 overflow-hidden">
      <div className="text-[0.62rem] font-bold text-[var(--color-f1-muted)] tracking-[1.5px] uppercase py-[12px] px-[14px] border-b border-[var(--color-f1-border)]">
        Live Timing
      </div>
      <div className="overflow-y-auto flex-1 scrollbar-custom">
        {sorted.map((d) => {
          const color = TEAM_COLORS[DRIVER_TEAM[d.dc]] || '#666';
          const gap = data?.gaps_to_leader?.[d.dc] || '';
          const pos = d.pos === 99 ? '—' : `P${d.pos}`;
          const isActive = d.dc === selectedDriver;

          return (
            <div
              key={d.dc}
              onClick={() => onSelectDriver(d.dc)}
              className={`flex items-center gap-[8px] py-[6px] px-[14px] cursor-pointer border-l-[3px] transition-all duration-[0.15s] ${
                isActive
                  ? 'bg-[rgba(225,6,0,0.08)] border-l-[var(--color-f1-red)]'
                  : 'border-l-transparent hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              <span className="text-[0.62rem] text-[var(--color-f1-muted)] font-mono w-[22px]">
                {pos}
              </span>
              <div
                className="w-[3px] h-[16px] rounded-[2px] shrink-0"
                style={{ background: color }}
              ></div>
              <span className="text-[0.78rem] font-bold font-mono flex-1 text-[var(--color-f1-text)]">
                {d.dc}
              </span>
              <span className="text-[0.62rem] text-[var(--color-f1-muted)] font-mono text-right">
                {gap}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
