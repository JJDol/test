import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingMono } from "@/lib/marketing/fonts";

export type LegalSection = {
  heading: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  trailingParagraphs?: readonly string[];
};

function LegalText({ text }: { text: string }) {
  const links = {
    "www.datatilsynet.dk": "https://www.datatilsynet.dk/",
    "Security page": "/security/",
    "Contact section": "/about/#contact",
  } as const;
  const parts = text.split(/(www\.datatilsynet\.dk|Security page|Contact section)/g);

  return (
    <>
      {parts.map((part, index) => {
        const href = links[part as keyof typeof links];
        if (!href) return part;

        return (
          <Link
            key={`${part}-${index}`}
            href={href}
            className="underline underline-offset-2"
            {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {part}
          </Link>
        );
      })}
    </>
  );
}

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
  intro: string | readonly string[];
  sections: readonly LegalSection[];
}) {
  const introParagraphs = typeof intro === "string" ? [intro] : intro;

  return (
    <MarketingPageShell>
      <article className="mx-auto w-full max-w-[880px] px-5 py-16 md:px-8 md:py-24">
        <p className={`${marketingMono.className} text-[12px] leading-5 text-[#202326]/45`}>{eyebrow}</p>
        <h1 className="mt-4 text-[40px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px]">{title}</h1>
        <p className={`${marketingMono.className} mt-4 text-[12px] leading-5 text-[#202326]/45`}>{updated}</p>
        {introParagraphs.map((paragraph, index) => (
          <p
            key={paragraph}
            className={`${index === 0 ? "mt-8" : "mt-4"} whitespace-pre-line text-justify text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/75`}
          >
            <LegalText text={paragraph} />
          </p>
        ))}
        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-[22px] font-medium leading-[30px] tracking-[-1.76px]">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 whitespace-pre-line text-justify text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/80">
                  <LegalText text={paragraph} />
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 list-disc space-y-2 pl-6 text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/80">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>
                      <LegalText text={bullet} />
                    </li>
                  ))}
                </ul>
              )}
              {section.trailingParagraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 whitespace-pre-line text-justify text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/80">
                  <LegalText text={paragraph} />
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
  title: "Privacy Policy",
  updated: "Last updated 26 August 2026",
  intro: [
    "This Privacy Policy explains how personal data is handled when you visit the AutoDoc website, use AutoDoc, or contact us.",
    "For account administration, support, and the operation of the AutoDoc website, Ati:lab acts as the data controller. When AutoDoc processes project content on behalf of a customer organization, that organization normally acts as the controller and AutoDoc acts as its processor.",
    "This policy is a working draft for the current preview and early-access version of AutoDoc and will be reviewed before commercial launch.",
  ],
  sections: [
    {
      heading: "What we collect",
      paragraphs: ["We may collect:"],
      bullets: [
        "Account information, such as your name, work email address, organization, and role.",
        "Project content, including documents, templates, project information, and text generated or processed through AutoDoc.",
        "Usage and technical information needed to operate and secure the service, such as sign-in times, browser type, device information, and technical logs.",
        "Support information, including messages and files you provide when requesting assistance.",
      ],
      trailingParagraphs: [
        "Please do not upload personal data or confidential information that you are not authorized to process or share.",
      ],
    },
    {
      heading: "Why we use it",
      paragraphs: ["We process personal data to:"],
      bullets: [
        "provide AutoDoc, including document generation, validation, chat, and collaboration;",
        "create and administer user accounts;",
        "maintain the security and reliability of the service;",
        "prevent misuse and investigate technical or security incidents;",
        "respond to support requests;",
        "comply with applicable legal obligations; and",
        "understand and improve AutoDoc using aggregated or anonymized information that does not identify individual users or reveal customer project content.",
      ],
      trailingParagraphs: [
        "We do not sell personal data. We do not use customer project files to train public or general-purpose AI models.",
      ],
    },
    {
      heading: "Our legal bases",
      paragraphs: ["Depending on the type of data and processing, we rely on:"],
      bullets: [
        "performance of a contract or steps taken before entering into a contract;",
        "our legitimate interests in operating, securing, supporting, and improving AutoDoc;",
        "compliance with applicable legal obligations; or",
        "consent, where consent is specifically requested.",
      ],
      trailingParagraphs: [
        "Where AutoDoc processes project content on behalf of a customer organization, the processing is carried out according to that organization’s instructions and the applicable Data Processing Agreement.",
      ],
    },
    {
      heading: "Who can access the data",
      paragraphs: ["Personal data may be accessed by:"],
      bullets: [
        "authorized users within your organization;",
        "authorized Ati:lab personnel who need access to operate, secure, or support AutoDoc;",
        "our contracted development partner, Buildersgate, where access is necessary to develop, maintain, or support the service; and",
        "hosting, infrastructure, AI, and other service providers that process data on our instructions.",
      ],
      trailingParagraphs: [
        "Access is limited according to role and operational need. Service providers and development partners are required to protect the data and may not use it for their own independent purposes.",
      ],
    },
    {
      heading: "International data transfers",
      paragraphs: [
        "Some of our service providers or development resources may operate outside the European Economic Area, including in South Korea.",
        "Where personal data is transferred outside the EEA, we use a lawful transfer mechanism and appropriate safeguards as required by applicable data protection law. These may include an adequacy decision or approved Standard Contractual Clauses, together with additional technical and organizational safeguards where necessary.",
        "You may contact us for further information about the safeguards used for international transfers.",
      ],
    },
    {
      heading: "How long we keep data",
      paragraphs: [
        "Account and project data is retained while the customer organization uses AutoDoc.",
        "When an organization stops using AutoDoc, its data is deleted, returned, or anonymized according to the applicable customer agreement, Data Processing Agreement, and our backup deletion procedures, unless longer retention is required by law or reasonably necessary to establish, exercise, or defend a legal claim.",
        "Technical logs are retained only for as long as needed for security, troubleshooting, and service operation. Support messages and attachments are retained while the request is handled and for a limited period afterward where necessary for follow-up, security, or documentation.",
        "Your organization’s administrator may request the deletion of a project or account. You may contact us if you cannot make the request through your administrator.",
      ],
    },
    {
      heading: "Automated and AI-assisted processing",
      paragraphs: [
        "AutoDoc uses AI-assisted features to generate, retrieve, review, or validate information. These features may process content provided by users.",
        "AutoDoc does not use automated decision-making that produces legal or similarly significant effects concerning individual users. AI-generated output must be reviewed by an authorized professional before it is relied upon or used in a building project.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: ["Depending on the circumstances and applicable law, you may have the right to:"],
      bullets: [
        "access your personal data;",
        "correct inaccurate or incomplete data;",
        "request deletion of your data;",
        "request restriction of processing;",
        "object to certain processing;",
        "receive certain data in a portable format; and",
        "withdraw consent where processing is based on consent.",
      ],
      trailingParagraphs: [
        "Where your data is controlled by your organization, you should normally contact your organization’s administrator first. You may also contact Ati:lab if you are uncertain about whom to contact.",
        "You also have the right to submit a complaint to the Danish Data Protection Authority at www.datatilsynet.dk.",
      ],
    },
    {
      heading: "Security",
      paragraphs: [
        "We use technical and organizational measures intended to protect personal data against unauthorized access, alteration, loss, or disclosure.",
        "More information about how AutoDoc protects customer data is available on our Security page.",
      ],
    },
    {
      heading: "Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy as AutoDoc develops or when our processing practices or legal obligations change.",
        "The date at the top of this page shows when the policy was last updated. We will provide reasonable notice where a change materially affects how personal data is processed.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "For questions about this Privacy Policy, international transfers, or your data protection rights, contact:",
        "Ati:lab\nRentemestervej 14\nDK-2400 København NV\nDenmark\nPhone: +45 41 95 24 00",
        "You may also contact us through the Contact section of the AutoDoc website.",
      ],
    },
  ],
} as const;

