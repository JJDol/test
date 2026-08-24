"use client";

import { Instrument_Serif } from "next/font/google";
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

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

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
    if (id === "upload" || id === "create" || id === "type-once" || id === "generate" || id === "ask") {
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
      activeId === "generate" ||
      activeId === "ask"
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
    <section id="how-it-works" className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
      <p className="text-sm text-[#1a1a1a]/45">How it works - try it</p>
      <h2
        className={`${instrumentSerif.className} mt-4 max-w-4xl text-4xl leading-[1.12] text-[#1a1a1a] md:text-6xl`}
      >
        From contract to finished documents in one sitting.
      </h2>

      <div className="mt-14 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:grid-rows-[auto_auto] lg:gap-x-10 xl:gap-x-12">
        <p className="order-1 mb-3 text-left text-[13px] leading-snug text-[#1a1a1a]/50 lg:col-start-2 lg:row-start-1 lg:mb-3">
          {step.caption}
        </p>
        <div className="order-2 mb-6 lg:order-none lg:col-start-1 lg:row-start-2 lg:mb-0 lg:flex lg:h-full lg:min-h-0">
          <DemoStepper steps={DEMO_STEPS} activeId={activeId} onSelect={handleSelect} />
        </div>
        <div className="order-3 min-w-0 lg:col-start-2 lg:row-start-2">
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
            {activeId === "ask" && <AskAutodocScene key={replayKey} />}
          </DemoAppFrame>
        </div>
      </div>

      <div className="mt-12 flex justify-center md:mt-16">
        <a
          href="/signup"
          className="rounded-full bg-[#1a1a1a] px-8 py-3 text-sm font-medium tracking-[0.08em] text-white"
        >
          SIGN UP
        </a>
      </div>
    </section>
  );
}
