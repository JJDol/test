import { RotateCcw } from "lucide-react";

interface DemoAppFrameProps {
  title: string;
  status: string;
  onReplay: () => void;
  children: React.ReactNode;
}

export function DemoAppFrame({ title, status, onReplay, children }: DemoAppFrameProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#14161c] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <p className="hidden absolute left-1/2 -translate-x-1/2 text-[11px] font-medium tracking-[0.14em] text-zinc-400 sm:block">
          {title}
        </p>
        <span className="rounded-full border border-amber-400/50 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300">
          SIMULATED DEMO
        </span>
      </div>

      <div className="relative min-h-[420px] overflow-x-hidden overflow-y-auto md:min-h-[500px]">{children}</div>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <p className="font-mono text-[11px] tracking-wide text-emerald-400">{status}</p>
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium tracking-wide text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          <RotateCcw className="h-3 w-3" />
          REPLAY
        </button>
      </div>
    </div>
  );
}
