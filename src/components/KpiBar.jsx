import { formatINR } from '../lib/finance.js';

function KpiCard({ label, value, hint, accent }) {
  return (
    <div className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${accent}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function KpiBar({ kpis }) {
  const overdueWord = kpis.overdueCount === 1 ? 'invoice' : 'invoices';
  const billWord = kpis.upcomingBills.count === 1 ? 'bill' : 'bills';

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Cash in Bank"
        value={formatINR(kpis.cashInBank)}
        hint="Current balance"
        accent="border-l-blue-500"
      />
      <KpiCard
        label="Upcoming Bills"
        value={formatINR(kpis.upcomingBills.total)}
        hint={`${kpis.upcomingBills.count} ${billWord} due in next 30 days`}
        accent="border-l-violet-500"
      />
      <KpiCard
        label="Outstanding Receivables"
        value={formatINR(kpis.outstanding)}
        hint="Unpaid student invoices"
        accent="border-l-emerald-500"
      />
      <KpiCard
        label="Overdue Invoices"
        value={formatINR(kpis.overdueTotal)}
        hint={`${kpis.overdueCount} ${overdueWord} past due`}
        accent="border-l-red-500"
      />
    </div>
  );
}
