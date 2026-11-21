import { useMemo, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import { formatDate, formatINR } from '../lib/finance.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending/Unpaid' },
  { key: 'overdue', label: 'Overdue' },
];

const HEADERS = ['Student', 'Invoice #', 'Description', 'Due Date', 'Amount', 'Status', 'Action'];

// Unpaid invoices belong to the Pending/Unpaid tab.
const filterBucket = (status) => (status === 'unpaid' ? 'pending' : status);

export default function WhoOwesMeTable({ invoices, students, onMarkPaid, onMarkUnpaid, onSmartRemind }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const result = { all: invoices.length, paid: 0, pending: 0, overdue: 0 };
    invoices.forEach((inv) => {
      const bucket = filterBucket(inv.derivedStatus);
      if (result[bucket] !== undefined) result[bucket] += 1;
    });
    return result;
  }, [invoices]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (filter !== 'all' && filterBucket(inv.derivedStatus) !== filter) return false;
      if (!q) return true;
      const name = students[inv.studentId]?.name ?? '';
      return name.toLowerCase().includes(q);
    });
  }, [invoices, students, filter, query]);

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-base font-bold text-slate-900">Who Owes Me</h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by student name…"
          aria-label="Search by student name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 md:w-64"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter invoices by status">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label} <span className="ml-1 text-xs opacity-80">({counts[f.key]})</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-slate-500">
        Showing {visible.length} of {invoices.length} invoices
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {HEADERS.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-4 py-8 text-center text-slate-500">
                  No invoices match your filters.
                </td>
              </tr>
            ) : (
              visible.map((inv) => {
                const student = students[inv.studentId];
                const isPaid = inv.derivedStatus === 'paid';
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-medium text-slate-900">{student?.name ?? 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{student?.city ?? ''}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                      {inv.invoiceNo}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{inv.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                      {formatINR(inv.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.derivedStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!isPaid && onSmartRemind && (
                          <button
                            type="button"
                            onClick={() => onSmartRemind(inv)}
                            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
                          >
                            Smart Remind
                          </button>
                        )}
                        {isPaid ? (
                          <button
                            type="button"
                            onClick={() => onMarkUnpaid?.(inv.id)}
                            title="Click to mark unpaid"
                            className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
                          >
                            Paid ✓
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onMarkPaid(inv.id)}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
