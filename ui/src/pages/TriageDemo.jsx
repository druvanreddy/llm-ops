import { useState, useEffect } from 'react';
import { Send, Loader2, Clock, Coins, Cpu, AlertTriangle, Sparkles, Trash2, X, CheckSquare, Square, ThumbsUp, ThumbsDown, Download, Upload, AlertCircle, ShieldAlert, Globe, Target, Eye, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { triageTicket, submitFeedback, bulkTriage, fetchPromptVersions } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

const EXAMPLES = [
  "I was charged twice for my subscription last month and I still haven't received a refund.",
  "My delivery has been stuck in transit for 2 weeks. Order #ORD-9921.",
  "I can't log into my account. I've tried resetting my password three times.",
  "The premium export feature just spins forever. I need reports by Friday.",
  "Your app crashes every time I upload a file larger than 50MB on iOS.",
];

export default function TriageDemo() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [feedback, setFeedbackState] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [expandedBulk, setExpandedBulk] = useState(null);
  const [promptVersions, setPromptVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');

  useEffect(() => {
    fetch('/api/v1/history').then(r => r.ok ? r.json() : []).then(setHistory).catch(() => {});
    fetchPromptVersions().then(data => {
      setPromptVersions(data.versions || []);
      setActiveVersion(data.active || 'v1');
      setSelectedVersion(data.active || 'v1');
    }).catch(() => {});
  }, []);

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleFeedback(itemId, value) {
    await submitFeedback(itemId, value);
    setFeedbackState(value);
    setHistory(h => h.map(item => item.id === itemId ? { ...item, feedback: value } : item));
  }

  async function handleBulkTriage() {
    const lines = text.trim().split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+\.\s*/, ''));
    if (lines.length < 1) return;
    setBulkLoading(true);
    try {
      const data = await bulkTriage(lines, selectedVersion || null);
      setBulkResults(data);
      const updated = await fetch('/api/v1/history').then(r => r.ok ? r.json() : []);
      setHistory(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkLoading(false);
    }
  }

  async function deleteItems(ids) {
    await fetch('/api/v1/history/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...ids] }),
    });
    setHistory(h => h.filter(item => !ids.has(item.id)));
    setSelected(new Set());
    setSelectMode(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await triageTicket(text.trim(), 'demo-ui', selectedVersion || null);
      setResult(data);
      const updated = await fetch('/api/v1/history').then(r => r.ok ? r.json() : []);
      setHistory(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Ticket Triage</h1>
          <p className="text-slate-400 text-sm">
            {bulkMode
              ? 'Paste multiple tickets (one per line) to triage them all at once.'
              : 'Paste a support ticket and let the AI classify it instantly.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {promptVersions.length > 0 && (
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 focus:outline-none focus:border-blue-500"
            >
              {promptVersions.map(v => (
                <option key={v} value={v}>
                  Prompt {v}{v === activeVersion ? ' (default)' : ''}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => { setBulkMode(!bulkMode); setBulkResults(null); }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              bulkMode ? 'bg-blue-900/30 border-blue-700 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3 h-3" />
            {bulkMode ? 'Single' : 'Bulk'}
          </button>
          <a href="/api/v1/export/csv" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <Download className="w-3 h-3" /> CSV
          </a>
          <a href="/api/v1/export/json" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <Download className="w-3 h-3" /> JSON
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input + Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Input */}
          <form onSubmit={handleSubmit}>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={bulkMode ? "Paste tickets, one per line..." : "Paste a customer support ticket..."}
                rows={5}
                className="w-full bg-transparent text-white placeholder-slate-500 p-4 rounded-lg resize-none focus:outline-none text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-xs text-slate-500">{text.length} chars</span>
                {bulkMode ? (
                  <button type="button" onClick={handleBulkTriage} disabled={!text.trim() || bulkLoading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    {bulkLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Upload className="w-4 h-4" /> Bulk Triage</>}
                  </button>
                ) : (
                  <button type="submit" disabled={!text.trim() || loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Triaging...</> : <><Send className="w-4 h-4" /> Triage</>}
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Examples */}
          <div>
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (bulkMode) {
                      setText(prev => {
                        const lines = prev.trim().split('\n').filter(l => l.trim());
                        const num = lines.length + 1;
                        return prev.trim() ? prev.trimEnd() + '\n' + `${num}. ${ex}` : `1. ${ex}`;
                      });
                    } else {
                      setText(ex);
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg px-3 py-2 transition-colors text-left"
                >
                  {ex.length > 60 ? ex.slice(0, 60) + '...' : ex}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-medium text-sm">Triage Failed</p>
                <p className="text-red-400 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Bulk Results */}
          {bulkResults && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-700/50 px-5 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  Bulk Results: {bulkResults.success}/{bulkResults.total} successful
                </span>
                <span className="text-xs text-slate-500">Click to expand</span>
              </div>
              <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
                {bulkResults.results.map((r, i) => {
                  const isExpanded = expandedBulk === i;
                  return (
                    <div key={i}>
                      <div
                        className={`px-5 py-3 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-700/30' : 'hover:bg-slate-700/20'}`}
                        onClick={() => setExpandedBulk(isExpanded ? null : i)}
                      >
                        <div className="flex items-start gap-2 mb-1.5">
                          <span className="text-xs font-bold text-slate-500 mt-0.5 flex-shrink-0">{i + 1}.</span>
                          <p className="text-xs text-slate-300 flex-1 line-clamp-1">{r.text}</p>
                          {r.result && (isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />)}
                        </div>
                        {r.result ? (
                          <div className="ml-5 flex items-center gap-2 flex-wrap">
                            <StatusBadge value={r.result.result.priority} />
                            <StatusBadge value={r.result.result.category} />
                            {r.result.result.confidence != null && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${r.result.result.confidence >= 0.8 ? 'bg-green-900/30 text-green-400' : r.result.result.confidence >= 0.6 ? 'bg-amber-900/30 text-amber-400' : 'bg-red-900/30 text-red-400'}`}>
                                {(r.result.result.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                            {!isExpanded && <span className="text-xs text-slate-500 ml-1 truncate">{r.result.result.summary}</span>}
                          </div>
                        ) : (
                          <div className="ml-5"><span className="text-xs text-red-400">{r.error}</span></div>
                        )}
                      </div>
                      {isExpanded && r.result && <BulkDetail r={r.result} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single Result */}
          {result && !bulkMode && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-700/50 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-white">Triage Result</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge value={result.result.priority} />
                  <StatusBadge value={result.result.category} />
                  {result.result.severity && <StatusBadge value={result.result.severity} />}
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetaItem icon={Cpu} label="Model" value={result.metadata.model} />
                  <MetaItem icon={Clock} label="Latency" value={`${result.metadata.latency_ms.toFixed(0)}ms`} />
                  <MetaItem icon={Coins} label="Cost" value={`$${result.metadata.cost_usd.toFixed(5)}`} />
                  <MetaItem label="Tokens" value={`${result.metadata.input_tokens} / ${result.metadata.output_tokens}`} />
                </div>

                {result.result.confidence != null && <ConfidenceBadge confidence={result.result.confidence} />}

                {result.result.detected_language && result.result.detected_language !== 'en' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-blue-900/30 text-blue-400 border border-blue-800">
                    <Globe className="w-3.5 h-3.5" />
                    Detected language: {result.result.detected_language.toUpperCase()}
                  </div>
                )}
                {result.result.review_required && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-amber-900/30 text-amber-400 border border-amber-800">
                    <Eye className="w-3.5 h-3.5" />
                    Human review required
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-700 pt-4">
                  {result.result.product && <DetailField label="Product Area" value={result.result.product} />}
                  {result.result.customer_intent && <DetailField label="Customer Intent" value={result.result.customer_intent.replace(/_/g, ' ')} />}
                </div>

                {result.result.extracted_entities?.length > 0 && (
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Entities</p>
                    <div className="flex flex-wrap gap-2">
                      {result.result.extracted_entities.map((e, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                          <Hash className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-400">{e.type}:</span>
                          <span className="text-white font-mono">{e.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.result.recommended_action && result.result.recommended_action !== 'review' && (
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">Recommended Action</p>
                    <div className="flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-blue-400" />
                      <p className="text-white text-sm">{result.result.recommended_action}</p>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-700 pt-4">
                  <DetailField label="Summary" value={result.result.summary} />
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">Draft Reply</p>
                  <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 leading-relaxed">
                    {result.result.draft_reply}
                  </div>
                </div>

                {result.escalations?.length > 0 && (
                  <div className="border-t border-amber-700/50 pt-4">
                    <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-amber-300">Auto-Escalation Triggered</span>
                      </div>
                      {result.escalations.map((e, i) => (
                        <div key={i} className="text-xs text-amber-400 ml-6">{e.name}: {e.action} → {e.target}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Prompt: {result.metadata.prompt_version}</span>
                    <span>Provider: {result.metadata.provider}</span>
                    {result.metadata.fallback_used && <span className="text-amber-400">Fallback used</span>}
                  </div>
                  {result.db_id && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500 mr-2">Helpful?</span>
                      <button onClick={() => handleFeedback(result.db_id, feedback === 'up' ? null : 'up')} className={`p-1.5 rounded transition-colors ${feedback === 'up' ? 'bg-green-900/50 text-green-400' : 'text-slate-500 hover:text-green-400'}`}>
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleFeedback(result.db_id, feedback === 'down' ? null : 'down')} className={`p-1.5 rounded transition-colors ${feedback === 'down' ? 'bg-red-900/50 text-red-400' : 'text-slate-500 hover:text-red-400'}`}>
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History Sidebar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              History ({history.length})
            </h2>
            {history.length > 0 && (
              <div className="flex items-center gap-2">
                {selectMode ? (
                  <>
                    <button onClick={() => deleteItems(selected)} disabled={selected.size === 0} className="text-xs text-red-400 hover:text-red-300 disabled:text-slate-600 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Delete ({selected.size})
                    </button>
                    <button onClick={() => { setSelectMode(false); setSelected(new Set()); }} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setSelectMode(true)} className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" /> Select
                    </button>
                    <button onClick={() => { fetch('/api/v1/history', { method: 'DELETE' }); setHistory([]); }} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {history.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
              <p className="text-slate-500 text-sm">No requests yet</p>
              <p className="text-slate-600 text-xs mt-1">Triage a ticket to see it here</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="relative group w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg p-3 transition-colors cursor-pointer"
                  onClick={() => {
                    if (selectMode) { toggleSelect(item.id); }
                    else { setText(item.text); setResult(item.result); setError(null); }
                  }}
                >
                  <div className="flex items-start gap-2">
                    {selectMode && (
                      <div className="mt-0.5 flex-shrink-0">
                        {selected.has(item.id) ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge value={item.result.result.priority} />
                        <StatusBadge value={item.result.result.category} />
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">{item.text}</p>
                      <p className="text-xs text-slate-600 mt-1">{relativeTime(item.ts)}</p>
                    </div>
                    {!selectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteItems(new Set([item.id])); }}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 text-slate-600 hover:text-red-400 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        {Icon && <Icon className="w-3 h-3 text-slate-500" />}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-mono text-white">{value}</span>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">{label}</p>
      <p className="text-white text-sm">{value}</p>
    </div>
  );
}

function ConfidenceBadge({ confidence }) {
  const cls = confidence >= 0.8
    ? 'bg-green-900/30 text-green-400 border-green-800'
    : confidence >= 0.6
      ? 'bg-amber-900/30 text-amber-400 border-amber-800'
      : 'bg-red-900/30 text-red-400 border-red-800';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${cls}`}>
      <ShieldAlert className="w-3.5 h-3.5" />
      Confidence: {(confidence * 100).toFixed(0)}%
      {confidence < 0.7 && <span className="ml-1">— Review recommended</span>}
    </div>
  );
}

function BulkDetail({ r }) {
  return (
    <div className="px-5 pb-5 ml-5 space-y-3 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetaItem icon={Cpu} label="Model" value={r.metadata.model} />
        <MetaItem icon={Clock} label="Latency" value={`${r.metadata.latency_ms.toFixed(0)}ms`} />
        <MetaItem icon={Coins} label="Cost" value={`$${r.metadata.cost_usd.toFixed(5)}`} />
        <MetaItem label="Tokens" value={`${r.metadata.input_tokens} / ${r.metadata.output_tokens}`} />
      </div>
      {r.result.confidence != null && <ConfidenceBadge confidence={r.result.confidence} />}
      <div className="border-t border-slate-700 pt-3">
        <p className="text-xs text-slate-500 mb-1 font-medium">Summary</p>
        <p className="text-white text-sm">{r.result.summary}</p>
      </div>
      <div className="border-t border-slate-700 pt-3">
        <p className="text-xs text-slate-500 mb-1 font-medium">Draft Reply</p>
        <div className="bg-slate-900 rounded-lg p-3 text-sm text-slate-300 leading-relaxed">{r.result.draft_reply}</div>
      </div>
      <div className="border-t border-slate-700 pt-2 flex items-center gap-3 text-xs text-slate-500">
        <span>Prompt: {r.metadata.prompt_version}</span>
        <span>Provider: {r.metadata.provider}</span>
        {r.metadata.fallback_used && <span className="text-amber-400">Fallback used</span>}
      </div>
    </div>
  );
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
