import { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquareText, LayoutDashboard, BarChart3, Shield, FlaskConical, Sun, Moon, Menu, X } from 'lucide-react';
import { ThemeContext } from '../App';

function Logo() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#3b82f6" />
      <rect x="7" y="11" width="18" height="13" rx="3.5" fill="#fff" />
      <circle cx="12.5" cy="17.5" r="2.2" fill="#3b82f6" />
      <circle cx="19.5" cy="17.5" r="2.2" fill="#3b82f6" />
      <rect x="13.5" y="21" width="5" height="1.5" rx=".75" fill="#3b82f6" />
      <line x1="16" y1="5" x2="16" y2="11" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="4" r="2.2" fill="#fff" />
      <line x1="4" y1="16" x2="7" y2="16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="16" x2="28" y2="16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ThemeToggle() {
  const { dark, toggle } = useContext(ThemeContext);
  return (
    <button
      onClick={toggle}
      className="ml-2 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

const NAV_LINKS = [
  { to: '/', icon: MessageSquareText, label: 'Triage' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/rules', icon: Shield, label: 'Rules' },
  { to: '/ab-test', icon: FlaskConical, label: 'A/B Test' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-400 hover:text-white hover:bg-slate-700'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
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

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
            <ThemeToggle />
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-700 bg-slate-900 px-4 py-3 space-y-1 animate-slide-down">
          {NAV_LINKS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={mobileLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
