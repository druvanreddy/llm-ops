import { useState, useEffect, useCallback, useContext } from 'react';
import {
  Activity, Zap, DollarSign, AlertCircle, Shield, Clock, RefreshCw,
  CheckCircle2, XCircle, ArrowRightLeft, Hash, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { fetchHealth, fetchReadiness, fetchMetrics, parsePrometheusMetrics } from '../lib/api';
import StatCard from '../components/StatCard';
import { ThemeContext } from '../App';

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

function useChartTheme() {
  const { dark } = useContext(ThemeContext);
  return {
    tooltip: {
      background: dark ? '#1e293b' : '#ffffff',
      border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`,
      borderRadius: 8,
      boxShadow: dark ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
    },
    tooltipLabel: { color: dark ? '#94a3b8' : '#475569' },
    grid: dark ? '#334155' : '#e2e8f0',
    axis: dark ? '#64748b' : '#475569',
    axisLight: dark ? '#94a3b8' : '#64748b',
  };
}

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const [latencyHistory, setLatencyHistory] = useState([]);
  const [dbStats, setDbStats] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [h, r, m, s] = await Promise.all([
        fetchHealth(),
        fetchReadiness(),
        fetchMetrics(),
        fetch('/api/v1/stats').then(res => res.ok ? res.json() : null).catch(() => null),
      ]);
      setHealth(h);
      setReadiness(r);
      const parsed = parsePrometheusMetrics(m);
      setMetrics(parsed);
      if (s) setDbStats(s);
      setLastRefresh(new Date());
      setError(null);

      if (s?.latency_history?.length > 0) {
        setLatencyHistory(s.latency_history.map(p => ({
          time: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: p.value,
        })));
      }
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

  const ct = useChartTheme();

  const totalRequests = dbStats?.total_requests ?? getSum(metrics, 'llm_requests_total');
  const totalErrors = getSum(metrics, 'llm_errors_total');
  const totalCost = dbStats?.total_cost ?? getSum(metrics, 'llm_cost_dollars_total');
  const totalTokens = dbStats ? (dbStats.total_input_tokens + dbStats.total_output_tokens) : getSum(metrics, 'llm_tokens_total');
  const totalFallbacks = dbStats?.total_fallbacks ?? getSum(metrics, 'llm_fallback_total');
  const schemaValid = dbStats?.total_requests ?? getSum(metrics, 'llm_schema_valid_total');

  const errorsByClass = getGrouped(metrics, 'llm_errors_total', 'error_class');
  const promRequestsByStatus = getGrouped(metrics, 'llm_requests_total', 'status');
  const requestsByStatus = dbStats && dbStats.total_requests > 0
    ? [{ name: 'success', value: dbStats.total_requests }]
    : promRequestsByStatus;
  const tokensByDir = getGrouped(metrics, 'llm_tokens_total', 'direction');
  const promRequestsByModel = getGrouped(metrics, 'llm_requests_total', 'model');
  const requestsByModel = dbStats?.requests_by_model?.length > 0
    ? dbStats.requests_by_model
    : promRequestsByModel;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
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
        <ServiceStatus label="Health" sub="Is the backend server running?" data={health} field="status" />
        <ServiceStatus label="Readiness" sub="Can it accept triage requests?" data={readiness} field="status" />
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 stagger-children">
        <StatCard icon={Hash} label="Requests" value={fmt(totalRequests)} sub="Tickets triaged so far" color="text-blue-400" />
        <StatCard icon={AlertCircle} label="Errors" value={fmt(totalErrors)} sub="Failed triage attempts" color="text-red-400" />
        <StatCard icon={DollarSign} label="Total Cost" value={`$${totalCost.toFixed(4)}`} sub="Money spent on LLM calls" color="text-green-400" />
        <StatCard icon={Zap} label="Tokens" value={fmtK(totalTokens)} sub="Text units processed by LLM" color="text-yellow-400" />
        <StatCard icon={ArrowRightLeft} label="Fallbacks" value={fmt(totalFallbacks)} sub="Times backup model was used" color="text-amber-400" />
        <StatCard icon={Shield} label="Schema Valid" value={fmt(schemaValid)} sub="Properly formatted responses" color="text-cyan-400" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Latency Over Time */}
        <ChartCard title="Latency per Request (ms)" subtitle="Response time for each triage call — lower is better" icon={Clock}>
          {latencyHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={latencyHistory}>
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: ct.axis }} />
                <YAxis tick={{ fontSize: 10, fill: ct.axis }} unit="ms" />
                <Tooltip
                  contentStyle={ct.tooltip}
                  labelStyle={ct.tooltipLabel}
                  formatter={(val) => [`${val} ms`, 'Latency']}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#latencyGrad)" dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6, fill: '#60a5fa' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Requests by Model */}
        <ChartCard title="Requests by Model" subtitle="Which LLM model handled each request" icon={Cpu}>
          {requestsByModel.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={requestsByModel}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.axis }} />
                <YAxis tick={{ fontSize: 10, fill: ct.axis }} />
                <Tooltip contentStyle={ct.tooltip} labelStyle={ct.tooltipLabel} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Error Distribution */}
        <ChartCard title="Error Distribution" subtitle="Breakdown of what went wrong" icon={AlertCircle}>
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
                <Tooltip contentStyle={ct.tooltip} />
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
        <ChartCard title="Token Usage" subtitle="Input = your ticket text sent to LLM · Output = LLM's response" icon={TrendingUp}>
          <div className="flex items-center justify-around py-6">
            {dbStats ? (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{fmtK(dbStats.total_input_tokens)}</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase">INPUT</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{fmtK(dbStats.total_output_tokens)}</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase">OUTPUT</div>
                </div>
              </>
            ) : tokensByDir.length > 0 ? tokensByDir.map((t) => (
              <div key={t.name} className="text-center">
                <div className="text-2xl font-bold text-white">{fmtK(t.value)}</div>
                <div className="text-xs text-slate-400 mt-1 uppercase">{t.name}</div>
              </div>
            )) : <EmptyChart />}
          </div>
        </ChartCard>

        {/* Request Status Breakdown */}
        <ChartCard title="Request Status" subtitle="Success vs. failed triage calls" icon={Activity}>
          {requestsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={requestsByStatus} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: ct.axis }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: ct.axisLight }} width={80} />
                <Tooltip contentStyle={ct.tooltip} />
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

function ServiceStatus({ label, sub, data, field }) {
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
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-slate-400" />}
          <span className="text-sm font-semibold text-slate-300">{title}</span>
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-1 ml-6">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label = 'No data yet' }) {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center text-slate-500">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-40">
        <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" />
      </svg>
      <p className="text-sm">{label}</p>
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
