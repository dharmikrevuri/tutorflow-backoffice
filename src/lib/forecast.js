// Pure cash-flow forecasting helpers for TutorFlow. No React, no mutation of state.
// Dates are ISO strings (YYYY-MM-DD) interpreted in local time.

import {
  BILL_HORIZON_DAYS,
  SAFETY_BUFFER,
  daysBetween,
  formatDate,
  formatINR,
  parseISODate,
  toISODate,
} from './finance.js';

export const HORIZONS = [30, 60, 90];
export const LATE_DAYS = 15;
export const STRESS_DELAY_DAYS = 30;
export const STRESS_PARENT_COUNT = 5;
export const BILL_RECURRENCE_DAYS = 30;
export const TUITION_RECURRENCE_DAYS = 30;
// Only bills whose name matches this pattern recur every BILL_RECURRENCE_DAYS (monthly fixed obligations).
export const RECURRING_BILL_NAME_PATTERN = /rent|salary/i;

const URGENT_DAYS = 7;
const DEFER_WINDOW_DAYS = 14;
const DEFER_TOP_N = 3;

/** Adds n days to an ISO date (local calendar arithmetic). */
export function addDaysISO(iso, n) {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Whole days from isoA to isoB (positive when isoB is later). */
export function dayDiff(isoA, isoB) {
  return daysBetween(isoA, isoB);
}

function compareISO(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function unpaidInvoices(state) {
  return state.invoices.filter((inv) => inv.status !== 'paid');
}

function unpaidBills(state) {
  return state.bills.filter((bill) => !bill.paid);
}

/** First STRESS_PARENT_COUNT distinct students with unpaid invoices, ordered by earliest unpaid due date. */
function pickStressedStudentIds(invoices) {
  const sorted = [...invoices].sort((a, b) => compareISO(a.dueDate, b.dueDate));
  const ids = [];
  for (const inv of sorted) {
    if (!ids.includes(inv.studentId)) {
      ids.push(inv.studentId);
      if (ids.length === STRESS_PARENT_COUNT) break;
    }
  }
  return ids;
}

/**
 * Projects the daily cash balance from `today` through `today + horizon` (inclusive).
 * Inflows are unpaid invoices: each lands on its due date (overdue ones on day 0) and then
 * recurs every TUITION_RECURRENCE_DAYS. Outflows are unpaid bills: monthly fixed obligations (name matches
 * RECURRING_BILL_NAME_PATTERN) recur every BILL_RECURRENCE_DAYS; all other bills land once, on their due date
 * (or day 0 if overdue).
 */
export function projectCashFlow({ state, today, horizon, lateStudentId = null, stressOn = false }) {
  const days = Math.max(0, Math.floor(Number(horizon) || 0));
  const invoices = unpaidInvoices(state);
  const inflow = new Array(days + 1).fill(0);
  const outflow = new Array(days + 1).fill(0);
  const stressedStudentIds = stressOn ? pickStressedStudentIds(invoices) : [];

  for (const inv of invoices) {
    let shift = 0;
    if (lateStudentId && inv.studentId === lateStudentId) shift += LATE_DAYS;
    if (stressedStudentIds.includes(inv.studentId)) shift += STRESS_DELAY_DAYS;
    // Scenario shifts move the first occurrence; the recurrence below then shifts every occurrence.
    const landsOn = shift > 0 ? addDaysISO(inv.dueDate, shift) : inv.dueDate;
    // Overdue occurrences are clamped to day 0. That single first occurrence is the only
    // one at day 0; later ones start at first + TUITION_RECURRENCE_DAYS, so nothing is counted twice.
    const first = Math.max(0, dayDiff(today, landsOn));
    const amount = Number(inv.amount) || 0;
    for (let idx = first; idx <= days; idx += TUITION_RECURRENCE_DAYS) {
      inflow[idx] += amount;
    }
  }

  for (const bill of unpaidBills(state)) {
    const amount = Number(bill.amount) || 0;
    const due = dayDiff(today, bill.dueDate);
    if (!RECURRING_BILL_NAME_PATTERN.test(bill.name)) {
      // One-off bill: lands exactly once, on its due date, or on day 0 if already overdue.
      const idx = due < 0 ? 0 : due;
      if (idx <= days) outflow[idx] += amount;
      continue;
    }
    let first = due;
    if (first < 0) {
      // Overdue recurring bill is paid today; its next monthly occurrence is the first one after today.
      outflow[0] += amount;
      first += BILL_RECURRENCE_DAYS * (Math.floor(-first / BILL_RECURRENCE_DAYS) + 1);
    }
    for (let idx = first; idx <= days; idx += BILL_RECURRENCE_DAYS) {
      outflow[idx] += amount;
    }
  }

  const points = [];
  let balance = Number(state.cashInBank) || 0;
  let totalInflow = 0;
  let totalOutflow = 0;
  let minBalance = Infinity;
  let minDate = today;
  let zeroDate = null;

  for (let i = 0; i <= days; i += 1) {
    balance += inflow[i] - outflow[i];
    const date = addDaysISO(today, i);
    points.push({ day: i, date, balance, inflow: inflow[i], outflow: outflow[i] });
    totalInflow += inflow[i];
    totalOutflow += outflow[i];
    if (balance < minBalance) {
      minBalance = balance;
      minDate = date;
    }
    if (zeroDate === null && balance < 0) zeroDate = date;
  }

  return {
    points,
    minBalance,
    minDate,
    zeroDate,
    totalInflow,
    totalOutflow,
    endBalance: balance,
    stressedStudentIds,
  };
}

/** Unpaid bills sorted by due date, with days-until and urgency, plus the total due in the next 30 days. */
export function buildBillTracker(state, today) {
  const bills = unpaidBills(state)
    .map((bill) => {
      const daysUntil = dayDiff(today, bill.dueDate);
      let urgency = 'later';
      if (daysUntil < 0) urgency = 'overdue';
      else if (daysUntil === 0) urgency = 'today';
      else if (daysUntil <= URGENT_DAYS) urgency = 'soon';
      return { ...bill, daysUntil, urgency };
    })
    .sort((a, b) => compareISO(a.dueDate, b.dueDate));

  const totalDue30 = bills
    .filter((b) => b.daysUntil >= 0 && b.daysUntil <= BILL_HORIZON_DAYS)
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  return { bills, totalDue30 };
}

/** studentId with the largest unpaid invoice total (ties go to the earlier student). */
export function findRiskiestParent(state) {
  const totals = new Map();
  for (const inv of unpaidInvoices(state)) {
    totals.set(inv.studentId, (totals.get(inv.studentId) ?? 0) + (Number(inv.amount) || 0));
  }
  let bestId = state.students[0]?.id ?? null;
  let bestTotal = -1;
  for (const student of state.students) {
    const total = totals.get(student.id) ?? 0;
    if (total > bestTotal) {
      bestTotal = total;
      bestId = student.id;
    }
  }
  return bestId;
}

/** Recovery plan for a projected shortfall, built from the stressed projection. */
export function buildPlaybook({ state, today, stressed, baseline, horizon }) {
  const invoices = unpaidInvoices(state);
  const shortfall = Math.max(0, -stressed.minBalance);

  const stressedStudents = stressed.stressedStudentIds
    .map((id) => {
      const student = state.students.find((s) => s.id === id);
      const amount = invoices
        .filter((inv) => inv.studentId === id)
        .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
      return { id, name: student?.name ?? 'Unknown', guardian: student?.guardian ?? '', amount };
    })
    .sort((a, b) => b.amount - a.amount);

  const billsToDefer = unpaidBills(state)
    .filter((bill) => {
      const days = dayDiff(today, bill.dueDate);
      return days >= 0 && days <= DEFER_WINDOW_DAYS;
    })
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, DEFER_TOP_N)
    .map((bill) => ({
      id: bill.id,
      name: bill.name,
      amount: Number(bill.amount) || 0,
      dueDate: bill.dueDate,
    }));

  const stressedSet = new Set(stressed.stressedStudentIds);
  let largest = null;
  for (const inv of invoices) {
    if (!stressedSet.has(inv.studentId)) continue;
    if (!largest || (Number(inv.amount) || 0) > (Number(largest.amount) || 0)) largest = inv;
  }
  const largestStressInvoice = largest
    ? {
        id: largest.id,
        invoiceNo: largest.invoiceNo,
        amount: Number(largest.amount) || 0,
        dueDate: largest.dueDate,
        studentName: state.students.find((s) => s.id === largest.studentId)?.name ?? 'Unknown',
      }
    : null;

  const steps = [];
  if (stressedStudents.length > 0) {
    const count = stressedStudents.length;
    const names = stressedStudents.map((s) => s.name).join(', ');
    steps.push(
      `Send Smart Remind (Stage 2, Polite Firm) to the ${count} delaying parent${count === 1 ? '' : 's'}: ${names}.`,
    );
  }
  if (largestStressInvoice) {
    const inv = largestStressInvoice;
    steps.push(
      `Offer 50% Split-Pay on ${inv.invoiceNo} (${inv.studentName}, ${formatINR(inv.amount)}): ${formatINR(Math.ceil(inv.amount / 2))} now, the rest later.`,
    );
  }
  if (shortfall > 0) {
    const lead = stressedStudents[0];
    const from = lead ? `${lead.guardian || lead.name} (${lead.name})` : 'your largest-balance parent';
    const by = formatDate(stressed.zeroDate ?? stressed.minDate);
    steps.push(`Ask ${from} for an advance of ${formatINR(shortfall)} before ${by}.`);
  }
  billsToDefer.forEach((bill) => {
    steps.push(
      `Defer or negotiate ${bill.name} (${formatINR(bill.amount)}, due ${formatDate(bill.dueDate)}).`,
    );
  });
  steps.push(
    `Keep a cash buffer of at least ${formatINR(SAFETY_BUFFER)} and pause non-essential spending until collections land.`,
  );

  return {
    shortfall,
    zeroDate: stressed.zeroDate,
    minDate: stressed.minDate,
    lowestBalance: stressed.minBalance,
    baselineLowestBalance: baseline ? baseline.minBalance : null,
    horizon,
    stressedStudents,
    billsToDefer,
    largestStressInvoice,
    steps,
  };
}
