export function Gauge({ label, idPrefix, unit, colorClass }) {
  return (
    <div className="bg-[var(--color-f1-bg3)] border border-[var(--color-f1-border)] rounded-[14px] p-[18px_16px_14px] flex flex-col items-center gap-[10px]">
      <div className="text-[0.62rem] font-bold tracking-[2px] text-[var(--color-f1-muted)] uppercase self-start">
        {label}
      </div>
      <div className="relative w-[130px] h-[130px]">
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <path
            className="fill-none stroke-[#1a1f2e] stroke-[10] stroke-round"
            strokeLinecap="round"
            d="M 18 102 A 52 52 0 1 1 102 102"
          />
          <path
            id={`g${idPrefix}`}
            className={`fill-none stroke-[10] stroke-round transition-[stroke-dashoffset] duration-[0.08s] ease-linear ${colorClass}`}
            strokeLinecap="round"
            strokeDasharray="310"
            strokeDashoffset="310"
            d="M 18 102 A 52 52 0 1 1 102 102"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            id={`v${idPrefix}`}
            className="font-mono text-[1.55rem] font-bold text-white leading-none"
          >
            0
          </div>
          <div className="text-[0.6rem] text-[var(--color-f1-muted)] tracking-[1px] mt-[3px]">
            {unit}
          </div>
        </div>
      </div>
    </div>
  );
}
