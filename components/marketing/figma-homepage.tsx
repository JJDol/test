"use client";

import { DM_Sans, Roboto_Mono, Work_Sans } from "next/font/google";
import { useState } from "react";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: "500",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const NAV = [
  { label: "Benefits", href: "#benefits" },
  { label: "Specifications", href: "#specifications" },
  { label: "How-to", href: "#how-to" },
  { label: "Contact Us", href: "#contact" },
] as const;

const FEATURES = [
  {
    number: "01",
    text: "Spot Trends in Seconds: No more digging through numbers.",
  },
  {
    number: "02",
    text: "Get Everyone on the Same Page: Share easy-to-understand reports with your team.",
  },
  {
    number: "03",
    text: "Make Presentations Pop: Interactive maps and dashboards keep your audience engaged.",
  },
  {
    number: "04",
    text: "Your Global Snapshot: Get a quick, clear overview of your entire operation.",
  },
] as const;

export function FigmaHomepage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`${workSans.className} relative bg-[#F2EFE8] text-[#202326]`}>
      <div className="relative mx-auto flex min-h-svh w-full max-w-[1280px] flex-col items-center px-4 pb-5 md:px-10">
        <nav className="hidden h-[148px] w-full shrink-0 items-center justify-between pb-20 pt-5 md:flex">
          <a href="#benefits" className={`${dmSans.className} text-[30px] font-medium leading-[1.2] tracking-[-1.5px]`}>
            AutoDoc
          </a>
          <a
            href="#benefits"
            className="inline-flex items-center justify-center gap-[2px] rounded-[12px] bg-[#202326] px-[22px] py-[14px] text-[14px] font-semibold leading-[1.4] tracking-[-0.35px] text-[#F2EFE8]"
          >
            Learn More
            <span className="inline-flex h-[6px] w-[7px] items-center">
              <img src="/images/marketing/figma-learn-more-arrow.svg" alt="" width={6} height={6} className="h-[6px] w-[6px]" />
            </span>
          </a>
        </nav>

        <div className="absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 items-center gap-[27px] overflow-hidden rounded-[12px] bg-white/40 px-6 py-5 text-[14px] font-semibold leading-[1.4] tracking-[-0.35px] backdrop-blur-[15px] md:flex">
          {NAV.map((item) => (
            <a key={item.label} href={item.href} className="whitespace-nowrap">
              {item.label}
            </a>
          ))}
        </div>

        <header
          className={`w-full md:hidden ${
            menuOpen ? "rounded-b-[12px] bg-[#FDC57E] shadow-[0px_2px_4px_rgba(0,0,0,0.05)]" : ""
          }`}
        >
          <div className="flex items-center justify-between px-5 pb-[50px] pt-5">
            <a href="#benefits" className={`${dmSans.className} text-[30px] font-medium leading-[1.2] tracking-[-2.4px]`}>
              AutoDoc
            </a>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="size-6 shrink-0"
            >
              <img src="/images/marketing/figma-menu-icon.svg" alt="" width={24} height={24} className="size-6" />
            </button>
          </div>
          {menuOpen && (
            <div className="flex flex-col gap-[50px] px-5 pb-8 pt-2">
              <div>
                {NAV.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block border-t border-[#F2EFE8] py-[30px] text-[14px] font-semibold leading-[1.4] tracking-[-0.35px]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
              <a
                href="#benefits"
                onClick={() => setMenuOpen(false)}
                className="inline-flex w-fit items-center justify-center rounded-[12px] bg-[#F2EFE8] px-[22px] py-[14px] text-[14px] font-semibold leading-[1.4] tracking-[-0.35px] text-[#202326]"
              >
                Learn More
              </a>
            </div>
          )}
        </header>

        <main className="flex w-full flex-col items-start">
          <div id="benefits" className="flex h-[509px] w-full flex-col items-start pb-[120px] md:h-[844px]">
            <section className="relative h-[409px] w-full border-t-[0.5px] border-[#F2EFE8] md:h-[367px]" />
          </div>

          <section className="flex w-full items-start pb-[120px]">
            <div className="flex w-full flex-col items-start gap-10 border-t border-[#F2EFE8] pb-20 pt-[60px]">
              <div className="flex w-full flex-col items-start gap-10 pr-0 md:pr-20">
                <h1 className="w-full text-[48px] font-normal leading-[0.9] tracking-[-1.8px] md:text-[60px]">
                  See the Big Picture
                </h1>
                <p className="w-full text-[15px] font-normal leading-[1.4] tracking-[-0.075px] text-[#6F6F6F]">
                  Area turns your data into clear, vibrant visuals that show you exactly what&apos;s happening in each
                  region.
                </p>
              </div>

              <div id="specifications" className="flex w-full flex-col items-start tracking-[-0.075px]">
                {FEATURES.map((feature) => (
                  <div
                    key={feature.number}
                    className="flex w-full items-start justify-center gap-[30px] border-t border-[#F2EFE8] py-5 pr-0 md:pr-20"
                  >
                    <p className="shrink-0 text-[15px] font-bold leading-[1.4] text-[#6F6F6F]">{feature.number}</p>
                    <p className="min-w-0 flex-1 text-[15px] font-normal leading-[1.4] text-[#202326]">{feature.text}</p>
                  </div>
                ))}
              </div>

              <a
                id="how-to"
                href="#benefits"
                className="inline-flex items-center justify-center rounded-[12px] bg-[#F2EFE8] px-[22px] py-[14px] text-[14px] font-semibold leading-[1.4] tracking-[-0.35px] text-[#202326]"
              >
                Discover More
              </a>
            </div>
          </section>
        </main>

        <footer
          id="contact"
          className="flex w-full flex-col items-start justify-end gap-20 border-t border-[#F2EFE8] pb-5 pt-10"
        >
          <div className="flex h-10 w-full items-center">
            <div className="flex items-center gap-[27px] text-[14px] font-semibold leading-[1.4] tracking-[-0.35px]">
              {NAV.slice(0, 3).map((item) => (
                <a key={item.label} href={item.href}>
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="flex w-full items-end gap-10">
            <div className="relative h-[70px] w-[31.751px] shrink-0 overflow-visible" aria-label="ATI:lab">
              <img
                src="/images/marketing/atilab-logo.svg"
                alt=""
                width={346}
                height={195}
                className="absolute bottom-0 left-0 h-[195px] w-[346px] max-w-none"
              />
            </div>
            <div
              className={`${robotoMono.className} flex min-w-0 flex-1 items-center gap-4 text-[12px] tracking-[-0.12px] text-[#485C11]`}
            >
              <p className="leading-[1.4]">© Area.</p>
              <p className="leading-[1.4]">2025</p>
            </div>
            <p className={`${robotoMono.className} shrink-0 text-[12px] leading-[1.4] tracking-[-0.12px] text-[#485C11]`}>
              All Rights Reserved
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
