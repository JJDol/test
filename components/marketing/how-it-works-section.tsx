"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { marketingMono, marketingTitleDisplay } from "@/lib/marketing/fonts";

export function HowItWorksSection() {
  const demoRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<DemoStepId>("upload");
  const [demoStarted, setDemoStarted] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(DEMO_STEPS[0].status);
  const [selected, setSelected] = useState<DemoDisciplineId[]>([]);
  const [pickedDocs, setPickedDocs] = useState<DemoPickedDocs>({});
  const [typedValues, setTypedValues] = useState<DemoTypedValues>(emptyTypedValues);

  const [generateStatus, setGenerateStatus] = useState(DEMO_STEPS[3].status);

  useEffect(() => {
    const demo = demoRef.current;
    if (!demo) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setDemoStarted(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(demo);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const restartFromProductTourLink = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.hash !== "#how-it-works") return;

      setActiveId("upload");
      setSelected([]);
      setPickedDocs({});
      setTypedValues(emptyTypedValues());
      setReplayKey((key) => key + 1);
    };

    document.addEventListener("click", restartFromProductTourLink);
    return () => document.removeEventListener("click", restartFromProductTourLink);
  }, []);

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
      <p className={`${marketingMono.className} text-[12px] leading-5 text-[#202326]/45`}>
        How it works — product tour
      </p>
      <h2 className={`mt-4 ${marketingTitleDisplay} text-[#202326]`}>
        From Contract to Project Documents in one seamless flow
      </h2>
      <p className="mt-5 max-w-[760px] text-[15px] leading-[24.375px] tracking-[-0.6px] text-[#202326]/60">
        An interactive walkthrough using sample data. No files are uploaded or production
        documents generated.
      </p>

      <div
        ref={demoRef}
        className="mt-10 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:grid-rows-[auto_auto] lg:gap-x-12"
      >
        <p className="order-1 mb-3 text-left text-[13px] leading-snug text-[#202326]/50 lg:col-start-2 lg:row-start-1 lg:mb-3">
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
                play={demoStarted}
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
                onValuesChange={setTypedValues}
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
                onAskAutoDoc={() => {
                  setReplayKey((key) => key + 1);
                  setActiveId("ask");
                }}
              />
            )}
            {activeId === "ask" && (
              <AskAutodocScene
                key={replayKey}
                typedValues={typedValues}
                pickedDocs={pickedDocs}
              />
            )}
          </DemoAppFrame>
        </div>
      </div>

      <div className="mt-12 grid md:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:gap-x-12">
        <div aria-hidden className="hidden lg:block" />
        <div className="flex justify-center lg:justify-end">
          <a
            href="/signup"
            className="flex h-11 items-center rounded-[12px] bg-[#202326] px-8 text-[15px] font-medium leading-5 text-white"
          >
            SIGN UP
          </a>
        </div>
      </div>
    </section>
  );
}
