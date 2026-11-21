import { buildSeedData } from '../data/seed.js';

export const STORAGE_KEY = 'tutorflow:v1';

function isValidState(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    Array.isArray(value.students) &&
    Array.isArray(value.invoices) &&
    Array.isArray(value.bills) &&
    typeof value.cashInBank === 'number'
  );
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or disabled; the app keeps working in memory.
  }
}

/** Loads state from localStorage, seeding (and saving) sample data if missing or invalid. */
export function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (isValidState(parsed)) return parsed;
    } catch {
      // Corrupt JSON – fall through and re-seed.
    }
  }

  const seed = buildSeedData();
  saveState(seed);
  return seed;
}

/** Replaces stored state with a fresh copy of the sample data and returns it. */
export function resetState() {
  const seed = buildSeedData();
  saveState(seed);
  return seed;
}
