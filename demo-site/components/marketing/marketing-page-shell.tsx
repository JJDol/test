import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { marketingSans } from "@/lib/marketing/fonts";

export function MarketingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${marketingSans.className} min-h-svh bg-[#F5F2EB] text-[#1a1a1a]`}>
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
