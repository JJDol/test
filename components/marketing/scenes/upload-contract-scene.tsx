"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, FileText, Loader2, MousePointer2 } from "lucide-react";
import {
  EXTRACTED_FIELDS,
  SAMPLE_PROJECT,
  type ExtractedField,
} from "@/lib/marketing/havnegade-demo";
import { demoColors } from "@/lib/marketing/demo-colors";
import { cn } from "@/lib/utils";

type Phase = "idle" | "drop" | "parse" | "extract" | "done";

interface UploadContractSceneProps {
  replayKey: number;
  play: boolean;
  onStatusChange: (status: string) => void;
  onCreateProject: () => void;
}

const STATUS: Record<Phase, string> = {
  idle: "DROP A CONTRACT TO START",
  drop: `${SAMPLE_PROJECT.contractFile.toUpperCase()} · ${SAMPLE_PROJECT.contractSize}`,
  parse: "READING CONTRACT…",
  extract: "EXTRACTING PROJECT FIELDS…",
  done: "CONTRACT PARSED · 8 FIELDS EXTRACTED",
};

function Mark({
  fieldId,
  revealed,
  children,
}: {
  fieldId: string;
  revealed: string[];
  children: React.ReactNode;
}) {
  const isOn = revealed.includes(fieldId);
  return (
    <span
      className={cn(
        "rounded-[12px] px-0.5 transition-all duration-500",
        isOn
          ? "bg-[#b0c9e6] text-zinc-900 shadow-[inset_0_-1px_0_rgba(125,163,204,0.35)]"
          : "text-zinc-800"
      )}
    >
      {children}
    </span>
  );
}

function PdfFileIcon() {
  return (
    <div className="relative h-[92px] w-[70px]" aria-hidden>
      <div className="absolute inset-0 rounded-[12px] border border-zinc-300 bg-white">
        <div className="absolute right-0 top-0 h-5 w-5 bg-zinc-100 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
        <div className="absolute right-0 top-0 h-5 w-5 border-b border-l border-zinc-300 bg-zinc-50 [clip-path:polygon(0_0,100%_100%,0_100%)]" />
        <div className="space-y-1.5 px-2.5 pt-5">
          <div className="h-1 w-10 rounded-full bg-zinc-200" />
          <div className="h-1 w-8 rounded-full bg-zinc-200" />
          <div className="h-1 w-9 rounded-full bg-zinc-200" />
        </div>
        <span
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-[12px] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white"
          style={{ backgroundColor: demoColors.pdfBadge }}
        >
          PDF
        </span>
      </div>
    </div>
  );
}

const GLIDE_DELAY_MS = 2000;
const GLIDE_MOVE_MS = 900;

const TIMING = {
  afterDropMs: 350,
  parseToExtractMs: 1200,
  fieldStagger: 360,
} as const;

