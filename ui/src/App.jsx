import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';
import Navbar from './components/Navbar';
import TriageDemo from './pages/TriageDemo';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Rules from './pages/Rules';
import ABTest from './pages/ABTest';

export const ThemeContext = createContext({ dark: true, toggle: () => {} });

export default function App() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('theme') !== 'light'; } catch { return true; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark);
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      <BrowserRouter>
        <div className={`min-h-screen ${dark ? 'bg-slate-950' : 'bg-gray-50'}`}>
          <Navbar />
          <Routes>
            <Route path="/" element={<TriageDemo />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/ab-test" element={<ABTest />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}
