import { Instrument_Serif } from "next/font/google";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: readonly LegalSection[];
}) {
  return (
    <MarketingPageShell>
      <article className="mx-auto w-full max-w-[880px] px-5 py-16 md:px-8 md:py-24">
        <p className="text-[13px] text-[#1a1a1a]/45">{eyebrow}</p>
        <h1 className={`${instrumentSerif.className} mt-4 text-5xl leading-[1.08] md:text-6xl`}>{title}</h1>
        <p className="mt-4 text-[13px] text-[#1a1a1a]/45">{updated}</p>
        <p className="mt-8 text-[17px] leading-relaxed text-[#1a1a1a]/75">{intro}</p>
        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-[22px] font-medium tracking-tight">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-[17px] leading-[1.7] text-[#1a1a1a]/80">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </MarketingPageShell>
  );
}

export const TERMS_PAGE = {
  eyebrow: "Resources",
  title: "Terms of Use",
  updated: "Last updated 24 August 2026",
  intro:
    "These terms describe how you may use AutoDoc. They are a working draft for the product site and will be replaced by counsel-reviewed terms before a paid commercial launch.",
  sections: [
    {
      heading: "The service",
      paragraphs: [
        "AutoDoc is a document and project-knowledge tool operated by ATI:lab. You get access through an account issued by your company or by us.",
        "We may change features, limit preview access, or pause the service for maintenance. Material changes to these terms will be posted on this page.",
      ],
    },
    {
      heading: "Your account",
      paragraphs: [
        "You must keep login details confidential and use AutoDoc only for work you are authorised to do. Company administrators are responsible for who they invite.",
        "Do not attempt to access other tenants’ projects, probe the service, or overload it. We may suspend accounts that put the service or other customers at risk.",
      ],
    },
    {
      heading: "Your content",
      paragraphs: [
        "You keep the rights to contracts, drawings, templates, and other files you upload. You grant us a limited licence to process that material so AutoDoc can generate, store, and show documents for your organisation.",
        "You are responsible for having the right to upload the material and for checking generated documents before you rely on them in a project.",
      ],
    },
    {
      heading: "Acceptable use",
      paragraphs: [
        "AutoDoc is for professional project work. You may not use it to break the law, to upload malware, or to train a competing model on other customers’ data.",
      ],
    },
    {
      heading: "Liability",
      paragraphs: [
        "AutoDoc assists documentation; it does not replace professional judgement, codes, or a signed contract. Generated text can be incomplete or wrong. You remain responsible for what you issue.",
        "To the extent Danish law allows, ATI:lab is not liable for indirect loss. These draft terms do not limit liability that cannot be limited by law.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Questions about these terms: ATI:lab, Rentemestervej 14, DK-2400 København NV, or via the Contact section on About us.",
      ],
    },
  ],
} as const;

export const PRIVACY_PAGE = {
  eyebrow: "Resources",
  title: "Privacy",
  updated: "Last updated 24 August 2026",
  intro:
    "This page explains how AutoDoc handles personal data. It is a working draft for the product site. The controller for AutoDoc personal data is ATI:lab.",
  sections: [
    {
      heading: "What we collect",
      paragraphs: [
        "Account data such as name, work email, company, and role. Project files and the text generated from them. Technical logs needed to run and secure the service, such as sign-in time and browser type.",
        "If you write to tech support, we keep the message and any files you attach until the issue is closed and for a short period afterwards.",
      ],
    },
    {
      heading: "Why we use it",
      paragraphs: [
        "To provide AutoDoc, including generation, validation, chat, and collaboration. To keep accounts secure. To answer support requests. To improve the product using aggregated or de-identified signals where we can.",
        "We do not sell personal data. We do not use your project files to train public models.",
      ],
    },
    {
      heading: "Who sees it",
      paragraphs: [
        "People in your organisation who have been given access to the project. ATI:lab and our development partner Buildersgate, under contract, when they need access to operate the product. Hosting and subprocessors that store or process data on our instructions.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "Account and project data last for as long as the organisation uses AutoDoc, then for a limited period needed for backup, disputes, or legal duty. You can ask your administrator to delete a project, or write to us if you cannot.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "Depending on applicable law, you may ask for access, correction, deletion, or restriction, and you may object to certain processing. To exercise these rights, contact us through About us or your company administrator.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Privacy questions: ATI:lab, Rentemestervej 14, DK-2400 København NV. Phone +45 41 95 24 00.",
      ],
    },
  ],
} as const;

export const SECURITY_PAGE = {
  eyebrow: "Resources",
  title: "Security",
  updated: "Last updated 24 August 2026",
  intro:
    "How we approach security for AutoDoc. This is a product description, not a certification claim.",
  sections: [
    {
      heading: "Access",
      paragraphs: [
        "Each organisation’s projects are isolated from other customers. Users sign in with credentials issued for that organisation. Administrators decide who can see which projects.",
      ],
    },
    {
      heading: "Data in transit and at rest",
      paragraphs: [
        "Traffic to AutoDoc is encrypted in transit. Project files and generated documents are stored with the hosting provider we use for the product, with access limited to people who operate the service.",
      ],
    },
    {
      heading: "The application",
      paragraphs: [
        "We keep dependencies current, review changes before they ship, and restrict production access. Preview and demo environments use fictional project data where we can.",
      ],
    },
    {
      heading: "Your side",
      paragraphs: [
        "Use strong unique passwords, invite only people who need access, and treat generated documents as internal until you have checked them. Do not upload secrets that do not belong in project files.",
      ],
    },
    {
      heading: "Report a problem",
      paragraphs: [
        "If you think you have found a security issue in AutoDoc, write to tech support with enough detail to reproduce it. Do not share customer project files on a public channel.",
      ],
    },
  ],
} as const;
