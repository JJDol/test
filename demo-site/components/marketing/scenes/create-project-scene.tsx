"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, MoreVertical } from "lucide-react";
import {
  DEMO_DISCIPLINES,
  NEW_BOARD_PROJECT,
  SAMPLE_PROJECT,
  type DemoDisciplineId,
} from "@/lib/marketing/havnegade-demo";
import { cn } from "@/lib/utils";

export function CreateProjectScene({
  replayKey,
  selected,
  pickedDocs,
  onToggleDiscipline,
  onToggleDocument,
  onNext,
}: {
  replayKey: number;
  selected: DemoDisciplineId[];
  pickedDocs: Record<string, string[]>;
  onToggleDiscipline: (id: DemoDisciplineId) => void;
  onToggleDocument: (disciplineId: DemoDisciplineId, docId: string) => void;
  onNext: () => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setReady(true);
      return;
    }

    setReady(false);
    const timer = window.setTimeout(() => setReady(true), 280);
    return () => window.clearTimeout(timer);
  }, [replayKey]);

  const chosen = DEMO_DISCIPLINES.filter((item) => selected.includes(item.id));

  const project = NEW_BOARD_PROJECT;

  return (
    <div className="flex h-full min-h-0 flex-col">
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-5 md:grid-cols-2 md:p-6">
      {ready ? (
        <article className="demo-card-pop flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#1a1a1a]/10 bg-white p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-[#1a1a1a]">{project.name}</h3>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-[12px] bg-[#1a1a1a]/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#1a1a1a]/70">
                NEW
              </span>
              <MoreVertical className="h-4 w-4 text-[#1a1a1a]/35" />
            </div>
          </div>
          <p className="text-xs text-[#1a1a1a]/50">Location: {project.location}</p>
          <div className="mt-2">
            <p className="text-xs text-[#1a1a1a]/50">Progress</p>
            <div className="mt-1 h-1.5 w-full rounded bg-[#1a1a1a]/10">
              <div className="h-1.5 w-0 rounded bg-[#1a1a1a]" />
            </div>
            <p className="mt-1 text-xs text-[#1a1a1a]/70">{project.progress}%</p>
          </div>
          <p className="mt-2 text-xs text-[#1a1a1a]/70">
            Deadline: <span className="font-semibold text-[#1a1a1a]">{project.deadline}</span>
          </p>
          <p className="mt-1.5 text-xs text-[#1a1a1a]/70">Project Leader: {project.leader}</p>

          <div className="mt-4 border-t border-[#1a1a1a]/10 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#1a1a1a]/40">DISCIPLINES</p>
            <div className="mt-3 space-y-2">
              {DEMO_DISCIPLINES.map((discipline) => {
                const on = selected.includes(discipline.id);
                const count = pickedDocs[discipline.id]?.length ?? 0;
                return (
                  <button
                    key={discipline.id}
                    type="button"
                    onClick={() => onToggleDiscipline(discipline.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition",
                      on
                        ? "border-[#1a1a1a]/20 bg-[#E8E2D6]"
                        : "border-[#1a1a1a]/10 hover:border-[#1a1a1a]/20"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        on ? "border-[#1a1a1a] bg-[#1a1a1a] text-white" : "border-[#1a1a1a]/25"
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className={cn("flex-1 text-sm", on ? "text-[#1a1a1a]" : "text-[#1a1a1a]/50")}>
                      {discipline.label}
                    </span>
                    {on && count > 0 && (
                      <span className="rounded-[12px] bg-[#1a1a1a]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#1a1a1a]/70">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </article>
      ) : (
        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#1a1a1a]/15 text-sm text-[#1a1a1a]/45">
          Creating {SAMPLE_PROJECT.shortName}…
        </div>
      )}

      <section
        className={cn(
          "h-full min-h-0 overflow-hidden rounded-xl border border-[#1a1a1a]/10 bg-white p-3 transition-opacity duration-500",
          ready ? "opacity-100" : "pointer-events-none opacity-30"
        )}
      >
        {chosen.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-[#1a1a1a]/45">
              Select a discipline to choose its documents.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {chosen.map((discipline) => {
              const docs = pickedDocs[discipline.id] ?? [];
              return (
                <div key={discipline.id} className="demo-fade-up">
                  <p className="text-sm font-semibold leading-tight text-[#1a1a1a]">{discipline.label}</p>
                  <div className="mt-1 space-y-1">
                    {discipline.documents.map((doc) => {
                      const checked = docs.includes(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3.5 rounded-[12px] px-2.5 py-1 transition",
                            checked ? "bg-[#E8E2D6]" : "hover:bg-[#1a1a1a]/5"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => onToggleDocument(discipline.id, doc.id)}
                          />
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              checked
                                ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                                : "border-[#1a1a1a]/25"
                            )}
                          >
                            {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className={cn("text-sm", checked ? "text-[#1a1a1a]" : "text-[#1a1a1a]/60")}>
                            {doc.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>

      {ready && (
        <div className="demo-fade-up shrink-0 px-4 py-2 md:px-6">
          <button
            type="button"
            onClick={onNext}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8E2D6] px-4 py-2 text-sm font-medium text-[#1a1a1a] transition hover:bg-[#ddd6c8]"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
