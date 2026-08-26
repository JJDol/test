"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileText, Info, Loader2 } from "lucide-react";
import {
  DEMO_DISCIPLINES,
  selectedDemoDocuments,
  type DemoDisciplineId,
  type DemoPickedDocs,
  type DemoTypedValues,
} from "@/lib/marketing/havnegade-demo";
import { cn } from "@/lib/utils";
import { DocumentBody, collectFacts } from "./document-templates";

const WRITE_STAGGER_MS = 260;
const PAGE_COUNT = 3;

function DocumentPreview({
  docId,
  title,
  disciplineId,
  typedValues,
}: {
  docId: string;
  title: string;
  disciplineId: DemoDisciplineId;
  typedValues: DemoTypedValues;
}) {
  const [page, setPage] = useState(0);
  const facts = collectFacts(title, disciplineId, typedValues);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1.5 flex shrink-0 items-center justify-between px-0.5">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-zinc-500">AUTODOC</p>
        <p className="truncate text-[10px] text-zinc-400">{title}.docx · 3 pages</p>
      </div>

      <div className="relative min-h-0 flex-1 pr-1.5 pb-1.5">
        <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-md border border-zinc-300 bg-zinc-200" />
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-md border border-zinc-300 bg-zinc-100" />
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-zinc-200 bg-white px-8 py-2.5 text-zinc-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
          <div className="min-h-0 flex-1 overflow-hidden">
            <DocumentBody docId={docId} page={page} facts={facts} />
          </div>
          <p className="mt-2 shrink-0 text-center text-[10px] font-medium tabular-nums text-zinc-400">
            {page + 1}/{PAGE_COUNT}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0}
          className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-200 bg-white p-1 text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(PAGE_COUNT - 1, current + 1))}
          disabled={page === PAGE_COUNT - 1}
          className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-200 bg-white p-1 text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function GenerateScene({
  replayKey,
  pickedDocs,
  typedValues,
  onStatusChange,
}: {
  replayKey: number;
  pickedDocs: DemoPickedDocs;
  typedValues: DemoTypedValues;
  onStatusChange: (status: string) => void;
}) {
  const documents = useMemo(
    () => selectedDemoDocuments(pickedDocs),
    [pickedDocs]
  );
  const groups = DEMO_DISCIPLINES.map((discipline) => ({
    ...discipline,
    docs: documents.filter((doc) => doc.disciplineId === discipline.id),
  })).filter((group) => group.docs.length > 0);

  const [written, setWritten] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [userPicked, setUserPicked] = useState(false);
  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;

  const total = documents.length;
  const previewDoc =
    documents.find((doc) => doc.id === previewId) ?? (written > 0 ? documents[written - 1] : null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setPreviewId(null);
    setUserPicked(false);

    if (total === 0) {
      setWritten(0);
      statusRef.current("NO DOCUMENTS SELECTED");
      return;
    }

    if (reduced) {
      setWritten(total);
      setPreviewId(documents[0]?.id ?? null);
      statusRef.current(`${total} DOCUMENTS GENERATED`);
      return;
    }

    setWritten(0);
    statusRef.current("WRITING DOCUMENTS…");
    const timers: number[] = [];
    documents.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => {
          setWritten(index + 1);
          if (index + 1 === total) {
            statusRef.current(`${total} DOCUMENTS GENERATED`);
          }
        }, 180 + index * WRITE_STAGGER_MS)
      );
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [replayKey, total]);

  useEffect(() => {
    if (userPicked || written === 0) return;
    const previewIndex = written === total ? 0 : written - 1;
    setPreviewId(documents[previewIndex]?.id ?? null);
  }, [written, total, documents, userPicked]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        role="note"
        className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-300/70 bg-amber-100 px-4 py-2 text-center text-[12px] leading-snug text-amber-950"
      >
        <Info className="h-4 w-4 shrink-0" aria-hidden />
        <p>
          <strong className="font-semibold">SAMPLE PREVIEW ONLY</strong>
          {" — "}
          This simplified document is illustrative. AutoDoc generates your documents from your
          company&apos;s own templates.
        </p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden p-3 md:grid-cols-[0.72fr_1.28fr] md:gap-3 md:p-4">
      {total === 0 ? (
        <div className="flex h-full items-center justify-center md:col-span-2">
          <p className="text-center text-sm text-zinc-500">
            No documents selected. Return to “Create project” to choose documents.
          </p>
        </div>
      ) : (
        <>
          <div className="min-h-0 space-y-2 overflow-y-auto pr-0.5">
            {groups.map((group) => (
              <div key={group.id}>
                <p className="mb-1 text-[11px] font-semibold text-[#1a1a1a]">{group.label}</p>
                <div className="space-y-1">
                  {group.docs.map((doc) => {
                    const index = documents.findIndex(
                      (item) => item.disciplineId === doc.disciplineId && item.id === doc.id
                    );
                    const isWritten = index < written;
                    const isPreview = previewDoc?.id === doc.id && isWritten;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        disabled={!isWritten}
                        onClick={() => {
                          setPreviewId(doc.id);
                          setUserPicked(true);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
                          isWritten
                            ? "border-[#1a1a1a]/10 bg-white hover:bg-[#F5F2EB]"
                            : "cursor-default border-[#1a1a1a]/10 bg-white/50",
                          isPreview && "border-[#1a1a1a]/25 bg-[#E8E2D6]"
                        )}
                      >
                        <FileText
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isWritten ? "text-[#1a1a1a]" : "text-[#1a1a1a]/35"
                          )}
                        />
                        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#1a1a1a]">
                          {isWritten ? `${doc.name}.docx` : doc.name}
                        </p>
                        {isWritten ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-emerald-700">
                            <Check className="h-3 w-3" strokeWidth={3} />
                            READY
                          </span>
                        ) : (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden h-full min-h-0 md:block">
            {previewDoc && written > 0 ? (
              <DocumentPreview
                key={previewDoc.id}
                docId={previewDoc.id}
                title={previewDoc.name}
                disciplineId={previewDoc.disciplineId}
                typedValues={typedValues}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#1a1a1a]/15">
                <p className="text-[12px] text-zinc-500">Writing preview…</p>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
