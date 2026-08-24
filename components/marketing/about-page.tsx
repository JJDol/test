import { Instrument_Serif } from "next/font/google";
import { AboutSections } from "@/components/marketing/about-sections";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export function AboutPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
        <p className="text-sm text-[#1a1a1a]/45">About us</p>
        <h1 className={`${instrumentSerif.className} mt-4 max-w-[920px] text-5xl leading-[1.08] md:text-7xl`}>
          ATI:lab builds AutoDoc for the way projects actually run.
        </h1>
        <p className="mt-8 max-w-[640px] text-[17px] leading-relaxed text-[#1a1a1a]/75">
          We come from practice: architecture, engineering, and the documentation that has to stay true
          across a project. AutoDoc is how we keep that knowledge consistent.
        </p>
        <AboutSections />
      </main>
    </MarketingPageShell>
  );
}
