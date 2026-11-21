// Pure finance helpers for TutorFlow. All amounts are INR numbers.
// Dates are ISO strings (YYYY-MM-DD) interpreted in local time.

export const SAFETY_BUFFER = 25000;
export const SAFE_RATIO = 0.3;
export const CAUTION_RATIO = 0.1;
export const BILL_HORIZON_DAYS = 30;
export const SAFE_WINDOW_DAYS = 7;
export const ALERT_BILL_DAYS = 2;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n) {
  return String(n).padStart(2, '0');
}

export function formatINR(n) {
  return inrFormatter.format(Number(n) || 0);
}

/** Formats an ISO date as "12 May 2025". */
export function formatDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return `${pad(d)} ${MONTHS[m - 1]} ${y}`;
}

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

/** Parses 'YYYY-MM-DD' as a LOCAL date (avoids UTC shifting). */
export function parseISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from isoA to isoB (positive when isoB is later). */
export function daysBetween(isoA, isoB) {
  const a = parseISODate(isoA);
  const b = parseISODate(isoB);
  return Math.round((b - a) / MS_PER_DAY);
}

function sumBy(items, pick) {
  return items.reduce((total, item) => total + (Number(pick(item)) || 0), 0);
}

function billDaysUntil(bill, today) {
  return daysBetween(today, bill.dueDate);
}

/** Returns 'paid' | 'unpaid' | 'overdue' | 'pending' for an invoice. */
export function deriveInvoiceStatus(invoice, today) {
  if (invoice.status === 'paid') return 'paid';
  if (invoice.manualUnpaid === true) return 'unpaid';
  if (invoice.dueDate < today) return 'overdue';
  return 'pending';
}

export function computeKpis(state, today) {
  const upcoming = state.bills.filter((bill) => {
    if (bill.paid) return false;
    const days = billDaysUntil(bill, today);
    return days >= 0 && days <= BILL_HORIZON_DAYS;
  });

  const unpaidInvoices = state.invoices.filter(
    (inv) => deriveInvoiceStatus(inv, today) !== 'paid',
  );
  const overdue = state.invoices.filter(
    (inv) => deriveInvoiceStatus(inv, today) === 'overdue',
  );

  return {
    cashInBank: state.cashInBank,
    upcomingBills: { total: sumBy(upcoming, (b) => b.amount), count: upcoming.length },
    outstanding: sumBy(unpaidInvoices, (inv) => inv.amount),
    overdueCount: overdue.length,
    overdueTotal: sumBy(overdue, (inv) => inv.amount),
  };
}

export function computeSafeToSpend(state, today) {
  const cash = Number(state.cashInBank) || 0;
  // Includes overdue unpaid bills (negative day counts).
  const billsDue = state.bills.filter(
    (bill) => !bill.paid && billDaysUntil(bill, today) <= SAFE_WINDOW_DAYS,
  );
  const billTotal = sumBy(billsDue, (b) => b.amount);

  const amount = Math.max(0, cash - billTotal - SAFETY_BUFFER);
  const ratio = cash > 0 ? amount / cash : 0;

  let level;
  if (ratio >= SAFE_RATIO) level = 'safe';
  else if (ratio >= CAUTION_RATIO) level = 'caution';
  else level = 'danger';

  const label = { safe: 'Safe', caution: 'Caution', danger: 'Danger' }[level];

  return { amount, ratio, level, label };
}

export function computeAlerts(state, today) {
  const alerts = [];
  const studentName = (id) => state.students.find((s) => s.id === id)?.name ?? 'Unknown';

  const overdueInvoices = state.invoices.filter(
    (inv) => deriveInvoiceStatus(inv, today) === 'overdue',
  );
  if (overdueInvoices.length > 0) {
    const total = sumBy(overdueInvoices, (inv) => inv.amount);
    const names = [...new Set(overdueInvoices.map((inv) => studentName(inv.studentId)))];
    const shown = names.slice(0, 3).join(', ');
    const more = names.length > 3 ? ` and ${names.length - 3} more` : '';
    const count = overdueInvoices.length;
    alerts.push({
      id: 'alert-overdue-invoices',
      type: 'overdue_invoices',
      severity: 'high',
      title: `${count} overdue invoice${count === 1 ? '' : 's'} worth ${formatINR(total)}`,
      detail: `Payment pending from ${shown}${more}.`,
      action: 'Send payment reminders',
    });
  }

  // Unpaid bills due within ALERT_BILL_DAYS, including overdue bills.
  state.bills
    .filter((bill) => !bill.paid && billDaysUntil(bill, today) <= ALERT_BILL_DAYS)
    .forEach((bill) => {
      const days = billDaysUntil(bill, today);
      let when;
      if (days < 0) when = `overdue by ${-days} day${days === -1 ? '' : 's'}`;
      else if (days === 0) when = 'due today';
      else if (days === 1) when = 'due tomorrow';
      else when = `due in ${days} days`;

      alerts.push({
        id: `alert-bill-${bill.id}`,
        type: 'bill_due',
        severity: days <= 0 ? 'high' : 'medium',
        title: `${bill.name} (${formatINR(bill.amount)})`,
        detail: `Payment is ${when}.`,
        action: 'Keep cash ready / pay before due date',
      });
    });

  const safe = computeSafeToSpend(state, today);
  if (safe.level === 'danger') {
    alerts.push({
      id: 'alert-safe-to-spend',
      type: 'safe_to_spend',
      severity: 'high',
      title: 'Safe-to-spend is in the danger zone',
      detail: `Only ${formatINR(safe.amount)} is free after the safety buffer and bills due this week.`,
      action: 'Pause non-essential spending',
    });
  }

  // High severity first (stable sort keeps insertion order otherwise).
  return alerts.sort((a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1));
}
