"use client";

import { Check, ChevronRight, MoreVertical } from "lucide-react";
import {
  DEMO_DISCIPLINES,
  NEW_BOARD_PROJECT,
  type DemoDisciplineId,
} from "@/lib/marketing/havnegade-demo";
import { demoPanelClass } from "@/lib/marketing/demo-colors";
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
  const chosen = DEMO_DISCIPLINES.filter((item) => selected.includes(item.id));
  const project = NEW_BOARD_PROJECT;
  const showDisciplineHint = selected.length === 0;
  const canNext = selected.some((id) => (pickedDocs[id]?.length ?? 0) > 0);

  const handleNext = () => {
    if (!canNext) return;
    onNext();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-2">
        <article className={cn(demoPanelClass, "flex h-full min-h-0 flex-col overflow-hidden")}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-[#202326]">{project.name}</h3>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-[12px] bg-[#202326]/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#202326]/70">
                NEW
              </span>
              <MoreVertical className="h-4 w-4 text-[#202326]/35" />
            </div>
          </div>
          <p className="text-xs text-[#202326]/50">Location: {project.location}</p>
          <div className="mt-2">
            <p className="text-xs text-[#202326]/50">Progress</p>
            <div className="mt-1 h-1.5 w-full rounded bg-[#202326]/10">
              <div className="h-1.5 w-0 rounded bg-[#202326]" />
            </div>
            <p className="mt-1 text-xs text-[#202326]/70">{project.progress}%</p>
          </div>
          <p className="mt-2 text-xs text-[#202326]/70">
            Deadline: <span className="font-semibold text-[#202326]">{project.deadline}</span>
          </p>
          <p className="mt-1.5 text-xs text-[#202326]/70">Project Leader: {project.leader}</p>

          <div className="mt-4 border-t border-[#202326]/10 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#202326]/40">DISCIPLINES</p>
            <div className="mt-3 space-y-2">
              {DEMO_DISCIPLINES.map((discipline, index) => {
                const on = selected.includes(discipline.id);
                const count = pickedDocs[discipline.id]?.length ?? 0;
                return (
                  <button
                    key={`${discipline.id}-${replayKey}`}
                    type="button"
                    onClick={() => onToggleDiscipline(discipline.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition",
                      showDisciplineHint && "demo-discipline-hint",
                      on
                        ? "border-[#202326]/20 bg-[#E8E2D6]"
                        : "border-[#202326]/10 hover:border-[#202326]/20"
                    )}
                    style={showDisciplineHint ? { animationDelay: `${index * 0.55}s` } : undefined}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        on ? "border-[#202326] bg-[#202326] text-white" : "border-[#202326]/25"
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className={cn("flex-1 text-sm", on ? "text-[#202326]" : "text-[#202326]/50")}>
                      {discipline.label}
                    </span>
                    {on && count > 0 && (
                      <span className="rounded-[12px] bg-[#202326]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#202326]/70">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </article>

        <section className={cn(demoPanelClass, "h-full min-h-0 overflow-hidden")}>
          {chosen.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-[#202326]/45">
                Select a discipline to choose its documents.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {chosen.map((discipline) => {
                const docs = pickedDocs[discipline.id] ?? [];
                return (
                  <div key={discipline.id}>
                    <p className="text-sm font-semibold leading-tight text-[#202326]">{discipline.label}</p>
                    <div className="mt-1 space-y-1">
                      {discipline.documents.map((doc) => {
                        const checked = docs.includes(doc.id);
                        return (
                          <label
                            key={doc.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3.5 rounded-[12px] px-2.5 py-1 transition",
                              checked ? "bg-[#E8E2D6]" : "hover:bg-[#202326]/5"
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
                                  ? "border-[#202326] bg-[#202326] text-white"
                                  : "border-[#202326]/25"
                              )}
                            >
                              {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <span className={cn("text-sm", checked ? "text-[#202326]" : "text-[#202326]/60")}>
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

      <div className="shrink-0 pt-2">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
            canNext
              ? "bg-[#8B8B89] text-white hover:bg-[#7d7d7b]"
              : "cursor-not-allowed bg-[#8B8B89]/35 text-white/55"
          )}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
