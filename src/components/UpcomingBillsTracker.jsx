import { formatDate, formatINR } from '../lib/finance.js';

const URGENCY = {
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700' },
  today: { label: 'Due today', className: 'bg-orange-100 text-red-700' },
  soon: { label: 'Due in ≤7 days', className: 'bg-amber-100 text-amber-800' },
  later: { label: 'Later', className: 'bg-slate-100 text-slate-600' },
};

/** `bills` is the output of buildBillTracker: { bills, totalDue30 }. */
export default function UpcomingBillsTracker({ bills }) {
  const items = bills?.bills ?? [];
  const totalDue30 = bills?.totalDue30 ?? 0;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Upcoming Bills</h2>
      <p className="mt-1 text-sm text-slate-600">
        Total due in next 30 days:{' '}
        <span className="font-semibold tabular-nums text-slate-900">{formatINR(totalDue30)}</span>
      </p>

      {items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">No unpaid bills</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {items.map((bill) => {
            const tone = URGENCY[bill.urgency] ?? URGENCY.later;
            return (
              <li key={bill.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{bill.name}</p>
                  <p className="text-xs text-slate-500">Due {formatDate(bill.dueDate)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatINR(bill.amount)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone.className}`}>
                    {tone.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
