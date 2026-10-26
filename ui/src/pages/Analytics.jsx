import { useState, useEffect, useContext } from 'react';
import { fetchAnalytics } from '../lib/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Clock, DollarSign, ThumbsUp, ThumbsDown, Globe, RefreshCw, Shield, Target, Gauge } from 'lucide-react';
import { ThemeContext } from '../App';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#06b6d4', '#f97316'];

function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 p-5 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-0.5">
        {Icon && <Icon className="w-4 h-4 text-blue-400" />}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function useChartTheme() {
  const { dark } = useContext(ThemeContext);
  return {
    tooltip: {
      background: dark ? '#1e293b' : '#ffffff',
      border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`,
      borderRadius: 8,
      boxShadow: dark ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
    },
    grid: dark ? '#334155' : '#e2e8f0',
    axis: dark ? '#94a3b8' : '#475569',
    pieLabel: dark ? '#e2e8f0' : '#334155',
  };
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const ct = useChartTheme();

  async function load() {
    setLoading(true);
    try {
      const d = await fetchAnalytics();
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-500">
        Failed to load analytics.
      </div>
    );
  }

  const totalFeedback = (data.feedback?.up || 0) + (data.feedback?.down || 0);
  const accuracy = totalFeedback > 0 ? Math.round(((data.feedback?.up || 0) / totalFeedback) * 100) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-slate-400">Deep dive into triage performance, costs, and quality.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KPI icon={Clock} label="P50 Latency" value={`${data.latency.p50}ms`} sub="Median response time" />
        <KPI icon={Clock} label="P95 Latency" value={`${data.latency.p95}ms`} sub="95th percentile" />
        <KPI icon={DollarSign} label="Cost / Ticket" value={`$${data.cost_per_ticket.toFixed(5)}`} sub={`Total: $${data.total_cost.toFixed(4)}`} />
        <KPI
          icon={ThumbsUp}
          label="Accuracy"
          value={accuracy !== null ? `${accuracy}%` : '—'}
          sub={totalFeedback > 0 ? `${data.feedback.up || 0} up / ${data.feedback.down || 0} down` : 'No feedback yet'}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Volume */}
        <Card>
          <CardTitle icon={TrendingUp} title="Daily Volume" subtitle="Tickets triaged per day" />
          {data.daily_volume.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.daily_volume}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="date" tick={{ fill: ct.axis, fontSize: 11 }} />
                <YAxis tick={{ fill: ct.axis, fontSize: 11 }} />
                <Tooltip contentStyle={ct.tooltip} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardTitle title="Category Breakdown" subtitle="Distribution of ticket categories" />
          {data.categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.categories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent, x, y }) => <text x={x} y={y} fill={ct.pieLabel} textAnchor="middle" dominantBaseline="central" fontSize={12}>{name} {(percent * 100).toFixed(0)}%</text>}>
                  {data.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={ct.tooltip} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardTitle title="Priority Distribution" subtitle="How tickets are prioritized" />
          {data.priorities.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.priorities} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis type="number" tick={{ fill: ct.axis, fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: ct.axis, fontSize: 11 }} width={80} />
                <Tooltip contentStyle={ct.tooltip} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.priorities.map((entry, i) => {
                    const colors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' };
                    return <Cell key={i} fill={colors[entry.name] || COLORS[i % COLORS.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        {/* Latency Trend */}
        <Card>
          <CardTitle icon={Clock} title="Latency Percentiles" subtitle={`Avg: ${data.latency.avg}ms · P95: ${data.latency.p95}ms · P99: ${data.latency.p99}ms`} />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-2xl font-bold text-blue-400 font-mono">{data.latency.p50}</p>
              <p className="text-xs text-slate-500 mt-1">P50 (ms)</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-2xl font-bold text-amber-400 font-mono">{data.latency.p95}</p>
              <p className="text-xs text-slate-500 mt-1">P95 (ms)</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <p className="text-2xl font-bold text-red-400 font-mono">{data.latency.p99}</p>
              <p className="text-xs text-slate-500 mt-1">P99 (ms)</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Phase 2 Analytics: Severity, Intent, Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Severity Breakdown */}
        <Card>
          <CardTitle icon={Shield} title="Severity Distribution" subtitle="Impact severity across triaged tickets" />
          {data.severities?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.severities} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis type="number" tick={{ fill: ct.axis, fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: ct.axis, fontSize: 11 }} width={70} />
                <Tooltip contentStyle={ct.tooltip} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {(data.severities || []).map((entry, i) => {
                    const sevColors = { cosmetic: '#94a3b8', minor: '#38bdf8', major: '#f97316', critical: '#ef4444' };
                    return <Cell key={i} fill={sevColors[entry.name] || COLORS[i % COLORS.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        {/* Customer Intent */}
        <Card>
          <CardTitle icon={Target} title="Customer Intent" subtitle="What customers are trying to accomplish" />
          {data.intents?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.intents} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent, x, y }) => <text x={x} y={y} fill={ct.pieLabel} textAnchor="middle" dominantBaseline="central" fontSize={11}>{name.replace(/_/g, ' ')} {(percent * 100).toFixed(0)}%</text>} labelLine={false}>
                  {data.intents.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={ct.tooltip} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        {/* Confidence Distribution */}
        <Card>
          <CardTitle icon={Gauge} title="Confidence Distribution" subtitle={data.confidence?.avg ? `Average: ${(data.confidence.avg * 100).toFixed(1)}%` : 'Classification confidence levels'} />
          {data.confidence?.buckets?.some(b => b.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.confidence.buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fill: ct.axis, fontSize: 10 }} />
                <YAxis tick={{ fill: ct.axis, fontSize: 11 }} />
                <Tooltip contentStyle={ct.tooltip} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.confidence.buckets.map((entry, i) => {
                    const confColors = ['#22c55e', '#f59e0b', '#ef4444'];
                    return <Cell key={i} fill={confColors[i]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
      </div>

      {/* Language Breakdown */}
      {data.languages?.length > 0 && (
        <Card className="mb-6">
          <CardTitle icon={Globe} title="Language Distribution" subtitle="Languages detected in triaged tickets" />
          <div className="flex flex-wrap gap-3">
            {data.languages.map((l, i) => (
              <div key={i} className="bg-slate-900 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-sm font-medium text-white">{l.name.toUpperCase()}</span>
                <span className="text-xs text-slate-500">{l.value} tickets</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Feedback Breakdown */}
      {totalFeedback > 0 && (
        <Card>
          <CardTitle icon={ThumbsUp} title="Feedback Summary" subtitle="User satisfaction with triage results" />
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-green-900/40 p-3 rounded-lg">
                <ThumbsUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data.feedback.up || 0}</p>
                <p className="text-xs text-slate-500">Positive</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-red-900/40 p-3 rounded-lg">
                <ThumbsDown className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data.feedback.down || 0}</p>
                <p className="text-xs text-slate-500">Negative</p>
              </div>
            </div>
            {accuracy !== null && (
              <div className="ml-auto bg-slate-900 rounded-lg px-6 py-3 text-center">
                <p className="text-3xl font-bold text-blue-400">{accuracy}%</p>
                <p className="text-xs text-slate-500">Satisfaction Rate</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-white font-mono">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-40">
        <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" />
      </svg>
      <p className="text-sm">No data yet</p>
      <p className="text-xs mt-0.5 opacity-60">Triage some tickets to see analytics</p>
    </div>
  );
}
