"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SearchHit } from "@/lib/indexer/types";

interface ResultListVirtualizedProps {
  rows: SearchHit[];
}

export function ResultListVirtualized({ rows }: ResultListVirtualizedProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
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
              className="absolute left-0 top-0 flex w-full flex-col gap-2 border-b border-slate-100 bg-white px-4 py-3"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
                width: "100%",
              }}
            >
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <span
                  className="min-w-0 flex-1 truncate font-medium text-slate-700"
                  title={row.user || "(알 수 없음)"}
                >
                  {row.user || "(알 수 없음)"}
                </span>
                <span className="shrink-0">{row.date || ""}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-900">{row.message}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
