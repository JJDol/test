import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

export function MarketingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[#F5F2EB] text-[#1a1a1a]">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
