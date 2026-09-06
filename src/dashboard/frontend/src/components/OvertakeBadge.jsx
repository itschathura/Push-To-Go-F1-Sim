export function OvertakeBadge({ show }) {
  return (
    <div
      className={`fixed bottom-[24px] right-[24px] p-[14px_28px] bg-[rgba(225,6,0,0.1)] border-2 border-[var(--color-f1-red)] rounded-[14px] text-[var(--color-f1-red)] text-[1rem] font-black tracking-[1px] text-center whitespace-nowrap pointer-events-none z-[9999] transition-all duration-250 ease-out glow-red ${
        show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-[6px]'
      }`}
    >
      🔥 OVERTAKE<br />LIKELY
    </div>
  );
}
