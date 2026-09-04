"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  CATEGORY_PROGRESS_WEIGHT,
  DEMO_CATEGORY_FIELDS,
  DEMO_DISCIPLINES,
  DEMO_GENERAL_FIELDS,
  GENERAL_PROGRESS_WEIGHT,
  selectedDemoDocuments,
  type DemoDisciplineId,
  type DemoInputField,
  type DemoPickedDocs,
  type DemoTypedValues,
} from "@/lib/marketing/havnegade-demo";
import { demoPanelClass } from "@/lib/marketing/demo-colors";
import { cn } from "@/lib/utils";

function FieldControl({
  field,
  value,
  onChange,
  layout = "stack",
  tone = "general",
}: {
  field: DemoInputField;
  value: string;
  onChange: (value: string) => void;
  layout?: "stack" | "row";
  tone?: "general" | "discipline";
}) {
  const filled = value.trim().length > 0;
  const isGeneral = tone === "general";
  const border = filled ? "border-[#202326]/25" : "border-[#202326]/10";
  const valueColor = filled
    ? isGeneral
      ? "text-[#abcfa9]"
      : "text-[#eea2a2]"
    : "text-[#202326]/40";
  const inputClass = cn(
    "w-full rounded-[12px] border bg-white px-2 outline-none placeholder:text-[#202326]/35 focus:border-[#202326]/35",
    valueColor,
    layout === "row" ? "h-7 text-[13px]" : "h-9 text-sm"
  );

  const control =
    field.type === "select" ? (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, "bg-white", border)}
      >
        <option value="">Select…</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    ) : (
      <div className="relative">
        <input
          type={field.type}
          min={field.type === "number" ? 0 : undefined}
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClass, border, field.suffix && "pr-9")}
        />
        {field.suffix && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#202326]/40">
            {field.suffix}
          </span>
        )}
      </div>
    );

  if (layout === "row") {
    return (
      <label className="flex items-center gap-3">
        <span className="w-[52%] shrink-0 text-[12px] leading-tight text-[#202326]/70">
          {field.label}:
        </span>
        <div className="min-w-0 flex-1">{control}</div>
      </label>
    );
  }

  return (
    <label className="flex h-full flex-col justify-center">
      <span className="mb-1 block text-[12px] text-[#202326]/50">{field.label}</span>
      {control}
    </label>
  );
}

function documentProgress(
  disciplineId: DemoDisciplineId,
  generalFilled: number,
  categoryFilled: Record<DemoDisciplineId, number>
) {
  const general = (generalFilled / DEMO_GENERAL_FIELDS.length) * GENERAL_PROGRESS_WEIGHT;
  const categoryFields = DEMO_CATEGORY_FIELDS[disciplineId];
  const category =
    (categoryFilled[disciplineId] / categoryFields.length) * CATEGORY_PROGRESS_WEIGHT;
  return Math.round(general + category);
}

