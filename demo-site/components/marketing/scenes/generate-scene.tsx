"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import {
  DEMO_CATEGORY_FIELDS,
  DEMO_DISCIPLINES,
  DEMO_GENERAL_FIELDS,
  SAMPLE_PROJECT,
  selectedDemoDocuments,
  typedFieldDisplay,
  type DemoDisciplineId,
  type DemoInputField,
  type DemoPickedDocs,
  type DemoTypedValues,
} from "@/lib/marketing/havnegade-demo";
import { cn } from "@/lib/utils";

const WRITE_STAGGER_MS = 260;
const PAGE_COUNT = 3;

function generalValue(id: string, values: DemoTypedValues) {
  const field = DEMO_GENERAL_FIELDS.find((item) => item.id === id);
  return field ? typedFieldDisplay(field, values.general) : null;
}

function categoryValue(disciplineId: DemoDisciplineId, id: string, values: DemoTypedValues) {
  const field = DEMO_CATEGORY_FIELDS[disciplineId].find((item) => item.id === id);
  return field ? typedFieldDisplay(field, values.category[disciplineId]) : null;
}

type VariableTone = "general" | "discipline" | "contract";

function FactValue({
  value,
  tone = "general",
}: {
  value: string | null;
  tone?: VariableTone;
}) {
  if (!value) {
    return (
      <span className="inline-block min-w-[3.5rem] border-b border-dotted border-zinc-400 text-transparent">
        blank
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-[2px] px-0.5 text-zinc-900",
        tone === "discipline" && "bg-sky-200 shadow-[inset_0_-1px_0_rgba(14,165,233,0.35)]",
        tone === "general" && "bg-violet-300 shadow-[inset_0_-1px_0_rgba(109,40,217,0.35)]",
        tone === "contract" && "bg-amber-200 shadow-[inset_0_-1px_0_rgba(217,119,6,0.35)]"
      )}
    >
      {value}
    </span>
  );
}

function FactRow({
  label,
  value,
  typed,
  tone = "general",
}: {
  label: string;
  value: string | null;
  typed?: boolean;
  tone?: VariableTone;
}) {
  return (
    <div className="grid grid-cols-[6.75rem_1fr] items-baseline gap-1.5 text-[10px] leading-snug">
      <span className="truncate text-zinc-500">{label}</span>
      {typed ? <FactValue value={value} tone={tone} /> : <span className="text-zinc-800">{value}</span>}
    </div>
  );
}

function RunningHeader({
  title,
  projectNumber,
  gfa,
}: {
  title: string;
  projectNumber: string | null;
  gfa: string | null;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-2 border-b border-zinc-200 pb-1.5">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold leading-tight text-zinc-900">{title}</p>
        <p className="mt-0.5 truncate text-[10px] text-zinc-500">
          <FactValue value={SAMPLE_PROJECT.shortName} tone="contract" />
          {projectNumber ? (
            <>
              {" · "}
              <FactValue value={projectNumber} tone="general" />
            </>
          ) : null}
        </p>
      </div>
      <p className="shrink-0 text-[10px] text-zinc-500">
        GFA <FactValue value={gfa} tone="general" />
      </p>
    </div>
  );
}

function FacadeSketch({ storeys }: { storeys: number }) {
  const floors = Math.min(Math.max(storeys, 3), 6);
  return (
    <div className="flex shrink-0 flex-col items-center" aria-hidden>
      <div className="h-1.5 w-12 border-x border-t border-zinc-800" />
      <div className="flex flex-col-reverse border border-zinc-800">
        {Array.from({ length: floors }, (_, index) => (
          <div
            key={index}
            className="flex items-center justify-center gap-1 border-t border-zinc-800 px-1.5 py-[3px]"
          >
            <span className="h-2 w-2 border border-zinc-400" />
            <span className="h-2 w-2 border border-zinc-400" />
            <span className="h-2 w-2 border border-zinc-400" />
          </div>
        ))}
      </div>
      <div className="h-px w-16 bg-zinc-800" />
    </div>
  );
}

