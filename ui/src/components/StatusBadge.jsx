const colors = {
  urgent: { bg: '#dc2626', text: '#ffffff' },
  high: { bg: '#f97316', text: '#ffffff' },
  medium: { bg: '#eab308', text: '#1a1a1a' },
  low: { bg: '#22c55e', text: '#ffffff' },
  billing: { bg: '#a855f7', text: '#ffffff' },
  technical: { bg: '#3b82f6', text: '#ffffff' },
  account: { bg: '#06b6d4', text: '#ffffff' },
  shipping: { bg: '#f59e0b', text: '#ffffff' },
  product: { bg: '#6366f1', text: '#ffffff' },
  cancellation: { bg: '#f43f5e', text: '#ffffff' },
  refund: { bg: '#ec4899', text: '#ffffff' },
  other: { bg: '#64748b', text: '#ffffff' },
  // Severity levels
  cosmetic: { bg: '#94a3b8', text: '#ffffff' },
  minor: { bg: '#38bdf8', text: '#1a1a1a' },
  major: { bg: '#f97316', text: '#ffffff' },
  critical: { bg: '#dc2626', text: '#ffffff' },
};

export default function StatusBadge({ value, className = '' }) {
  const c = colors[value?.toLowerCase()] || { bg: '#475569', text: '#ffffff' };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${className}`}
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {value}
    </span>
  );
}
