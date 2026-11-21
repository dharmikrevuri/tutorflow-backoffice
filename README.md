# TutorFlow

TutorFlow is a small cash-flow and fee-collection dashboard for a tuition business, with all amounts in Indian Rupees (₹).

## Features

- **KPI bar** – Cash in Bank, Upcoming Bills (next 30 days), Outstanding Receivables, and Overdue Invoices.
- **Safe to Spend Today** – a colour-coded gauge (green / amber / red) that subtracts a ₹25,000 safety buffer and bills due within 7 days from cash in bank.
- **Actionable Alerts** – urgent items such as overdue invoices, bills due within 2 days, and a danger-level safe-to-spend warning.
- **Who Owes Me** – a filterable invoice table (All / Paid / Pending / Overdue) with status badges, student-name search, and a "Mark Paid" action that also adds the amount to cash in bank.
- **Sample data** – 8 Indian students, 14 invoices, and 7 bills with dates relative to today. Use "Reset sample data" to restore it.

## Getting started

```bash
npm install
npm run dev     # start the dev server
npm run build   # production build
```

## Data storage

All data is kept in the browser's `localStorage` under the key `tutorflow:v1`. Clearing site data or using "Reset sample data" returns the app to the seeded sample data.

## Tech stack

React (functional components and hooks), Vite, and Tailwind CSS v3. No additional runtime dependencies.
