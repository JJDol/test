import type { DemoStep, DemoStepId } from "@/lib/marketing/havnegade-demo";
import { cn } from "@/lib/utils";

interface DemoStepperProps {
  steps: DemoStep[];
  activeId: DemoStepId;
  onSelect: (id: DemoStepId) => void;
}

export function DemoStepper({ steps, activeId, onSelect }: DemoStepperProps) {
  return (
    <ol className="flex gap-3 overflow-x-auto pb-2 md:flex-col md:gap-0 md:overflow-visible md:pb-0">
      {steps.map((step, index) => {
        const isActive = step.id === activeId;
        return (
          <li key={step.id} className="flex shrink-0 md:shrink">
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              className="flex items-center gap-3 rounded-full px-1 py-1 text-left md:w-full md:rounded-none md:px-0 md:py-0"
            >
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition",
                    isActive
                      ? "bg-sky-300 text-zinc-950 shadow-[0_0_18px_rgba(125,211,252,0.55)]"
                      : "border border-white/15 bg-white/5 text-zinc-500"
                  )}
                >
                  {step.number}
                </span>
                {index < steps.length - 1 && (
                  <span className="hidden h-8 w-px bg-white/10 md:block" />
                )}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-sm font-medium md:mb-8",
                  isActive ? "text-white" : "text-zinc-500"
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
