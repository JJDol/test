import { MARKETING_FEATURES } from "@/components/marketing/key-features-section";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingMono } from "@/lib/marketing/fonts";

export function FeaturesPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
        <p className={`${marketingMono.className} text-[12px] leading-5 text-[#202326]/45`}>
          PRODUCT
        </p>
        <h1 className="mt-4 text-[40px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px]">
          Features
        </h1>
        <p className="mt-6 max-w-[760px] text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/70">
          Discover how AutoDoc brings project information, company knowledge, and collaboration
          into one consistent document workflow.
        </p>

        <div className="mt-20 border-t border-[#202326]/15">
          {MARKETING_FEATURES.map((feature, index) => (
            <section
              id={feature.id}
              key={feature.title}
              className="grid scroll-mt-24 gap-8 border-b border-[#202326]/15 py-14 md:grid-cols-2 md:items-center md:gap-14 md:py-20 lg:gap-24"
            >
              <img
                src={feature.image}
                alt=""
                className={`aspect-[4/3] w-full rounded-xl object-cover ${
                  index % 2 === 1 ? "md:order-2" : ""
                }`}
              />
              <div>
                <p
                  className={`${marketingMono.className} text-[11px] leading-5 text-[#202326]/45`}
                >
                  FEATURE {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-3 text-[30px] font-medium leading-[38px] tracking-[-2px] md:text-[38px] md:leading-[46px]">
                  {feature.title}
                </h2>
                <p className="mt-6 text-[22px] font-medium leading-[30px] tracking-[-1.92px] text-[#202326]/45 md:text-[24px]">
                  {feature.further}
                </p>
                <p className="mt-6 max-w-[640px] text-justify text-[17px] leading-[26px] tracking-[-1px] text-[#202326]/80">
                  {feature.detail}
                </p>
              </div>
            </section>
          ))}
        </div>
      </main>
    </MarketingPageShell>
  );
}
