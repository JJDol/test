import type { DemoStep, DemoStepId } from "@/lib/marketing/havnegade-demo";
import { demoColors } from "@/lib/marketing/demo-colors";
import { cn } from "@/lib/utils";

interface DemoStepperProps {
  steps: DemoStep[];
  activeId: DemoStepId;
  onSelect: (id: DemoStepId) => void;
  variant?: "dark" | "light";
}

export function DemoStepper({
  steps,
  activeId,
  onSelect,
  variant = "dark",
}: DemoStepperProps) {
  const isDark = variant === "dark";
  const activeText = isDark ? demoColors.stepDarkActiveText : demoColors.stepActiveText;
  const inactiveText = isDark ? demoColors.stepDarkInactiveText : demoColors.stepInactiveText;
  const inactiveDot = isDark ? demoColors.stepDarkInactiveDot : demoColors.stepInactiveDot;
  const activeBorder = isDark ? demoColors.stepDarkActiveBorder : demoColors.stepActiveBorder;

  return (
    <ol className="relative flex w-full gap-5 overflow-x-auto pb-1 lg:flex-col lg:gap-12 lg:overflow-visible lg:pb-0">
      <span
        aria-hidden
        className={cn(
          "absolute top-[22.5px] bottom-[22.5px] left-[22.5px] hidden w-[2px] -translate-x-1/2 rounded-full lg:block",
          isDark ? "bg-white/40" : "opacity-40"
        )}
        style={isDark ? undefined : { backgroundColor: demoColors.stepConnector }}
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
                    isActive ? "h-[45px] w-[45px] border" : "h-[18px] w-[18px]"
                  )}
                  style={
                    isActive
                      ? {
                          backgroundColor: demoColors.stepActiveBg,
                          borderColor: activeBorder,
                        }
                      : { backgroundColor: inactiveDot }
                  }
                />
              </span>
              <span
                className={cn(
                  "whitespace-nowrap font-medium transition-[font-size,line-height,color] duration-200",
                  isActive ? "text-[18px] leading-[22px]" : "text-[15px] leading-[18px]"
                )}
                style={{ color: isActive ? activeText : inactiveText }}
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