export function UploadContractScene({
  replayKey,
  play,
  onStatusChange,
  onCreateProject,
}: UploadContractSceneProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [revealed, setRevealed] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const dragCursorRef = useRef<HTMLDivElement>(null);
  const onStatusRef = useRef(onStatusChange);
  onStatusRef.current = onStatusChange;

  useEffect(() => {
    setPhase("idle");
    setRevealed([]);
    setCreating(false);
    onStatusRef.current(STATUS.idle);

    if (!play) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setPhase("done");
      setRevealed(EXTRACTED_FIELDS.map((field) => field.id));
      onStatusRef.current("READY TO CREATE PROJECT");
    }
  }, [play, replayKey]);

  useLayoutEffect(() => {
    if (!play) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timers: number[] = [];
    let dropHandled = false;

    const scheduleAfterDrop = () => {
      timers.push(
        window.setTimeout(() => {
          setPhase("parse");
          onStatusRef.current(STATUS.parse);
        }, TIMING.afterDropMs),
      );
      timers.push(
        window.setTimeout(() => {
          setPhase("extract");
          onStatusRef.current(STATUS.extract);
          EXTRACTED_FIELDS.forEach((field, index) => {
            timers.push(
              window.setTimeout(() => {
                setRevealed((prev) => (prev.includes(field.id) ? prev : [...prev, field.id]));
                if (index === EXTRACTED_FIELDS.length - 1) {
                  setPhase("done");
                  onStatusRef.current("READY TO CREATE PROJECT");
                }
              }, index * TIMING.fieldStagger),
            );
          });
        }, TIMING.afterDropMs + TIMING.parseToExtractMs),
      );
    };

    const triggerDrop = () => {
      if (dropHandled) return;
      dropHandled = true;
      setPhase("drop");
      onStatusRef.current(STATUS.drop);
      scheduleAfterDrop();
    };

    const onDragGlideEnd = (event: AnimationEvent) => {
      if (!event.animationName.includes("demo-drag-in")) return;
      triggerDrop();
    };

    const dragCursor = dragCursorRef.current;
    dragCursor?.addEventListener("animationend", onDragGlideEnd);
    timers.push(
      window.setTimeout(triggerDrop, GLIDE_DELAY_MS + GLIDE_MOVE_MS + 50),
    );

    return () => {
      dragCursor?.removeEventListener("animationend", onDragGlideEnd);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [play, replayKey]);

  const handleCreate = () => {
    if (phase !== "done" || creating) return;
    setCreating(true);
    onStatusRef.current("CREATING PROJECT…");
    window.setTimeout(() => {
      onCreateProject();
    }, 700);
  };

  const showDocument = phase === "parse" || phase === "extract" || phase === "done";
  const dropped = phase === "drop";
  const canCreate = phase === "done" && !creating;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-[3fr_2fr]">
      <div
        className={cn(
          "relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl",
          showDocument ? "bg-white" : "bg-transparent"
        )}
      >
        {(phase === "idle" || phase === "drop") && (
          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl p-6",
              phase === "drop" ? "demo-zone-catch" : "demo-idle-zone"
            )}
            style={{ backgroundColor: demoColors.dropZoneBg }}
          >
            <div className="relative z-10 flex h-[92px] w-[70px] items-center justify-center">
              <div
                className={cn(
                  "absolute flex h-16 w-16 items-center justify-center rounded-[12px] border border-zinc-200 bg-white transition-all duration-150 ease-out",
                  dropped ? "scale-50 opacity-0" : "demo-icon-bob scale-100 opacity-100"
                )}
              >
                <FileText className="h-7 w-7 text-zinc-400" />
              </div>
              <div
                className={cn(
                  "absolute transition-all duration-150 ease-out",
                  dropped ? "scale-100 opacity-100" : "scale-75 opacity-0"
                )}
              >
                <PdfFileIcon />
              </div>
            </div>

            <div className="relative z-10 h-10 w-72 text-center">
              <div
                className={cn(
                  "absolute inset-x-0 transition-all duration-150 ease-out",
                  dropped ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100"
                )}
              >
                <p className="text-sm font-medium text-zinc-800">Drop a PDF contract</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Interactive product tour · no upload needed
                </p>
              </div>
              <div
                className={cn(
                  "absolute inset-x-0 transition-all duration-150 ease-out",
                  dropped ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                )}
              >
                <p className="truncate text-sm font-medium text-zinc-900">
                  {SAMPLE_PROJECT.contractFile}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{SAMPLE_PROJECT.contractSize} · København Ø</p>
              </div>
            </div>

            {play && (
              <div
                key={replayKey}
                ref={dragCursorRef}
                className={cn(
                  "pointer-events-none absolute left-1/2 top-1/2 z-20 transition-opacity duration-75",
                  phase === "idle" && "demo-drag-cursor-active",
                  dropped && "opacity-0",
                )}
              >
              <div className="relative -translate-x-1/4">
                <div
                  className={cn(
                    "h-10 w-8 rounded-[12px] border border-zinc-300 bg-white shadow-md transition-opacity duration-75",
                    dropped && "opacity-0"
                  )}
                >
                  <span
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-[12px] px-1 text-[7px] font-bold text-white"
                    style={{ backgroundColor: demoColors.pdfBadge }}
                  >
                    PDF
                  </span>
                </div>
                <MousePointer2 className="absolute -bottom-3 -right-3 h-5 w-5 fill-white text-zinc-900 drop-shadow" />
              </div>
              </div>
            )}
          </div>
        )}

        {showDocument && (
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 md:px-6 md:py-5">
            {phase === "parse" && (
              <div className="demo-scan pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-sky-400/25 to-transparent" />
            )}
            <div className="mb-4 flex items-start justify-between border-b border-zinc-200 pb-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] text-zinc-500">
                  ENTERPRISE AGREEMENT
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {SAMPLE_PROJECT.shortName}
                </p>
              </div>
              <p className="text-[10px] text-zinc-400">PDF · 1 / 12</p>
            </div>
            <div className="space-y-3 text-[13px] leading-relaxed text-zinc-800">
              <p>
                Between{" "}
                <Mark fieldId="client" revealed={revealed}>
                  {SAMPLE_PROJECT.client}
                </Mark>{" "}
                (CVR{" "}
                <Mark fieldId="cvr" revealed={revealed}>
                  {SAMPLE_PROJECT.clientCvr}
                </Mark>
                ) and{" "}
                <Mark fieldId="architect" revealed={revealed}>
                  {SAMPLE_PROJECT.architect}
                </Mark>
                .
              </p>
              <p>
                Project:{" "}
                <Mark fieldId="name" revealed={revealed}>
                  {SAMPLE_PROJECT.name}
                </Mark>
              </p>
              <p>
                Site:{" "}
                <Mark fieldId="address" revealed={revealed}>
                  {SAMPLE_PROJECT.address}
                </Mark>
              </p>
              <p>
                Cadastral:{" "}
                <Mark fieldId="cadastral" revealed={revealed}>
                  {SAMPLE_PROJECT.cadastral}
                </Mark>
              </p>
              <p>
                Contract sum:{" "}
                <Mark fieldId="value" revealed={revealed}>
                  {SAMPLE_PROJECT.contractValue}
                </Mark>
              </p>
              <p>
                Completion:{" "}
                <Mark fieldId="deadline" revealed={revealed}>
                  {SAMPLE_PROJECT.deadline}
                </Mark>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        <p
          className="shrink-0 text-[12px] font-semibold tracking-[1.8px]"
          style={{ color: demoColors.sceneTitle }}
        >
          EXTRACTED FIELDS
        </p>
        <ul className="flex min-h-0 flex-1 flex-col gap-2">
          {EXTRACTED_FIELDS.map((field) => (
            <ExtractedRow key={field.id} field={field} visible={revealed.includes(field.id)} />
          ))}
        </ul>
      </div>
      </div>

      <div className="shrink-0 pt-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
            canCreate
              ? "bg-[#8B8B89] text-white hover:bg-[#7d7d7b]"
              : "cursor-not-allowed bg-[#8B8B89]/35 text-white/55",
            creating && "cursor-wait opacity-80"
          )}
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating project…
            </>
          ) : (
            "Create a project"
          )}
        </button>
      </div>
    </div>
  );
}

function ExtractedRow({ field, visible }: { field: ExtractedField; visible: boolean }) {
  return (
    <li
      className={cn(
        "flex min-h-0 flex-1 items-start justify-between gap-3 rounded-[8px] border px-3 py-3 text-xs transition-all duration-300",
        visible ? "" : "bg-transparent text-transparent"
      )}
      style={{ borderColor: demoColors.extractedRowBorder }}
    >
      <div className="min-w-0">
        <p
          className={cn("text-[10px] tracking-[0.25px]", !visible && "text-transparent")}
          style={{ color: visible ? demoColors.extractedLabel : undefined }}
        >
          {field.label}
        </p>
        <p
          className="truncate font-medium"
          style={{ color: visible ? demoColors.extractedValue : undefined }}
        >
          {field.value}
        </p>
      </div>
      {visible && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/50" />}
    </li>
  );
}
