export interface ParsedRow {
  [key: string]: unknown;
}

export interface KakaoMessage {
  id: number;
  date: string;
  user: string;
  message: string;
}

export interface SearchHit {
  id: number;
  date: string;
  user: string;
  message: string;
}

export interface LoadResult {
  messageCount: number;
  users: string[];
  firstRows: SearchHit[];
  total: number;
  tookMs: number;
}

export interface SearchPayload {
  rows: SearchHit[];
  total: number;
  tookMs: number;
}

export interface SearchOptions {
  query: string;
  userFilter?: string;
  limit: number;
}
