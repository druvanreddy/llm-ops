import { useState, useEffect } from 'react';
import { fetchRules, createRule, deleteRule } from '../lib/api';
import { Plus, Trash2, Shield, ToggleLeft, ToggleRight, Zap, Info, Bell, ArrowUpRight, UserPlus, Siren, ChevronDown, ChevronUp } from 'lucide-react';

const ACTION_INFO = {
  notify: {
    icon: Bell,
    label: 'Notify',
    color: 'text-blue-400',
    desc: 'Send a notification to a Slack channel or email when a matching ticket arrives.',
    example: '#billing-team, alerts@company.com',
  },
  escalate: {
    icon: ArrowUpRight,
    label: 'Escalate',
    color: 'text-amber-400',
    desc: 'Move the ticket to a higher support tier automatically.',
    example: 'tier-2, senior-support',
  },
  assign: {
    icon: UserPlus,
    label: 'Assign',
    color: 'text-green-400',
    desc: 'Auto-assign the ticket to a specific person or team.',
    example: '@jane, backend-team',
  },
  page: {
    icon: Siren,
    label: 'Page On-Call',
    color: 'text-red-400',
    desc: 'Trigger an urgent alert to the on-call engineer via PagerDuty, Opsgenie, etc.',
    example: 'oncall@company.com, pd-service-key',
  },
};

const TEMPLATES = [
  { name: 'Critical Billing Alert', priority: 'critical', category: 'billing', action: 'page', target: 'oncall@company.com' },
  { name: 'High-Priority Escalation', priority: 'high', category: '', action: 'escalate', target: 'tier-2' },
  { name: 'Technical Issues → Engineering', priority: '', category: 'technical', action: 'assign', target: '#engineering' },
];

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [form, setForm] = useState({ name: '', priority: '', category: '', action: 'notify', target: '' });

  async function load() {
    try { setRules(await fetchRules()); } catch { /* ignore */ }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    await createRule({
      name: form.name,
      priority: form.priority || null,
      category: form.category || null,
      action: form.action,
      target: form.target,
    });
    setForm({ name: '', priority: '', category: '', action: 'notify', target: '' });
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    await deleteRule(id);
    setRules(r => r.filter(rule => rule.id !== id));
  }

  async function handleToggle(id, enabled) {
    await fetch(`/api/v1/rules/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    load();
  }

  function useTemplate(t) {
    setForm({ name: t.name, priority: t.priority, category: t.category, action: t.action, target: t.target });
    setShowForm(true);
  }

  const actionMeta = ACTION_INFO[form.action] || ACTION_INFO.notify;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-7 h-7 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Escalation Rules</h1>
          </div>
          <p className="text-slate-400">Automatically take action when the AI triages a ticket matching your conditions.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* How it Works */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <Info className="w-4 h-4" />
        <span>How do escalation rules work?</span>
        {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showGuide && (
        <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Zap className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">How It Works</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                When a support ticket is triaged by the AI, the system checks it against your rules.
                If the ticket's <span className="text-blue-400 font-medium">priority</span> and/or <span className="text-blue-400 font-medium">category</span> match
                a rule's conditions, the rule's <span className="text-blue-400 font-medium">action</span> fires automatically.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Step 1</p>
              <p className="text-sm text-white font-medium">AI Triages Ticket</p>
              <p className="text-xs text-slate-400 mt-1">Priority & category assigned</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Step 2</p>
              <p className="text-sm text-white font-medium">Rules Are Checked</p>
              <p className="text-xs text-slate-400 mt-1">Conditions matched against result</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Step 3</p>
              <p className="text-sm text-white font-medium">Action Fires</p>
              <p className="text-xs text-slate-400 mt-1">Notify, escalate, assign, or page</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-800/50">
            <p className="text-xs text-slate-400 font-medium mb-2">Available Actions:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(ACTION_INFO).map(([key, a]) => {
                const Icon = a.icon;
                return (
                  <div key={key} className="flex items-start gap-2">
                    <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${a.color}`} />
                    <div>
                      <span className="text-xs font-medium text-white">{a.label}</span>
                      <span className="text-xs text-slate-400"> — {a.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Templates */}
      {!showForm && rules.length === 0 && (
        <div className="mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Quick Start — click a template to use it</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TEMPLATES.map((t, i) => {
              const a = ACTION_INFO[t.action];
              const Icon = a.icon;
              return (
                <button
                  key={i}
                  onClick={() => useTemplate(t)}
                  className="bg-slate-800 rounded-xl border border-slate-700 hover:border-blue-500/50 p-4 text-left transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${a.color}`} />
                    <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">{a.label}</span>
                  </div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {t.priority && <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded">Priority: {t.priority}</span>}
                    {t.category && <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded">Category: {t.category}</span>}
                    {t.target && <span className="text-xs text-slate-500">→ {t.target}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6 space-y-4">
          <p className="text-xs text-slate-500 mb-2">Fill in the conditions below. When a triaged ticket matches, the action will fire automatically.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Rule Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g. Critical Billing Alert"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Action — what happens when matched</label>
              <select
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="notify">🔔 Notify — send alert to a channel or email</option>
                <option value="escalate">⬆️ Escalate — bump to higher support tier</option>
                <option value="assign">👤 Assign — route to a person or team</option>
                <option value="page">🚨 Page On-Call — urgent alert via PagerDuty etc.</option>
              </select>
              <p className="text-xs text-slate-500 mt-1.5">{actionMeta.desc}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Match Priority (leave blank = any)</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Any Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Match Category (leave blank = any)</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Any Category</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
                <option value="shipping">Shipping</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Target — who or where to send it</label>
            <input
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder={actionMeta.example}
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Create Rule
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Rules List */}
      {rules.length === 0 && !showForm ? (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 text-center">
          <Shield className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No escalation rules yet</p>
          <p className="text-slate-600 text-xs mt-1">Click "New Rule" above or pick a template to get started</p>
        </div>
      ) : rules.length > 0 && (
        <div className="space-y-3">
          {rules.map(rule => {
            const a = ACTION_INFO[rule.action] || ACTION_INFO.notify;
            const ActionIcon = a.icon;
            return (
              <div key={rule.id} className={`bg-slate-800 rounded-xl border p-4 flex items-center justify-between transition-colors ${rule.enabled ? 'border-slate-700' : 'border-slate-800 opacity-50'}`}>
                <div className="flex items-center gap-4">
                  <button onClick={() => handleToggle(rule.id, rule.enabled)} className="text-slate-400 hover:text-blue-400 transition-colors">
                    {rule.enabled ? <ToggleRight className="w-6 h-6 text-blue-400" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-white">{rule.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {rule.priority && <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded">Priority: {rule.priority}</span>}
                      {rule.category && <span className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded">Category: {rule.category}</span>}
                      <span className={`text-xs flex items-center gap-1 ${a.color}`}>
                        <ActionIcon className="w-3 h-3" /> {a.label}
                      </span>
                      {rule.target && <span className="text-xs text-slate-600">→ {rule.target}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDelete(rule.id)} className="text-slate-600 hover:text-red-400 p-1.5 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
