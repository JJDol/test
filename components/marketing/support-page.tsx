"use client";

import type { FormEvent } from "react";
import { Instrument_Serif } from "next/font/google";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const inputClass =
  "mt-2 w-full rounded-full border border-[#1a1a1a]/15 bg-white/50 px-5 py-3 text-[15px] outline-none placeholder:text-[#1a1a1a]/35 focus:border-[#1a1a1a]/40";

export function SupportPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
        <p className="text-sm text-[#1a1a1a]/45">Resources</p>
        <h1 className={`${instrumentSerif.className} mt-4 max-w-[860px] text-5xl leading-[1.08] md:text-7xl`}>
          Tech support
        </h1>

        <div className="mt-12 grid items-start gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
          <div className="max-w-[560px] space-y-5 text-[17px] leading-[1.7] text-[#1a1a1a]/75">
            <p>
              For AutoDoc: generation, validation, chat, and the rest of the product. If you can sign
              in, start with AutoDoc Chat on the project.
            </p>
            <p>
              If something is broken, tell us the project name, what you were doing, and what you
              expected.
            </p>
            <p>
              If you cannot sign in, ask your company admin to invite you. AutoDoc accounts are not
              created from a public form.
            </p>
          </div>

          <form
            className="max-w-[480px]"
            onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
          >
            <label className="block text-sm text-[#1a1a1a]/70">
              Work email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                className={inputClass}
              />
            </label>
            <label className="mt-5 block text-sm text-[#1a1a1a]/70">
              Message
              <textarea
                name="message"
                required
                rows={6}
                placeholder="What you need help with"
                className="mt-2 w-full rounded-2xl border border-[#1a1a1a]/15 bg-white/50 px-5 py-3 text-[15px] outline-none placeholder:text-[#1a1a1a]/35 focus:border-[#1a1a1a]/40"
              />
            </label>
            <button
              type="submit"
              className="mt-8 rounded-full bg-[#1a1a1a] px-8 py-3 text-sm font-medium tracking-[0.08em] text-white"
            >
              SEND
            </button>
          </form>
        </div>
      </main>
    </MarketingPageShell>
  );
}
