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
      <div className="relative min-h-svh">
        <MarketingHeader overlay />

        <section className="relative isolate h-svh overflow-hidden bg-[#F5F2EB]">
          <h1 className="sr-only">Less Fragmented, More Connected</h1>
          <InformationFlowBackdrop />
        </section>
      </div>

      <div className="relative mt-12">
        <Link
          href="#how-it-works"
          className="absolute left-1/2 top-0 z-20 flex h-11 w-[254px] -translate-x-1/2 items-center justify-center rounded-full bg-[#202306] text-[14px] font-medium leading-5 tracking-[1.12px] text-white"
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
