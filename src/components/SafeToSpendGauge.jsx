import { SAFE_WINDOW_DAYS, SAFETY_BUFFER, formatINR } from '../lib/finance.js';

const COLORS = {
  safe: '#16a34a',
  caution: '#f59e0b',
  danger: '#dc2626',
};

// Semicircle arc from left (20,100) to right (180,100), radius 80.
const ARC_PATH = 'M 20 100 A 80 80 0 0 1 180 100';

export default function SafeToSpendGauge({ safe }) {
  const ratio = Math.min(1, Math.max(0, Number(safe.ratio) || 0));
  const percent = ratio * 100;
  const color = COLORS[safe.level] ?? COLORS.danger;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Safe to Spend Today</h2>

      <div className="mx-auto mt-3 w-full max-w-xs">
        <svg
          viewBox="0 0 200 110"
          className="w-full"
          role="img"
          aria-label={`Safe to spend ${formatINR(safe.amount)}, ${safe.label}`}
        >
          <path
            d={ARC_PATH}
            pathLength="100"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d={ARC_PATH}
            pathLength="100"
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${percent} 100`}
          />
        </svg>
      </div>

      <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color }}>
        {formatINR(safe.amount)}
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color }}>
        {safe.label}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        after {formatINR(SAFETY_BUFFER)} buffer &amp; bills due in {SAFE_WINDOW_DAYS} days
      </p>
    </section>
  );
}
