import { useState } from 'react';
import { Send, Loader2, FlaskConical, Sparkles, Info, ChevronDown, ChevronUp, Zap, FileText, BarChart3 } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const SAMPLE_TICKETS = [
  "I was charged twice for my subscription this month. Order #4821. Please refund the extra charge immediately.",
  "My app keeps crashing every time I try to upload a file larger than 10MB. I'm on the latest version.",
  "I want to cancel my account and get a full refund. I've been a customer for 3 years and the service quality has dropped significantly.",
];

export default function ABTest() {
  const [text, setText] = useState('');
  const [versionA, setVersionA] = useState('v1');
  const [versionB, setVersionB] = useState('v2');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  async function handleTest(e) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch('/api/v1/ab-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_text: text.trim(), version_a: versionA, version_b: versionB }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
      setResults(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <FlaskConical className="w-7 h-7 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">A/B Prompt Testing</h1>
        </div>
        <p className="text-slate-400">Test the same support ticket against two different AI prompts and compare their results side by side.</p>
      </div>

      {/* How it Works */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <Info className="w-4 h-4" />
        <span>What is A/B prompt testing?</span>
        {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showGuide && (
        <div className="bg-purple-900/20 border border-purple-800/50 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Zap className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Why Test Prompts?</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                The AI's behavior depends on the <span className="text-purple-400 font-medium">prompt</span> — the instructions it receives.
                Small changes in wording can lead to very different triage results. A/B testing lets you
                send the <span className="text-purple-400 font-medium">same ticket</span> to two different prompt versions and see which one gives better results.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <FileText className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500 mb-0.5">Step 1</p>
              <p className="text-sm text-white font-medium">Enter a Ticket</p>
              <p className="text-xs text-slate-400 mt-1">Paste a real or sample support message</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <FlaskConical className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500 mb-0.5">Step 2</p>
              <p className="text-sm text-white font-medium">Pick Two Versions</p>
              <p className="text-xs text-slate-400 mt-1">v1 = Standard, v2 = Chain-of-Thought</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <BarChart3 className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500 mb-0.5">Step 3</p>
              <p className="text-sm text-white font-medium">Compare Results</p>
              <p className="text-xs text-slate-400 mt-1">See priority, cost, speed & reply quality</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-purple-800/30">
            <p className="text-xs text-slate-400 font-medium mb-2">Prompt Versions:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-purple-400 bg-purple-900/40 px-1.5 py-0.5 rounded shrink-0">v1</span>
                <p className="text-xs text-slate-300"><span className="text-white font-medium">Standard</span> — Direct classification. Fast and cheap. Good baseline for simple tickets.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-purple-400 bg-purple-900/40 px-1.5 py-0.5 rounded shrink-0">v2</span>
                <p className="text-xs text-slate-300"><span className="text-white font-medium">Chain-of-Thought</span> — AI reasons step by step. More accurate on complex tickets, but slower and uses more tokens.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleTest} className="space-y-4 mb-8">
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Support Ticket Text</label>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-1">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste a support ticket here, or click a sample below..."
              rows={4}
              className="w-full bg-transparent text-white placeholder-slate-500 p-4 rounded-lg resize-none focus:outline-none text-sm leading-relaxed"
            />
          </div>
        </div>

        {/* Sample tickets */}
        {!text && (
          <div>
            <p className="text-xs text-slate-500 mb-2">Try a sample ticket:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TICKETS.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setText(t)}
                  className="text-xs bg-slate-800 border border-slate-700 hover:border-purple-500/50 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors text-left max-w-xs truncate"
                >
                  {t.slice(0, 60)}...
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider">Version A</label>
            <select
              value={versionA}
              onChange={e => setVersionA(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="v1">v1 (Standard)</option>
              <option value="v2">v2 (Chain-of-Thought)</option>
            </select>
          </div>
          <span className="text-slate-600 font-bold">VS</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider">Version B</label>
            <select
              value={versionB}
              onChange={e => setVersionB(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="v1">v1 (Standard)</option>
              <option value="v2">v2 (Chain-of-Thought)</option>
            </select>
          </div>
          <div className="flex-1" />
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
            ) : (
              <><Send className="w-4 h-4" /> Run Test</>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      {results && (
        <>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Results — compare side by side</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResultCard label="A" data={results.a} />
            <ResultCard label="B" data={results.b} />
          </div>
          <WinnerHint a={results.a} b={results.b} />
        </>
      )}
    </div>
  );
}

function WinnerHint({ a, b }) {
  if (a.error || b.error) return null;
  const confA = a.result?.result?.confidence ?? 0;
  const confB = b.result?.result?.confidence ?? 0;
  const latA = a.result?.metadata?.latency_ms ?? Infinity;
  const latB = b.result?.metadata?.latency_ms ?? Infinity;
  const costA = a.result?.metadata?.cost_usd ?? 0;
  const costB = b.result?.metadata?.cost_usd ?? 0;

  const hints = [];
  if (confA !== confB) hints.push(confA > confB ? `Version ${a.version} has higher confidence` : `Version ${b.version} has higher confidence`);
  if (latA !== latB) hints.push(latA < latB ? `Version ${a.version} is faster` : `Version ${b.version} is faster`);
  if (costA !== costB) hints.push(costA < costB ? `Version ${a.version} is cheaper` : `Version ${b.version} is cheaper`);

  if (hints.length === 0) return null;

  return (
    <div className="mt-4 bg-slate-800 rounded-xl border border-slate-700 p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Quick Comparison</p>
      <div className="flex flex-wrap gap-3">
        {hints.map((h, i) => (
          <span key={i} className="text-xs bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full">{h}</span>
        ))}
      </div>
    </div>
  );
}

function ResultCard({ label, data }) {
  if (data.error) {
    return (
      <div className="bg-slate-800 rounded-xl border border-red-700 p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Version {data.version} ({label})</h3>
        <p className="text-red-400 text-sm">{data.error}</p>
      </div>
    );
  }

  const r = data.result;
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="bg-slate-700/50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">
            Prompt {data.version} ({label})
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge value={r.result.priority} />
          <StatusBadge value={r.result.category} />
          {r.result.severity && <StatusBadge value={r.result.severity} />}
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500">Model</span>
            <p className="text-white font-mono mt-0.5 truncate">{r.metadata.model}</p>
          </div>
          <div>
            <span className="text-slate-500">Latency</span>
            <p className="text-white font-mono mt-0.5">{r.metadata.latency_ms.toFixed(0)}ms</p>
          </div>
          <div>
            <span className="text-slate-500">Cost</span>
            <p className="text-white font-mono mt-0.5">${r.metadata.cost_usd.toFixed(5)}</p>
          </div>
          <div>
            <span className="text-slate-500">Tokens</span>
            <p className="text-white font-mono mt-0.5">{r.metadata.input_tokens + r.metadata.output_tokens}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {r.result.confidence != null && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              r.result.confidence >= 0.8 ? 'bg-green-900/30 text-green-400' :
              r.result.confidence >= 0.6 ? 'bg-amber-900/30 text-amber-400' :
              'bg-red-900/30 text-red-400'
            }`}>
              Confidence: {(r.result.confidence * 100).toFixed(0)}%
            </span>
          )}
          {r.result.review_required && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-900/30 text-amber-400">
              Review required
            </span>
          )}
          {r.result.customer_intent && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-slate-700/50 text-slate-300">
              {r.result.customer_intent.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {r.result.extracted_entities?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {r.result.extracted_entities.map((e, i) => (
              <span key={i} className="text-xs bg-slate-900 border border-slate-700 rounded px-2 py-0.5">
                <span className="text-slate-500">{e.type}: </span>
                <span className="text-white font-mono">{e.value}</span>
              </span>
            ))}
          </div>
        )}

        {r.result.recommended_action && r.result.recommended_action !== 'review' && (
          <div className="text-xs text-blue-400">
            Next step: {r.result.recommended_action}
          </div>
        )}

        <div className="border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-500 mb-1">Summary</p>
          <p className="text-sm text-white">{r.result.summary}</p>
        </div>

        <div className="border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-500 mb-1">Draft Reply</p>
          <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 leading-relaxed max-h-[200px] overflow-y-auto">
            {r.result.draft_reply}
          </div>
        </div>
      </div>
    </div>
  );
}
