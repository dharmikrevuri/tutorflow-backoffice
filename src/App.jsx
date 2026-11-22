import { useCallback, useEffect, useMemo, useState } from 'react';
import KpiBar from './components/KpiBar.jsx';
import SafeToSpendGauge from './components/SafeToSpendGauge.jsx';
import AlertsBanner from './components/AlertsBanner.jsx';
import WhoOwesMeTable from './components/WhoOwesMeTable.jsx';
import MagicPasteCard from './components/MagicPasteCard.jsx';
import NewInvoiceModal from './components/NewInvoiceModal.jsx';
import SmartRemindDrawer from './components/SmartRemindDrawer.jsx';
import CashFlowChart from './components/CashFlowChart.jsx';
import UpcomingBillsTracker from './components/UpcomingBillsTracker.jsx';
import WhatIfPanel from './components/WhatIfPanel.jsx';
import BadDayPlaybook from './components/BadDayPlaybook.jsx';
import WhyTutorsPayModal from './components/WhyTutorsPayModal.jsx';
import { loadState, saveState, resetState } from './lib/store.js';
import {
  todayISO,
  deriveInvoiceStatus,
  computeKpis,
  computeSafeToSpend,
  computeAlerts,
} from './lib/finance.js';
import {
  projectCashFlow,
  buildBillTracker,
  buildPlaybook,
  findRiskiestParent,
} from './lib/forecast.js';

function App() {
  const [state, setState] = useState(() => loadState());
  const today = todayISO();
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [remindInvoiceId, setRemindInvoiceId] = useState(null);
  const [cfHorizon, setCfHorizon] = useState(30);
  const [lateOn, setLateOn] = useState(false);
  const [stressOn, setStressOn] = useState(false);
  const [keyOverride, setKeyOverride] = useState(null);
  const [whyOpen, setWhyOpen] = useState(false);
  // Bumped on each sample-data reset so MagicPasteCard remounts with fresh state.
  const [resetCount, setResetCount] = useState(0);

  // Persist whenever state changes.
  useEffect(() => {
    saveState(state);
  }, [state]);

  const students = useMemo(
    () => Object.fromEntries(state.students.map((s) => [s.id, s])),
    [state.students],
  );

  const invoices = useMemo(
    () =>
      state.invoices.map((inv) => ({
        ...inv,
        derivedStatus: deriveInvoiceStatus(inv, today),
      })),
    [state.invoices, today],
  );

  const remindInvoice = useMemo(
    () => invoices.find((inv) => inv.id === remindInvoiceId) ?? null,
    [invoices, remindInvoiceId],
  );
  const remindStudent = remindInvoice ? students[remindInvoice.studentId] : null;

  const kpis = useMemo(() => computeKpis(state, today), [state, today]);
  const safe = useMemo(() => computeSafeToSpend(state, today), [state, today]);
  const alerts = useMemo(() => computeAlerts(state, today), [state, today]);

  const keyStudentId = keyOverride ?? findRiskiestParent(state);
  const baselineProj = useMemo(
    () => projectCashFlow({ state, today, horizon: cfHorizon }),
    [state, today, cfHorizon],
  );
  const scenarioProj = useMemo(
    () =>
      projectCashFlow({
        state,
        today,
        horizon: cfHorizon,
        lateStudentId: lateOn ? keyStudentId : null,
        stressOn,
      }),
    [state, today, cfHorizon, lateOn, keyStudentId, stressOn],
  );
  const billTracker = useMemo(() => buildBillTracker(state, today), [state, today]);
  const playbook = useMemo(
    () =>
      buildPlaybook({
        state,
        today,
        stressed: scenarioProj,
        baseline: baselineProj,
        horizon: cfHorizon,
      }),
    [state, today, scenarioProj, baselineProj, cfHorizon],
  );

  const markInvoicePaid = useCallback((id) => {
    setState((prev) => {
      const invoice = prev.invoices.find((inv) => inv.id === id);
      if (!invoice || invoice.status === 'paid') return prev;
      return {
        ...prev,
        invoices: prev.invoices.map((inv) =>
          inv.id === id ? { ...inv, status: 'paid', manualUnpaid: false } : inv,
        ),
        cashInBank: prev.cashInBank + invoice.amount,
      };
    });
  }, []);

  const markInvoiceUnpaid = useCallback((id) => {
    setState((prev) => {
      const invoice = prev.invoices.find((inv) => inv.id === id);
      if (!invoice || invoice.status !== 'paid') return prev;
      return {
        ...prev,
        invoices: prev.invoices.map((inv) =>
          inv.id === id ? { ...inv, status: 'unpaid', manualUnpaid: true } : inv,
        ),
        cashInBank: prev.cashInBank - invoice.amount,
      };
    });
  }, []);

  const handleInvoiceAction = useCallback(
    (action) => {
      if (action.mode === 'create') {
        setState((prev) => ({ ...prev, invoices: [...prev.invoices, action.invoice] }));
      } else if (action.mode === 'update') {
        setState((prev) => ({
          ...prev,
          invoices: prev.invoices.map((inv) =>
            inv.id === action.invoice.id ? action.invoice : inv,
          ),
        }));
      } else if (action.mode === 'mark_paid') {
        markInvoicePaid(action.invoiceId);
      }
    },
    [markInvoicePaid],
  );

  const handleReset = () => {
    if (!window.confirm('Reset all TutorFlow data to the sample data? Your changes will be lost.')) {
      return;
    }
    setState(resetState());
    setResetCount((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">TutorFlow</h1>
            <p className="text-sm text-slate-500">
              Cash flow and fee collection for your tuition business (₹)
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setIsInvoiceModalOpen(true)}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
            >
              New Invoice
            </button>
            <button
              type="button"
              onClick={() => setWhyOpen(true)}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            >
              Why Tutors Pay
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Reset sample data
            </button>
          </div>
        </header>

        <MagicPasteCard
          key={resetCount}
          students={state.students}
          invoices={state.invoices}
          onAction={handleInvoiceAction}
          today={today}
        />

        <KpiBar kpis={kpis} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <SafeToSpendGauge safe={safe} />
        </div>

        <AlertsBanner alerts={alerts} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CashFlowChart
              projection={scenarioProj}
              baseline={baselineProj}
              horizon={cfHorizon}
              onHorizonChange={setCfHorizon}
            />
          </div>
          <UpcomingBillsTracker bills={billTracker} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <WhatIfPanel
            students={state.students}
            keyStudentId={keyStudentId}
            onKeyStudentChange={setKeyOverride}
            lateOn={lateOn}
            onLateToggle={setLateOn}
            stressOn={stressOn}
            onStressToggle={setStressOn}
          />
          <div className="lg:col-span-2">
            <BadDayPlaybook
              playbook={playbook}
              visible={stressOn || lateOn}
              stressOn={stressOn}
            />
          </div>
        </div>

        <WhoOwesMeTable
          invoices={invoices}
          students={students}
          onMarkPaid={markInvoicePaid}
          onMarkUnpaid={markInvoiceUnpaid}
          onSmartRemind={(inv) => setRemindInvoiceId(inv.id)}
        />
      </div>

      <SmartRemindDrawer
        open={!!remindInvoice}
        onClose={() => setRemindInvoiceId(null)}
        invoice={remindInvoice}
        student={remindStudent}
        today={today}
      />

      <NewInvoiceModal
        open={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        students={state.students}
        invoices={state.invoices}
        onSave={handleInvoiceAction}
      />

      <WhyTutorsPayModal open={whyOpen} onClose={() => setWhyOpen(false)} />
    </div>
  );
}

export default App;
