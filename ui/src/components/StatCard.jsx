export default function StatCard({ icon: Icon, label, value, sub, color = 'text-blue-400' }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center gap-3 mb-3">
        {Icon && <Icon className={`w-5 h-5 ${color}`} />}
        <span className="text-sm text-slate-400 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
