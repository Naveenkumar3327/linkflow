import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Radio, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Database, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  AlertCircle
} from 'lucide-react';
import type { TraceStep } from '../types';
import { StatusPill } from './StatusPill';


interface StageCardProps {
  step: TraceStep;
  index: number;
}

export const StageCard: React.FC<StageCardProps> = ({ step, index }) => {
  const [expanded, setExpanded] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const getStageIcon = () => {
    switch (step.stage) {
      case 1:
        return <Radio className="w-5 h-5 text-violet-400" />;
      case 2:
        return step.status === 'failed' ? (
          <ShieldAlert className="w-5 h-5 text-rose-400" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
        );
      case 3:
        return <KeyRound className="w-5 h-5 text-amber-400" />;
      case 4:
        return <Database className="w-5 h-5 text-emerald-400" />;
      case 5:
        return <Send className="w-5 h-5 text-indigo-400" />;
      default:
        return <Radio className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStageBorderClass = () => {
    if (step.status === 'running') return 'border-violet-500/60 bg-[#111728] shadow-lg shadow-violet-500/10';
    if (step.status === 'failed') return 'border-rose-500/60 bg-[#190F16] shadow-lg shadow-rose-500/10';
    if (step.status === 'completed') return 'border-slate-800 bg-[#0E1424] hover:border-slate-700/80';
    return 'border-slate-800/60 bg-[#0A0E18]/60 opacity-80';
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={`rounded-xl border p-4 transition-all duration-200 ${getStageBorderClass()}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Stage Header Info */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
            {getStageIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-violet-400 tracking-wider">
                STAGE {step.stage}
              </span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-[11px] text-slate-400">
                {step.name}
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              {step.title}
            </h3>
          </div>
        </div>

        {/* Status Pill & Timing */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {step.duration_ms > 0 && (
            <span className="text-xs font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              {step.duration_ms} ms
            </span>
          )}
          <StatusPill status={step.status} />
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Details */}
      {expanded && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 text-xs text-slate-300 space-y-2.5">
          {/* Failure Alert */}
          {step.status === 'failed' && step.error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-200 font-mono text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-300">Failure Reason: </span>
                <span>{step.error}</span>
              </div>
            </div>
          )}

          {/* Stage 1: Request Received specifics */}
          {step.stage === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 font-mono">
                <span className="text-slate-400 block mb-1">HTTP Method &amp; Route:</span>
                <span className="text-violet-300 font-bold">{step.details?.http_method || 'POST'}</span>{' '}
                <span className="text-slate-200">{step.details?.endpoint || '/api/shorten'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 font-mono truncate">
                <span className="text-slate-400 block mb-1">Submitted URL:</span>
                <span className="text-cyan-300">{step.details?.raw_payload?.url || '—'}</span>
              </div>
            </div>
          )}

          {/* Stage 2: URL Validation specifics */}
          {step.stage === 2 && (
            <div className="space-y-2">
              <p className="text-slate-400 leading-relaxed text-[11px]">
                The backend inspects the payload using strict RFC-3986 URL parsing and Pydantic schema validation. Only supported <code className="text-violet-300">http</code> and <code className="text-violet-300">https</code> protocols with a valid network location (host) are accepted.
              </p>
              {step.details && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Scheme:</span>
                    <span className={step.details.scheme ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                      {step.details.scheme || 'none'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Host / Netloc:</span>
                    <span className="text-slate-200 truncate block">
                      {step.details.host || 'none'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Validation:</span>
                    <span className={step.status === 'completed' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {step.details.validation_outcome || (step.status === 'completed' ? 'PASSED' : 'FAILED')}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Security:</span>
                    <span className="text-slate-300 truncate block">
                      {step.details.security_check || 'Standard'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 3: Code Generation specifics */}
          {step.stage === 3 && (
            <div className="space-y-2">
              <p className="text-slate-400 leading-relaxed text-[11px]">
                The service draws from Python's cryptographically secure <code className="text-violet-300">secrets</code> library across 62 URL-safe alphanumeric characters (<code className="text-slate-300">[a-zA-Z0-9]</code>) with automatic collision retries against database unique constraints.
              </p>
              {step.details?.generated_code && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/90 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono">Generated Short Code:</span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/40 text-sm">
                      {step.details.generated_code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(step.details.generated_code)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
              )}
              {step.details && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Length:</span>
                    <span className="text-slate-200">{step.details.code_length || 6} characters</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Entropy:</span>
                    <span className="text-cyan-300">{step.details.entropy_bits || 35.7} bits</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Collision Attempts:</span>
                    <span className="text-emerald-400 font-semibold">{step.details.collision_attempts || 1}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 4: SQLite Persistence specifics */}
          {step.stage === 4 && (
            <div className="space-y-2">
              <p className="text-slate-400 leading-relaxed text-[11px]">
                The mapping is stored via parameterized SQL (<code className="text-violet-300">INSERT INTO urls (short_code, original_url) VALUES (?, ?)</code>) within an ACID transaction into SQLite. The indexed unique column prevents duplicates and persists across app restarts.
              </p>
              {step.details && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Target DB:</span>
                    <span className="text-slate-200">{step.details.database_file || 'data/urls.db'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Row ID:</span>
                    <span className="text-cyan-300 font-bold">{step.details.row_id || '—'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Transaction:</span>
                    <span className="text-emerald-400 font-bold">{step.details.transaction_status || 'COMMITTED'}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block">Created At:</span>
                    <span className="text-slate-300 truncate block">{step.details.created_at || 'Recorded'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 5: Response specifics */}
          {step.stage === 5 && (
            <div className="space-y-2">
              <p className="text-slate-400 leading-relaxed text-[11px]">
                The API compiles the short URL with the active base URL host and returns an HTTP 201 Created payload to the client.
              </p>
              {step.details?.short_url && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/90 border border-violet-500/40">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-slate-400 font-mono">Short URL:</span>
                    <a
                      href={step.details.short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-semibold text-violet-300 hover:text-cyan-300 underline underline-offset-2 truncate"
                    >
                      {step.details.short_url}
                    </a>
                  </div>
                  <button
                    onClick={() => handleCopy(step.details.short_url)}
                    className="flex items-center gap-1.5 text-xs text-violet-300 hover:text-white px-2 py-1 rounded bg-violet-600/30 hover:bg-violet-600/50 transition-colors cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
