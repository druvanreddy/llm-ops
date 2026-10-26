import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Zap, DollarSign, AlertCircle, Shield, Clock, RefreshCw,
  CheckCircle2, XCircle, ArrowRightLeft, Hash, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { fetchHealth, fetchReadiness, fetchMetrics, parsePrometheusMetrics } from '../lib/api';
import StatCard from '../components/StatCard';

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const [latencyHistory, setLatencyHistory] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const [h, r, m] = await Promise.all([fetchHealth(), fetchReadiness(), fetchMetrics()]);
      setHealth(h);
      setReadiness(r);
      const parsed = parsePrometheusMetrics(m);
      setMetrics(parsed);
      setLastRefresh(new Date());
      setError(null);

      const avgLatency = getSum(parsed, 'llm_request_duration_seconds_sum') /
        (getSum(parsed, 'llm_request_duration_seconds_count') || 1);
      setLatencyHistory((prev) =>
        [...prev, { time: new Date().toLocaleTimeString(), value: +(avgLatency * 1000).toFixed(0) }].slice(-30)
      );
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  const totalRequests = getSum(metrics, 'llm_requests_total');
  const totalErrors = getSum(metrics, 'llm_errors_total');
  const totalCost = getSum(metrics, 'llm_cost_dollars_total');
  const totalTokens = getSum(metrics, 'llm_tokens_total');
  const totalFallbacks = getSum(metrics, 'llm_fallback_total');
  const schemaValid = getSum(metrics, 'llm_schema_valid_total');

  const errorsByClass = getGrouped(metrics, 'llm_errors_total', 'error_class');
  const requestsByStatus = getGrouped(metrics, 'llm_requests_total', 'status');
  const tokensByDir = getGrouped(metrics, 'llm_tokens_total', 'direction');
  const requestsByModel = getGrouped(metrics, 'llm_requests_total', 'model');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Operations Dashboard</h1>
          <p className="text-slate-400 text-sm">
            Real-time monitoring for the LLM Ops triage service.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              autoRefresh
                ? 'bg-green-900/30 border-green-700 text-green-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          {lastRefresh && (
            <span className="text-xs text-slate-600">
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300 text-sm">{error}</span>
          <span className="text-red-500 text-xs ml-auto">Backend may be offline</span>
        </div>
      )}

      {/* Service Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ServiceStatus label="Health" data={health} field="status" />
        <ServiceStatus label="Readiness" data={readiness} field="status" />
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">Version</div>
          <div className="text-lg font-mono text-white">{health?.version || '—'}</div>
          <div className="text-xs text-slate-500 mt-1">SHA: {health?.git_sha || '—'}</div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">Readiness Checks</div>
          {readiness?.checks ? (
            <div className="space-y-1 mt-1">
              {Object.entries(readiness.checks).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  {v ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className="text-slate-300">{k.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm">—</div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard icon={Hash} label="Requests" value={fmt(totalRequests)} color="text-blue-400" />
        <StatCard icon={AlertCircle} label="Errors" value={fmt(totalErrors)} color="text-red-400" />
        <StatCard icon={DollarSign} label="Total Cost" value={`$${totalCost.toFixed(4)}`} color="text-green-400" />
        <StatCard icon={Zap} label="Tokens" value={fmtK(totalTokens)} color="text-yellow-400" />
        <StatCard icon={ArrowRightLeft} label="Fallbacks" value={fmt(totalFallbacks)} color="text-amber-400" />
        <StatCard icon={Shield} label="Schema Valid" value={fmt(schemaValid)} color="text-cyan-400" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Latency Over Time */}
        <ChartCard title="Avg Latency (ms)" icon={Clock}>
          {latencyHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={latencyHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Requests by Model */}
        <ChartCard title="Requests by Model" icon={Cpu}>
          {requestsByModel.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={requestsByModel}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Error Distribution */}
        <ChartCard title="Error Distribution" icon={AlertCircle}>
          {errorsByClass.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={errorsByClass}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {errorsByClass.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No errors recorded" />
          )}
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Breakdown */}
        <ChartCard title="Token Usage" icon={TrendingUp}>
          <div className="flex items-center justify-around py-6">
            {tokensByDir.map((t) => (
              <div key={t.name} className="text-center">
                <div className="text-2xl font-bold text-white">{fmtK(t.value)}</div>
                <div className="text-xs text-slate-400 mt-1 uppercase">{t.name}</div>
              </div>
            ))}
            {tokensByDir.length === 0 && <EmptyChart />}
          </div>
        </ChartCard>

        {/* Request Status Breakdown */}
        <ChartCard title="Request Status" icon={Activity}>
          {requestsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={requestsByStatus} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {requestsByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.name === 'success' ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ServiceStatus({ label, data, field }) {
  const val = data?.[field];
  const ok = val === 'healthy' || val === 'ready';
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-400' : data ? 'bg-red-400' : 'bg-slate-600'}`} />
        <span className={`text-lg font-semibold ${ok ? 'text-green-400' : data ? 'text-red-400' : 'text-slate-500'}`}>
          {val || (data ? 'Error' : 'Unknown')}
        </span>
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <span className="text-sm font-semibold text-slate-300">{title}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label = 'No data yet' }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-sm text-slate-600">
      {label}
    </div>
  );
}

function getSum(metrics, name) {
  if (!metrics?.[name]) return 0;
  return metrics[name].reduce((s, m) => s + m.value, 0);
}

function getGrouped(metrics, name, labelKey) {
  if (!metrics?.[name]) return [];
  const grouped = {};
  for (const m of metrics[name]) {
    const key = m.labels[labelKey] || 'unknown';
    grouped[key] = (grouped[key] || 0) + m.value;
  }
  return Object.entries(grouped).map(([name, value]) => ({ name, value }));
}

function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtK(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function Cpu(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />
    </svg>
  );
}
