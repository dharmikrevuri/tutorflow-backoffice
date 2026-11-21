import { useEffect, useRef, useState } from 'react';
import { formatINR, parseISODate, todayISO } from '../lib/finance.js';

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Returns the next invoice number ('TF-YYYY-NNN') after the highest existing one. */
function nextInvoiceNo(invoices) {
  const max = invoices.reduce((m, inv) => {
    const n = Number(String(inv.invoiceNo).match(/TF-\d{4}-(\d+)/)?.[1] ?? 0);
    return Math.max(m, n);
  }, 0);
  return `TF-2025-${String(max + 1).padStart(3, '0')}`;
}

/** Default description for a new fee invoice, e.g. 'Monthly fee – June 2025'. */
function defaultDescription(isoDate) {
  const d = parseISODate(isoDate);
  return `Monthly fee – ${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const LABEL = 'block text-xs font-semibold uppercase tracking-wide text-slate-500';
const INPUT =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const ERROR = 'mt-1 text-xs font-medium text-rose-600';

function InvoiceForm({ students, invoices, onSave, onClose, initialValues }) {
  const today = todayISO();
  const seed = initialValues ?? {};

  const [studentId, setStudentId] = useState(seed.studentId ?? students[0]?.id ?? '');
  const [description, setDescription] = useState(seed.description ?? defaultDescription(today));
  const [amount, setAmount] = useState(seed.amount != null ? String(seed.amount) : '');
  const [dueDate, setDueDate] = useState(seed.dueDate ?? '');
  const [submitted, setSubmitted] = useState(false);

  const [invoiceNo] = useState(() => nextInvoiceNo(invoices));
  const firstFieldRef = useRef(null);

  // Focus the first field on open.
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Esc closes the modal.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const amountNum = Number(amount);
  const errors = {
    studentId: studentId ? null : 'Select a student.',
    description: description.trim() ? null : 'Enter a description.',
    amount: amount !== '' && Number.isFinite(amountNum) && amountNum > 0 ? null : 'Amount must be greater than 0.',
    dueDate: dueDate ? null : 'Pick a due date.',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    onSave({
      mode: 'create',
      invoice: {
        id: 'inv-' + Date.now(),
        studentId,
        invoiceNo,
        description: description.trim(),
        amount: amountNum,
        dueDate,
        status: 'unpaid',
      },
    });
    onClose();
  };

  const showError = (key) => (submitted && errors[key] ? <p className={ERROR}>{errors[key]}</p> : null);

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
        aria-labelledby="new-invoice-title"
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="new-invoice-title" className="text-base font-bold text-slate-900">
            New Invoice
          </h2>
          <span className="font-mono text-xs text-slate-500">{invoiceNo}</span>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div>
            <label htmlFor="ni-student" className={LABEL}>Student</label>
            <select
              id="ni-student"
              ref={firstFieldRef}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={INPUT}
            >
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {showError('studentId')}
          </div>

          <div>
            <label htmlFor="ni-description" className={LABEL}>Description</label>
            <input
              id="ni-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={INPUT}
            />
            {showError('description')}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ni-amount" className={LABEL}>Amount (₹)</label>
              <input
                id="ni-amount"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${INPUT} tabular-nums`}
              />
              {showError('amount')}
            </div>

            <div>
              <label htmlFor="ni-due" className={LABEL}>Due date</label>
              <input
                id="ni-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={INPUT}
              />
              {showError('dueDate')}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            {Number.isFinite(amountNum) && amountNum > 0 ? `Invoice total ${formatINR(amountNum)}` : ' '}
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
            >
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewInvoiceModal({
  open,
  onClose,
  students,
  invoices,
  onSave,
  initialValues,
}) {
  if (!open) return null;
  // Mounting the form fresh each time the modal opens resets its fields.
  return (
    <InvoiceForm
      students={students}
      invoices={invoices}
      onSave={onSave}
      onClose={onClose}
      initialValues={initialValues}
    />
  );
}
