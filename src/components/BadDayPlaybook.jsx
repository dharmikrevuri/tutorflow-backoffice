import { useEffect, useState } from 'react';
import { formatDate, formatINR } from '../lib/finance.js';

/** Recovery card shown when a scenario pushes cash below zero (or confirms the stress test is survived). */
export default function BadDayPlaybook({ playbook, visible, stressOn }) {
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle' | 'copied' | 'failed'

  // "Copied ✓" reverts after 2 seconds.
  useEffect(() => {
    if (copyStatus === 'idle') return undefined;
    const timer = setTimeout(() => setCopyStatus('idle'), copyStatus === 'copied' ? 2000 : 3000);
    return () => clearTimeout(timer);
  }, [copyStatus]);

  if (!visible || !playbook) return null;

  const atRisk = playbook.shortfall > 0 || !!playbook.zeroDate;

  if (!atRisk) {
    if (!stressOn) return null;
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <h2 className="text-base font-bold text-emerald-800">Bad-Day Survival Playbook</h2>
        <p className="mt-2 text-sm font-medium text-emerald-700">
          Stress test survived — cash stays positive (lowest {formatINR(playbook.lowestBalance)}).
        </p>
      </section>
    );
  }

  const planText = [
    `Bad-Day Survival Playbook`,
    `Shortfall: ${formatINR(playbook.shortfall)}` +
      (playbook.zeroDate ? ` · cash hits zero on ${formatDate(playbook.zeroDate)}` : ''),
    '',
    ...playbook.steps.map((step, i) => `${i + 1}. ${step}`),
  ].join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(planText);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  return (
    <section className="rounded-xl border-2 border-red-300 bg-red-50/60 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-bold text-red-800">Bad-Day Survival Playbook</h2>
          <p className="mt-1 text-sm font-semibold text-red-700">
            Shortfall of {formatINR(playbook.shortfall)}
            {playbook.zeroDate
              ? ` · cash hits zero on ${formatDate(playbook.zeroDate)}`
              : ' · cash dips below your safety buffer'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
        >
          {copyStatus === 'copied' ? 'Copied ✓' : 'Copy plan'}
        </button>
      </div>
      {copyStatus === 'failed' && (
        <p className="mt-2 text-xs font-medium text-rose-600">Copy failed – select the text manually</p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stressed parents
          </h3>
          {playbook.stressedStudents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No parents delaying in this scenario.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-800">
              {playbook.stressedStudents.map((s) => (
                <li key={s.id}>
                  <span className="font-medium">{s.name}</span>
                  {s.guardian && <span className="text-slate-500"> ({s.guardian})</span>}
                  {' — '}
                  <span className="tabular-nums">{formatINR(s.amount)} unpaid</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bills to defer or negotiate
          </h3>
          {playbook.billsToDefer.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No bills due in the next 14 days.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-800">
              {playbook.billsToDefer.map((b) => (
                <li key={b.id}>
                  <span className="font-medium">{b.name}</span>
                  {' — '}
                  <span className="tabular-nums">{formatINR(b.amount)}</span>
                  <span className="text-slate-500"> · due {formatDate(b.dueDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Recovery steps
        </h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-800">
          {playbook.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
