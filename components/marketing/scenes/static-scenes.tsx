"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEMO_DISCIPLINES,
  SAMPLE_PROJECT,
  selectedDemoDocuments,
  type DemoPickedDocs,
  type DemoTypedValues,
} from "@/lib/marketing/havnegade-demo";
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
] as const;

const THINK_MS = 1200;

function joinFacts(facts: string[]) {
  if (facts.length < 2) return facts[0];
  return `${facts.slice(0, -1).join(", ")}, and ${facts[facts.length - 1]}`;
}

function buildingSizeQuestion(typedValues: DemoTypedValues) {
  const facts: string[] = [];
  const sources = new Set<string>();
  const general = typedValues.general;
  const architecture = typedValues.category.architecture;

  if (general.gfa?.trim()) {
    facts.push(`a gross floor area of ${general.gfa.trim()} m²`);
    sources.add("Type once · General variables");
  }
  if (general.basement?.trim()) {
    facts.push(`a basement area of ${general.basement.trim()} m²`);
    sources.add("Type once · General variables");
  }
  if (architecture.height?.trim()) {
    facts.push(`a permitted height of ${architecture.height.trim()} m`);
    sources.add("Type once · Architecture");
  }
  if (architecture.storeys?.trim()) {
    facts.push(`${architecture.storeys.trim()} permitted storeys`);
    sources.add("Type once · Architecture");
  }

  const summary = joinFacts(facts);

  return {
    id: "building",
    question: "How large is the building?",
    answer: summary
      ? `The building has ${summary}.`
      : `The conversion provides ${SAMPLE_PROJECT.units} over ${SAMPLE_PROJECT.storeys}. Gross floor area is ${SAMPLE_PROJECT.area}. Completion is ${SAMPLE_PROJECT.deadline}.`,
    sources:
      sources.size > 0
        ? Array.from(sources)
        : ["Enterprise agreement", `GFA ${SAMPLE_PROJECT.area}`],
  };
}

function responsibilityQuestion(typedValues: DemoTypedValues, pickedDocs: DemoPickedDocs) {
  const selected = selectedDemoDocuments(pickedDocs);
  const document =
    selected.find((item) => typedValues.category[item.disciplineId].responsible?.trim()) ??
    selected[0] ?? {
      ...DEMO_DISCIPLINES[0].documents[0],
      disciplineId: DEMO_DISCIPLINES[0].id,
    };
  const discipline = DEMO_DISCIPLINES.find((item) => item.id === document.disciplineId)!;
  const responsible = typedValues.category[document.disciplineId].responsible?.trim();

  return {
    id: "responsible",
    question: `Who is responsible for ${document.name}.docx?`,
    answer: responsible
      ? `${responsible} is responsible for ${document.name}.docx.`
      : `No responsible person has been entered for ${document.name}.docx. Add one under ${discipline.label} in “Type once.”`,
    sources: [
      responsible ? "Type once · Discipline variables" : "Type once · No value entered",
      `${discipline.label} · ${document.name}.docx`,
    ],
  };
}

function projectSetupQuestion(typedValues: DemoTypedValues) {
  const facts: string[] = [];
  const projectNumber = typedValues.general.projectNumber?.trim();
  const geo = typedValues.general.geo?.trim();
  if (projectNumber) facts.push(`project number is ${projectNumber}`);
  if (geo) facts.push(`geotechnical category is ${geo}`);

  return {
    id: "project-setup",
    question: "What are the project identifiers?",
    answer: facts.length
      ? `The ${joinFacts(facts)}.`
      : "No project number or geotechnical category has been entered in “Type once.”",
    sources: ["Type once · General variables"],
  };
}

function constructionQuestion(typedValues: DemoTypedValues) {
  const values = typedValues.category.construction;
  const facts: string[] = [];
  if (values.cc?.trim()) facts.push(`the consequence class is ${values.cc.trim()}`);
  if (values.kk?.trim()) facts.push(`the construction class is ${values.kk.trim()}`);
  if (values.complexity?.trim()) {
    facts.push(`the structural complexity is ${values.complexity.trim().toLowerCase()}`);
  }

  return {
    id: "construction",
    question: "What are the structural classifications?",
    answer: facts.length
      ? `For Construction, ${joinFacts(facts)}.`
      : "No structural classifications have been entered under Construction in “Type once.”",
    sources: ["Type once · Construction variables"],
  };
}

function fireQuestion(typedValues: DemoTypedValues) {
  const values = typedValues.category.fire;
  const facts: string[] = [];
  if (values.bk?.trim()) facts.push(`the fire class is ${values.bk.trim()}`);
  if (values.rk?.trim()) facts.push(`the risk class is ${values.rk.trim()}`);
  if (values.sleeping?.trim()) {
    facts.push(`sleeping accommodation is marked ${values.sleeping.trim().toLowerCase()}`);
  }

  return {
    id: "fire",
    question: "What are the fire classifications?",
    answer: facts.length
      ? `For Fire safety, ${joinFacts(facts)}.`
      : "No fire classifications have been entered under Fire safety in “Type once.”",
    sources: ["Type once · Fire safety variables"],
  };
}

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

export function AskAutodocScene({
  typedValues,
  pickedDocs,
}: {
  typedValues: DemoTypedValues;
  pickedDocs: DemoPickedDocs;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const timerRef = useRef<number | null>(null);
  const questions = [
    ...QUESTIONS,
    responsibilityQuestion(typedValues, pickedDocs),
    buildingSizeQuestion(typedValues),
    projectSetupQuestion(typedValues),
    constructionQuestion(typedValues),
    fireQuestion(typedValues),
  ];
  const active = questions.find((item) => item.id === activeId) ?? null;

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
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {questions.map((item) => {
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