export const SECURITY_PAGE = {
  eyebrow: "Resources",
  title: "Security",
  updated: "Last updated 26 August 2026",
  intro:
    "This page explains how we approach security for AutoDoc. It is a product description, not a certification claim.",
  sections: [
    {
      heading: "Access",
      paragraphs: [
        "Each organization’s projects are isolated from those of other customers. Users sign in with credentials issued for their organization. Administrators decide who can access individual projects.",
      ],
    },
    {
      heading: "Data storage and transmission",
      paragraphs: [
        "Traffic to AutoDoc is encrypted in transit. Project files and generated documents are stored with the hosting and storage providers used for AutoDoc.",
        "Access is limited to authorized personnel and contracted service providers who require it to operate, maintain, secure, or support the service.",
      ],
    },
    {
      heading: "The application",
      paragraphs: [
        "We regularly review and update application dependencies, review changes before deployment, and restrict access to production systems.",
        "Preview and demonstration environments are intended to use fictional or appropriately sanitized project data.",
      ],
    },
    {
      heading: "Your responsibilities",
      paragraphs: [
        "Use strong, unique passwords and do not share your login credentials. Invite only people who require access and regularly review who can access your organization’s projects.",
        "Treat generated documents as internal until they have been reviewed. Do not upload passwords, access keys, or other secrets that do not belong in project files.",
      ],
    },
    {
      heading: "Reporting a security issue",
      paragraphs: [
        "If you believe you have found a security issue in AutoDoc, contact tech support and provide enough information for us to understand and reproduce the issue.",
        "Do not publicly disclose the issue or share customer project files through a public channel.",
      ],
    },
    {
      heading: "Our approach",
      paragraphs: [
        "We use reasonable technical and organizational safeguards designed to protect AutoDoc and customer data. However, no online service can guarantee absolute security.",
        "We review our security practices as AutoDoc develops and will update this page when relevant measures or certifications are introduced.",
      ],
    },
  ],
} as const;
