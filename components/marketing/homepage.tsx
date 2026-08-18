import Link from "next/link";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { InformationFlowBackdrop } from "@/components/marketing/information-flow-backdrop";
import { SAMPLE_PROJECT } from "@/lib/marketing/havnegade-demo";

export function MarketingHomepage() {
  return (
    <div className="min-h-screen bg-[#0b0d12] text-zinc-100">
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <InformationFlowBackdrop />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_42%,rgba(11,13,18,0.88)_0%,rgba(11,13,18,0.62)_34%,rgba(11,13,18,0.28)_58%,rgba(11,13,18,0.12)_78%,transparent_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b0d12]/80 via-transparent to-[#0b0d12]"
        />

        <div className="relative z-10 flex min-h-[100svh] flex-col">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              AutoDOC
            </Link>
            <span className="rounded-full border border-amber-400/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-300">
              SIMULATED DEMO
            </span>
          </header>

          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-24 pt-8 md:px-6">
            <div className="relative max-w-3xl">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-x-10 -inset-y-12 bg-gradient-to-r from-[#0b0d12]/80 via-[#0b0d12]/55 to-transparent blur-2xl"
              />
              <div className="relative">
                <p className="text-xs font-medium tracking-[0.22em] text-zinc-400">
                  CONSTRUCTION DOCUMENTATION
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85),0_18px_50px_rgba(0,0,0,0.55)] md:text-6xl md:leading-[1.05]">
                  See every project fact land in the documents that need it.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-300 [text-shadow:0_8px_24px_rgba(0,0,0,0.8)] md:text-lg">
                  A fictional walkthrough of {SAMPLE_PROJECT.shortName} — a residential conversion in
                  Østerbro, Copenhagen. Contract in, finished documents out.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HowItWorksSection />

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-8 text-sm text-zinc-500 md:px-6">
        <a href="https://aticon.dk" target="_blank" rel="noreferrer" className="hover:text-zinc-300">
          Aticon
        </a>
        <p>Simulated demo · sample project</p>
      </footer>
    </div>
  );
}
