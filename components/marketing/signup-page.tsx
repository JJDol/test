import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SignupAccountTabs } from "@/components/marketing/signup-account-tabs";
import { marketingMono, marketingTitleDisplayNowrap } from "@/lib/marketing/fonts";

export function SignupPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
        <p className={`${marketingMono.className} text-[12px] leading-5 text-[#202326]/45`}>Sign up</p>
        <h1 className={`mt-4 ${marketingTitleDisplayNowrap}`}>
          Which account do you need?
        </h1>
        <SignupAccountTabs />
      </main>
    </MarketingPageShell>
  );
}
