export function Metrics({ data, selectedDriver }) {
  const tel = data?.telemetry?.[selectedDriver];
  const tire = data?.tires?.[selectedDriver];

  const gapLeader = data?.gaps_to_leader?.[selectedDriver] || '--';
  const gapAhead = tel?.gap_seconds ? tel.gap_seconds.toFixed(3) + 's' : '--';
  const soc = tel?.soc ? tel.soc.toFixed(1) + '%' : '--%';
  const tireStr = tire ? `${tire.compound} (${tire.laps}L)` : '--';

  return (
    <div className="grid grid-cols-4 gap-[12px]">
      <div className="bg-[var(--color-f1-bg3)] border border-[var(--color-f1-border)] rounded-[12px] p-[14px_16px]">
        <div className="text-[0.58rem] text-[var(--color-f1-muted)] tracking-[1.5px] font-bold uppercase mb-[6px]">
          Gap to Leader
        </div>
        <div className="font-mono text-[1.15rem] text-white font-bold">{gapLeader}</div>
      </div>
      <div className="bg-[var(--color-f1-bg3)] border border-[var(--color-f1-border)] rounded-[12px] p-[14px_16px]">
        <div className="text-[0.58rem] text-[var(--color-f1-muted)] tracking-[1.5px] font-bold uppercase mb-[6px]">
          Gap Ahead
        </div>
        <div className="font-mono text-[1.15rem] text-white font-bold">{gapAhead}</div>
      </div>
      <div className="bg-[var(--color-f1-bg3)] border border-[var(--color-f1-border)] rounded-[12px] p-[14px_16px]">
        <div className="text-[0.58rem] text-[var(--color-f1-muted)] tracking-[1.5px] font-bold uppercase mb-[6px]">
          Estimated SoC
        </div>
        <div className="font-mono text-[1.15rem] text-white font-bold">{soc}</div>
      </div>
      <div className="bg-[var(--color-f1-bg3)] border border-[var(--color-f1-border)] rounded-[12px] p-[14px_16px]">
        <div className="text-[0.58rem] text-[var(--color-f1-muted)] tracking-[1.5px] font-bold uppercase mb-[6px]">
          Tire
        </div>
        <div className="font-mono text-[1.15rem] text-white font-bold">{tireStr}</div>
      </div>
    </div>
  );
}
