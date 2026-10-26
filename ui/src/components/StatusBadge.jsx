const colors = {
  urgent: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-green-500 text-white',
  billing: 'bg-purple-500 text-white',
  technical: 'bg-blue-500 text-white',
  account: 'bg-cyan-500 text-white',
  shipping: 'bg-amber-500 text-white',
  product: 'bg-indigo-500 text-white',
  cancellation: 'bg-rose-500 text-white',
  refund: 'bg-pink-500 text-white',
  other: 'bg-slate-500 text-white',
};

export default function StatusBadge({ value, className = '' }) {
  const color = colors[value?.toLowerCase()] || 'bg-slate-600 text-white';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${color} ${className}`}
    >
      {value}
    </span>
  );
}
