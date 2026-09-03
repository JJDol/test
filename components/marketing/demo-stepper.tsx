import type { DemoStep, DemoStepId } from "@/lib/marketing/havnegade-demo";
import { cn } from "@/lib/utils";

interface DemoStepperProps {
  steps: DemoStep[];
  activeId: DemoStepId;
  onSelect: (id: DemoStepId) => void;
}

export function DemoStepper({ steps, activeId, onSelect }: DemoStepperProps) {
  return (
    <ol className="relative flex w-full gap-5 overflow-x-auto pb-1 lg:h-full lg:flex-col lg:gap-12 lg:overflow-visible lg:pb-0 lg:pt-[98px]">
      <span
        aria-hidden
        className="absolute left-[22px] top-[116px] hidden h-[368px] w-px rounded-full bg-[#202326]/20 lg:block"
      />
      {steps.map((step) => {
        const isActive = step.id === activeId;
        return (
          <li key={step.id} className="relative z-10 flex shrink-0">
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              className="flex items-center gap-3.5 text-left lg:gap-12"
            >
              <span className="flex h-[45px] w-[45px] shrink-0 items-center justify-center">
                <span
                  className={cn(
                    "rounded-full transition-[width,height,border-color,background-color] duration-200",
                    isActive
                      ? "h-[45px] w-[45px] border border-[#202326] bg-[#F7F5F0]"
                      : "h-7 w-7 bg-[#8B8B89]"
                  )}
                />
              </span>
              <span
                className={cn(
                  "whitespace-nowrap font-medium transition-[font-size,line-height,color] duration-200",
                  isActive
                    ? "text-[18px] leading-[22px] text-[#202326]"
                    : "text-[15px] leading-[18px] text-[#202326]/75"
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
