"use client";

import { Download, SendHorizontal } from "lucide-react";
import { DEMO_DOCUMENTS, SAMPLE_PROJECT } from "@/lib/marketing/havnegade-demo";

function Donut({ value }: { value: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
      <circle cx="20" cy="20" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="#7dd3fc"
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TypeOnceScene() {
  return (
    <div className="grid min-h-[420px] gap-5 p-5 md:min-h-[500px] md:grid-cols-[0.9fr_1.1fr] md:p-6">
      <div>
        <p className="mb-3 text-[10px] font-semibold tracking-[0.18em] text-zinc-500">
          GENERAL VARIABLES
        </p>
        <div className="space-y-2">
          <div className="rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2">
            <p className="text-[11px] text-sky-200">Client name</p>
            <p className="text-sm text-white">{SAMPLE_PROJECT.client}</p>
          </div>
          <div className="rounded-lg border border-white/10 px-3 py-2">
            <p className="text-[11px] text-zinc-500">Site address</p>
            <p className="text-sm text-zinc-300">{SAMPLE_PROJECT.address}</p>
          </div>
          <div className="rounded-lg border border-white/10 px-3 py-2">
            <p className="text-[11px] text-zinc-500">Completion</p>
            <p className="text-sm text-zinc-300">{SAMPLE_PROJECT.deadline}</p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          Shared fields lift every document. A fire-strategy-only field would complete only that
          document.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {DEMO_DOCUMENTS.map((doc) => (
          <div key={doc.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <Donut value={doc.progressFromGeneral} />
            <p className="mt-2 text-xs font-medium text-white">{doc.name}</p>
            <p className="font-mono text-[11px] text-sky-300">{doc.progressFromGeneral}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenerateScene() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 p-6 md:min-h-[500px]">
      <div className="flex items-center gap-2 rounded-full bg-sky-300 px-5 py-2.5 text-sm font-semibold text-zinc-950">
        <Download className="h-4 w-4" />
        Generate documents
      </div>
      <div className="grid w-full max-w-xl grid-cols-2 gap-3">
        {DEMO_DOCUMENTS.map((doc) => (
          <div key={doc.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-medium text-white">{doc.name}</p>
            <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-zinc-500">
              {SAMPLE_PROJECT.client} · {SAMPLE_PROJECT.address} · {SAMPLE_PROJECT.deadline}
            </p>
            <p className="mt-3 font-mono text-[10px] text-emerald-400">FILLED · READY</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AskAutodocScene() {
  return (
    <div className="flex min-h-[420px] flex-col p-5 md:min-h-[500px] md:p-6">
      <div className="flex-1 space-y-4">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-white/10 px-4 py-3 text-sm text-white">
          What does BR18 require for escape routes in this building?
        </div>
        <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-zinc-300">
          For {SAMPLE_PROJECT.shortName} ({SAMPLE_PROJECT.storeys}), BR18 requires two independent
          escape routes from each storey above ground, with travel distances within the limits for
          residential use.
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-300/30 px-2 py-0.5 text-[10px] text-sky-200">
              BR18 § 82
            </span>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-zinc-400">
              Project: {SAMPLE_PROJECT.shortName}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-500">
        Ask a what-if about this project or BR18…
        <SendHorizontal className="ml-auto h-4 w-4" />
      </div>
    </div>
  );
}
