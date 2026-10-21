import React, { useState } from 'react';
import { 
  Globe, 
  ArrowRight, 
  Database, 
  CornerDownRight, 
  ExternalLink, 
  AlertTriangle,
  Play
} from 'lucide-react';
import { API_BASE } from '../api';

interface RedirectFlowCardProps {
  shortCode?: string | null;
  shortUrl?: string | null;
  originalUrl?: string | null;
}

export const RedirectFlowCard: React.FC<RedirectFlowCardProps> = ({
  shortCode,
  shortUrl,
  originalUrl,
}) => {
  const [test404Result, setTest404Result] = useState<{ status: number; detail: string } | null>(null);
  const [testing404, setTesting404] = useState(false);


  const handleTest404 = async () => {
    setTesting404(true);
    setTest404Result(null);
    try {
      const testCode = 'nonExistentCode99';
      const targetUrl = API_BASE ? `${API_BASE}/${testCode}` : `/${testCode}`;
      const res = await fetch(targetUrl);
      const data = await res.json().catch(() => ({ detail: 'Unknown response' }));
      setTest404Result({
        status: res.status,
        detail: data?.detail || 'Short code not found',
      });
    } catch (err: any) {
      setTest404Result({
        status: 404,
        detail: err.message || 'Route not found in database',
      });
    } finally {
      setTesting404(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0E1524] p-5 space-y-4">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold block mb-0.5">
            Secondary Resolution Lifecycle
          </span>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>How Redirection Works: Resolution &amp; 302 Handshake</span>
          </h3>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 self-start sm:self-auto">
          GET /{shortCode || '{code}'}
        </span>
      </div>

      {/* Visual Pipeline Diagram */}
      <div className="p-3.5 rounded-lg bg-[#070B13] border border-slate-800/90 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[550px] gap-2 text-xs font-mono">
          {/* Node 1: Browser */}
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded bg-slate-900 border border-slate-800 text-center flex-1">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-200">Browser</span>
            <span className="text-[10px] text-slate-400">User visits link</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

          {/* Node 2: Route */}
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded bg-slate-900 border border-slate-800 text-center flex-1">
            <span className="font-bold text-violet-400">GET /{shortCode || '{code}'}</span>
            <span className="text-slate-200">FastAPI Route</span>
            <span className="text-[10px] text-slate-400">Resolves shortcode</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

          {/* Node 3: SQLite */}
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded bg-slate-900 border border-slate-800 text-center flex-1">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">SQLite Lookup</span>
            <span className="text-[10px] text-slate-400">Indexed SELECT query</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

          {/* Node 4: 302 Redirect */}
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded bg-slate-900 border border-slate-800 text-center flex-1">
            <CornerDownRight className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-300">HTTP 302 Found</span>
            <span className="text-[10px] text-slate-400">Location header set</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

          {/* Node 5: Destination */}
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded bg-slate-900 border border-slate-800 text-center flex-1">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-200">Destination</span>
            <span className="text-[10px] text-slate-400">Browser arrives</span>
          </div>
        </div>
      </div>

      {/* Explanation text */}
      <p className="text-xs text-slate-400 leading-relaxed">
        When an incoming request reaches <code className="text-violet-300 font-mono">GET /{'{code}'}</code>, the FastAPI backend queries SQLite using an indexed case-sensitive lookup. If a match exists, the backend sends an <strong className="text-slate-200 font-mono">HTTP 302 Found</strong> redirect response pointing directly to the stored URL. If no record matches the code, an <strong className="text-rose-400 font-mono">HTTP 404 Not Found</strong> is returned.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Real Redirect Test */}
        <div className="flex items-center gap-3">
          {shortUrl ? (
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-violet-500/20 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test Redirect (Opens Generated Link)</span>
            </a>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 font-medium text-xs cursor-not-allowed border border-slate-700/50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test Redirect (Execute workflow first)</span>
            </button>
          )}

          {shortCode && (
            <span className="text-xs font-mono text-slate-400">
              Code: <strong className="text-amber-300">{shortCode}</strong>
            </span>
          )}
          {originalUrl && (
            <span className="text-xs font-mono text-slate-400 truncate max-w-xs hidden lg:inline">
              → <span className="text-slate-300">{originalUrl}</span>
            </span>
          )}
        </div>


        {/* 404 Resolution Test */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTest404}
            disabled={testing404}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
          >
            <Play className="w-3 h-3 text-cyan-400" />
            <span>{testing404 ? 'Testing...' : 'Test 404 Resolution'}</span>
          </button>
        </div>
      </div>

      {/* 404 Test Result Output */}
      {test404Result && (
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>HTTP {test404Result.status}: {test404Result.detail}</span>
          </div>
          <span className="text-[11px] text-slate-400">Code: nonExistentCode99</span>
        </div>
      )}
    </div>
  );
};
