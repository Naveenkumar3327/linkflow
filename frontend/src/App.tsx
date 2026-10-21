import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Menu, Link as LinkIcon } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { ToastProvider } from './components/Toast';

export function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col md:flex-row bg-dev-grid">
          {/* Persistent Sidebar (Desktop & Mobile Drawer) */}
          <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

          {/* Mobile Top Header */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0D121F] border-b border-slate-800/80 sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 shadow-sm">
                <LinkIcon className="w-4 h-4 text-white transform -rotate-45" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white font-sans">
                LinkFlow Studio
              </span>
            </div>
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </header>

          {/* Main Workspace Viewport */}
          <main className="flex-1 md:pl-64 lg:pl-72 flex flex-col min-h-screen">
            <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>

            {/* Global Workspace Footer */}
            <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-400 font-mono">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-5xl mx-auto">
                <span>LinkFlow Studio • Understand Every Link. Visualize Every Step.</span>
                <span className="text-slate-400">FastAPI + SQLite + React</span>
              </div>
            </footer>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
