import { Instrument_Serif } from "next/font/google";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SignupAccountTabs } from "@/components/marketing/signup-account-tabs";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export function SignupPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
        <p className="text-sm text-[#1a1a1a]/45">Sign up</p>
        <h1 className={`${instrumentSerif.className} mt-4 max-w-[920px] text-5xl leading-[1.08] md:text-7xl`}>
          Which account do you need?
        </h1>
        <SignupAccountTabs />
      </main>
    </MarketingPageShell>
  );
}
