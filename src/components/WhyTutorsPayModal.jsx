import { useEffect, useRef } from 'react';
import { formatINR } from '../lib/finance.js';

const PRO_PRICE = 499;
const RECOVERED_FEE = 4000;
const MONTHS_COVERED = Math.round(RECOVERED_FEE / PRO_PRICE); // 8

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    popular: false,
    features: [
      'Up to 10 active students',
      'Who Owes Me table',
      'Magic WhatsApp Paste',
      '30-day cash forecast',
    ],
  },
  {
    id: 'pro',
    name: 'Tutor Pro',
    price: PRO_PRICE,
    popular: true,
    features: [
      'Unlimited students',
      'Smart Remind tone slider',
      '90-day cash forecast',
      'Bad-Day Survival Playbook',
      'UPI reminders',
    ],
  },
  {
    id: 'institute',
    name: 'Institute',
    price: 1499,
    popular: false,
    features: [
      'Multi-tutor access',
      'Shared dashboard',
      'GST-ready invoices',
      'Priority support',
    ],
  },
];

export default function WhyTutorsPayModal({ open, onClose }) {
  const closeRef = useRef(null);

  // Focus the close button on open; Esc closes the modal.
  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="why-tutors-pay-title"
        className="max-h-full w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="why-tutors-pay-title" className="text-xl font-bold text-slate-900">
            Why Tutors Pay
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            ×
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          TutorFlow turns chasing fees into a routine. Fewer chase messages to write, faster
          collection from parents who pay late, and a day-by-day cash forecast that shows an
          overdraft coming before it hits, so you can plan instead of scramble.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-xl border p-5 ${
                tier.popular
                  ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-base font-bold text-slate-900">{tier.name}</h3>
              <p className="mt-2">
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {formatINR(tier.price)}
                </span>
                <span className="text-sm text-slate-500">/month</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-emerald-600" aria-hidden="true">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onClose}
                className={`mt-5 rounded-md px-3 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                  tier.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Choose plan
              </button>
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          A single {formatINR(RECOVERED_FEE)} fee recovered from a late payer covers Tutor Pro for
          about {MONTHS_COVERED} months.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Prices are illustrative; no payment is taken in this demo.
        </p>
      </div>
    </div>
  );
}
