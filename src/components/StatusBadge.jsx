const STYLES = {
  paid: 'bg-green-100 text-green-800 ring-green-600/20',
  pending: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  unpaid: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  overdue: 'bg-red-100 text-red-800 ring-red-600/20',
};

const LABELS = {
  paid: 'Paid',
  pending: 'Pending',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
};

export default function StatusBadge({ status }) {
  const key = STYLES[status] ? status : 'pending';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[key]}`}
    >
      {LABELS[key]}
    </span>
  );
}
