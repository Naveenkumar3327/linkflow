export interface ShortenResponse {
  short_code: string;
  short_url: string;
  original_url: string;
}

export type StageStatus = 'waiting' | 'running' | 'completed' | 'failed';

export interface TraceStep {
  stage: number;
  name: string;
  title: string;
  status: StageStatus;
  started_at: string;
  duration_ms: number;
  details: Record<string, any>;
  error?: string | null;
}

export interface ShortenTraceResponse {
  success: boolean;
  total_duration_ms: number;
  short_code?: string | null;
  short_url?: string | null;
  original_url: string;
  steps: TraceStep[];
  error?: string | null;
}

export interface HealthResponse {
  status: string;
  database: string;
  database_path: string;
  urls_count: number;
}

export interface HistoryItem {
  id: string;
  short_code: string;
  short_url: string;
  original_url: string;
  created_at: string;
}

export interface RequestInspectorData {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, any>;
}

export interface ResponseInspectorData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  duration_ms: number;
}
