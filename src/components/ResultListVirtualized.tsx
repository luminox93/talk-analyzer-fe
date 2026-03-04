"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SearchHit } from "@/lib/indexer/types";

interface ResultListVirtualizedProps {
  rows: SearchHit[];
}

const estimateTextHeight = (text: string): number => {
  const normalized = text.trim();
  if (!normalized) {
    return 124;
  }

  const explicitLines = normalized.split("\n");
  const wrappedLinesPerRawLine = explicitLines.map((line) => Math.max(1, Math.ceil(line.length / 48)));
  const lines = wrappedLinesPerRawLine.reduce((sum, lineCount) => sum + lineCount, 0);

  return Math.min(460, 112 + lines * 24);
};

const estimateRowHeight = (message: string, isLast: boolean): number => {
  return estimateTextHeight(message) + (isLast ? 14 : 22);
};

export function ResultListVirtualized({ rows }: ResultListVirtualizedProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => estimateRowHeight(rows[index]?.message ?? "", index === rows.length - 1),
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 8,
  });

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        검색 결과가 없습니다.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[64vh] w-full overflow-auto rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-2 py-3 shadow-sm"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const row = rows[virtualItem.index];
          const isLast = virtualItem.index === rows.length - 1;

          return (
            <article
              key={virtualItem.key}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 top-0 flex w-full justify-center px-4"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
                width: "100%",
                boxSizing: "border-box",
                paddingTop: "10px",
                paddingBottom: "10px",
              }}
            >
              <div className="mx-auto w-full max-w-[72ch]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
                  <header className="flex items-start justify-between gap-3 text-xs text-slate-500">
                    <span
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800"
                      title={row.user || "(알 수 없음)"}
                    >
                      {row.user || "(알 수 없음)"}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">{row.date || ""}</span>
                  </header>
                  <p className="mt-3 whitespace-pre-wrap break-all rounded-xl bg-slate-50 px-3 py-2 text-sm leading-7 tracking-[0.01em] text-slate-900">
                    {row.message}
                  </p>
                </section>
                {!isLast ? <div className="mx-auto mt-3 h-px w-full max-w-[72ch] bg-slate-200/80" /> : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
