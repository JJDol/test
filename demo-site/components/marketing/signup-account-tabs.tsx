"use client";

import { useEffect, useState } from "react";
import { APP_SIGN_IN } from "@/lib/marketing/links";
import { marketingMono } from "@/lib/marketing/fonts";

type AccountTab = "company-admin" | "individual";

const TABS: { id: AccountTab; label: string }[] = [
  { id: "company-admin", label: "Company admin" },
  { id: "individual", label: "Individual account" },
];

const inputClass =
  "mt-2 h-[46px] w-full rounded-full border border-[#1a1a1a]/15 bg-[#F5F2EB] px-5 text-[15px] leading-[24px] tracking-[-0.6px] outline-none placeholder:text-[#1a1a1a]/35 focus:border-[#1a1a1a]/40";

function readTabFromHash(): AccountTab {
  if (typeof window === "undefined") return "company-admin";
  return window.location.hash === "#individual" ? "individual" : "company-admin";
}

export function SignupAccountTabs() {
  const [tab, setTab] = useState<AccountTab>("company-admin");

  useEffect(() => {
    setTab(readTabFromHash());
    const onHash = () => setTab(readTabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function selectTab(next: AccountTab) {
    setTab(next);
    window.history.replaceState(null, "", `/signup#${next}`);
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Account type"
        className="mt-8 inline-flex rounded-full border border-[#1a1a1a]/15 p-1"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              onClick={() => selectTab(item.id)}
              className={`rounded-full px-4 py-2 text-[15px] transition ${
                selected
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#1a1a1a]/55 hover:text-[#1a1a1a]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "company-admin" ? (
        <section
          id="panel-company-admin"
          role="tabpanel"
          aria-labelledby="tab-company-admin"
          className="mt-12 max-w-[640px]"
        >
          <p className={`${marketingMono.className} text-[12px] leading-5 text-[#1a1a1a]/45`}>COMPANY ADMIN</p>
          <h2 className="mt-4 text-[36px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px]">
            First account for the practice
          </h2>
          <p className="mt-6 text-[17px] leading-[24.375px] tracking-[-1px] text-[#1a1a1a]/75">
            Created by ATI:lab. This person owns the company workspace, invites colleagues, and
            manages who can use AutoDoc.
          </p>
          <form className="mt-10">
            <label className="block text-sm text-[#1a1a1a]/70">
              Company
              <input
                name="company"
                type="text"
                autoComplete="organization"
                placeholder="Practice or company name"
                className={inputClass}
              />
            </label>
            <label className="mt-5 block text-sm text-[#1a1a1a]/70">
              Admin name
              <input
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Who should be the company admin"
                className={inputClass}
              />
            </label>
            <label className="mt-5 block text-sm text-[#1a1a1a]/70">
              Work email
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className={inputClass}
              />
            </label>
            <a
              href="/about#contact"
              className="mt-8 flex h-11 w-full items-center justify-center rounded-full bg-[#1a1a1a] px-8 text-[15px] font-medium leading-5 text-white"
            >
              REQUEST COMPANY ADMIN
            </a>
            <p className={`${marketingMono.className} mt-4 text-[12px] leading-5 text-[#1a1a1a]/45`}>
              This is a request to ATI:lab. It does not open a login by itself.
            </p>
          </form>
        </section>
      ) : (
        <section
          id="panel-individual"
          role="tabpanel"
          aria-labelledby="tab-individual"
          className="mt-12 max-w-[640px]"
        >
          <p className={`${marketingMono.className} text-[12px] leading-5 text-[#1a1a1a]/45`}>INDIVIDUAL ACCOUNT</p>
          <h2 className="mt-4 text-[36px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px]">
            Join the company workspace
          </h2>
          <p className="mt-6 text-[17px] leading-[24.375px] tracking-[-1px] text-[#1a1a1a]/75">
            Created by your company admin, not on this page. You get an email invite, set a
            password, and then you only log in.
          </p>
          <ol className="mt-8 space-y-4 text-[16px] leading-relaxed text-[#1a1a1a]/70">
            <li>
              <span className={`${marketingMono.className} text-[12px] text-[#1a1a1a]/45`}>01 — </span>
              Ask the company admin to invite you.
            </li>
            <li>
              <span className={`${marketingMono.className} text-[12px] text-[#1a1a1a]/45`}>02 — </span>
              Open the invitation email and finish account setup.
            </li>
            <li>
              <span className={`${marketingMono.className} text-[12px] text-[#1a1a1a]/45`}>03 — </span>
              After that, sign in with the same email.
            </li>
          </ol>
          <a
            href={APP_SIGN_IN}
            className="mt-10 flex h-11 w-full items-center justify-center rounded-full bg-[#1a1a1a] px-8 text-[15px] font-medium leading-5 text-white"
          >
            LOG IN
          </a>
          <p className="mt-4 text-[13px] leading-relaxed text-[#1a1a1a]/45">
            No invite yet? Ask the person who runs AutoDoc in your practice, or write to{" "}
            <a href="/support" className="underline underline-offset-2">
              tech support
            </a>
            .
          </p>
        </section>
      )}
    </>
  );
}