function TitleStat({
  label,
  value,
  tone = "general",
}: {
  label: string;
  value: string | null;
  tone?: VariableTone;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-semibold tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-semibold leading-tight text-zinc-900">
        <FactValue value={value} tone={tone} />
      </p>
    </div>
  );
}

function CoverPage({
  title,
  disciplineId,
  disciplineLabel,
  typedValues,
}: {
  title: string;
  disciplineId: DemoDisciplineId;
  disciplineLabel: string;
  typedValues: DemoTypedValues;
}) {
  const projectNumber = generalValue("projectNumber", typedValues);
  const gfa = generalValue("gfa", typedValues);
  const storeysRaw = (typedValues.category.architecture.storeys ?? "").trim();
  const storeysCount = Number.parseInt(storeysRaw, 10);
  const facadeStoreys = Number.isFinite(storeysCount) ? storeysCount : 5;

  const thirdStat: { label: string; value: string | null } =
    disciplineId === "architecture"
      ? { label: "HEIGHT", value: categoryValue("architecture", "height", typedValues) }
      : disciplineId === "construction"
        ? {
            label: "CC / KK",
            value:
              [
                categoryValue("construction", "cc", typedValues),
                categoryValue("construction", "kk", typedValues),
              ]
                .filter(Boolean)
                .join(" · ") || null,
          }
        : { label: "FIRE CLASS", value: categoryValue("fire", "bk", typedValues) };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold tracking-[0.22em] text-zinc-400">
          {disciplineLabel.toUpperCase()} · TITLE SHEET
        </p>
        <p className="text-[9px] tracking-[0.14em] text-zinc-400">
          {SAMPLE_PROJECT.municipality.toUpperCase()}
        </p>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.18em] text-zinc-400">
            {SAMPLE_PROJECT.units.toUpperCase()}
          </p>
          <h3 className="mt-1 text-[22px] font-semibold leading-[0.95] tracking-tight text-zinc-900">
            <FactValue value={SAMPLE_PROJECT.shortName} tone="contract" />
          </h3>
          <p className="mt-1.5 text-[12px] font-medium leading-snug text-zinc-700">{title}</p>
          <p className="mt-1 text-[10px] leading-snug text-zinc-500">
            <FactValue value={SAMPLE_PROJECT.address} tone="contract" />
          </p>
        </div>
        <FacadeSketch storeys={facadeStoreys} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-900 pt-2">
        <TitleStat label="PROJECT NUMBER" value={projectNumber} tone="general" />
        <TitleStat label="GFA" value={gfa} tone="general" />
        <TitleStat label={thirdStat.label} value={thirdStat.value} tone="discipline" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-zinc-200 pt-2">
        <div>
          <p className="text-[8px] font-semibold tracking-[0.16em] text-zinc-400">CLIENT</p>
          <p className="mt-0.5 truncate text-[10px] text-zinc-800">
            <FactValue value={SAMPLE_PROJECT.client} tone="contract" />
          </p>
        </div>
        <div>
          <p className="text-[8px] font-semibold tracking-[0.16em] text-zinc-400">ARCHITECT</p>
          <p className="mt-0.5 truncate text-[10px] text-zinc-800">
            <FactValue value={SAMPLE_PROJECT.architect} tone="contract" />
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[8px] font-semibold tracking-[0.16em] text-zinc-400">RESPONSIBLE</p>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-zinc-900">
            <FactValue
              tone="discipline"
              value={categoryValue(disciplineId, "responsible", typedValues)}
            />
          </p>
        </div>
      </div>
    </div>
  );
}

