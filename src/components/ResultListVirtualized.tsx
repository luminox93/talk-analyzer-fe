"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchHit } from "@/lib/indexer/types";

interface ResultListVirtualizedProps {
  rows: SearchHit[];
}

type VisibleRowMetadata = {
  id: string | number;
  date: string;
  user: string;
  message: string;
  height: number;
};

const MIN_ROW_HEIGHT = 132;
const LINE_HEIGHT = 28;
const CHARS_PER_LINE = 44;
const VIEWPORT_BUFFER = 240;
const OVERSCAN_ROWS = 3;
const MAX_ESTIMATED_ROW_HEIGHT = 520;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const estimateRowHeight = (message: string): number => {
  const normalized = message.trim();
  if (!normalized) {
    return MIN_ROW_HEIGHT;
  }

  const rawLines = normalized.split("\n");
  const wrappedLines = rawLines.reduce((sum, line) => {
    const safeLine = line.length === 0 ? 1 : line.length;
    return sum + Math.max(1, Math.ceil(safeLine / CHARS_PER_LINE));
  }, 0);

  return Math.min(MAX_ESTIMATED_ROW_HEIGHT, MIN_ROW_HEIGHT + wrappedLines * LINE_HEIGHT);
};

const buildPrefixOffsets = (rows: VisibleRowMetadata[]): number[] => {
  const offsets: number[] = [0];
  let acc = 0;

  for (const row of rows) {
    acc += row.height + 16;
    offsets.push(acc);
  }

  return offsets;
};

const lowerBound = (arr: number[], value: number): number => {
  let left = 0;
  let right = arr.length;

  while (left < right) {
    const mid = left + ((right - left) >> 1);
    if (arr[mid] < value) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
};

export function ResultListVirtualized({ rows }: ResultListVirtualizedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const rowsWithHeight: VisibleRowMetadata[] = useMemo(
    () =>
      rows.map((row, index) => ({
        id: row.id ?? index,
        date: row.date ?? "",
        user: row.user ?? "",
        message: row.message ?? "",
        height: estimateRowHeight(row.message ?? ""),
      })),
    [rows],
  );

  const offsets = useMemo(() => buildPrefixOffsets(rowsWithHeight), [rowsWithHeight]);
  const totalHeight = offsets[offsets.length - 1] ?? 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const sync = () => {
      setViewportHeight(container.clientHeight);
      setScrollTop(container.scrollTop);
    };

    sync();

    container.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(() => sync());
    ro.observe(container);

    return () => {
      container.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, []);

  const rawStart = useMemo(() => {
    const target = Math.max(0, scrollTop - VIEWPORT_BUFFER);
    const index = lowerBound(offsets, target);
    return clamp(index - 1, 0, rows.length - 1);
  }, [offsets, scrollTop, rows.length]);

  const rawEnd = useMemo(() => {
    const target = scrollTop + viewportHeight + VIEWPORT_BUFFER;
    const index = lowerBound(offsets, target);
    return clamp(index + 1, 0, rows.length);
  }, [offsets, scrollTop, viewportHeight, rows.length]);

  const startIndex = clamp(rawStart - OVERSCAN_ROWS, 0, rows.length - 1);
  const endIndex = clamp(rawEnd + OVERSCAN_ROWS, 0, rows.length);

  const beforeHeight = startIndex >= 0 && startIndex < offsets.length ? offsets[startIndex] : 0;
  const afterHeight = Math.max(0, totalHeight - (offsets[endIndex] ?? totalHeight));

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        검색 결과가 없습니다.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[64vh] min-h-[320px] w-full overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 shadow-sm"
    >
      <div style={{ width: "100%" }}>
        <div style={{ height: `${beforeHeight}px` }} />
        <div className="flex flex-col gap-3">
          {rowsWithHeight.slice(startIndex, endIndex).map((row, localIndex) => {
            const globalIndex = startIndex + localIndex;
            const isLast = globalIndex === rowsWithHeight.length - 1;

            return (
              <article
                key={row.id}
                className="w-full px-2"
                style={{ minHeight: `${row.height}px` }}
              >
                <div className="mx-auto flex w-full max-w-[72ch] flex-col">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
                    <header className="flex items-start justify-between gap-3 text-xs text-slate-500">
                      <span
                        className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800"
                        title={row.user || "(알 수 없음)"}
                      >
                        {row.user || "(알 수 없음)"}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">{row.date || ""}</span>
                    </header>
                    <p className="mt-3 whitespace-pre-wrap break-all rounded-xl bg-slate-50 px-3 py-2 text-sm leading-8 tracking-[0.01em] text-slate-900">
                      {row.message}
                    </p>
                  </section>
                  {!isLast ? <div className="mx-auto mt-3 h-px w-full max-w-[72ch] bg-slate-200/90" /> : null}
                </div>
              </article>
            );
          })}
        </div>
        <div style={{ height: `${afterHeight}px` }} />
      </div>
    </div>
  );
}
