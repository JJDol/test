import { AboutSections } from "@/components/marketing/about-sections";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingMono } from "@/lib/marketing/fonts";

export function AboutPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
        <p className={`${marketingMono.className} text-[12px] leading-5 text-[#1a1a1a]/45`}>About us</p>
        <h1 className="mt-4 max-w-[920px] text-[40px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px]">
          ATI:lab builds AutoDoc for the way projects actually run.
        </h1>
        <p className="mt-8 max-w-[640px] text-[17px] leading-[24.375px] tracking-[-1px] text-[#1a1a1a]/75">
          We come from practice: architecture, engineering, and the documentation that has to stay true
          across a project. AutoDoc is how we keep that knowledge consistent.
        </p>
        <AboutSections />
      </main>
    </MarketingPageShell>
  );
}
