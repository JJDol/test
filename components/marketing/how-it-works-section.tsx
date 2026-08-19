"use client";

import { useCallback, useState } from "react";
import {
  DEMO_STEPS,
  emptyTypedValues,
  type DemoDisciplineId,
  type DemoPickedDocs,
  type DemoStepId,
  type DemoTypedValues,
} from "@/lib/marketing/havnegade-demo";
import { DemoAppFrame } from "@/components/marketing/demo-app-frame";
import { DemoStepper } from "@/components/marketing/demo-stepper";
import { UploadContractScene } from "@/components/marketing/scenes/upload-contract-scene";
import { CreateProjectScene } from "@/components/marketing/scenes/create-project-scene";
import { TypeOnceScene } from "@/components/marketing/scenes/type-once-scene";
import { GenerateScene } from "@/components/marketing/scenes/generate-scene";
import { AskAutodocScene } from "@/components/marketing/scenes/static-scenes";

export function HowItWorksSection() {
  const [activeId, setActiveId] = useState<DemoStepId>("upload");
  const [replayKey, setReplayKey] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(DEMO_STEPS[0].status);
  const [selected, setSelected] = useState<DemoDisciplineId[]>([]);
  const [pickedDocs, setPickedDocs] = useState<DemoPickedDocs>({});
  const [typedValues, setTypedValues] = useState<DemoTypedValues>(emptyTypedValues);

  const [generateStatus, setGenerateStatus] = useState(DEMO_STEPS[3].status);

  const step = DEMO_STEPS.find((item) => item.id === activeId) ?? DEMO_STEPS[0];
  const status =
    activeId === "upload" ? uploadStatus : activeId === "generate" ? generateStatus : step.status;

  const resetPicks = () => {
    setSelected([]);
    setPickedDocs({});
    setTypedValues(emptyTypedValues());
  };

  const handleStatusChange = useCallback((next: string) => {
    setUploadStatus(next);
  }, []);

  const handleSelect = (id: DemoStepId) => {
    setActiveId(id);
    if (id === "upload" || id === "create" || id === "type-once" || id === "generate") {
      if (id === "create" || id === "upload") resetPicks();
      if (id === "type-once") setTypedValues(emptyTypedValues());
      setReplayKey((key) => key + 1);
    }
  };

  const handleReplay = () => {
    if (
      activeId === "upload" ||
      activeId === "create" ||
      activeId === "type-once" ||
      activeId === "generate"
    ) {
      if (activeId === "create") resetPicks();
      if (activeId === "type-once") setTypedValues(emptyTypedValues());
      setReplayKey((key) => key + 1);
    }
  };

  const toggleDiscipline = (id: DemoDisciplineId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        setPickedDocs((docs) => {
          const copy = { ...docs };
          delete copy[id];
          return copy;
        });
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
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

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <p className="text-xs font-medium tracking-[0.22em] text-zinc-500">HOW IT WORKS — TRY IT</p>
      <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-5xl md:leading-tight">
        From contract to finished documents in{" "}
        <span className="bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-transparent">
          one sitting
        </span>
        .
      </h2>

      <div className="mt-12 grid gap-10 lg:grid-cols-[220px_1fr]">
        <DemoStepper steps={DEMO_STEPS} activeId={activeId} onSelect={handleSelect} />

        <div>
          <p className="mb-4 text-sm text-zinc-400">{step.caption}</p>
          <DemoAppFrame title={step.windowTitle} status={status} onReplay={handleReplay}>
            {activeId === "upload" && (
              <UploadContractScene
                replayKey={replayKey}
                onStatusChange={handleStatusChange}
                onCreateProject={() => {
                  resetPicks();
                  setReplayKey((key) => key + 1);
                  setActiveId("create");
                }}
              />
            )}
            {activeId === "create" && (
              <CreateProjectScene
                replayKey={replayKey}
                selected={selected}
                pickedDocs={pickedDocs}
                onToggleDiscipline={toggleDiscipline}
                onToggleDocument={toggleDocument}
                onNext={() => {
                  setReplayKey((key) => key + 1);
                  setActiveId("type-once");
                }}
              />
            )}
            {activeId === "type-once" && (
              <TypeOnceScene
                key={replayKey}
                replayKey={replayKey}
                pickedDocs={pickedDocs}
                onNext={(values) => {
                  setTypedValues(values);
                  setReplayKey((key) => key + 1);
                  setActiveId("generate");
                }}
              />
            )}
            {activeId === "generate" && (
              <GenerateScene
                key={replayKey}
                replayKey={replayKey}
                pickedDocs={pickedDocs}
                typedValues={typedValues}
                onStatusChange={setGenerateStatus}
              />
            )}
            {activeId === "ask" && <AskAutodocScene />}
          </DemoAppFrame>
        </div>
      </div>
    </section>
  );
}
