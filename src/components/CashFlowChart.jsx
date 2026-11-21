import { useState } from 'react';
import { HORIZONS } from '../lib/forecast.js';
import { formatDate, formatINR } from '../lib/finance.js';

// Hand-written SVG line chart. Plot area is inset by PAD; x/y map data to viewBox units.
const W = 800;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const ZERO_RED = '#dc2626';
const TOOLTIP_W = 176;

/** Short INR label for axes: 2.5L, 50k, ₹0. */
function shortINR(n) {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  const trim = (v) => String(Number(v.toFixed(1)));
  if (a >= 100000) return `${sign}₹${trim(a / 100000)}L`;
  if (a >= 1000) return `${sign}₹${trim(a / 1000)}k`;
  return `${sign}₹${Math.round(a)}`;
}

/** Picks a round step and returns tick values covering [min, max]. */
function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = 10 * mag;
  for (const s of [1, 2, 5, 10]) {
    if (s * mag >= raw) {
      step = s * mag;
      break;
    }
  }
  const lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if (hi === lo) hi = lo + step;
  const ticks = [];
  const steps = Math.round((hi - lo) / step);
  for (let k = 0; k <= steps; k += 1) ticks.push(lo + k * step);
  return { ticks, lo, hi };
}

export default function CashFlowChart({ projection, baseline, horizon, onHorizonChange }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const points = projection.points;
  const n = points.length - 1;
  const showBaseline =
    !!baseline && baseline.points.some((p, i) => p.balance !== points[i]?.balance);

  const allBalances = points.map((p) => p.balance);
  if (showBaseline) baseline.points.forEach((p) => allBalances.push(p.balance));
  const { ticks, lo, hi } = niceTicks(
    Math.min(0, ...allBalances),
    Math.max(0, ...allBalances),
  );

  const xFor = (i) => PAD.left + (n === 0 ? 0 : (i / n) * PLOT_W);
  const yFor = (v) => PAD.top + ((hi - v) / (hi - lo)) * PLOT_H;
  const zeroY = yFor(0);

  const linePath = (pts) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.balance).toFixed(1)}`)
      .join(' ');

  // Area between the zero line and the curve wherever the balance is below zero.
  const negativeArea = [
    `M ${xFor(0).toFixed(1)} ${zeroY.toFixed(1)}`,
    ...points.map(
      (p, i) => `L ${xFor(i).toFixed(1)} ${Math.max(yFor(p.balance), zeroY).toFixed(1)}`,
    ),
    `L ${xFor(n).toFixed(1)} ${zeroY.toFixed(1)} Z`,
  ].join(' ');
  const hasNegative = points.some((p) => p.balance < 0);

  const xTickIdx = [0, 1, 2, 3, 4, 5].map((k) => Math.round((k * n) / 5));

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const raw = ((svgX - PAD.left) / PLOT_W) * n;
    setHoverIdx(Math.min(n, Math.max(0, Math.round(raw))));
  };

  const hover = hoverIdx !== null ? points[hoverIdx] : null;
  const hoverX = hover ? xFor(hoverIdx) : 0;
  const tipX = hoverX + 12 + TOOLTIP_W > W - PAD.right ? hoverX - 12 - TOOLTIP_W : hoverX + 12;
  const tipLines = hover
    ? [
        formatDate(hover.date),
        `Balance ${formatINR(hover.balance)}`,
        `Inflow +${formatINR(hover.inflow)}`,
        `Outflow -${formatINR(hover.outflow)}`,
        ...(showBaseline ? [`Baseline ${formatINR(baseline.points[hoverIdx].balance)}`] : []),
      ]
    : [];
  const tipH = 12 + tipLines.length * 15;

  const chips = [
    {
      key: 'low',
      label: 'Lowest balance',
      value: formatINR(projection.minBalance),
      sub: `on ${formatDate(projection.minDate)}`,
      tone: projection.minBalance < 0 ? 'text-red-700' : 'text-slate-900',
    },
    {
      key: 'zero',
      label: 'Zero-cash date',
      value: projection.zeroDate ? formatDate(projection.zeroDate) : 'Never goes negative',
      sub: projection.zeroDate ? 'balance drops below ₹0' : 'stays at or above ₹0',
      tone: projection.zeroDate ? 'text-red-700' : 'text-emerald-700',
    },
    {
      key: 'in',
      label: 'Total inflow',
      value: `+${formatINR(projection.totalInflow)}`,
      sub: `next ${horizon} days`,
      tone: 'text-emerald-700',
    },
    {
      key: 'out',
      label: 'Total outflow',
      value: `-${formatINR(projection.totalOutflow)}`,
      sub: `next ${horizon} days`,
      tone: 'text-rose-700',
    },
    {
      key: 'end',
      label: 'End balance',
      value: formatINR(projection.endBalance),
      sub: formatDate(points[n].date),
      tone: projection.endBalance < 0 ? 'text-red-700' : 'text-slate-900',
    },
  ];

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Cash Flow Projection</h2>
          <p className="text-xs text-slate-500">
            Bank balance day by day from unpaid invoices and bills
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Forecast horizon">
          {HORIZONS.map((h) => {
            const active = horizon === h;
            return (
              <button
                key={h}
                type="button"
                aria-pressed={active}
                onClick={() => onHorizonChange(h)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {h} days
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full select-none"
          role="img"
          aria-label={`Cash balance projection for ${horizon} days`}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {ticks.map((t) => (
            <g key={`tick-${t}`}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={yFor(t) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#64748b"
              >
                {shortINR(t)}
              </text>
            </g>
          ))}

          {xTickIdx.map((idx, k) => (
            <text
              key={`x-${idx}`}
              x={xFor(idx)}
              y={H - 8}
              textAnchor={k === 0 ? 'start' : k === xTickIdx.length - 1 ? 'end' : 'middle'}
              fontSize="11"
              fill="#64748b"
            >
              {formatDate(points[idx].date).slice(0, 6)}
            </text>
          ))}

          {hasNegative && (
            <path d={negativeArea} fill={ZERO_RED} fillOpacity="0.12" />
          )}

          {showBaseline && (
            <path
              d={linePath(baseline.points)}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}

          <path
            d={linePath(points)}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={zeroY}
            y2={zeroY}
            stroke={ZERO_RED}
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
          <text
            x={W - PAD.right - 4}
            y={zeroY - 6}
            textAnchor="end"
            fontSize="12"
            fontWeight="600"
            fill={ZERO_RED}
          >
            Zero Cash ₹0
          </text>

          {hover && (
            <g pointerEvents="none">
              <line
                x1={hoverX}
                x2={hoverX}
                y1={PAD.top}
                y2={PAD.top + PLOT_H}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={hoverX} cy={yFor(hover.balance)} r="4" fill="#4f46e5" stroke="white" strokeWidth="1.5" />
              <rect
                x={tipX}
                y={PAD.top + 4}
                width={TOOLTIP_W}
                height={tipH}
                rx="6"
                fill="white"
                stroke="#cbd5e1"
              />
              {tipLines.map((line, i) => (
                <text
                  key={line}
                  x={tipX + 8}
                  y={PAD.top + 20 + i * 15}
                  fontSize="11"
                  fontWeight={i === 0 ? '700' : '400'}
                  fill="#1e293b"
                >
                  {line}
                </text>
              ))}
            </g>
          )}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-indigo-600" aria-hidden="true" />
          Scenario
        </span>
        {showBaseline && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-5 border-t-2 border-dashed border-slate-400"
              aria-hidden="true"
            />
            Baseline (no scenario)
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-red-600" aria-hidden="true" />
          Zero cash
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {chips.map((chip) => (
          <div key={chip.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {chip.label}
            </p>
            <p className={`mt-1 text-sm font-bold tabular-nums ${chip.tone}`}>{chip.value}</p>
            <p className="text-xs text-slate-500">{chip.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
