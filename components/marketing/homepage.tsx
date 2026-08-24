import Link from "next/link";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { InformationFlowBackdrop } from "@/components/marketing/information-flow-backdrop";
import { KeyFeaturesSection } from "@/components/marketing/key-features-section";
import { LatestNewsSection } from "@/components/marketing/latest-news-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

export function MarketingHomepage() {
  return (
    <div className="bg-[#F5F2EB] text-[#1a1a1a]">
      <div className="flex min-h-svh flex-col">
        <MarketingHeader loginHref="#how-it-works" />

        <section className="relative isolate min-h-0 flex-1 overflow-hidden bg-[#2134c4]">
          <h1 className="sr-only">Project Knowledge Made Consistent</h1>
          <InformationFlowBackdrop />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-8 md:pb-10">
            <Link
              href="#how-it-works"
              className="pointer-events-auto rounded-full bg-[#1a1a1a] px-8 py-3 text-sm font-medium tracking-[0.08em] text-white"
            >
              TRY AUTODOC
            </Link>
          </div>
        </section>
      </div>

      <KeyFeaturesSection />
      <HowItWorksSection />
      <LatestNewsSection />
      <MarketingFooter />
    </div>
  );
}
