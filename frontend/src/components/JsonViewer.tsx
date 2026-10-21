import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  title?: string;
  maxHeight?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, title, maxHeight = 'max-h-72' }) => {
  const [copied, setCopied] = useState(false);

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg border border-slate-800 bg-[#070A10] overflow-hidden text-xs font-mono">
      {title && (
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-3 py-2 text-slate-400">
          <span className="font-semibold text-slate-300">{title}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
            title="Copy JSON"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {!title && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded bg-slate-800/80 px-2 py-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors cursor-pointer shadow-md"
          title="Copy JSON"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      )}

      <pre className={`p-4 overflow-auto text-slate-300 leading-relaxed ${maxHeight}`}>
        <code>{jsonString}</code>
      </pre>
    </div>
  );
};
