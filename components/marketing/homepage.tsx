import Link from "next/link";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { InformationFlowBackdrop } from "@/components/marketing/information-flow-backdrop";
import { SAMPLE_PROJECT } from "@/lib/marketing/havnegade-demo";

export function MarketingHomepage() {
  return (
    <div className="min-h-screen bg-[#0b0d12] text-zinc-100">
      <header className="relative z-30 bg-[#0f0f0f]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="text-[17px] font-semibold tracking-tight text-white">
            AutoDoc
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-[#0f0f0f]">
        <h1 className="sr-only">AutoDoc Knowledge Built Into Every Document</h1>
        <InformationFlowBackdrop />

        <p className="absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-6xl px-4 pb-8 text-sm leading-relaxed text-zinc-500 md:px-6 md:text-base">
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
