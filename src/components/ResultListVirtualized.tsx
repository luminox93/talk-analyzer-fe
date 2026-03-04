"use client";

import type { SearchHit } from "@/lib/indexer/types";

interface ResultListVirtualizedProps {
  rows: SearchHit[];
}

const toColorByName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 58%, 65%)`;
};

function ChatBubble({
  hit,
  isLast,
}: {
  hit: SearchHit;
  isLast: boolean;
}) {
  const user = hit.user || "(알 수 없음)";
  const bg = toColorByName(user);

  return (
    <li className="w-full px-2">
      <div className="mx-auto flex w-full max-w-[76ch] flex-col gap-2">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: bg }}
            aria-label={`${user} 프로필`}
            title={user}
          >
            {user.charAt(0) || "?"}
          </span>
          <div className="flex max-w-[calc(100%-3rem)] flex-col">
            <span className="mb-1 text-xs text-slate-500">{user}</span>
            <div className="mt-1 flex items-end gap-2">
              <div
                className="relative w-full rounded-[12px] rounded-tl-[4px] bg-white px-3 py-2 shadow-sm"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.03)",
                }}
              >
                <div className="absolute left-[-8px] top-3 h-0 w-0 border-t-[8px] border-r-[8px] border-b-[8px] border-solid border-transparent border-r-white" />
                <p className="whitespace-pre-wrap break-all text-[14px] leading-7 text-slate-900">
                  {hit.message}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-slate-500">{hit.date || ""}</span>
            </div>
          </div>
        </div>
        {!isLast ? <div className="ml-11 h-px bg-slate-200/80" /> : null}
      </div>
    </li>
  );
}

export function ResultListVirtualized({ rows }: ResultListVirtualizedProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        검색 결과가 없습니다.
      </div>
    );
  }

  return (
    <section className="max-h-[64vh] min-h-[320px] w-full overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-[#efeae2] px-2 py-3">
      <ul className="flex flex-col gap-4 pb-2">
        {rows.map((row, index) => (
          <ChatBubble key={row.id ?? index} hit={row} isLast={index === rows.length - 1} />
        ))}
      </ul>
    </section>
  );
}
