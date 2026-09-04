"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEMO_DISCIPLINES,
  SAMPLE_PROJECT,
  selectedDemoDocuments,
  type DemoPickedDocs,
  type DemoTypedValues,
} from "@/lib/marketing/havnegade-demo";
import { demoColors } from "@/lib/marketing/demo-colors";
import { marketingMono } from "@/lib/marketing/fonts";
import { cn } from "@/lib/utils";

type AskItem = {
  id: string;
  question: string;
  answer: string;
  sources: string[];
};

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; sources: string[] };

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

function buildingSizeQuestion(typedValues: DemoTypedValues): AskItem {
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
      : `Gross floor area and other general variables have not been entered in “Type once” yet. From the enterprise agreement, ${SAMPLE_PROJECT.name} is planned as ${SAMPLE_PROJECT.units} over ${SAMPLE_PROJECT.storeys}, with completion ${SAMPLE_PROJECT.deadline}.`,
    sources: sources.size > 0 ? Array.from(sources) : ["Enterprise agreement", "Type once · Not entered"],
  };
}

function responsibilityQuestion(typedValues: DemoTypedValues, pickedDocs: DemoPickedDocs): AskItem {
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

function projectSetupQuestion(typedValues: DemoTypedValues): AskItem {
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

function constructionQuestion(typedValues: DemoTypedValues): AskItem {
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

function fireQuestion(typedValues: DemoTypedValues): AskItem {
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

function buildAskCatalog(typedValues: DemoTypedValues, pickedDocs: DemoPickedDocs): AskItem[] {
  return [
    ...QUESTIONS,
    responsibilityQuestion(typedValues, pickedDocs),
    buildingSizeQuestion(typedValues),
    projectSetupQuestion(typedValues),
    constructionQuestion(typedValues),
    fireQuestion(typedValues),
  ];
}

function findAskItem(catalog: AskItem[], text: string) {
  const normalized = text.trim().toLowerCase();
  return (
    catalog.find((item) => item.question.toLowerCase() === normalized) ??
    catalog.find((item) => normalized.includes(item.question.toLowerCase().slice(0, 24)))
  );
}

function welcomeMessage() {
  return {
    id: "welcome",
    role: "assistant" as const,
    text: `Ask about ${SAMPLE_PROJECT.shortName} or BR18. Answers draw on this project’s data — try a sample question or type your own.`,
    sources: [] as string[],
  };
}

function TypingBubble() {
  return (
    <div className="max-w-[92%] rounded-[12px] border border-white/10 bg-white px-3.5 py-2.5">
      <p className="text-[11px] text-[#202326]/45">Searching project and BR18…</p>
      <div className="mt-2 flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#202326]/40 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#202326]/40 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#202326]/40" />
      </div>
    </div>
  );
}

function AssistantMessage({ text, sources }: { text: string; sources: string[] }) {
  return (
    <div className="max-w-[92%] rounded-[12px] border border-white/10 bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-[#202326]/80">
      {text}
      {sources.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {sources.map((source) => (
            <span
              key={source}
              className="rounded-[12px] border border-[#202326]/15 px-2 py-0.5 text-[10px] text-[#202326]/55"
            >
              {source}
            </span>
          ))}
        </div>
      ) : null}
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
  const catalog = useMemo(
    () => buildAskCatalog(typedValues, pickedDocs),
    [typedValues, pickedDocs]
  );
  const samplePrompts = useMemo(
    () =>
      SAMPLE_PROMPT_IDS.map((id) => catalog.find((item) => item.id === id)).filter(
        (item): item is AskItem => Boolean(item)
      ),
    [catalog]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [usedPromptIds, setUsedPromptIds] = useState<string[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const thinkTimerRef = useRef<number | null>(null);
  const messageIdRef = useRef(0);

  const visibleSamplePrompts = samplePrompts.filter((item) => !usedPromptIds.includes(item.id));

  const nextMessageId = () => {
    messageIdRef.current += 1;
    return String(messageIdRef.current);
  };

  useEffect(() => {
    return () => {
      if (thinkTimerRef.current) window.clearTimeout(thinkTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [messages, isThinking]);

  const sendQuestion = (raw: string) => {
    const question = raw.trim();
    if (!question || isThinking) return;

    const match = findAskItem(catalog, question);
    const answer = match?.answer ??
      "I can answer questions about this project and BR18. Try one of the sample prompts below.";
    const sources = match?.sources ?? [];

    if (match && SAMPLE_PROMPT_IDS.includes(match.id as (typeof SAMPLE_PROMPT_IDS)[number])) {
      setUsedPromptIds((prev) => (prev.includes(match.id) ? prev : [...prev, match.id]));
    }

    setMessages((prev) => [...prev, { id: nextMessageId(), role: "user", text: question }]);
    setDraft("");
    setIsThinking(true);

    if (thinkTimerRef.current) window.clearTimeout(thinkTimerRef.current);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setMessages((prev) => [
        ...prev,
        { id: nextMessageId(), role: "assistant", text: answer, sources },
      ]);
      setIsThinking(false);
      return;
    }

    thinkTimerRef.current = window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: nextMessageId(), role: "assistant", text: answer, sources },
      ]);
      setIsThinking(false);
    }, THINK_MS);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div ref={threadRef} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-0.5">
        {messages.map((message) =>
          message.role === "user" ? (
            <div
              key={message.id}
              className="ml-auto max-w-[85%] rounded-[12px] px-3.5 py-2.5 text-[13px] leading-snug text-white"
              style={{ backgroundColor: demoColors.chatUserBubble }}
            >
              {message.text}
            </div>
          ) : (
            <AssistantMessage key={message.id} text={message.text} sources={message.sources} />
          )
        )}
        {isThinking ? <TypingBubble /> : null}
      </div>

      <div className="shrink-0 border-t border-white/10 pt-3">
        {visibleSamplePrompts.length > 0 ? (
          <>
            <p className={`${marketingMono.className} text-[10px] tracking-[0.16em] text-white/45`}>
              TRY A SAMPLE QUESTION
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleSamplePrompts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={isThinking}
                  onClick={() => sendQuestion(item.question)}
                  className={cn(
                    "rounded-full border border-white/15 px-2.5 py-1 text-left text-[11px] leading-snug text-white/75 transition hover:border-white/25 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {item.question}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <form
          className={cn("flex items-center gap-2 rounded-xl border border-white/15 bg-[#2a2d30] px-3 py-2", visibleSamplePrompts.length > 0 ? "mt-3" : "")}
          onSubmit={(event) => {
            event.preventDefault();
            sendQuestion(draft);
          }}
        >
          <input
            type="text"
            value={draft}
            disabled={isThinking}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about this project or BR18…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/40 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isThinking || !draft.trim()}
            aria-label="Send question"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f5f0] text-[#202326] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </form>
      </div>
    </div>
  );
}
