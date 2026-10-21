import React, { useState, useEffect } from 'react';
import { 
  Link as LinkIcon, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Database, 
  Clock, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { shortenUrl } from '../api';
import type { ShortenResponse, HistoryItem } from '../types';
import { useToast } from '../components/Toast';


const STORAGE_KEY = 'https://github.com/Naveenkumar3327/linkflow.githttps://github.com/Naveenkumar3327/linkflow.git_session_history';

export const HomePage: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortenResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { showToast } = useToast();

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // ignore storage errors
    }
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      setError('Please enter a destination URL.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await shortenUrl(inputUrl.trim());
      setResult(data);
      showToast('Short URL created successfully!', 'success');

      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        short_code: data.short_code,
        short_url: data.short_url,
        original_url: data.original_url,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setHistory((prev) => [newItem, ...prev.filter((item) => item.short_code !== data.short_code)].slice(0, 8));
    } catch (err: any) {
      const msg = err.message || 'Failed to shorten URL. Check network or server status.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputUrl('');
    setError(null);
    setResult(null);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast('Copied short URL to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Page Header with Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
          <span>Workspace</span>
          <span>/</span>
          <span className="text-violet-400 font-semibold">Home</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              URL Shortener
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Convert long URLs into clean, shareable links backed by persistent SQLite storage.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SQLite Active</span>
          </div>
        </div>
      </div>

      {/* Main Input Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0E1424] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <label htmlFor="url-input" className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
              <LinkIcon className="w-3.5 h-3.5 text-violet-400" />
              <span>Enter your destination URL</span>
            </label>
            {inputUrl && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                id="url-input"
                type="text"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="https://example.com/your/long/url"
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700/80 bg-[#070B13] text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 font-mono transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputUrl.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-md shadow-violet-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Short URL</span>
                </>
              )}
            </button>
          </div>

          {/* Validation Error Banner */}
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/70 text-rose-200 text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-300">Validation Error: </span>
                <span>{error}</span>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Generated Result Card */}
      {result && (
        <div className="rounded-2xl border border-emerald-500/30 bg-[#0F1A28] p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Check className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Short URL Created</h3>
                <p className="text-xs text-slate-400">Mapping safely persisted to SQLite</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                Code: {result.short_code}
              </span>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                HTTP 201 Created
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#070B13] border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <LinkIcon className="w-5 h-5 text-violet-400 shrink-0" />
              <a
                href={result.short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-base font-bold text-violet-300 hover:text-cyan-300 underline underline-offset-4 truncate"
                id="generated-short-url"
              >
                {result.short_url}
              </a>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyLink(result.short_url)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer border border-slate-700/60"
                id="copy-short-url-btn"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
              <a
                href={result.short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
                id="open-short-url-btn"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Link</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 font-mono pt-1">
            <div className="truncate">
              <span className="text-slate-400">Destination: </span>
              <span className="text-slate-300">{result.original_url}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Table `urls` • Indexed</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity (Session-Local History) */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C101C] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">Recent Session Creations</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            Session-Local History
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <p>No URLs created during this browser session yet.</p>
            <p className="mt-1 text-slate-400">Shorten a URL above to see your session history appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {history.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-violet-300">{item.short_url}</span>
                    <span className="text-slate-400">•</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px]">
                      {item.short_code}
                    </span>
                  </div>
                  <p className="text-slate-400 font-mono truncate text-[11px] max-w-lg">
                    {item.original_url}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 mr-2">{item.created_at}</span>
                  <button
                    onClick={() => handleCopyLink(item.short_url)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy short link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={item.short_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Open short link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
