import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  GitBranch, 
  Database, 
  ExternalLink, 
  X, 
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { fetchHealth, API_BASE } from '../api';
import type { HealthResponse } from '../types';


interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const data = await fetchHealth();
        if (mounted) {
          setHealth(data);
          setHealthError(false);
        }
      } catch {
        if (mounted) {
          setHealthError(true);
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  const navItems = [
    {
      to: '/',
      label: 'Home',
      description: 'Create short URLs',
      icon: Home,
      accent: 'violet',
    },
    {
      to: '/how-it-works',
      label: 'How It Works',
      description: 'Live execution visualizer',
      icon: GitBranch,
      accent: 'cyan',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0D121F] border-r border-slate-800/80 text-slate-300">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <NavLink 
          to="/" 
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 group"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 shadow-md shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
            <LinkIcon className="w-5 h-5 text-white transform -rotate-45" />
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 opacity-0 group-hover:opacity-30 blur transition-opacity" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white font-sans">
                LinkFlow
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded font-mono font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                STUDIO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Understand. Visualize.</p>
          </div>
        </NavLink>

        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase font-mono">
          Workspace Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-all group relative
                ${
                  isActive
                    ? item.accent === 'violet'
                      ? 'bg-violet-950/40 text-violet-200 border border-violet-500/40 shadow-sm shadow-violet-500/10'
                      : 'bg-cyan-950/40 text-cyan-200 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`
                    p-1.5 rounded-md transition-colors
                    ${isActive 
                      ? item.accent === 'violet' ? 'bg-violet-600/30 text-violet-300' : 'bg-cyan-600/30 text-cyan-300'
                      : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-300'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="font-semibold text-sm leading-tight text-slate-100">{item.label}</span>
                    <span className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5">{item.description}</span>
                  </div>

                  {isActive && (
                    <span className={`w-1.5 h-6 rounded-full absolute right-2 ${item.accent === 'violet' ? 'bg-violet-500' : 'bg-cyan-400'}`} />
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* Feature Highlight Pill */}
        <div className="mt-8 mx-2 p-3.5 rounded-xl border border-slate-800/90 bg-gradient-to-b from-[#131B2E] to-[#0E1526] text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Tracing</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Execute live URL shortening requests to inspect request schemas, collision detection, and SQLite ACID writes.
          </p>
        </div>
      </div>

      {/* Bottom Status & Links */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0A0E18]">
        {/* Backend Connection Status */}
        <div className="p-2.5 rounded-lg border border-slate-800 bg-[#0E1424] text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              SQLite Backend
            </span>
            {healthError ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Records:</span>
            <span className="font-semibold text-slate-200">
              {health ? health.urls_count : healthError ? 'N/A' : '...'} links
            </span>
          </div>
        </div>

        {/* API Docs & Version */}
        <div className="flex items-center justify-between pt-1">
          <a
            href={API_BASE ? `${API_BASE}/docs` : "/docs"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
            id="sidebar-api-docs"
          >
            <span>API Docs (/docs)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
            v1.0
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-col fixed inset-y-0 left-0 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Content */}
      <div
        className={`fixed inset-y-0 left-0 w-72 z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
