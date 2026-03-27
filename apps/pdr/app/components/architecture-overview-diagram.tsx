'use client';

import { useEffect, useId, useState } from 'react';

function DiagramSvg({ idPrefix }: { idPrefix: string }) {
  const arrowId = `${idPrefix}-arrow-right`;

  return (
    <svg
      viewBox="0 0 960 520"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
    >
      <defs>
        <marker
          id={arrowId}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#d6d1ca" />
        </marker>
      </defs>

      <rect
        x="40"
        y="90"
        width="320"
        height="122"
        rx="22"
        fill="#121212"
        stroke="#2a2a2a"
        strokeWidth="1.5"
      />
      <g transform="translate(74 126)">
        <path d="m12 1.608 12 20.784H0Z" fill="#f1ede6" />
        <text x="40" y="18" fill="#f1ede6" fontSize="18" fontWeight="700">
          UI Layer
        </text>
        <text x="40" y="46" fill="#b9b1a8" fontSize="13">
          User-facing dashboards
        </text>
      </g>

      <rect
        x="520"
        y="90"
        width="320"
        height="122"
        rx="22"
        fill="#5a5652"
        stroke="#706b66"
        strokeWidth="1.5"
      />
      <g transform="translate(556 123)">
        <image
          href="/lightdash-logo.svg"
          x="0"
          y="-2"
          width="24"
          height="24"
          preserveAspectRatio="xMidYMid meet"
        />
        <text x="40" y="18" fill="#f1ede6" fontSize="18" fontWeight="700">
          Semantic Layer
        </text>
        <text x="40" y="46" fill="#e0d9d0" fontSize="13">
          Compiles metrics to SQL
        </text>
      </g>

      <rect
        x="40"
        y="310"
        width="320"
        height="128"
        rx="22"
        fill="#ece8e1"
        stroke="#cfc8bd"
        strokeWidth="1.5"
      />
      <g transform="translate(74 346)">
        <image
          href="/bigquery-logo.svg"
          x="0"
          y="-1"
          width="26"
          height="26"
          preserveAspectRatio="xMidYMid meet"
        />
        <text x="40" y="18" fill="#202020" fontSize="18" fontWeight="700">
          Warehouse
        </text>
        <text x="40" y="46" fill="#6c675f" fontSize="13">
          Where queries execute
        </text>
      </g>

      <line
        x1="360"
        y1="132"
        x2="518"
        y2="132"
        stroke="#d6d1ca"
        strokeWidth="2"
        markerEnd={`url(#${arrowId})`}
      />
      <text
        x="439"
        y="104"
        textAnchor="middle"
        fill="#e7e1d8"
        fontSize="14"
        fontWeight="600"
      >
        semantic intent
      </text>
      <text x="439" y="121" textAnchor="middle" fill="#9f978e" fontSize="11">
        what do I need?
      </text>

      <line
        x1="520"
        y1="172"
        x2="362"
        y2="172"
        stroke="#9f978e"
        strokeWidth="2"
        markerEnd={`url(#${arrowId})`}
      />
      <text
        x="439"
        y="198"
        textAnchor="middle"
        fill="#e7e1d8"
        fontSize="14"
        fontWeight="600"
      >
        compiled SQL
      </text>
      <text x="439" y="215" textAnchor="middle" fill="#9f978e" fontSize="11">
        here&apos;s how to ask for it
      </text>

      <line
        x1="150"
        y1="212"
        x2="150"
        y2="308"
        stroke="#d6d1ca"
        strokeWidth="2"
        strokeDasharray="7,5"
        markerEnd={`url(#${arrowId})`}
      />
      <text
        x="124"
        y="258"
        textAnchor="end"
        fill="#e7e1d8"
        fontSize="14"
        fontWeight="600"
      >
        run this SQL
      </text>

      <line
        x1="300"
        y1="310"
        x2="300"
        y2="214"
        stroke="#d6d1ca"
        strokeWidth="2"
        strokeDasharray="7,5"
        markerEnd={`url(#${arrowId})`}
      />
      <text x="326" y="258" fill="#e7e1d8" fontSize="14" fontWeight="600">
        here are the rows
      </text>
    </svg>
  );
}

export function ArchitectureOverviewDiagram() {
  const [open, setOpen] = useState(false);
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="relative my-10 mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-black/60"
          aria-label="Open larger diagram view"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5">
            <path
              d="M7 3H3v4m0-4 5 5m5-5h4v4m0-4-5 5M8 12l-5 5m0-4v4h4m10-5 0 5h-4m4-5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Expand</span>
        </button>
        <DiagramSvg idPrefix={`${id}-inline`} />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-6 py-10"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded architecture diagram"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-7xl rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-black/60"
            >
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="h-3.5 w-3.5"
              >
                <path
                  d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span>Close</span>
            </button>
            <DiagramSvg idPrefix={`${id}-modal`} />
          </div>
        </div>
      )}
    </>
  );
}
