// Pure WhatsApp message parser for TutorFlow. No React.
// Extracts student, rupee amount, due date and payment intent from free text.

import { daysBetween, parseISODate, toISODate, todayISO } from './finance.js';

const FULL_MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

// Full names first, then abbreviations ("sept" before "sep").
const MONTH_PATTERN =
  'january|february|march|april|may|june|july|august|september|october|november|december|' +
  'jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec';

const KEYWORD_RE = /\b(fees?|dues?|pending|amount|paid|payment|bill|balance|outstanding|pay)\b/g;
const KEYWORD_DISTANCE = 25;
const MIN_BARE_AMOUNT = 100;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Lowercases, unifies apostrophes, collapses whitespace. */
function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function monthNumber(name) {
  const prefix = name.slice(0, 3);
  return FULL_MONTHS.findIndex((m) => m.startsWith(prefix)) + 1;
}

function addDays(base, n) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
}

/** Builds a local Date, or null if the day/month/year combination does not exist. */
function buildDate(y, m, d) {
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/** Missing year: use today's year, but roll forward if the result is over ~6 months in the past. */
function withNearestYear(month, day, todayDate) {
  let date = buildDate(todayDate.getFullYear(), month, day);
  if (!date) return null;
  if (daysBetween(toISODate(date), toISODate(todayDate)) > 183) {
    date = buildDate(todayDate.getFullYear() + 1, month, day);
  }
  return date;
}

/**
 * Finds date expressions. Returns the date spans found plus every text range
 * that was consumed (valid or not), so amount parsing can ignore them.
 */
function scanDates(text, todayDate) {
  const taken = [];
  const spans = [];

  const scan = (re, handler) => {
    for (const m of text.matchAll(re)) {
      const index = m.index;
      const end = index + m[0].length;
      if (taken.some(([s, e]) => index < e && s < end)) continue;
      taken.push([index, end]);
      const date = handler(m);
      if (date) spans.push({ index, date });
    }
  };

  // 5/06/2025, 05-06-25
  scan(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})\b/g, (m) => {
    let year = Number(m[3]);
    if (m[3].length === 2) year += 2000;
    return buildDate(year, Number(m[2]), Number(m[1]));
  });

  // 5/06
  scan(/\b(\d{1,2})[/-](\d{1,2})\b/g, (m) =>
    withNearestYear(Number(m[2]), Number(m[1]), todayDate),
  );

  // 5 June, 5th Jun 2025
  scan(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})\\b\\.?(?:,?\\s+(\\d{4})(?!\\d))?`, 'g'),
    (m) => {
      const month = monthNumber(m[2]);
      if (m[3]) return buildDate(Number(m[3]), month, Number(m[1]));
      return withNearestYear(month, Number(m[1]), todayDate);
    },
  );

  // June 5, Jun 5th 2025
  scan(
    new RegExp(`\\b(${MONTH_PATTERN})\\b\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4})(?!\\d))?`, 'g'),
    (m) => {
      const month = monthNumber(m[1]);
      if (m[3]) return buildDate(Number(m[3]), month, Number(m[2]));
      return withNearestYear(month, Number(m[2]), todayDate);
    },
  );

  scan(/\btoday\b/g, () => new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()));
  scan(/\btomorrow\b/g, () => addDays(todayDate, 1));
  scan(/\bin\s+(\d{1,3})\s+days?\b/g, (m) => addDays(todayDate, Number(m[1])));

  return { spans, taken };
}

/** Finds the student by full name first, then by first name (incl. "Aarav's"). */
function matchStudent(text, students) {
  // Whole-word search. An apostrophe after the name ("Aarav's") still counts as a word end.
  const findWord = (phrase) => {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`, 'u');
    const m = re.exec(text);
    return m ? m.index : -1;
  };

  const pick = (candidates) => {
    let best = null;
    for (const c of candidates) {
      if (c.index < 0) continue;
      if (!best || c.index < best.index) best = c;
    }
    return best ? best.student : null;
  };

  const fullHits = students.map((student) => ({
    student,
    index: findWord(normalize(student.name)),
  }));
  const fullMatch = pick(fullHits);
  if (fullMatch) return fullMatch;

  const firstHits = students.map((student) => ({
    student,
    index: findWord(normalize(student.name).split(' ')[0]),
  }));
  return pick(firstHits);
}

/** Extracts a rupee amount from text whose dates and long digit runs were already masked. */
function extractAmount(masked) {
  // Currency-marked amounts: ₹4,000 / Rs 4000 / Rs. 4000 / INR 6k
  const currencyRe = /(?:₹|\brs\.?|\binr\b)\s*(\d[\d,]*(?:\.\d+)?)(k\b)?/g;
  for (const m of masked.matchAll(currencyRe)) {
    const value = toAmount(m[1], Boolean(m[2]));
    if (value > 0) return value;
  }

  // Bare numbers close to a fee/due/pending/amount/paid keyword.
  const keywordIndexes = [...masked.matchAll(KEYWORD_RE)].map((m) => m.index);
  if (keywordIndexes.length === 0) return null;

  const bareRe = /\b(\d[\d,]*(?:\.\d+)?)(k\b)?/g;
  for (const m of masked.matchAll(bareRe)) {
    const raw = m[1];
    const hasK = Boolean(m[2]);
    if (!hasK && /^(19|20)\d{2}$/.test(raw)) continue; // looks like a year
    const near = keywordIndexes.some((k) => Math.abs(k - m.index) <= KEYWORD_DISTANCE);
    if (!near) continue;
    const value = toAmount(raw, hasK);
    if (hasK ? value > 0 : value >= MIN_BARE_AMOUNT) return value;
  }
  return null;
}

function toAmount(raw, hasK) {
  const n = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(n)) return 0;
  return hasK ? n * 1000 : n;
}

/**
 * Parses a WhatsApp-style message.
 * @param {string} text
 * @param {Array<{id:string,name:string}>} students
 * @param {string} [today] ISO date 'YYYY-MM-DD' (local); defaults to the current local date.
 * @returns {{studentId:string|null, studentName:string|null, matchedStudent:boolean,
 *   amount:number|null, dueDate:string|null, isPayment:boolean}}
 */
export function parseWhatsAppMessage(text, students, today) {
  const todayDate = parseISODate(today ?? todayISO());
  const norm = normalize(text);
  const list = Array.isArray(students) ? students : [];

  const student = norm ? matchStudent(norm, list) : null;

  const { spans, taken } = scanDates(norm, todayDate);

  // Mask long digit runs (phone numbers, IDs) so they are never read as amounts.
  for (const m of norm.matchAll(/\d{10,}/g)) {
    taken.push([m.index, m.index + m[0].length]);
  }

  const masked = norm
    .split('')
    .map((ch, i) => (taken.some(([s, e]) => i >= s && i < e) ? ' ' : ch))
    .join('');

  const amount = extractAmount(masked);

  let dueDate = null;
  if (spans.length > 0) {
    const first = spans.reduce((a, b) => (b.index < a.index ? b : a));
    dueDate = toISODate(first.date);
  }

  return {
    studentId: student ? student.id : null,
    studentName: student ? student.name : null,
    matchedStudent: Boolean(student),
    amount,
    dueDate,
    isPayment: /paid/i.test(norm),
  };
}
