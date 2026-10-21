import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  Layers, 
  Code2, 
  CheckCircle2, 
  AlertCircle, 
  Terminal
} from 'lucide-react';
import { executeTraceWorkflow } from '../api';
import type { 
  TraceStep, 
  ShortenTraceResponse, 
  RequestInspectorData, 
  ResponseInspectorData 
} from '../types';
import { StageCard } from '../components/StageCard';
import { RedirectFlowCard } from '../components/RedirectFlowCard';
import { JsonViewer } from '../components/JsonViewer';
import { useToast } from '../components/Toast';


const INITIAL_STAGES: TraceStep[] = [
  {
    stage: 1,
    name: 'REQUEST_RECEIVED',
    title: 'Request Received',
    status: 'waiting',
    started_at: '',
    duration_ms: 0,
    details: {
      http_method: 'POST',
      endpoint: '/api/shorten',
      protocol: 'HTTP/1.1',
    },
  },
  {
    stage: 2,
    name: 'URL_VALIDATION',
    title: 'URL Validation',
    status: 'waiting',
    started_at: '',
    duration_ms: 0,
    details: {
      allowed_schemes: ['http', 'https'],
      validation_rules: ['Non-empty', 'Valid host netloc', 'Pydantic schema check'],
    },
  },
  {
    stage: 3,
    name: 'CODE_GENERATION',
    title: 'Short-Code Generation',
    status: 'waiting',
    started_at: '',
    duration_ms: 0,
    details: {
      charset: '62 alphanumeric characters [a-zA-Z0-9]',
      default_length: 6,
      entropy: '~35.7 bits',
    },
  },
  {
    stage: 4,
    name: 'SQLITE_PERSISTENCE',
    title: 'SQLite Persistence',
    status: 'waiting',
    started_at: '',
    duration_ms: 0,
    details: {
      target_db: 'data/urls.db',
      table: 'urls',
      acid_guarantee: 'ACID Transaction Commit',
    },
  },
  {
    stage: 5,
    name: 'SHORT_URL_RESPONSE',
    title: 'Short URL Response',
    status: 'waiting',
    started_at: '',
    duration_ms: 0,
    details: {
      expected_status: '201 Created',
      response_schema: ['short_code', 'short_url', 'original_url'],
    },
  },
];

