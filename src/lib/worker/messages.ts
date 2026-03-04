import { SearchHit, SearchOptions } from "../indexer/types";

export type WorkerRequest = LoadCsvRequest | SearchRequest;

export interface LoadCsvRequest {
  type: "LOAD_CSV";
  payload: {
    file: File;
  };
}

export interface SearchRequest {
  type: "SEARCH";
  payload: SearchOptions;
}

export interface LoadCsvResponse {
  type: "LOADED";
  payload: {
    messageCount: number;
    users: string[];
    firstRows: SearchHit[];
    total: number;
    tookMs: number;
  };
}

export interface SearchResponse {
  type: "SEARCH_RESULT";
  payload: {
    query: string;
    userFilter?: string;
    result: SearchHit[];
    total: number;
    tookMs: number;
  };
}

export interface WorkerErrorResponse {
  type: "ERROR";
  payload: {
    requestType: WorkerRequest["type"];
    message: string;
  };
}

export type WorkerResponse = LoadCsvResponse | SearchResponse | WorkerErrorResponse;