function ScopePage({
  disciplineId,
  typedValues,
}: {
  disciplineId: DemoDisciplineId;
  typedValues: DemoTypedValues;
}) {
  const gfa = generalValue("gfa", typedValues);
  const basement = generalValue("basement", typedValues);
  const geo = generalValue("geo", typedValues);
  const projectNumber = generalValue("projectNumber", typedValues);

  const body: Record<DemoDisciplineId, React.ReactNode> = {
    architecture: (
      <>
        The permitted building height is <FactValue tone="discipline" value={categoryValue(disciplineId, "height", typedValues)} />
        {" over "}
        <FactValue tone="discipline" value={categoryValue(disciplineId, "storeys", typedValues)} /> storeys. Required
        parking is <FactValue tone="discipline" value={categoryValue(disciplineId, "parking", typedValues)} /> spaces.
        Responsible person: <FactValue tone="discipline" value={categoryValue(disciplineId, "responsible", typedValues)} />.
      </>
    ),
    construction: (
      <>
        The structure is designed in consequence class{" "}
        <FactValue tone="discipline" value={categoryValue(disciplineId, "cc", typedValues)} /> and construction class{" "}
        <FactValue tone="discipline" value={categoryValue(disciplineId, "kk", typedValues)} />. Complexity is{" "}
        <FactValue tone="discipline" value={categoryValue(disciplineId, "complexity", typedValues)} />. Responsible
        person: <FactValue tone="discipline" value={categoryValue(disciplineId, "responsible", typedValues)} />.
      </>
    ),
    fire: (
      <>
        Fire class is <FactValue tone="discipline" value={categoryValue(disciplineId, "bk", typedValues)} /> and risk
        class is <FactValue tone="discipline" value={categoryValue(disciplineId, "rk", typedValues)} />. Sleeping
        accommodation: <FactValue tone="discipline" value={categoryValue(disciplineId, "sleeping", typedValues)} />.
        Responsible person: <FactValue tone="discipline" value={categoryValue(disciplineId, "responsible", typedValues)} />.
      </>
    ),
  };

  return (
    <div className="min-h-0 overflow-hidden">
      <p className="text-[9px] font-semibold tracking-[0.16em] text-zinc-400">2. DESIGN BASIS</p>
      <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-700">
        Prepared for <FactValue value={SAMPLE_PROJECT.client} tone="contract" /> at{" "}
        <FactValue value={SAMPLE_PROJECT.address} tone="contract" />. Project number{" "}
        <FactValue value={projectNumber} tone="general" />. Gross floor area{" "}
        <FactValue value={gfa} tone="general" />. Basement area{" "}
        <FactValue value={basement} tone="general" />. Geotechnical category{" "}
        <FactValue value={geo} tone="general" />.
      </p>
      <p className="mt-2.5 text-[9px] font-semibold tracking-[0.16em] text-zinc-400">
        3. DISCIPLINE SCOPE
      </p>
      <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-700">{body[disciplineId]}</p>
      <div className="mt-2.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5">
        <p className="text-[9px] font-semibold tracking-[0.14em] text-zinc-400">REPEATED FROM COVER</p>
        <div className="mt-1 space-y-px">
          <FactRow label="Client" value={SAMPLE_PROJECT.client} typed tone="contract" />
          <FactRow label="Project number" value={projectNumber} typed tone="general" />
          <FactRow label="Gross floor area" value={gfa} typed tone="general" />
          <FactRow label="Geotechnical" value={geo} typed tone="general" />
        </div>
      </div>
    </div>
  );
}

