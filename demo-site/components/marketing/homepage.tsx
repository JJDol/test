import Link from "next/link";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { InformationFlowBackdrop } from "@/components/marketing/information-flow-backdrop";
import { KeyFeaturesSection } from "@/components/marketing/key-features-section";
import { LatestNewsSection } from "@/components/marketing/latest-news-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { marketingSans } from "@/lib/marketing/fonts";

export function MarketingHomepage() {
  return (
    <div className={`${marketingSans.className} bg-[#F5F2EB] text-[#1a1a1a]`}>
      <div className="flex min-h-svh flex-col">
        <MarketingHeader />

        <section className="relative isolate min-h-0 flex-1 overflow-hidden bg-[#2134c4]">
          <h1 className="sr-only">Project Knowledge Made Consistent</h1>
          <InformationFlowBackdrop />
        </section>
      </div>

      <div className="relative mt-12">
        <Link
          href="#how-it-works"
          className="absolute left-5 top-0 z-20 flex h-11 w-[254px] items-center justify-center rounded-full bg-[#202306] text-[14px] font-medium leading-5 tracking-[1.12px] text-white md:left-8 lg:left-[max(2.5rem,calc((100vw-1760px)/2))]"
        >
          VIEW PRODUCT TOUR
        </Link>
        <KeyFeaturesSection />
      </div>
      <HowItWorksSection />
      <LatestNewsSection />
      <MarketingFooter />
    </div>
  );
}
