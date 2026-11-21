// Sample data for TutorFlow. Dates are relative to "today" so the demo
// always shows a mix of paid, pending, and overdue items.

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Returns the ISO date (YYYY-MM-DD) that is `n` days after `today` (local time). */
export function addDays(today, n) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STUDENTS = [
  { id: 'stu-1', name: 'Aarav Sharma', guardian: 'Sunita Sharma', phone: '+91 9810000001', city: 'Mumbai', course: 'Maths Grade 10', monthlyFee: 4000 },
  { id: 'stu-2', name: 'Diya Patel', guardian: 'Kiran Patel', phone: '+91 9810000002', city: 'Ahmedabad', course: 'Science Grade 9', monthlyFee: 3500 },
  { id: 'stu-3', name: 'Rohan Iyer', guardian: 'Lakshmi Iyer', phone: '+91 9810000003', city: 'Chennai', course: 'Physics JEE', monthlyFee: 6000 },
  { id: 'stu-4', name: 'Ananya Reddy', guardian: 'Padmaja Reddy', phone: '+91 9810000004', city: 'Hyderabad', course: 'English Grade 8', monthlyFee: 2500 },
  { id: 'stu-5', name: 'Vihaan Gupta', guardian: 'Neha Gupta', phone: '+91 9810000005', city: 'Delhi', course: 'Maths Grade 12', monthlyFee: 5000 },
  { id: 'stu-6', name: 'Ishita Nair', guardian: 'Radhika Nair', phone: '+91 9810000006', city: 'Kochi', course: 'Chemistry NEET', monthlyFee: 5500 },
  { id: 'stu-7', name: 'Arjun Singh', guardian: 'Gurpreet Singh', phone: '+91 9810000007', city: 'Jaipur', course: 'Coding Class Grade 11', monthlyFee: 3000 },
  { id: 'stu-8', name: 'Meera Joshi', guardian: 'Anjali Joshi', phone: '+91 9810000008', city: 'Pune', course: 'Biology Grade 10', monthlyFee: 3500 },
];

/**
 * Builds the full seed state. Invoice `dueDate`s are relative to `today`:
 * overdue invoices are 5–20 days in the past, pending ones 3–20 days ahead.
 */
export function buildSeedData(today = new Date()) {
  const students = STUDENTS.map((s) => ({ ...s }));

  // [studentId, description, amount, dayOffset, status]
  const rows = [
    ['stu-1', 'Maths – Grade 10, April', 4000, -30, 'paid'],
    ['stu-2', 'Science – Grade 9, April', 3500, -28, 'paid'],
    ['stu-3', 'Physics – JEE, May', 6000, -12, 'unpaid'],
    ['stu-4', 'English – Grade 8, May', 2500, -8, 'unpaid'],
    ['stu-5', 'Maths – Grade 12, May', 5000, -15, 'unpaid'],
    ['stu-6', 'Chemistry – NEET, May', 5500, -5, 'unpaid'],
    ['stu-7', 'Coding Class – Grade 11, April', 3000, -22, 'paid'],
    ['stu-6', 'Chemistry – NEET, June', 5500, 5, 'unpaid'],
    ['stu-7', 'Coding Class – Grade 11, June', 3000, 9, 'unpaid'],
    ['stu-8', 'Biology – Grade 10, June', 3500, 14, 'unpaid'],
    ['stu-1', 'Maths – Grade 10, June', 4000, 18, 'unpaid'],
    ['stu-2', 'Science – Grade 9, June', 3500, 4, 'unpaid'],
    ['stu-3', 'Physics – JEE, June', 6000, 11, 'unpaid'],
    ['stu-5', 'Maths – Grade 12, June', 5000, 20, 'unpaid'],
  ];

  const invoices = rows.map(([studentId, description, amount, offset, status], i) => ({
    id: `inv-${i + 1}`,
    studentId,
    invoiceNo: `TF-2025-${String(i + 1).padStart(3, '0')}`,
    description,
    amount,
    dueDate: addDays(today, offset),
    status,
  }));

  const bills = [
    { id: 'bill-1', name: 'Office rent', amount: 45000, dueDate: addDays(today, 20), paid: false },
    { id: 'bill-2', name: 'Tutor assistant salary', amount: 18000, dueDate: addDays(today, 0), paid: false },
    { id: 'bill-3', name: 'Internet (fibre)', amount: 1499, dueDate: addDays(today, 1), paid: false },
    { id: 'bill-4', name: 'Video-conferencing subscription', amount: 2400, dueDate: addDays(today, 6), paid: false },
    { id: 'bill-5', name: 'Electricity – BESCOM/MSEDCL', amount: 3200, dueDate: addDays(today, 20), paid: false },
    { id: 'bill-6', name: 'Study-material printing', amount: 1200, dueDate: addDays(today, -2), paid: false },
    { id: 'bill-7', name: 'Insurance premium', amount: 6200, dueDate: addDays(today, -10), paid: true },
  ];

  return {
    students,
    invoices,
    bills,
    cashInBank: 58000,
  };
}
