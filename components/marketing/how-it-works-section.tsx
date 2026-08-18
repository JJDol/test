"use client";

import { useCallback, useState } from "react";
import { DEMO_STEPS, type DemoStepId } from "@/lib/marketing/havnegade-demo";
import { DemoAppFrame } from "@/components/marketing/demo-app-frame";
import { DemoStepper } from "@/components/marketing/demo-stepper";
import { UploadContractScene } from "@/components/marketing/scenes/upload-contract-scene";
import {
  AskAutodocScene,
  GenerateScene,
  ProjectFormScene,
  TypeOnceScene,
} from "@/components/marketing/scenes/static-scenes";

export function HowItWorksSection() {
  const [activeId, setActiveId] = useState<DemoStepId>("upload");
  const [replayKey, setReplayKey] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(DEMO_STEPS[0].status);

  const step = DEMO_STEPS.find((item) => item.id === activeId) ?? DEMO_STEPS[0];
  const status = activeId === "upload" ? uploadStatus : step.status;

  const handleStatusChange = useCallback((next: string) => {
    setUploadStatus(next);
  }, []);

  const handleSelect = (id: DemoStepId) => {
    setActiveId(id);
    if (id === "upload") {
      setReplayKey((key) => key + 1);
    }
  };

  const handleReplay = () => {
    if (activeId === "upload") {
      setReplayKey((key) => key + 1);
    }
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
                onCreateProject={() => setActiveId("create")}
              />
            )}
            {activeId === "create" && <ProjectFormScene />}
            {activeId === "type-once" && <TypeOnceScene />}
            {activeId === "generate" && <GenerateScene />}
            {activeId === "ask" && <AskAutodocScene />}
          </DemoAppFrame>
        </div>
      </div>
    </section>
  );
}
