import { useMemo, useState } from 'react';
import { parseISODate, toISODate, todayISO } from '../lib/finance.js';
import { parseWhatsAppMessage } from '../lib/whatsappParser.js';

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SAMPLES = [
  { id: 'sunita', text: "Sunita Sharma: Aarav's fee ₹4,000 due 5/06/2025 please" },
  { id: 'diya', text: 'Hi, Diya Patel fees 3500 pending till 10 Jun' },
  { id: 'rohan', text: 'Rohan Iyer – 6k due tomorrow' },
  { id: 'ananya', text: 'Ananya Reddy paid 2500 today' },
];

const LABEL = 'block text-xs font-semibold uppercase tracking-wide text-slate-500';
const INPUT =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

/** Next invoice number ('TF-YYYY-NNN') after the highest existing one. */
function nextInvoiceNo(invoices) {
  const max = invoices.reduce((m, inv) => {
    const n = Number(String(inv.invoiceNo).match(/TF-\d{4}-(\d+)/)?.[1] ?? 0);
    return Math.max(m, n);
  }, 0);
  return `TF-2025-${String(max + 1).padStart(3, '0')}`;
}

/** Description for a fee invoice due in the given ISO month, e.g. 'Monthly fee – June 2025'. */
function feeDescription(isoDate) {
  const d = parseISODate(isoDate);
  return `Monthly fee – ${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Matching rule: same amount first, else an unpaid invoice whose description names the due month. */
function findMatchingInvoice(unpaid, amount, dueDate) {
  if (amount != null) {
    const sameAmount = unpaid.find((inv) => Number(inv.amount) === amount);
    if (sameAmount) return sameAmount;
  }
  if (dueDate) {
    const month = FULL_MONTHS[parseISODate(dueDate).getMonth()];
    const re = new RegExp(`\\b${month}\\b`, 'i');
    return unpaid.find((inv) => re.test(inv.description)) ?? null;
  }
  return null;
}

export default function MagicPasteCard({ students, invoices, onAction, today }) {
  const todayValue = today ?? todayISO();
  const [text, setText] = useState('');
  // Inline edits to the parsed preview. Keys present here override the parse result.
  const [edits, setEdits] = useState({});
  const [notice, setNotice] = useState(null);
  // Sample chip whose text is currently in the textarea (null once edited or cleared).
  const [activeChipId, setActiveChipId] = useState(null);
  // Sample chip ids whose message was successfully applied; these chips are hidden.
  const [appliedChips, setAppliedChips] = useState([]);

  const parsed = useMemo(
    () => parseWhatsAppMessage(text, students, todayValue),
    [text, students, todayValue],
  );
  const hasText = text.trim() !== '';

  const studentId = 'studentId' in edits ? edits.studentId : (parsed.studentId ?? '');
  const amountInput =
    'amount' in edits ? edits.amount : parsed.amount != null ? String(parsed.amount) : '';
  const dueDefaulted = !('dueDate' in edits) && !parsed.dueDate;
  const dueDate =
    'dueDate' in edits ? edits.dueDate : (parsed.dueDate ?? toISODate(addDays(parseISODate(todayValue), 7)));

  const amountNum = Number(amountInput);
  const amountValid = amountInput !== '' && Number.isFinite(amountNum) && amountNum > 0;
  const student = students.find((s) => s.id === studentId) ?? null;

  const unpaid = student
    ? invoices.filter((inv) => inv.studentId === student.id && inv.status !== 'paid')
    : [];
  const existing = findMatchingInvoice(unpaid, amountValid ? amountNum : null, dueDate);
  const paymentTarget =
    parsed.isPayment && unpaid.length > 0
      ? (existing ??
        [...unpaid].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0])
      : null;

  let blockReason = null;
  if (!student) blockReason = 'Pick a student to continue.';
  else if (!amountValid) blockReason = 'Enter an amount greater than 0.';
  else if (!dueDate) blockReason = 'Enter a due date.';

  const setEdit = (key, value) => setEdits((prev) => ({ ...prev, [key]: value }));

  const loadSample = (chip) => {
    setText(chip.text);
    setActiveChipId(chip.id);
    setEdits({});
    setNotice(null);
  };

  const finish = (message) => {
    // Called only after onAction has been dispatched for the current message.
    if (activeChipId) {
      setAppliedChips((prev) => (prev.includes(activeChipId) ? prev : [...prev, activeChipId]));
    }
    setActiveChipId(null);
    setText('');
    setEdits({});
    setNotice(message);
  };

  const handleMain = () => {
    if (blockReason) return;
    if (existing) {
      onAction({ mode: 'update', invoice: { ...existing, amount: amountNum, dueDate } });
      finish(`Invoice ${existing.invoiceNo} updated`);
      return;
    }
    const invoiceNo = nextInvoiceNo(invoices);
    onAction({
      mode: 'create',
      invoice: {
        id: 'inv-' + Date.now(),
        studentId: student.id,
        invoiceNo,
        description: feeDescription(dueDate),
        amount: amountNum,
        dueDate,
        status: 'unpaid',
      },
    });
    finish(`Invoice ${invoiceNo} created`);
  };

  const handleMarkPaid = () => {
    onAction({ mode: 'mark_paid', invoiceId: paymentTarget.id });
    finish(`Invoice ${paymentTarget.invoiceNo} marked paid`);
  };

  const studentStatus =
    'studentId' in edits ? 'selected' : parsed.matchedStudent ? 'matched' : 'not found';

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">Magic WhatsApp Paste</h2>
      <p className="text-sm text-slate-500">
        Paste a fee message from WhatsApp and we will pull out the student, amount and due date.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Samples</span>
        {SAMPLES.filter((chip) => !appliedChips.includes(chip.id)).map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => loadSample(chip)}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
          >
            {chip.text}
          </button>
        ))}
        {appliedChips.length === SAMPLES.length && (
          <span className="text-xs text-slate-400">All sample messages applied</span>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActiveChipId(null);
          setEdits({});
          setNotice(null);
        }}
        rows={3}
        placeholder="Paste a WhatsApp message here…"
        aria-label="Paste a WhatsApp message"
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {hasText && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="mp-student" className={LABEL}>
                Student{' '}
                <span
                  className={`ml-1 normal-case tracking-normal ${
                    studentStatus === 'not found' ? 'text-amber-600' : 'text-emerald-700'
                  }`}
                >
                  ({studentStatus})
                </span>
              </label>
              <select
                id="mp-student"
                value={studentId}
                onChange={(e) => setEdit('studentId', e.target.value)}
                className={INPUT}
              >
                <option value="">Select a student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mp-amount" className={LABEL}>Amount (₹)</label>
              <input
                id="mp-amount"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={amountInput}
                onChange={(e) => setEdit('amount', e.target.value)}
                placeholder="Enter amount"
                className={`${INPUT} tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="mp-due" className={LABEL}>Due date</label>
              <input
                id="mp-due"
                type="date"
                value={dueDate}
                onChange={(e) => setEdit('dueDate', e.target.value)}
                className={INPUT}
              />
              {dueDefaulted && (
                <p className="mt-1 text-xs text-slate-500">defaulted to +7 days</p>
              )}
            </div>
          </div>

          {parsed.isPayment && (
            <p className="text-xs font-medium text-slate-500">Payment detected in this message.</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleMain}
              disabled={Boolean(blockReason)}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {existing ? `Update invoice ${existing.invoiceNo}` : 'Create invoice'}
            </button>

            {paymentTarget && (
              <button
                type="button"
                onClick={handleMarkPaid}
                className="rounded-md border border-emerald-600 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
              >
                Mark {paymentTarget.invoiceNo} paid
              </button>
            )}

            {blockReason ? (
              <p className="text-xs font-medium text-amber-600">{blockReason}</p>
            ) : !existing ? (
              <p className="text-xs text-slate-500">
                Will create {nextInvoiceNo(invoices)} · {feeDescription(dueDate)}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {notice && <p className="mt-4 text-sm font-medium text-emerald-700">{notice}</p>}
    </section>
  );
}
