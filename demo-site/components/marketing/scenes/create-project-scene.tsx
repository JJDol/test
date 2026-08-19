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
  onNext,
}: {
  replayKey: number;
  onNext: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<Set<DemoDisciplineId>>(new Set());
  const [pickedDocs, setPickedDocs] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setSelected(new Set());
    setPickedDocs({});

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

  const chosen = DEMO_DISCIPLINES.filter((item) => selected.has(item.id));

  const toggleDiscipline = (id: DemoDisciplineId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setPickedDocs((docs) => {
          const copy = { ...docs };
          delete copy[id];
          return copy;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleDocument = (disciplineId: DemoDisciplineId, docId: string) => {
    setPickedDocs((prev) => {
      const current = prev[disciplineId] ?? [];
      const next = current.includes(docId)
        ? current.filter((item) => item !== docId)
        : [...current, docId];
      return { ...prev, [disciplineId]: next };
    });
  };

  const project = NEW_BOARD_PROJECT;

  return (
    <div className="flex h-full min-h-0 flex-col">
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-5 md:grid-cols-2 md:p-6">
      {ready ? (
        <article className="demo-card-pop flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-emerald-400/30 bg-white/[0.04] p-4 shadow-[0_0_0_1px_rgba(52,211,153,0.08)]">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-white">{project.name}</h3>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-300">
                NEW
              </span>
              <MoreVertical className="h-4 w-4 text-zinc-500" />
            </div>
          </div>
          <p className="text-xs text-zinc-400">Location: {project.location}</p>
          <div className="mt-2">
            <p className="text-xs text-zinc-400">Progress</p>
            <div className="mt-1 h-1.5 w-full rounded bg-white/10">
              <div className="h-1.5 w-0 rounded bg-red-500" />
            </div>
            <p className="mt-1 text-xs text-zinc-300">{project.progress}%</p>
          </div>
          <p className="mt-2 text-xs text-zinc-300">
            Deadline: <span className="font-semibold text-sky-300">{project.deadline}</span>
          </p>
          <p className="mt-1.5 text-xs text-zinc-300">Project Leader: {project.leader}</p>

          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-400">DISCIPLINES</p>
            <div className="mt-3 space-y-2">
              {DEMO_DISCIPLINES.map((discipline) => {
                const on = selected.has(discipline.id);
                const count = pickedDocs[discipline.id]?.length ?? 0;
                return (
                  <button
                    key={discipline.id}
                    type="button"
                    onClick={() => toggleDiscipline(discipline.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                      on
                        ? "border-sky-300/35 bg-sky-300/10"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        on ? "border-sky-300 bg-sky-300 text-zinc-950" : "border-white/25"
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className={cn("flex-1 text-sm", on ? "text-white" : "text-zinc-400")}>
                      {discipline.label}
                    </span>
                    {on && count > 0 && (
                      <span className="rounded-full bg-sky-300/20 px-1.5 py-0.5 text-[10px] font-medium text-sky-200">
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
        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-zinc-500">
          Creating {SAMPLE_PROJECT.shortName}…
        </div>
      )}

      <section
        className={cn(
          "h-full min-h-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-opacity duration-500",
          ready ? "opacity-100" : "pointer-events-none opacity-30"
        )}
      >
        {chosen.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-zinc-400">
              Select a discipline to choose its documents.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {chosen.map((discipline) => {
              const docs = pickedDocs[discipline.id] ?? [];
              return (
                <div key={discipline.id} className="demo-fade-up">
                  <p className="text-sm font-semibold leading-tight text-white">{discipline.label}</p>
                  <div className="mt-1 space-y-1">
                    {discipline.documents.map((doc) => {
                      const checked = docs.includes(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3.5 rounded-md px-2.5 py-1 transition",
                            checked ? "bg-emerald-400/10" : "hover:bg-white/[0.04]"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleDocument(discipline.id, doc.id)}
                          />
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              checked
                                ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                                : "border-white/25"
                            )}
                          >
                            {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className={cn("text-sm", checked ? "text-white" : "text-zinc-300")}>
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
        <div className="demo-fade-up shrink-0 border-t border-white/10 px-4 py-2 md:px-6">
          <button
            type="button"
            onClick={onNext}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-sky-200"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
