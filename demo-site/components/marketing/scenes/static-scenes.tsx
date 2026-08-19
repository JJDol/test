"use client";

import { SendHorizontal } from "lucide-react";
import { SAMPLE_PROJECT } from "@/lib/marketing/havnegade-demo";

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
