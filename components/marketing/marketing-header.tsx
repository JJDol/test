"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { APP_SIGN_IN, MARKETING_NAV } from "@/lib/marketing/links";

export function MarketingHeader({ loginHref = APP_SIGN_IN }: { loginHref?: string }) {
  return (
    <header className="relative z-40 bg-[#F5F2EB]">
      <div className="mx-auto grid h-[72px] w-full max-w-[1760px] grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8 lg:px-10">
        <Link href="/" className="justify-self-start text-[22px] font-semibold leading-[33px] tracking-[-1px] text-[#1a1a1a]">
          AutoDoc
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {MARKETING_NAV.map((group) => (
            <div key={group.label} className="group relative">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                className="inline-flex cursor-pointer items-center gap-1 text-[15px] leading-[22.5px] tracking-[-0.6px] text-[#1a1a1a]"
              >
                {group.label}
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
              <div className="invisible absolute left-1/2 top-full z-50 min-w-[160px] -translate-x-1/2 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="rounded-xl border border-black/10 bg-[#F5F2EB] py-2 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                  {group.items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-[#1a1a1a]/80 hover:bg-black/[0.04] hover:text-[#1a1a1a]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>

        <a
          href={loginHref}
          className="justify-self-end rounded-full bg-[#1a1a1a] px-5 py-2 text-[15px] font-medium leading-5 text-white"
        >
          Login
        </a>
      </div>
      <nav className="flex items-center justify-center gap-5 border-t border-[#1a1a1a]/10 px-4 py-2 md:hidden">
        {MARKETING_NAV.map((group) => (
          <Link key={group.label} href={group.href} className="text-sm text-[#1a1a1a]/80">
            {group.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
