import { useState, useEffect } from 'react';
import { Send, Loader2, Clock, Coins, Cpu, AlertTriangle, Sparkles, Trash2, X, CheckSquare, Square, ThumbsUp, ThumbsDown, Download, Upload, AlertCircle, ShieldAlert, Globe, Tag, Target, Eye, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { triageTicket, submitFeedback, bulkTriage, fetchPromptVersions } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

const EXAMPLES = [
  "I was charged twice for my subscription last month and I still haven't received a refund. This is unacceptable and I want my money back immediately.",
  "My delivery has been stuck in transit for 2 weeks now. The tracking number shows no updates since October 12th. Order #ORD-9921.",
  "I can't log into my account anymore. I've tried resetting my password three times but I never get the reset email. My email is correct.",
  "The premium feature I purchased isn't working at all. The export button just spins forever and I need to generate reports for my team by Friday.",
  "I want to cancel my annual subscription effective immediately. I no longer need the service and would like a prorated refund for the remaining months.",
  "Your app keeps crashing every time I try to upload a file larger than 50MB. I'm on the latest version of iOS and this started happening after your last update.",
  "I received the wrong item in my order. I ordered a blue wireless keyboard but got a black wired mouse instead. Order #ORD-4418.",
  "How do I upgrade my plan from Basic to Pro? I can't find the option in my account settings and the pricing page doesn't have a clear upgrade button.",
  "My payment method was declined but I have sufficient funds. I've tried three different cards and none of them work. I need to renew before my data is deleted.",
  "The API rate limits are way too low for our use case. We're hitting 429 errors constantly during peak hours and it's affecting our production service.",
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
      <div className="flex flex-col sm:flex-row items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Triage Demo</h1>
          <p className="text-slate-400">
            {bulkMode
              ? 'Paste multiple tickets (one per line) to triage them all at once.'
              : 'Paste a customer support ticket below and watch the LLM classify it in real time.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {promptVersions.length > 0 && (
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
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
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              bulkMode ? 'bg-blue-900/30 border-blue-700 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3 h-3" />
            {bulkMode ? 'Single Mode' : 'Bulk Triage'}
          </button>
          <a
            href="/api/v1/export/csv"
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Download className="w-3 h-3" />
            CSV
          </a>
          <a
            href="/api/v1/export/json"
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Download className="w-3 h-3" />
            JSON
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter a customer support ticket..."
                rows={6}
                className="w-full bg-transparent text-white placeholder-slate-500 p-4 rounded-lg resize-none focus:outline-none text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-xs text-slate-500">
                  {text.length} chars · ~{Math.ceil(text.length / 4)} tokens
                </span>
                {bulkMode ? (
                  <button
                    type="button"
                    onClick={handleBulkTriage}
                    disabled={!text.trim() || bulkLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {bulkLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Bulk Triage</>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!text.trim() || loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Triaging...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Triage</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Example Tickets */}
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">
              Try an example
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  className="text-left text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg p-3 transition-colors line-clamp-2"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-700 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-medium text-sm">Triage Failed</p>
                <p className="text-red-400 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Bulk Results */}
          {bulkResults && (
            <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-700/50 px-5 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  Bulk Results: {bulkResults.success}/{bulkResults.total} successful
                </span>
                <span className="text-xs text-slate-500">Click a result to expand details</span>
              </div>
              <div className="divide-y divide-slate-700 max-h-[700px] overflow-y-auto">
                {bulkResults.results.map((r, i) => {
                  const isExpanded = expandedBulk === i;
                  return (
                    <div key={i}>
                      <div
                        className={`px-5 py-4 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-700/30' : 'hover:bg-slate-700/20'}`}
                        onClick={() => setExpandedBulk(isExpanded ? null : i)}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-500 mt-0.5 flex-shrink-0">{i + 1}.</span>
                          <p className="text-xs text-slate-300 leading-relaxed flex-1">{r.text}</p>
                          {r.result && (
                            isExpanded
                              ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          )}
                        </div>
                        {r.result ? (
                          <div className="ml-5 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <StatusBadge value={r.result.result.priority} />
                              <StatusBadge value={r.result.result.category} />
                              {r.result.result.severity && <StatusBadge value={r.result.result.severity} />}
                              {r.result.result.confidence != null && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  r.result.result.confidence >= 0.8 ? 'bg-green-900/30 text-green-400' :
                                  r.result.result.confidence >= 0.6 ? 'bg-amber-900/30 text-amber-400' :
                                  'bg-red-900/30 text-red-400'
                                }`}>
                                  {(r.result.result.confidence * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                            {!isExpanded && (
                              <p className="text-xs text-slate-400 leading-relaxed"><span className="text-slate-500 font-medium">Summary:</span> {r.result.result.summary}</p>
                            )}
                          </div>
                        ) : (
                          <div className="ml-5">
                            <span className="text-xs text-red-400">{r.error}</span>
                          </div>
                        )}
                      </div>

                      {/* Expanded Detail View */}
                      {isExpanded && r.result && (
                        <div className="px-5 pb-5 ml-5 space-y-4 animate-fade-in">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <MetaItem icon={Cpu} label="Model" value={r.result.metadata.model} />
                            <MetaItem icon={Clock} label="Latency" value={`${r.result.metadata.latency_ms.toFixed(0)}ms`} />
                            <MetaItem icon={Coins} label="Cost" value={`$${r.result.metadata.cost_usd.toFixed(5)}`} />
                            <MetaItem label="Tokens" value={`${r.result.metadata.input_tokens} / ${r.result.metadata.output_tokens}`} />
                          </div>

                          {r.result.result.confidence != null && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                              r.result.result.confidence >= 0.8
                                ? 'bg-green-900/30 text-green-400 border border-green-800'
                                : r.result.result.confidence >= 0.6
                                  ? 'bg-amber-900/30 text-amber-400 border border-amber-800'
                                  : 'bg-red-900/30 text-red-400 border border-red-800'
                            }`}>
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Confidence: {(r.result.result.confidence * 100).toFixed(0)}%
                              {r.result.result.confidence < 0.7 && <span className="ml-1">— Low confidence, review recommended</span>}
                            </div>
                          )}

                          {r.result.result.detected_language && r.result.result.detected_language !== 'en' && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-blue-900/30 text-blue-400 border border-blue-800">
                              <Globe className="w-3.5 h-3.5" />
                              Detected language: {r.result.result.detected_language.toUpperCase()}
                            </div>
                          )}

                          {r.result.result.review_required && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-amber-900/30 text-amber-400 border border-amber-800">
                              <Eye className="w-3.5 h-3.5" />
                              Human review required
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-700 pt-4">
                            {r.result.result.product && (
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">Product Area</p>
                                <p className="text-white text-sm">{r.result.result.product}</p>
                              </div>
                            )}
                            {r.result.result.customer_intent && (
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">Customer Intent</p>
                                <p className="text-white text-sm">{r.result.result.customer_intent.replace(/_/g, ' ')}</p>
                              </div>
                            )}
                          </div>

                          {r.result.result.extracted_entities?.length > 0 && (
                            <div className="border-t border-slate-700 pt-4">
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Extracted Entities</p>
                              <div className="flex flex-wrap gap-2">
                                {r.result.result.extracted_entities.map((e, j) => (
                                  <span key={j} className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                                    <Hash className="w-3 h-3 text-slate-500" />
                                    <span className="text-slate-400">{e.type}:</span>
                                    <span className="text-white font-mono">{e.value}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.result.result.recommended_action && r.result.result.recommended_action !== 'review' && (
                            <div className="border-t border-slate-700 pt-4">
                              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">Recommended Action</p>
                              <div className="flex items-center gap-2">
                                <Target className="w-3.5 h-3.5 text-blue-400" />
                                <p className="text-white text-sm">{r.result.result.recommended_action}</p>
                              </div>
                            </div>
                          )}

                          <div className="border-t border-slate-700 pt-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">Summary</p>
                            <p className="text-white text-sm">{r.result.result.summary}</p>
                          </div>

                          <div className="border-t border-slate-700 pt-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">Draft Reply</p>
                            <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 leading-relaxed">
                              {r.result.result.draft_reply}
                            </div>
                          </div>

                          <div className="border-t border-slate-700 pt-3 flex items-center gap-4 text-xs text-slate-500">
                            <span>Prompt: {r.result.metadata.prompt_version}</span>
                            <span>Provider: {r.result.metadata.provider}</span>
                            {r.result.metadata.fallback_used && (
                              <span className="text-amber-400">Fallback used</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result */}
          {result && !bulkMode && (
            <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-700/50 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-white">Triage Result</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge value={result.result.priority} />
                  <StatusBadge value={result.result.category} />
                  {result.result.secondary_category && <StatusBadge value={result.result.secondary_category} />}
                  {result.result.severity && <StatusBadge value={result.result.severity} />}
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <MetaItem icon={Cpu} label="Model" value={result.metadata.model} />
                  <MetaItem
                    icon={Clock}
                    label="Latency"
                    value={`${result.metadata.latency_ms.toFixed(0)}ms`}
                  />
                  <MetaItem
                    icon={Coins}
                    label="Cost"
                    value={`$${result.metadata.cost_usd.toFixed(5)}`}
                  />
                  <MetaItem
                    label="Tokens"
                    value={`${result.metadata.input_tokens} / ${result.metadata.output_tokens}`}
                  />
                </div>

                {/* Confidence Score */}
                {result.result.confidence != null && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                    result.result.confidence >= 0.8
                      ? 'bg-green-900/30 text-green-400 border border-green-800'
                      : result.result.confidence >= 0.6
                        ? 'bg-amber-900/30 text-amber-400 border border-amber-800'
                        : 'bg-red-900/30 text-red-400 border border-red-800'
                  }`}>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Confidence: {(result.result.confidence * 100).toFixed(0)}%
                    {result.result.confidence < 0.7 && <span className="ml-1">— Low confidence, review recommended</span>}
                  </div>
                )}

                {/* Detected Language */}
                {result.result.detected_language && result.result.detected_language !== 'en' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-blue-900/30 text-blue-400 border border-blue-800">
                    <Globe className="w-3.5 h-3.5" />
                    Detected language: {result.result.detected_language.toUpperCase()}
                  </div>
                )}

                {/* Review Required Banner */}
                {result.result.review_required && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-amber-900/30 text-amber-400 border border-amber-800">
                    <Eye className="w-3.5 h-3.5" />
                    Human review required — this ticket may be ambiguous or low-confidence
                  </div>
                )}

                {/* Customer Intent & Recommended Action */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-700 pt-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">Product Area</p>
                    <p className="text-white text-sm">{result.result.product}</p>
                  </div>
                  {result.result.customer_intent && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">Customer Intent</p>
                      <p className="text-white text-sm">{result.result.customer_intent.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                </div>

                {/* Extracted Entities */}
                {result.result.extracted_entities?.length > 0 && (
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Extracted Entities</p>
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

                {/* Recommended Action */}
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
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">
                    Summary
                  </p>
                  <p className="text-white text-sm">{result.result.summary}</p>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">
                    Draft Reply
                  </p>
                  <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 leading-relaxed">
                    {result.result.draft_reply}
                  </div>
                </div>

                {/* Escalation alerts */}
                {result.escalations?.length > 0 && (
                  <div className="border-t border-amber-700/50 pt-4">
                    <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-amber-300">Auto-Escalation Triggered</span>
                      </div>
                      {result.escalations.map((e, i) => (
                        <div key={i} className="text-xs text-amber-400 ml-6">
                          {e.name}: {e.action} → {e.target}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Prompt: {result.metadata.prompt_version}</span>
                    <span>Provider: {result.metadata.provider}</span>
                    <span>SHA: {result.metadata.git_sha}</span>
                    {result.metadata.fallback_used && (
                      <span className="text-amber-400">⚡ Fallback used</span>
                    )}
                  </div>
                  {result.db_id && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500 mr-2">Was this helpful?</span>
                      <button
                        onClick={() => handleFeedback(result.db_id, feedback === 'up' ? null : 'up')}
                        className={`p-1.5 rounded transition-colors ${feedback === 'up' ? 'bg-green-900/50 text-green-400' : 'text-slate-500 hover:text-green-400'}`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(result.db_id, feedback === 'down' ? null : 'down')}
                        className={`p-1.5 rounded transition-colors ${feedback === 'down' ? 'bg-red-900/50 text-red-400' : 'text-slate-500 hover:text-red-400'}`}
                      >
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
                    <button
                      onClick={() => deleteItems(selected)}
                      disabled={selected.size === 0}
                      className="text-xs text-red-400 hover:text-red-300 disabled:text-slate-600 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete ({selected.size})
                    </button>
                    <button
                      onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                      className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectMode(true)}
                      className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                    >
                      <CheckSquare className="w-3 h-3" />
                      Select
                    </button>
                    <button
                      onClick={() => {
                        fetch('/api/v1/history', { method: 'DELETE' });
                        setHistory([]);
                      }}
                      className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {history.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-slate-600 opacity-50">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-slate-500 text-sm font-medium">No requests yet</p>
              <p className="text-slate-600 text-xs mt-1">Triage a ticket to see it here</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="relative group w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg p-3 transition-colors cursor-pointer"
                  onClick={() => {
                    if (selectMode) {
                      toggleSelect(item.id);
                    } else {
                      setText(item.text);
                      setResult(item.result);
                      setError(null);
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    {selectMode && (
                      <div className="mt-0.5 flex-shrink-0">
                        {selected.has(item.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge value={item.result.result.priority} />
                        <StatusBadge value={item.result.result.category} />
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {item.text}
                      </p>
                      <p className="text-xs text-slate-600 mt-1" title={new Date(item.ts).toLocaleString()}>
                        {relativeTime(item.ts)}
                      </p>
                    </div>
                    {!selectMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItems(new Set([item.id]));
                        }}
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
