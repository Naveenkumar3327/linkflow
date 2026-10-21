import React from 'react';
import type { StageStatus } from '../types';
import { CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';


interface StatusPillProps {
  status: StageStatus;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-mono';

  switch (status) {
    case 'running':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-400 font-medium ${sizeClasses} shadow-sm shadow-violet-500/20`}>
          <Loader2 className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} animate-spin`} />
          <span>RUNNING</span>
        </span>
      );
    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-medium ${sizeClasses} shadow-sm shadow-emerald-500/20`}>
          <CheckCircle2 className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
          <span>COMPLETED</span>
        </span>
      );
    case 'failed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-400 font-medium ${sizeClasses} shadow-sm shadow-rose-500/20`}>
          <AlertTriangle className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
          <span>FAILED</span>
        </span>
      );
    case 'waiting':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/40 text-slate-400 font-medium ${sizeClasses}`}>
          <Clock className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
          <span>WAITING</span>
        </span>
      );
  }
};
