import { useState } from 'react';
import {
  BookOpen, MessageSquareText, LayoutDashboard, BarChart3, Shield, FlaskConical,
  ChevronDown, ChevronUp, Zap, CheckCircle2,
} from 'lucide-react';

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
          <span className="text-base font-semibold text-gray-900 dark:text-white">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-slate-500" /> : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-200 dark:border-slate-700">{children}</div>}
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
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{title}</p>
        <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
      <span className="text-sm text-gray-700 dark:text-slate-300">{children}</span>
    </li>
  );
}

export default function Manual() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="w-7 h-7 text-blue-500 dark:text-blue-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manual</h1>
      </div>
      <p className="text-gray-500 dark:text-slate-400 mb-8">
        A simple guide to everything this app can do.
      </p>

      {/* What is this app */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">What is this app?</h2>
        <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
          Customers send support messages like "I was charged twice" or "My order is late."
          This app uses AI to instantly sort each message — it figures out what it's about, how urgent it is,
          and even writes a reply for you. Think of it as a super-fast helper that reads every message
          and organizes it in seconds, so humans can focus on solving problems instead of sorting them.
        </p>
      </div>

      {/* Quick Start */}
      <Section icon={Zap} title="Quick Start" defaultOpen={true}>
        <Step number={1} title="Go to the Triage page">
          Click "Triage" in the menu bar at the top.
        </Step>
        <Step number={2} title="Enter a message">
          Type a customer message in the text box, or click one of the example messages to try it out.
        </Step>
        <Step number={3} title="Click Triage">
          Press the blue "Triage" button. The AI will show you the category, priority, a summary, and a suggested reply.
        </Step>
      </Section>

      <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-3 mt-8">Features</p>

      <div className="space-y-3">
        <Section icon={MessageSquareText} title="Triage">
          <ul className="mt-3 space-y-2">
            <Bullet>Paste a message and get an instant classification — category, priority, severity, confidence score, and a draft reply.</Bullet>
            <Bullet>Use <strong>Bulk mode</strong> to process many messages at once (up to 50). Click any result to see full details.</Bullet>
            <Bullet>Switch <strong>prompt versions</strong> (v1 = fast, v2 = more accurate) using the dropdown at the top right.</Bullet>
            <Bullet>Give thumbs up/down feedback, and export your history as CSV or JSON.</Bullet>
          </ul>
        </Section>

        <Section icon={LayoutDashboard} title="Dashboard">
          <ul className="mt-3 space-y-2">
            <Bullet>See if the system is healthy and ready (green = good, red = problem).</Bullet>
            <Bullet>View key numbers: total requests, errors, cost, tokens used, and fallback usage.</Bullet>
            <Bullet>Charts show response speed over time, which AI models are being used, and error breakdowns.</Bullet>
            <Bullet>Turn on <strong>Live</strong> mode to auto-refresh every 5 seconds.</Bullet>
          </ul>
        </Section>

        <Section icon={BarChart3} title="Analytics">
          <ul className="mt-3 space-y-2">
            <Bullet>See how many tickets are triaged each day and what categories they fall into.</Bullet>
            <Bullet>Check speed stats (P50, P95 latency) and cost per ticket.</Bullet>
            <Bullet>View priority, severity, and confidence distributions across all tickets.</Bullet>
            <Bullet>See feedback summary — how many thumbs up vs thumbs down.</Bullet>
          </ul>
        </Section>

        <Section icon={Shield} title="Escalation Rules">
          <ul className="mt-3 space-y-2">
            <Bullet>Create rules like: "If a ticket is urgent AND about billing, alert the billing team."</Bullet>
            <Bullet>Four actions: <strong>Notify</strong> (send alert), <strong>Escalate</strong> (move to higher tier), <strong>Assign</strong> (route to a person), <strong>Page On-Call</strong> (urgent alert).</Bullet>
            <Bullet>Toggle rules on/off anytime without deleting them.</Bullet>
          </ul>
        </Section>

        <Section icon={FlaskConical} title="A/B Testing">
          <ul className="mt-3 space-y-2">
            <Bullet>Send the same message to two different prompt versions and compare results side by side.</Bullet>
            <Bullet>See which version is more confident, faster, or cheaper.</Bullet>
            <Bullet>Helps you decide which prompt version to use as your default.</Bullet>
          </ul>
        </Section>
      </div>

      <div className="mt-10 text-center text-xs text-gray-400 dark:text-slate-600">
        LLM Ops Triage Platform v0.1.0
      </div>
    </div>
  );
}
