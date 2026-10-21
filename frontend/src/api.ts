import type { HealthResponse, ShortenResponse, ShortenTraceResponse, RequestInspectorData, ResponseInspectorData } from './types';

// Read configurable API base URL from VITE_API_BASE_URL (defaults to empty string for Vite proxy / same-origin)
const envApiBase = import.meta.env.VITE_API_BASE_URL;
export const API_BASE: string =
  typeof envApiBase === 'string' && envApiBase.trim() !== ''
    ? envApiBase.trim().replace(/\/+$/, '')
    : '';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with HTTP ${res.status}`);
  }
  return res.json();
}

export async function shortenUrl(url: string): Promise<ShortenResponse> {
  const res = await fetch(`${API_BASE}/api/shorten`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.detail || 'Failed to shorten URL';
    throw new Error(errorMsg);
  }
  return data;
}

export interface TraceExecutionResult {
  trace: ShortenTraceResponse;
  requestInspector: RequestInspectorData;
  responseInspector: ResponseInspectorData;
}

export async function executeTraceWorkflow(url: string): Promise<TraceExecutionResult> {
  const endpoint = `${API_BASE}/api/shorten/trace`;
  const reqBody = { url };
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const reqInspector: RequestInspectorData = {
    method: 'POST',
    url: API_BASE ? `${API_BASE}/api/shorten/trace` : '/api/shorten/trace',
    headers: reqHeaders,
    body: reqBody,
  };

  const t0 = performance.now();
  let res: Response;
  let resData: any = null;

  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(reqBody),
    });
  } catch (networkErr: any) {
    const elapsed = performance.now() - t0;
    const respInspector: ResponseInspectorData = {
      status: 0,
      statusText: 'Network Error',
      headers: {},
      body: { error: networkErr.message || 'Network connection failed' },
      duration_ms: Math.round(elapsed),
    };
    throw {
      networkError: true,
      message: networkErr.message || 'Cannot reach backend server',
      requestInspector: reqInspector,
      responseInspector: respInspector,
    };
  }

  const elapsed = performance.now() - t0;
  const resHeadersObj: Record<string, string> = {};
  res.headers.forEach((val, key) => {
    resHeadersObj[key] = val;
  });

  try {
    resData = await res.json();
  } catch {
    resData = { raw: await res.text() };
  }

  const respInspector: ResponseInspectorData = {
    status: res.status,
    statusText: res.statusText || (res.status === 201 ? 'Created' : res.status === 422 ? 'Unprocessable Entity' : ''),
    headers: resHeadersObj,
    body: resData,
    duration_ms: Math.round(elapsed),
  };

  return {
    trace: resData as ShortenTraceResponse,
    requestInspector: reqInspector,
    responseInspector: respInspector,
  };
}
