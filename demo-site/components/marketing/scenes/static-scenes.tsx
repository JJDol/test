"use client";

import { useEffect, useRef, useState } from "react";
import { SAMPLE_PROJECT } from "@/lib/marketing/havnegade-demo";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  {
    id: "escape",
    question: "What does BR18 require for escape routes?",
    answer: `For ${SAMPLE_PROJECT.shortName} (${SAMPLE_PROJECT.storeys}), BR18 requires two independent escape routes from each storey above ground, with travel distances within the limits for residential use.`,
    sources: ["BR18 § 82", `Project: ${SAMPLE_PROJECT.shortName}`],
  },
  {
    id: "parties",
    question: "Who is the client and the architect?",
    answer: `The client is ${SAMPLE_PROJECT.client} (CVR ${SAMPLE_PROJECT.clientCvr}). The architect is ${SAMPLE_PROJECT.architect}. The site is ${SAMPLE_PROJECT.address}.`,
    sources: ["Enterprise agreement", `Project: ${SAMPLE_PROJECT.shortName}`],
  },
  {
    id: "fire",
    question: "What fire safety class applies here?",
    answer: `${SAMPLE_PROJECT.shortName} is a residential building with sleeping accommodation in ${SAMPLE_PROJECT.units}. Fire class and risk class follow BR18 for that use, with compartmentation at the stair cores.`,
    sources: ["BR18 § 82–158", "Fire strategy"],
  },
  {
    id: "building",
    question: "How large is the building?",
    answer: `The conversion provides ${SAMPLE_PROJECT.units} over ${SAMPLE_PROJECT.storeys}. Gross floor area is ${SAMPLE_PROJECT.area}. Completion is ${SAMPLE_PROJECT.deadline}.`,
    sources: ["Enterprise agreement", `GFA ${SAMPLE_PROJECT.area}`],
  },
] as const;

const THINK_MS = 1200;

function TypingBubble() {
  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-[#1a1a1a]/10 bg-white px-3.5 py-2.5">
      <p className="text-[11px] text-[#1a1a1a]/45">Searching project and BR18…</p>
      <div className="mt-2 flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1a1a1a]/40 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1a1a1a]/40 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1a1a1a]/40" />
      </div>
    </div>
  );
}

export function AskAutodocScene() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const timerRef = useRef<number | null>(null);
  const active = QUESTIONS.find((item) => item.id === activeId) ?? null;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const pick = (id: string) => {
    setActiveId(id);
    if (timerRef.current) window.clearTimeout(timerRef.current);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setReady(true);
      return;
    }

    setReady(false);
    timerRef.current = window.setTimeout(() => setReady(true), THINK_MS);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#1a1a1a]/10 px-3 py-2.5 md:px-4">
        <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-[#1a1a1a]/40">
          QUESTIONS
        </p>
        <div className="space-y-1.5">
          {QUESTIONS.map((item) => {
            const on = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pick(item.id)}
                className={cn(
                  "w-full rounded-lg border px-3 py-1.5 text-left text-[12px] leading-snug transition",
                  on
                    ? "border-[#1a1a1a]/20 bg-[#E8E2D6] text-[#1a1a1a]"
                    : "border-[#1a1a1a]/10 bg-white text-[#1a1a1a]/70 hover:border-[#1a1a1a]/20"
                )}
              >
                {item.question}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-4 py-3 md:px-5">
        {active ? (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#1a1a1a] px-3.5 py-2.5 text-[13px] leading-snug text-white">
              {active.question}
            </div>
            {ready ? (
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-[#1a1a1a]/10 bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-[#1a1a1a]/80">
                {active.answer}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {active.sources.map((source) => (
                    <span
                      key={source}
                      className="rounded-full border border-[#1a1a1a]/15 px-2 py-0.5 text-[10px] text-[#1a1a1a]/55"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <TypingBubble />
            )}
          </div>
        ) : (
          <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-[#1a1a1a]/10 bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-[#1a1a1a]/70">
            I can answer from this project and from BR18. Choose a question above.
          </div>
        )}
      </div>
    </div>
  );
}
