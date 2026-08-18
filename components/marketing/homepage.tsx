import Link from "next/link";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { SAMPLE_PROJECT } from "@/lib/marketing/havnegade-demo";

export function MarketingHomepage() {
  return (
    <div className="min-h-screen bg-[#0b0d12] text-zinc-100">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          AutoDOC
        </Link>
        <span className="rounded-full border border-amber-400/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-300">
          SIMULATED DEMO
        </span>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pb-6 pt-10 md:px-6 md:pt-16">
        <p className="text-xs font-medium tracking-[0.22em] text-zinc-500">
          CONSTRUCTION DOCUMENTATION
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
          See every project fact land in the documents that need it.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
          A fictional walkthrough of {SAMPLE_PROJECT.shortName} — a residential conversion in
          Østerbro, Copenhagen. Contract in, finished documents out.
        </p>
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
