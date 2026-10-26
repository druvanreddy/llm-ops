import { useState } from 'react';
import { Send, Loader2, Clock, Coins, Cpu, AlertTriangle, Sparkles } from 'lucide-react';
import { triageTicket } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

const EXAMPLES = [
  "I was charged twice for my subscription last month and I still haven't received a refund. This is unacceptable and I want my money back immediately.",
  "My delivery has been stuck in transit for 2 weeks now. The tracking number shows no updates since October 12th. Order #ORD-9921.",
  "I can't log into my account anymore. I've tried resetting my password three times but I never get the reset email. My email is correct.",
  "The premium feature I purchased isn't working at all. The export button just spins forever and I need to generate reports for my team by Friday.",
];

export default function TriageDemo() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await triageTicket(text.trim());
      setResult(data);
      setHistory((h) => [{ text: text.trim(), result: data, ts: Date.now() }, ...h].slice(0, 20));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Triage Demo</h1>
        <p className="text-slate-400">
          Paste a customer support ticket below and watch the LLM classify it in real time.
        </p>
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
                <button
                  type="submit"
                  disabled={!text.trim() || loading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Triaging...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Triage
                    </>
                  )}
                </button>
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
                  onClick={() => setText(ex)}
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

          {/* Result */}
          {result && (
            <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-700/50 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-white">Triage Result</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge value={result.result.priority} />
                  <StatusBadge value={result.result.category} />
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

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-medium">
                    Product Area
                  </p>
                  <p className="text-white text-sm">{result.result.product}</p>
                </div>

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

                <div className="border-t border-slate-700 pt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span>Prompt: {result.metadata.prompt_version}</span>
                  <span>Provider: {result.metadata.provider}</span>
                  <span>SHA: {result.metadata.git_sha}</span>
                  {result.metadata.fallback_used && (
                    <span className="text-amber-400">⚡ Fallback used</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History Sidebar */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            History ({history.length})
          </h2>
          {history.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
              <p className="text-slate-500 text-sm">No requests yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {history.map((item, i) => (
                <button
                  key={item.ts}
                  onClick={() => {
                    setText(item.text);
                    setResult(item.result);
                    setError(null);
                  }}
                  className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg p-3 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge value={item.result.result.priority} />
                    <StatusBadge value={item.result.result.category} />
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {item.text}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {new Date(item.ts).toLocaleTimeString()}
                  </p>
                </button>
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
