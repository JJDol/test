import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SignupAccountTabs } from "@/components/marketing/signup-account-tabs";
import { marketingMono } from "@/lib/marketing/fonts";

export function SignupPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
        <p className={`${marketingMono.className} text-[12px] leading-5 text-[#1a1a1a]/45`}>Sign up</p>
        <h1 className="mt-4 max-w-[920px] text-[40px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px]">
          Which account do you need?
        </h1>
        <SignupAccountTabs />
      </main>
    </MarketingPageShell>
  );
}
