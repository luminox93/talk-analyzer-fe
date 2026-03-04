"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SearchHit } from "@/lib/indexer/types";
import { WorkerErrorResponse, WorkerRequest, WorkerResponse } from "@/lib/worker/messages";
import { ResultListVirtualized } from "./ResultListVirtualized";

export default function SearchPanel() {
  const workerRef = useRef<Worker | null>(null);
  const [rows, setRows] = useState<SearchHit[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const worker = new Worker(new URL("../lib/indexer/worker/indexWorker", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const payload = event.data;

      if (payload.type === "ERROR") {
        const response = payload as WorkerErrorResponse;
        setErrorMessage(response.payload.message);
        setLoading(false);
        return;
      }

      if (payload.type === "LOADED") {
        setIsLoaded(true);
        setRows(payload.payload.firstRows);
        setUsers(payload.payload.users);
        setErrorMessage("");
        setLoading(false);
        return;
      }

      if (payload.type === "SEARCH_RESULT") {
        setRows(payload.payload.result);
        setErrorMessage("");
        setLoading(false);
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  const triggerSearch = useCallback(() => {
    if (!workerRef.current || !isLoaded) {
      return;
    }

    const request: WorkerRequest = {
      type: "SEARCH",
      payload: {
        query,
        userFilter: selectedUser || undefined,
        limit: 500,
      },
    };

    workerRef.current.postMessage(request);
    setLoading(true);
  }, [isLoaded, query, selectedUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isLoaded) {
        triggerSearch();
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isLoaded, triggerSearch, query, selectedUser]);

  const onFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !workerRef.current) {
      return;
    }

    if (!/\.(csv|txt)$/i.test(file.name)) {
      setErrorMessage("CSV 또는 TXT 파일만 업로드할 수 있습니다.");
      return;
    }

    const request: WorkerRequest = {
      type: "LOAD_CSV",
      payload: {
        file,
      },
    };

    setLoading(true);
    setErrorMessage("");
    setRows([]);
    setUsers([]);
    setIsLoaded(false);
    setSelectedUser("");
    setQuery("");
    workerRef.current.postMessage(request);
  }, []);

  const resultSummary = useMemo(() => {
    if (!isLoaded) {
      return "데이터가 로드되지 않았습니다.";
    }

    return `${rows.length}건`;
  }, [isLoaded, rows.length]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold text-slate-900">KakaoTalk CSV/TXT 검색기</h1>

        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">CSV / TXT 업로드 (.csv, .txt)</span>
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={onFileChange}
              className="rounded-lg border border-slate-300 p-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">사용자 필터</span>
            <select
              value={selectedUser}
              onChange={(event) => {
                setSelectedUser(event.target.value);
              }}
              className="rounded-lg border border-slate-300 p-2"
              disabled={!isLoaded}
            >
              <option value="">전체</option>
              {users.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">메시지 검색</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            disabled={!isLoaded}
            placeholder="검색어를 입력하세요"
            className="rounded-lg border border-slate-300 p-2"
          />
        </label>

        {errorMessage ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        ) : null}

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>결과: {resultSummary}</span>
          <span>{loading ? "검색 중..." : "대기 중"}</span>
        </div>

        <ResultListVirtualized rows={rows} />
      </section>
    </main>
  );
}