export const HowItWorksPage: React.FC = () => {
  const [destinationUrl, setDestinationUrl] = useState('https://fastapi.tiangolo.com/tutorial/');
  const [isExecuting, setIsExecuting] = useState(false);
  const [stages, setStages] = useState<TraceStep[]>(INITIAL_STAGES);
  const [executionResult, setExecutionResult] = useState<ShortenTraceResponse | null>(null);
  const [reqInspector, setReqInspector] = useState<RequestInspectorData | null>(null);
  const [respInspector, setRespInspector] = useState<ResponseInspectorData | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('response');

  const { showToast } = useToast();

  const handlePresetSelect = (presetUrl: string) => {
    setDestinationUrl(presetUrl);
  };

  const handleReset = () => {
    setStages(INITIAL_STAGES);
    setExecutionResult(null);
    setReqInspector(null);
    setRespInspector(null);
    setIsExecuting(false);
    showToast('Workflow visualizer reset to waiting state', 'info');
  };

  const handleExecute = async () => {
    if (!destinationUrl.trim()) {
      showToast('Please enter a destination URL to execute workflow.', 'error');
      return;
    }

    // 1. Clear previous execution result
    setExecutionResult(null);
    setIsExecuting(true);

    // 2. Set all stages to waiting, stage 1 to running
    setStages(
      INITIAL_STAGES.map((s, idx) => ({
        ...s,
        status: idx === 0 ? 'running' : 'waiting',
      }))
    );

    try {
      // 3. Send real POST request to backend trace endpoint
      const result = await executeTraceWorkflow(destinationUrl.trim());

      setReqInspector(result.requestInspector);
      setRespInspector(result.responseInspector);
      setExecutionResult(result.trace);

      // 4. Update stages with actual data returned by the backend service
      if (result.trace && Array.isArray(result.trace.steps)) {
        setStages(result.trace.steps);
      }

      if (result.trace.success) {
        showToast(`Workflow executed in ${result.trace.total_duration_ms}ms!`, 'success');
      } else {
        showToast(`Validation failed: ${result.trace.error || 'Invalid URL input'}`, 'error');
      }
    } catch (err: any) {
      if (err.requestInspector) setReqInspector(err.requestInspector);
      if (err.responseInspector) setRespInspector(err.responseInspector);

      setStages((prev) =>
        prev.map((s, idx) =>
          idx === 0
            ? { ...s, status: 'failed', error: err.message || 'Network connection failed' }
            : { ...s, status: 'waiting' }
        )
      );
      showToast(err.message || 'Execution error occurred', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
          <span>Workspace</span>
          <span>/</span>
          <span className="text-cyan-400 font-semibold">How It Works</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>How URL Shortening Works</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Execute a real request and inspect how the URL Shortener backend validates, generates, stores, and resolves a shortened link.
            </p>
          </div>

          {/* Live Execution Indicator */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {isExecuting ? (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/50 bg-violet-500/20 text-violet-300 text-xs font-mono font-bold animate-pulse shadow-md shadow-violet-500/30">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
                <span>LIVE EXECUTION RUNNING</span>
              </span>
            ) : executionResult ? (
              <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold ${
                executionResult.success
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
              }`}>
                {executionResult.success ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>LIFECYCLE COMPLETED ({executionResult.total_duration_ms} ms)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>HALTED ON VALIDATION FAILURE</span>
                  </>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800/80 text-slate-400 text-xs font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>STANDBY • READY TO EXECUTE</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* URL Input Panel */}
      <div className="rounded-2xl border border-slate-800 bg-[#0E1526] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <label htmlFor="trace-url-input" className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Destination URL (Backend Input)</span>
          </label>

          {/* Quick presets for developers */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
            <span className="text-slate-400 mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => handlePresetSelect('https://github.com/fastapi/fastapi')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors cursor-pointer"
            >
              Standard URL
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('https://httpbin.org/get?user=developer&role=admin')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-violet-300 transition-colors cursor-pointer"
            >
              Query Params
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('ftp://ftp.example.com/file.zip')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 transition-colors cursor-pointer"
            >
              Invalid Scheme (FTP)
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('not-a-valid-http-url')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 transition-colors cursor-pointer"
            >
              Malformed
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            id="trace-url-input"
            type="text"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://example.com/products"
            disabled={isExecuting}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-700/80 bg-[#070B13] text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 font-mono transition-all"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleExecute}
              disabled={isExecuting || !destinationUrl.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-semibold text-sm shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              id="execute-workflow-btn"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isExecuting ? 'Executing...' : 'Execute Workflow'}</span>
            </button>
            <button
              onClick={handleReset}
              disabled={isExecuting}
              className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              title="Reset Execution State"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5-Stage Backend Workflow Visualization */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <h2 className="text-base font-bold text-slate-100">Backend Execution Pipeline</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            5 Stages • Real SQLite &amp; Service Execution
          </span>
        </div>

        <div className="space-y-3">
          {stages.map((step, idx) => (
            <StageCard key={step.stage} step={step} index={idx} />
          ))}
        </div>
      </div>

      {/* Developer Request & Response Inspector */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C111E] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">Request &amp; Response Inspector</h2>
          </div>

          {/* Inspector Tabs */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => setActiveTab('request')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === 'request'
                  ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Request Inspector
            </button>
            <button
              onClick={() => setActiveTab('response')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === 'response'
                  ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Response Inspector
            </button>
          </div>
        </div>

        {/* Tab 1: Request Tab */}
        {activeTab === 'request' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold border border-violet-500/40">
                {reqInspector?.method || 'POST'}
              </span>
              <span className="text-slate-300">{reqInspector?.url || '/api/shorten/trace'}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-400">Content-Type: application/json</span>
            </div>

            <div>
              <span className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase tracking-wider">
                Request Payload (JSON)
              </span>
              <JsonViewer
                data={reqInspector?.body || { url: destinationUrl }}
                title="Client Request Body"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Response Tab */}
        {activeTab === 'response' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded font-bold border ${
                  respInspector?.status === 201
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : respInspector?.status === 422
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  HTTP {respInspector?.status || (executionResult ? (executionResult.success ? 201 : 422) : 200)} {respInspector?.statusText}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">Content-Type: application/json</span>
              </div>
              {respInspector?.duration_ms ? (
                <span className="text-cyan-400 font-semibold">
                  Roundtrip: {respInspector.duration_ms} ms
                </span>
              ) : null}
            </div>

            <div>
              <span className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase tracking-wider">
                Backend Response Payload (Real FastAPI Execution Trace)
              </span>
              <JsonViewer
                data={respInspector?.body || executionResult || { status: 'waiting_execution', message: 'Click Execute Workflow to inspect live backend response' }}
                title="Server Response Body"
              />
            </div>
          </div>
        )}
      </div>

      {/* Secondary Redirect Lifecycle Workflow */}
      <RedirectFlowCard
        shortCode={executionResult?.short_code}
        shortUrl={executionResult?.short_url}
        originalUrl={executionResult?.original_url}
      />
    </div>
  );
};
