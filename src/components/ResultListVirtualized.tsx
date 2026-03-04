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
    return 72;
  }

  const newlineCount = (normalized.match(/\n/g) || []).length + 1;
  const estimatedWrapLines = Math.ceil(normalized.length / 52);
  const lines = Math.max(newlineCount, estimatedWrapLines);

  return Math.min(360, 64 + lines * 22);
};

const estimateRowHeight = (message: string): number => {
  return Math.max(72, estimateTextHeight(message));
};

export function ResultListVirtualized({ rows }: ResultListVirtualizedProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => estimateRowHeight(rows[index]?.message ?? ""),
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 8,
  });

  if (rows.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">검색 결과가 없습니다.</div>;
  }

  return (
    <div
      ref={parentRef}
      className="h-[64vh] w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm"
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

          return (
            <article
              key={virtualItem.key}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 top-0 flex w-full flex-col gap-2 border-b border-slate-100 bg-white px-4"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
                width: "100%",
                paddingTop: "12px",
                paddingBottom: "12px",
              }}
            >
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <span
                  className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800"
                  title={row.user || "(알 수 없음)"}
                >
                  {row.user || "(알 수 없음)"}
                </span>
                <span className="shrink-0 text-[11px] text-slate-400">{row.date || ""}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-900 font-normal">
                {row.message}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
