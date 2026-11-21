import { useEffect, useRef, useState } from 'react';
import { formatINR, todayISO } from '../lib/finance.js';
import {
  TONE_STAGES,
  buildReminder,
  daysOverdue,
  splitAmounts,
} from '../lib/reminders.js';

const STAGE_ACCENT = {
  1: 'accent-emerald-600',
  2: 'accent-amber-500',
  3: 'accent-red-600',
};

const STAGE_TEXT = {
  1: 'text-emerald-700',
  2: 'text-amber-700',
  3: 'text-red-700',
};

const DEFAULT_TUTOR = 'TutorFlow';

/** Default stage: 1 if not overdue, 2 if 1–14 days overdue, 3 if more than 14. */
function defaultStage(days) {
  if (days > 14) return 3;
  if (days > 0) return 2;
  return 1;
}

/** Copies text; uses the Clipboard API, then a hidden textarea + execCommand fallback. */
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path.
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Mounted fresh for each invoice (parent keys it), so stage/split state resets naturally. */
function RemindBody({ onClose, invoice, student, today }) {
  const days = daysOverdue(invoice, today);
  const [stage, setStage] = useState(() => defaultStage(days));
  const [splitPay, setSplitPay] = useState(false);
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle' | 'copied' | 'failed'
  const closeRef = useRef(null);

  // Focus the close button on open.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Esc closes the drawer.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // "Copied ✓" reverts after 2 seconds.
  useEffect(() => {
    if (copyStatus !== 'copied') return undefined;
    const timer = setTimeout(() => setCopyStatus('idle'), 2000);
    return () => clearTimeout(timer);
  }, [copyStatus]);

  const showSplit = stage === 3;
  const text = buildReminder({
    stage,
    invoice,
    student,
    tutorName: DEFAULT_TUTOR,
    splitPay: showSplit && splitPay,
    today,
  });
  const split = splitAmounts(invoice.amount);
  const digits = String(student?.phone ?? '').replace(/\D/g, '');
  const waUrl = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : null;

  const handleCopy = async () => {
    const ok = await copyText(text);
    setCopyStatus(ok ? 'copied' : 'failed');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="smart-remind-title"
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="smart-remind-title" className="text-base font-bold text-slate-900">
              Smart Remind
            </h2>
            <p className="mt-0.5 font-mono text-xs text-slate-500">{invoice.invoiceNo}</p>
            <p className="text-sm text-slate-700">{student?.name ?? 'Unknown student'}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            ×
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="smart-remind-stage"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Tone
            </label>
            <span className={`text-sm font-semibold ${STAGE_TEXT[stage]}`}>
              {TONE_STAGES[stage - 1].label}
            </span>
          </div>
          <input
            id="smart-remind-stage"
            type="range"
            min={1}
            max={3}
            step={1}
            value={stage}
            onChange={(e) => setStage(Number(e.target.value))}
            className={`mt-2 w-full cursor-pointer ${STAGE_ACCENT[stage]}`}
          />
          <div className="mt-1 grid grid-cols-3 text-xs text-slate-600">
            {TONE_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStage(s.id)}
                aria-pressed={stage === s.id}
                className={`text-left focus:outline-none ${
                  stage === s.id ? `font-semibold ${STAGE_TEXT[s.id]}` : 'hover:text-slate-900'
                } ${s.id === 2 ? 'text-center' : ''} ${s.id === 3 ? 'text-right' : ''}`}
              >
                {s.id} {s.label}
              </button>
            ))}
          </div>
        </div>

        {showSplit && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={splitPay}
                onChange={(e) => setSplitPay(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              Offer 50% Split-Pay
            </label>
            {splitPay && (
              <p className="mt-2 text-xs tabular-nums text-slate-700">
                Pay now: <span className="font-semibold">{formatINR(split.now)}</span>
                {' · '}Balance later: <span className="font-semibold">{formatINR(split.later)}</span>
              </p>
            )}
          </div>
        )}

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            WhatsApp preview
          </h3>
          <div
            className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-800"
            aria-live="polite"
          >
            {text}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
          >
            {copyStatus === 'copied' ? 'Copied ✓' : 'Copy Message'}
          </button>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Open in WhatsApp
            </a>
          )}
        </div>
        {copyStatus === 'failed' && (
          <p className="mt-2 text-xs font-medium text-rose-600">
            Copy failed – select the text manually
          </p>
        )}
      </div>
    </div>
  );
}

export default function SmartRemindDrawer({ open, onClose, invoice, student, today }) {
  if (!open || !invoice) return null;
  return (
    <RemindBody
      key={invoice.id}
      onClose={onClose}
      invoice={invoice}
      student={student}
      today={today ?? todayISO()}
    />
  );
}
