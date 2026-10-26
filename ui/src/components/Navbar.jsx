import { NavLink } from 'react-router-dom';
import { MessageSquareText, LayoutDashboard } from 'lucide-react';

function Logo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="url(#grad)" />
      <path d="M10 18.5C10 14.5 13 11 18 11C23 11 26 14.5 26 18.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="14" cy="18" r="1.8" fill="white" />
      <circle cx="22" cy="18" r="1.8" fill="white" />
      <path d="M13 23C14 24.5 16 25.5 18 25.5C20 25.5 22 24.5 23 23" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M8 14L10.5 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 14L25.5 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 8V11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="36" y2="36">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-400 hover:text-white hover:bg-slate-700'
    }`;

  return (
    <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-tight leading-tight">
                LLM Ops
              </span>
              <span className="text-[10px] text-slate-500 tracking-wider uppercase">
                Triage Platform
              </span>
            </div>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 ml-1">
              v0.1.0
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/" className={linkClass}>
              <MessageSquareText className="w-4 h-4" />
              Triage Demo
            </NavLink>
            <NavLink to="/dashboard" className={linkClass}>
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
