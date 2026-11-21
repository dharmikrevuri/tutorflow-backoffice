import { LATE_DAYS, STRESS_DELAY_DAYS, STRESS_PARENT_COUNT } from '../lib/forecast.js';

function Switch({ checked, onChange, labelId, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
        checked ? 'bg-indigo-600' : 'bg-slate-300'
      }`}
    >
      <span className="sr-only">{label}</span>
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function WhatIfPanel({
  students,
  keyStudentId,
  onKeyStudentChange,
  lateOn,
  onLateToggle,
  stressOn,
  onStressToggle,
}) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">What-If Scenarios</h2>

      <div className="mt-4 rounded-lg border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <p id="whatif-late-label" className="text-sm font-semibold text-slate-800">
            Key parent pays {LATE_DAYS} days late
          </p>
          <Switch
            checked={lateOn}
            onChange={onLateToggle}
            labelId="whatif-late-label"
            label="Key parent pays late"
          />
        </div>
        <label htmlFor="whatif-key-parent" className="mt-3 block text-xs text-slate-500">
          Key parent
        </label>
        <select
          id="whatif-key-parent"
          value={keyStudentId ?? ''}
          disabled={!lateOn}
          onChange={(e) => onKeyStudentChange(e.target.value)}
          className={`mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            lateOn ? 'bg-white text-slate-800' : 'cursor-not-allowed bg-slate-100 text-slate-400'
          }`}
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <p id="whatif-stress-label" className="text-sm font-semibold text-slate-800">
            Bad-Day Stress Test: {STRESS_PARENT_COUNT} parents delay payment by {STRESS_DELAY_DAYS} days
          </p>
          <Switch
            checked={stressOn}
            onChange={onStressToggle}
            labelId="whatif-stress-label"
            label="Bad-Day stress test"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Simulates a rough month: the {STRESS_PARENT_COUNT} parents with the earliest unpaid
          invoices all pay {STRESS_DELAY_DAYS} days later. The Bad-Day Survival Playbook shows how
          to recover if cash runs short.
        </p>
      </div>
    </section>
  );
}
