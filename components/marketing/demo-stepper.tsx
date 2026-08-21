import type { DemoStep, DemoStepId } from "@/lib/marketing/havnegade-demo";
import { cn } from "@/lib/utils";

interface DemoStepperProps {
  steps: DemoStep[];
  activeId: DemoStepId;
  onSelect: (id: DemoStepId) => void;
}

export function DemoStepper({ steps, activeId, onSelect }: DemoStepperProps) {
  return (
    <ol className="flex w-full gap-5 overflow-x-auto pb-1 lg:h-full lg:flex-col lg:justify-between lg:gap-0 lg:overflow-visible lg:py-[10%]">
      {steps.map((step) => {
        const isActive = step.id === activeId;
        return (
          <li key={step.id} className="flex shrink-0">
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              className="flex items-center gap-3.5 text-left"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                <span
                  className={cn(
                    "rounded-full transition",
                    isActive
                      ? "h-7 w-7 border border-[#1a1a1a] bg-transparent"
                      : "h-2.5 w-2.5 bg-[#D4CFC6]"
                  )}
                />
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[15px] tracking-tight",
                  isActive ? "font-medium text-[#1a1a1a]" : "text-[#1a1a1a]/40"
                )}
              >
                {step.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
