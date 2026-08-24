"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

const NAV = [
  {
    label: "Product",
    items: [
      { label: "Features", href: "#features" },
      { label: "Solutions", href: "#how-it-works" },
      { label: "FAQ", href: "#how-it-works" },
    ],
  },
  {
    label: "About us",
    items: [
      { label: "About", href: "#site-footer" },
      { label: "Careers", href: "#site-footer" },
      { label: "Contact", href: "#site-footer" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Support", href: "#site-footer" },
      { label: "Terms of Use", href: "#site-footer" },
      { label: "Privacy", href: "#site-footer" },
      { label: "Security", href: "#site-footer" },
    ],
  },
] as const;

export function MarketingHeader({ loginHref = "/sign-in" }: { loginHref?: string }) {
  return (
    <header className="relative z-40 bg-[#F5F2EB]">
      <div className="mx-auto grid h-[72px] w-full max-w-[1760px] grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8 lg:px-10">
        <Link href="/" className="justify-self-start text-[22px] font-semibold tracking-tight text-[#1a1a1a]">
          AutoDoc
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((group) => (
            <div key={group.label} className="group relative">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[15px] text-[#1a1a1a]"
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

        <Link
          href={loginHref}
          className="justify-self-end rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white"
        >
          Login
        </Link>
      </div>
      <nav className="flex items-center justify-center gap-5 border-t border-[#1a1a1a]/10 px-4 py-2 md:hidden">
        {NAV.map((group) => (
          <a key={group.label} href={group.items[0].href} className="text-sm text-[#1a1a1a]/80">
            {group.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