export function TypeOnceScene({
  replayKey,
  pickedDocs,
  onValuesChange,
  onNext,
}: {
  replayKey: number;
  pickedDocs: DemoPickedDocs;
  onValuesChange: (values: DemoTypedValues) => void;
  onNext: (values: DemoTypedValues) => void;
}) {
  const [general, setGeneral] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<Record<DemoDisciplineId, Record<string, string>>>({
    architecture: {},
    construction: {},
    fire: {},
  });
  const [activeCategory, setActiveCategory] = useState<DemoDisciplineId>("architecture");

  const documents = useMemo(() => selectedDemoDocuments(pickedDocs), [pickedDocs]);
  const activeDisciplines =
    DEMO_DISCIPLINES.filter((item) => documents.some((doc) => doc.disciplineId === item.id));
  const tabDisciplines = activeDisciplines.length > 0 ? activeDisciplines : DEMO_DISCIPLINES;

  useEffect(() => {
    setGeneral({});
    setCategory({ architecture: {}, construction: {}, fire: {} });
    setActiveCategory(selectedDemoDocuments(pickedDocs)[0]?.disciplineId ?? "architecture");
  }, [replayKey]);

  useEffect(() => {
    onValuesChange({ general, category });
  }, [general, category, onValuesChange]);

  const generalFilled = DEMO_GENERAL_FIELDS.filter((field) => (general[field.id] ?? "").trim())
    .length;
  const categoryFilled = {
    architecture: DEMO_CATEGORY_FIELDS.architecture.filter(
      (field) => (category.architecture[field.id] ?? "").trim()
    ).length,
    construction: DEMO_CATEGORY_FIELDS.construction.filter(
      (field) => (category.construction[field.id] ?? "").trim()
    ).length,
    fire: DEMO_CATEGORY_FIELDS.fire.filter((field) => (category.fire[field.id] ?? "").trim())
      .length,
  };

  const activeFields = DEMO_CATEGORY_FIELDS[activeCategory];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden md:grid-cols-[1.15fr_0.85fr]">
        <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <section className={cn(demoPanelClass, "flex min-h-0 flex-1 flex-col")}>
            <p className="text-[12px] font-semibold tracking-[0.16em] text-[#202326]/75">
              1. GENERAL VARIABLES
            </p>
            <p className="mt-1 text-[11px] text-[#202326]/45">
              These fields raise every selected document together.
            </p>
            <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
              {DEMO_GENERAL_FIELDS.map((field) => (
                <FieldControl
                  key={field.id}
                  field={field}
                  tone="general"
                  value={general[field.id] ?? ""}
                  onChange={(value) => setGeneral((prev) => ({ ...prev, [field.id]: value }))}
                />
              ))}
            </div>
          </section>

          <section
            className={cn(demoPanelClass, "shrink-0")}
            style={{ animationDelay: "120ms" }}
          >
            <p className="text-[12px] font-semibold tracking-[0.16em] text-[#202326]/75">
              2. DISCIPLINE VARIABLES
            </p>
            <div className="mt-1.5 flex gap-1">
              {tabDisciplines.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveCategory(item.id)}
                  className={cn(
                    "rounded-[12px] px-2 py-0.5 text-[11px] font-medium transition",
                    activeCategory === item.id
                      ? "bg-[#E8E2D6] text-[#202326]"
                      : "text-[#202326]/45 hover:text-[#202326]"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-1.5 space-y-1.5">
              {activeFields.map((field) => (
                <FieldControl
                  key={field.id}
                  field={field}
                  layout="row"
                  tone="discipline"
                  value={category[activeCategory][field.id] ?? ""}
                  onChange={(value) =>
                    setCategory((prev) => ({
                      ...prev,
                      [activeCategory]: { ...prev[activeCategory], [field.id]: value },
                    }))
                  }
                />
              ))}
            </div>
          </section>
        </div>

        <section className={cn(demoPanelClass, "flex min-h-0 flex-col overflow-hidden")}>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#202326]/40">DOCUMENTS</p>
          <div className="mt-2 min-h-0 space-y-2.5 overflow-y-auto">
            {documents.length === 0 ? (
              <p className="pt-6 text-center text-[12px] text-[#202326]/45">
                Choose documents in Create project.
              </p>
            ) : (
              activeDisciplines.map((discipline) => {
                const docs = documents.filter((doc) => doc.disciplineId === discipline.id);
                if (docs.length === 0) return null;
                return (
                  <div key={discipline.id}>
                    <p className="mb-1 text-[11px] font-semibold text-[#202326]">{discipline.label}</p>
                    <div className="space-y-0.5">
                      {docs.map((doc) => {
                        const value = documentProgress(
                          doc.disciplineId,
                          generalFilled,
                          categoryFilled
                        );
                        return (
                          <div key={doc.id} className="rounded-[12px] px-1.5 py-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-[11px] text-[#202326]/75">{doc.name}</p>
                              <p
                                className={cn(
                                  "shrink-0 font-mono text-[11px]",
                                  value === 100 ? "text-emerald-700" : "text-sky-800"
                                )}
                              >
                                {value}%
                              </p>
                            </div>
                            <div className="mt-0.5 h-1 overflow-hidden rounded bg-[#202326]/10">
                              <div
                                className={cn(
                                  "h-1 rounded transition-[width] duration-500 ease-out",
                                  value === 100 ? "bg-emerald-400" : "bg-sky-300"
                                )}
                                style={{ width: `${value}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="shrink-0 pt-2">
        <button
          type="button"
          onClick={() => onNext({ general, category })}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B8B89] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7d7d7b]"
        >
            Generate Documents
            <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
