import { useState } from 'react';
import {
  BookOpen, MessageSquareText, LayoutDashboard, BarChart3, Shield, FlaskConical,
  ChevronDown, ChevronUp, Zap, Info, ArrowRight, Send, Upload, Download,
  ThumbsUp, Bell, ArrowUpRight, UserPlus, Siren, RefreshCw, Activity,
  Target, Eye, Hash, Globe, Lightbulb, CheckCircle2,
} from 'lucide-react';

function Section({ icon: Icon, title, color = 'text-blue-400', children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className={`w-5 h-5 ${color}`} />}
          <span className="text-base font-semibold text-white">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-700">{children}</div>}
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="flex gap-4 mt-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
        {number}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white mb-1">{title}</p>
        <p className="text-sm text-slate-400 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Concept({ title, children }) {
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
      <p className="text-sm font-semibold text-white mb-1">{title}</p>
      <p className="text-sm text-slate-400 leading-relaxed">{children}</p>
    </div>
  );
}

function FlowStep({ label, last = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg px-3 py-2 text-xs font-medium text-blue-300 text-center whitespace-nowrap">
        {label}
      </div>
      {!last && <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />}
    </div>
  );
}

export default function Manual() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="w-7 h-7 text-blue-400" />
        <h1 className="text-3xl font-bold text-white">Manual</h1>
      </div>
      <p className="text-slate-400 mb-8">
        Everything you need to know about the LLM Ops Triage Platform, explained step by step.
      </p>

      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-900/30 to-slate-800 rounded-xl border border-blue-800/50 p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-3">What is this app?</h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-3">
          This app uses AI to automatically read customer support messages and classify them. It tells you what
          the message is about (billing, technical, shipping, etc.), how urgent it is, and even writes a suggested reply.
        </p>
        <p className="text-sm text-slate-400 leading-relaxed">
          Instead of a human spending 5 minutes reading and deciding what to do with each message,
          the AI does it in seconds. The human just reviews and sends.
        </p>
      </div>

      {/* Quick Start */}
      <Section icon={Zap} title="Quick Start - Triage Your First Ticket" color="text-yellow-400" defaultOpen={true}>
        <Step number={1} title="Go to the Triage page">
          Click "Triage" in the navigation bar at the top. This is the main page where you classify tickets.
        </Step>
        <Step number={2} title="Enter a customer message">
          Type or paste a customer support message into the text box. You can also click one of the example
          tickets below the text box to try it out.
        </Step>
        <Step number={3} title="Click Triage">
          Press the blue "Triage" button. The AI will read the message and show you the category,
          priority, severity, a summary, and a suggested reply. That's it!
        </Step>
      </Section>

      <div className="h-4" />

      {/* Features Guide */}
      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3 mt-6">Features Guide</p>

      <div className="space-y-3">
        {/* Triage */}
        <Section icon={MessageSquareText} title="Triage">
          <div className="mt-4 space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-blue-400" /> Single Triage
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Paste one customer message and click "Triage". The AI reads it and returns:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Category</span> - what it's about (billing, technical, shipping, etc.)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Priority</span> - how urgent it is (low, medium, high, urgent)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Severity</span> - how bad the impact is (cosmetic, minor, major, critical)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Confidence</span> - how sure the AI is (0-100%)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Summary</span> - one-line description of the issue</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Draft Reply</span> - a suggested response to send the customer</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Extracted Entities</span> - order IDs, emails, amounts found in the text</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-blue-400" /> Bulk Triage
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Click the "Bulk Triage" button to switch modes. Paste multiple tickets (one per line) and process
                them all at once. Click on any result to expand and see the full details. Up to 50 tickets at a time.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-blue-400" /> Prompt Versions
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Use the dropdown at the top right to switch between prompt versions. <span className="text-white">v1</span> is
                the standard prompt (fast and cheap). <span className="text-white">v2</span> uses chain-of-thought reasoning
                (more accurate but slower). Try both to see the difference.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <ThumbsUp className="w-3.5 h-3.5 text-blue-400" /> Feedback
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                After getting a result, click the thumbs up or thumbs down button to rate whether the AI did a good job.
                This feedback is tracked in the Analytics page.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-blue-400" /> Export
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Click the "CSV" or "JSON" buttons at the top to download all triage history. CSV works in Excel/Google Sheets.
                JSON is for developers who want to process the data programmatically.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-blue-400" /> History Sidebar
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                The right sidebar shows all previous triage results. Click any item to reload it.
                Use "Select" to pick multiple items and delete them, or "Clear All" to remove everything.
              </p>
            </div>
          </div>
        </Section>

        {/* Dashboard */}
        <Section icon={LayoutDashboard} title="Dashboard">
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-400 leading-relaxed">
              The Dashboard shows real-time health and performance of the triage system.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Health & Readiness</p>
                <p className="text-sm text-slate-300">Shows if the backend is running and can accept requests. Green = good, Red = problem.</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Key Metrics</p>
                <p className="text-sm text-slate-300">Total requests, errors, cost, tokens used, fallbacks triggered, and schema validity.</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Latency Chart</p>
                <p className="text-sm text-slate-300">How fast each triage request was processed. Lower numbers are better.</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Auto-Refresh</p>
                <p className="text-sm text-slate-300">Click "Live" to auto-update every 5 seconds, or "Refresh" for a manual update.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* Analytics */}
        <Section icon={BarChart3} title="Analytics">
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-400 leading-relaxed">
              Analytics gives you a deep dive into how the triage system is performing over time.
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Daily Volume</span> - how many tickets are triaged each day</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Category Breakdown</span> - pie chart of billing vs technical vs shipping etc.</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Priority Distribution</span> - how many urgent vs high vs medium vs low</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Latency (P50/P95/P99)</span> - speed at different percentiles</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Cost per Ticket</span> - how much each AI call costs in dollars</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Confidence Distribution</span> - how certain the AI is across all tickets</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" /> <span><span className="text-white">Feedback Summary</span> - thumbs up vs thumbs down from users</span></li>
            </ul>
          </div>
        </Section>

        {/* Rules */}
        <Section icon={Shield} title="Escalation Rules">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">
              Rules let you automate actions when a ticket matches certain conditions. For example:
              "If a ticket is urgent AND about billing, alert the billing manager."
            </p>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">How to create a rule</p>
              <Step number={1} title="Click 'New Rule'">
                Opens the form to define your rule conditions and action.
              </Step>
              <Step number={2} title="Set conditions">
                Pick a priority (urgent, high, etc.) and/or category (billing, technical, etc.).
                Leave blank to match any value.
              </Step>
              <Step number={3} title="Choose an action">
                What should happen when a matching ticket comes in.
              </Step>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Available Actions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-start gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <Bell className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Notify</p>
                    <p className="text-xs text-slate-400">Send alert to Slack or email</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <ArrowUpRight className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Escalate</p>
                    <p className="text-xs text-slate-400">Move to higher support tier</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <UserPlus className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Assign</p>
                    <p className="text-xs text-slate-400">Route to a specific person or team</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <Siren className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Page On-Call</p>
                    <p className="text-xs text-slate-400">Urgent alert via PagerDuty etc.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* A/B Test */}
        <Section icon={FlaskConical} title="A/B Prompt Testing" color="text-purple-400">
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-400 leading-relaxed">
              A/B testing lets you send the same ticket to two different prompt versions and compare the results side by side.
              This helps you decide which version gives better answers.
            </p>

            <Step number={1} title="Enter a ticket">
              Paste a support message or click a sample ticket.
            </Step>
            <Step number={2} title="Pick two versions">
              Choose which prompt versions to compare (e.g., v1 vs v2).
            </Step>
            <Step number={3} title="Run the test">
              Click "Run Test". Both versions process the same ticket simultaneously. Compare priority,
              confidence, speed, cost, and reply quality.
            </Step>

            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mt-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Prompt Versions Explained</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-blue-400 bg-blue-900/40 px-1.5 py-0.5 rounded flex-shrink-0">v1</span>
                  <p className="text-sm text-slate-400"><span className="text-white">Standard</span> - Direct classification. Fast, cheap, good for simple tickets.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-blue-400 bg-blue-900/40 px-1.5 py-0.5 rounded flex-shrink-0">v2</span>
                  <p className="text-sm text-slate-400"><span className="text-white">Chain-of-Thought</span> - AI reasons step by step. More accurate on complex tickets, but slower and uses more tokens.</p>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* How It Works */}
      <div className="h-4" />
      <Section icon={Zap} title="How It Works" color="text-yellow-400">
        <div className="mt-4">
          <p className="text-sm text-slate-400 mb-4">When you submit a ticket, here's what happens behind the scenes:</p>

          {/* Flow - wrapped for mobile */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <FlowStep label="Customer Message" />
            <FlowStep label="Backend API" />
            <FlowStep label="Pick Prompt (v1/v2)" />
            <FlowStep label="Send to AI" />
            <FlowStep label="AI Returns Result" />
            <FlowStep label="Save to Database" />
            <FlowStep label="Check Rules" />
            <FlowStep label="Show Result" last />
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
              <p className="text-sm text-slate-400">Your message goes from the browser to the backend API (FastAPI server).</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
              <p className="text-sm text-slate-400">The backend picks the prompt template (v1 or v2) and sends it to the AI provider (Groq).</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
              <p className="text-sm text-slate-400">If the primary AI fails, it automatically switches to the fallback model (no downtime).</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
              <p className="text-sm text-slate-400">The AI returns a structured JSON result. It's validated, saved to the database, and escalation rules are checked.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">5</div>
              <p className="text-sm text-slate-400">The result is shown in the browser with all the details: category, priority, summary, draft reply, etc.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Key Concepts */}
      <div className="h-4" />
      <Section icon={Info} title="Key Concepts">
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Concept title="Prompt Versions">
            Different sets of instructions for the AI. v1 is simple and fast. v2 tells the AI to think step-by-step,
            which gives more accurate results but takes longer and costs more.
          </Concept>
          <Concept title="Confidence Score">
            A number from 0% to 100% showing how sure the AI is about its classification.
            Above 80% is high confidence (green). Below 60% means the AI is unsure and a human should review it.
          </Concept>
          <Concept title="Fallback Model">
            If the primary AI model goes down or returns errors, the system automatically switches to a backup model.
            This means the service stays available even when one provider has issues.
          </Concept>
          <Concept title="Circuit Breaker">
            If the AI keeps failing repeatedly, the circuit breaker stops sending requests for a while to let it recover.
            Like a fuse in your house - it cuts the connection to prevent damage, then tries again later.
          </Concept>
          <Concept title="Eval System">
            A set of test tickets with known correct answers. Before deploying changes, the system runs these tests
            to make sure the AI is still giving good results. If accuracy drops, the change is blocked.
          </Concept>
          <Concept title="Tokens">
            The units of text the AI processes. More text = more tokens = higher cost.
            Input tokens are what you send, output tokens are what the AI replies.
          </Concept>
        </div>
      </Section>

      {/* Tips */}
      <div className="h-4" />
      <Section icon={Lightbulb} title="Tips & Tricks" color="text-amber-400">
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-slate-400">Click any <span className="text-white">example ticket</span> on the Triage page to quickly test without typing.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-slate-400">In <span className="text-white">Bulk Mode</span>, click example tickets to add them one by one to build a batch.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-slate-400">Use <span className="text-white">A/B Testing</span> before changing the default prompt version to make sure the new one is actually better.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-slate-400">Set up <span className="text-white">Escalation Rules</span> for urgent categories so you never miss a critical ticket.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-slate-400">Check the <span className="text-white">Dashboard</span> regularly to monitor costs and make sure the AI isn't generating too many errors.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-slate-400">Export your history as <span className="text-white">CSV</span> to analyze triage patterns in a spreadsheet.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-slate-400">Use the <span className="text-white">light/dark mode toggle</span> (sun/moon icon) in the navbar for your preferred theme.</p>
          </div>
        </div>
      </Section>

      <div className="mt-8 text-center text-xs text-slate-600">
        LLM Ops Triage Platform v0.1.0
      </div>
    </div>
  );
}
