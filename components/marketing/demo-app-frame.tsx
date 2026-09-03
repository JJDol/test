import { RotateCcw } from "lucide-react";

interface DemoAppFrameProps {
  title: string;
  status: string;
  onReplay: () => void;
  children: React.ReactNode;
}

export function DemoAppFrame({ title, status, onReplay, children }: DemoAppFrameProps) {
  return (
    <div className="relative flex min-h-[28rem] w-full flex-col overflow-hidden rounded-[12px] border border-[#1a1a1a]/20 bg-[#202326]/15 md:aspect-[16/9] md:min-h-0">
      <div className="relative flex shrink-0 items-center px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#C9C4BA]" />
          <span className="h-2 w-2 rounded-full bg-[#C9C4BA]" />
          <span className="h-2 w-2 rounded-full bg-[#C9C4BA]" />
        </div>
        <p className="absolute left-1/2 hidden -translate-x-1/2 font-mono text-[11px] font-medium tracking-[0.16em] text-[#1a1a1a]/55 sm:block">
          {title}
        </p>
        <span className="ml-auto font-mono text-[10px] font-medium tracking-[0.18em] text-[#1a1a1a]/40">
          SIMULATED PRODUCT TOUR
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>

      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <p className="font-mono text-[11px] tracking-wide text-[#1a1a1a]/45">{status}</p>
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex items-center gap-1.5 rounded-[12px] px-2 py-1 text-[11px] font-medium tracking-wide text-[#1a1a1a]/45 transition hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]"
        >
          <RotateCcw className="h-3 w-3" />
          REPLAY
        </button>
      </div>
    </div>
  );
}
