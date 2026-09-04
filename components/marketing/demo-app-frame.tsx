import { RotateCcw } from "lucide-react";
import { demoColors } from "@/lib/marketing/demo-colors";
import { marketingMono } from "@/lib/marketing/fonts";

interface DemoAppFrameProps {
  title: string;
  status: string;
  onReplay: () => void;
  sidebar: React.ReactNode;
  caption?: string;
  children: React.ReactNode;
}

export function DemoAppFrame({
  title,
  status,
  onReplay,
  sidebar,
  caption,
  children,
}: DemoAppFrameProps) {
  return (
    <div
      className="relative flex h-[32rem] max-h-[32rem] w-full flex-col overflow-hidden rounded-[16px] border lg:h-[771px] lg:max-h-[771px]"
      style={{ backgroundColor: demoColors.shellBg, borderColor: demoColors.shellBorder }}
    >
      <div className="relative flex shrink-0 items-center px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: demoColors.shellDot }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: demoColors.shellDot }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: demoColors.shellDot }} />
        </div>
        <span
          className={`${marketingMono.className} ml-auto text-[15px] leading-[15px] tracking-[1.8px]`}
          style={{ color: demoColors.shellLabel }}
        >
          SIMULATED DEMO
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-white/10 px-5 py-4 lg:w-[min(100%,408px)] lg:border-b-0 lg:border-r lg:px-8 lg:py-6">
          <div className="lg:translate-x-[45px]">{sidebar}</div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <p
            className={`${marketingMono.className} hidden shrink-0 px-5 pt-5 text-[15px] leading-[16.5px] tracking-[1.76px] lg:block lg:px-6`}
            style={{ color: demoColors.shellMeta }}
          >
            {title}
          </p>
          {caption ? (
            <p
              className="shrink-0 px-5 pt-3 text-[13px] leading-snug lg:px-6 lg:pt-4"
              style={{ color: demoColors.shellMeta }}
            >
              {caption}
            </p>
          ) : null}
          <div className="relative min-h-0 flex-1 overflow-hidden px-5 pb-4 pt-3 lg:px-6 lg:pb-6 lg:pt-4">
            {children}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <p
          className={`${marketingMono.className} text-[11px] leading-[16.5px] tracking-[0.275px]`}
          style={{ color: demoColors.shellMeta }}
        >
          {status}
        </p>
        <button
          type="button"
          onClick={onReplay}
          className={`${marketingMono.className} inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11px] font-medium leading-[16.5px] tracking-[0.275px] transition hover:bg-white/5`}
          style={{ color: demoColors.shellMeta }}
        >
          <RotateCcw className="h-3 w-3" />
          REPLAY
        </button>
      </div>
    </div>
  );
}
