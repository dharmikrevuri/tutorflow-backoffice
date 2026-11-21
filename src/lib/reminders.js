// Pure WhatsApp reminder text builders for TutorFlow. No React, no storage.
import { daysBetween, formatDate, formatINR, parseISODate, toISODate, todayISO } from './finance.js';

export const TONE_STAGES = [
  { id: 1, key: 'friendly', label: 'Friendly Nudge' },
  { id: 2, key: 'polite', label: 'Polite Firm' },
  { id: 3, key: 'urgent', label: 'Urgent' },
];

/** Whole days an invoice is past its due date (0 when not overdue). */
export function daysOverdue(invoice, today) {
  if (!invoice?.dueDate || !today) return 0;
  return Math.max(0, daysBetween(invoice.dueDate, today));
}

/** ISO date n days after `today`. */
export function addDaysISO(today, n) {
  const d = parseISODate(today);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Half now (rounded), remainder later, so the two always sum to the amount. */
export function splitAmounts(amount) {
  const value = Number(amount) || 0;
  const now = Math.round(value / 2);
  return { now, later: value - now };
}

function dayWord(n) {
  return `${n} day${n === 1 ? '' : 's'}`;
}

function greetingFor(student) {
  const first = String(student?.guardian ?? '').trim().split(/\s+/)[0];
  return first ? `Hi ${first} ji,` : 'Hello,';
}

/** Common facts used by every stage. */
function facts({ invoice, student, today }) {
  const days = daysOverdue(invoice, today);
  const due = formatDate(invoice.dueDate);
  return {
    greeting: greetingFor(student),
    no: invoice.invoiceNo,
    desc: invoice.description,
    amount: formatINR(invoice.amount),
    due,
    days,
    // e.g. "now 9 days past due (due date 05 Jun 2025)" or "due on 05 Jun 2025"
    dueState:
      days > 0
        ? `now ${dayWord(days)} past due (due date ${due})`
        : `due on ${due}`,
  };
}

function friendlyText(f) {
  const overdueNote =
    f.days > 0
      ? ` It may have slipped past the due date (${dayWord(f.days)} ago), so no worries at all.`
      : '';
  return [
    f.greeting,
    '',
    `Hope you're doing well! This is a gentle reminder about invoice ${f.no} (${f.desc}) for ${f.amount}, due on ${f.due}.${overdueNote}`,
    '',
    'If you have already paid, please ignore this message. Thank you!',
    '',
    'Regards,',
  ];
}

function politeText(f, { today, upiId }) {
  const payBy = addDaysISO(today, 3);
  return [
    f.greeting,
    '',
    `This is a follow-up on invoice ${f.no} (${f.desc}) for ${f.amount}, ${f.dueState}.`,
    '',
    `Could you please confirm a payment date by ${formatDate(payBy)}? You can also pay easily via UPI at ${upiId}.`,
    '',
    'If there is any issue with the amount or the timing, please reply here and we will sort it out together.',
    '',
    'Thank you,',
  ];
}

function urgentText(f, { today, splitPay, upiId }) {
  const pauseBy = formatDate(addDaysISO(today, 5));
  const lines = [
    f.greeting,
    '',
    `Invoice ${f.no} (${f.desc}) for ${f.amount} is ${f.dueState}, and it is still unpaid.`,
    '',
    `To avoid any interruption, please clear the payment by ${pauseBy}. After that date, classes and access may need to be paused until the dues are cleared. You can pay via UPI at ${upiId}.`,
  ];
  if (splitPay) {
    const { now, later } = splitAmounts(f.amountValue);
    const balanceBy = formatDate(addDaysISO(today, 14));
    lines.push(
      '',
      `*Split-Pay option:* If paying the full amount is difficult right now, you can pay 50% today (${formatINR(now)}) and the balance (${formatINR(later)}) by ${balanceBy}. Please reply to confirm if you would like to go with this plan.`,
    );
  }
  lines.push(
    '',
    'Please reply to confirm, or let us know if there is an issue, so we can find a workable solution together.',
    '',
    'Thank you,',
  );
  return lines;
}

/**
 * Builds the WhatsApp reminder text for an invoice.
 * stage: 1 friendly, 2 polite firm, 3 urgent. splitPay only applies to stage 3.
 */
export function buildReminder({
  stage,
  invoice,
  student,
  tutorName = 'TutorFlow',
  splitPay = false,
  today = todayISO(),
  upiId = '[UPI ID]',
}) {
  const f = { ...facts({ invoice, student, today }), amountValue: invoice.amount };
  let body;
  if (stage === 2) body = politeText(f, { today, upiId });
  else if (stage === 3) body = urgentText(f, { today, splitPay: splitPay === true, upiId });
  else body = friendlyText(f);
  return [...body, tutorName].join('\n');
}
