export default function AlertsBanner({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-emerald-800"
      >
        <p className="font-semibold">All clear — no urgent actions today</p>
      </div>
    );
  }

  const hasHigh = alerts.some((alert) => alert.severity === 'high');
  const tone = hasHigh
    ? 'border-red-300 bg-red-50 text-red-900'
    : 'border-amber-300 bg-amber-50 text-amber-900';

  return (
    <section className={`rounded-xl border px-5 py-4 ${tone}`} aria-label="Actionable alerts">
      <h2 className="text-base font-bold">Actionable Alerts ({alerts.length})</h2>
      <ul className="mt-3 space-y-3">
        {alerts.map((alert) => (
          <li key={alert.id} className="rounded-lg bg-white/70 p-3">
            <p className="font-semibold">{alert.title}</p>
            <p className="text-sm">{alert.detail}</p>
            <p className="mt-1 text-sm font-bold">{alert.action}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