function SummaryPage({
  disciplineId,
  disciplineLabel,
  typedValues,
}: {
  disciplineId: DemoDisciplineId;
  disciplineLabel: string;
  typedValues: DemoTypedValues;
}) {
  return (
    <div className="min-h-0 overflow-hidden">
      <p className="text-[9px] font-semibold tracking-[0.16em] text-zinc-400">
        4. VARIABLES APPLIED THROUGHOUT
      </p>
      <p className="mt-1.5 text-[10px] leading-snug text-zinc-600">
        Contract facts, general variables, and discipline variables all repeat in this document.
      </p>
      <p className="mt-2 mb-0.5 text-[9px] font-semibold tracking-[0.14em] text-zinc-400">
        FROM CONTRACT
      </p>
      <div className="space-y-px">
        <FactRow label="Client" value={SAMPLE_PROJECT.client} typed tone="contract" />
        <FactRow label="Architect" value={SAMPLE_PROJECT.architect} typed tone="contract" />
        <FactRow label="Site" value={SAMPLE_PROJECT.address} typed tone="contract" />
      </div>
      <p className="mt-2 mb-0.5 text-[9px] font-semibold tracking-[0.14em] text-zinc-400">
        GENERAL
      </p>
      <div className="space-y-px">
        {DEMO_GENERAL_FIELDS.map((field) => (
          <FactRow
            key={field.id}
            label={field.label}
            value={typedFieldDisplay(field, typedValues.general)}
            typed
            tone="general"
          />
        ))}
      </div>
      <p className="mt-2 mb-0.5 text-[9px] font-semibold tracking-[0.14em] text-zinc-400">
        {disciplineLabel.toUpperCase()}
      </p>
      <div className="space-y-px">
        {DEMO_CATEGORY_FIELDS[disciplineId].map((field) => (
          <FactRow
            key={field.id}
            label={field.label}
            value={typedFieldDisplay(field, typedValues.category[disciplineId])}
            typed
            tone="discipline"
          />
        ))}
      </div>
    </div>
  );
}

function DocumentPreview({
  title,
  disciplineId,
  typedValues,
}: {
  title: string;
  disciplineId: DemoDisciplineId;
  typedValues: DemoTypedValues;
}) {
  const [page, setPage] = useState(0);
  const disciplineLabel =
    DEMO_DISCIPLINES.find((item) => item.id === disciplineId)?.label ?? "Architecture";
  const projectNumber = generalValue("projectNumber", typedValues);
  const gfa = generalValue("gfa", typedValues);

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
          {page !== 0 && (
            <RunningHeader title={title} projectNumber={projectNumber} gfa={gfa} />
          )}
          <div className={cn("min-h-0 flex-1 overflow-hidden", page !== 0 && "mt-2")}>
            {page === 0 && (
              <CoverPage
                title={title}
                disciplineId={disciplineId}
                disciplineLabel={disciplineLabel}
                typedValues={typedValues}
              />
            )}
            {page === 1 && <ScopePage disciplineId={disciplineId} typedValues={typedValues} />}
            {page === 2 && (
              <SummaryPage
                disciplineId={disciplineId}
                disciplineLabel={disciplineLabel}
                typedValues={typedValues}
              />
            )}
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
  const documents = useMemo(() => selectedDemoDocuments(pickedDocs), [pickedDocs]);
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
    setPreviewId(documents[written - 1]?.id ?? null);
  }, [written, documents, userPicked]);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden p-3 md:grid-cols-[0.72fr_1.28fr] md:gap-3 md:p-4">
      {total === 0 ? (
        <div className="flex h-full items-center justify-center md:col-span-2">
          <p className="text-sm text-zinc-500">Choose documents in Create project.</p>
        </div>
      ) : (
        <>
          <div className="min-h-0 space-y-2 overflow-hidden">
              {groups.map((group) => (
                <div key={group.id}>
                  <p className="mb-1 text-[11px] font-semibold text-white">{group.label}</p>
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
                              ? "border-emerald-400/20 bg-emerald-400/5 hover:bg-emerald-400/10"
                              : "cursor-default border-white/10 bg-white/[0.03]",
                            isPreview && "border-sky-300/40 bg-sky-300/10"
                          )}
                        >
                          <FileText
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isWritten ? "text-sky-300" : "text-zinc-500"
                            )}
                          />
                          <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-white">
                            {isWritten ? `${doc.name}.docx` : doc.name}
                          </p>
                          {isWritten ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-emerald-400">
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
                title={previewDoc.name}
                disciplineId={previewDoc.disciplineId}
                typedValues={typedValues}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10">
                <p className="text-[12px] text-zinc-500">Writing preview…</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
