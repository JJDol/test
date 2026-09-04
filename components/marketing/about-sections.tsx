"use client";

import { useEffect, useState } from "react";
import { marketingMono, marketingTitleSection } from "@/lib/marketing/fonts";

type AboutTab = "vision" | "careers" | "contact";

const TABS: { id: AboutTab; label: string }[] = [
  { id: "vision", label: "Our vision" },
  { id: "careers", label: "Careers" },
  { id: "contact", label: "Contact" },
];

function readTabFromHash(): AboutTab {
  if (typeof window === "undefined") return "vision";
  const hash = window.location.hash.replace("#", "");
  if (hash === "careers" || hash === "contact" || hash === "vision") return hash;
  return "vision";
}

export function AboutSections() {
  const [tab, setTab] = useState<AboutTab>("vision");

  useEffect(() => {
    const sync = () => setTab(readTabFromHash());
    sync();
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (!link) return;
      const url = new URL(link.href, window.location.href);
      if (url.pathname.replace(/\/$/, "") === "/about" && url.hash) {
        queueMicrotask(sync);
      }
    };
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
      document.removeEventListener("click", onClick);
    };
  }, []);

  function selectTab(next: AboutTab) {
    setTab(next);
    window.history.replaceState(null, "", `/about#${next}`);
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="About us"
        className="mt-8 inline-flex rounded-[12px] border border-[#202326]/15 p-1"
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
              className={`rounded-[12px] px-4 py-2 text-[15px] transition ${
                selected ? "bg-[#202326] text-white" : "text-[#202326]/55 hover:text-[#202326]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "vision" ? (
        <section
          id="panel-vision"
          role="tabpanel"
          aria-labelledby="tab-vision"
          className="mt-12 space-y-5 text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/80"
        >
          <h2 className={marketingTitleSection}>Our vision</h2>
          <div className="max-w-[720px] space-y-5">
          <p>
            Project knowledge should be entered once, stay current, and appear correctly in every
            document that depends on it. That is the job AutoDoc is built to do.
          </p>
          <p>
            Too much of a project still lives in parallel files, inboxes, and memory. When facts
            drift, so does the quality of the work. We want teams to work from one shared base of
            project information, checked against the standards they already trust.
          </p>
          <p>
            ATI:lab builds AutoDoc with Aticon as a practice partner and Buildersgate as our
            joint-development partner. The aim is a tool that feels native to architecture and
            construction — not a generic document generator dropped onto a building project.
          </p>
          </div>
        </section>
      ) : null}

      {tab === "careers" ? (
        <section
          id="panel-careers"
          role="tabpanel"
          aria-labelledby="tab-careers"
          className="mt-12 space-y-5 text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/80"
        >
          <h2 className={marketingTitleSection}>Careers</h2>
          <div className="max-w-[720px] space-y-5">
          <p>
            We are a small team in Copenhagen, working with colleagues in Seoul. The work sits
            between product, design, and the reality of Danish building documentation.
          </p>
          <p>
            We are not listing open roles on this page yet. If you want to help build AutoDoc —
            design, engineering, or domain knowledge from practice — write to us and tell us what
            you would bring.
          </p>
          <button
            type="button"
            onClick={() => selectTab("contact")}
            className="inline-flex h-11 items-center rounded-[12px] bg-[#202326] px-8 text-[15px] font-medium leading-5 tracking-normal text-white"
          >
            SEND A NOTE
          </button>
          </div>
        </section>
      ) : null}

      {tab === "contact" ? (
        <section
          id="panel-contact"
          role="tabpanel"
          aria-labelledby="tab-contact"
          className="mt-12 space-y-8 text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/80"
        >
          <h2 className={marketingTitleSection}>Contact</h2>
          <div className="max-w-[720px] space-y-8">
          <p>For AutoDoc and ATI:lab, start here.</p>
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className={`${marketingMono.className} text-[12px] leading-5 text-[#202326]/45`}>STUDIO</dt>
              <dd className="mt-2">
                ATI:lab
                <br />
                Rentemestervej 14
                <br />
                DK-2400 København NV
              </dd>
            </div>
            <div>
              <dt className={`${marketingMono.className} text-[12px] leading-5 text-[#202326]/45`}>PHONE</dt>
              <dd className="mt-2">
                <a href="tel:+4541952400" className="hover:underline">
                  +45 41 95 24 00
                </a>
              </dd>
            </div>
            <div>
              <dt className={`${marketingMono.className} text-[12px] leading-5 text-[#202326]/45`}>TECH SUPPORT</dt>
              <dd className="mt-2">
                <a href="/support" className="hover:underline">
                  AutoDoc support
                </a>
              </dd>
            </div>
          </dl>
          </div>
        </section>
      ) : null}
    </>
  );
}
