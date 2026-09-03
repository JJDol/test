import { FileText, Play } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingMono } from "@/lib/marketing/fonts";

const TUTORIALS = [
  {
    title: "Create your first project",
    description: "Set up a project, choose disciplines, and select the documents your team needs.",
  },
  {
    title: "Enter project information once",
    description: "Add general and discipline-specific variables so information stays consistent.",
  },
  {
    title: "Generate and review documents",
    description: "Generate documents from your company templates and review them before use.",
  },
] as const;

const MATERIALS = [
  {
    title: "AutoDoc quick-start guide",
    description: "A concise guide to the complete project workflow.",
  },
  {
    title: "Project setup checklist",
    description: "The information and templates to prepare before creating a project.",
  },
] as const;

export function TutorialsPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
        <p className={`${marketingMono.className} text-[12px] leading-5 text-[#202326]/45`}>
          Product
        </p>
        <h1 className="mt-4 text-[40px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px]">
          Tutorials
        </h1>
        <p className="mt-6 max-w-[720px] text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/70">
          Learn AutoDoc step by step with practical video tutorials and downloadable materials.
          New resources will be published here as they become available.
        </p>

        <div className="mt-10 max-w-[880px] rounded-xl border border-[#202326]/10 bg-[#E8E2D6] px-6 py-5 md:px-8">
          <p className={`${marketingMono.className} text-[11px] leading-5 text-[#202326]/45`}>
            IN PROGRESS
          </p>
          <p className="mt-1 text-[22px] font-medium leading-[30px] tracking-[-1.76px]">
            Tutorials are currently in production.
          </p>
          <p className="mt-2 text-[15px] leading-[24.375px] tracking-[-0.6px] text-[#202326]/65">
            We are preparing practical videos and supporting materials to help your team get the
            most from AutoDoc.
          </p>
        </div>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-6 border-b border-[#202326]/15 pb-4">
            <h2 className="text-[28px] font-medium leading-[36px] tracking-[-2px]">
              Video tutorials
            </h2>
            <p className={`${marketingMono.className} text-[11px] leading-5 text-[#202326]/45`}>
              COMING SOON
            </p>
          </div>

          <div className="grid gap-10 pt-8 md:grid-cols-3 md:gap-8 lg:gap-12">
            {TUTORIALS.map((tutorial, index) => (
              <article key={tutorial.title}>
                <div className="flex aspect-video items-center justify-center rounded-xl border border-[#202326]/10 bg-[#E8E2D6]">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#202326] text-white">
                    <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden />
                  </span>
                </div>
                <p className={`${marketingMono.className} mt-5 text-[11px] leading-5 text-[#202326]/45`}>
                  TUTORIAL {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-[22px] font-medium leading-[30px] tracking-[-1.76px]">
                  {tutorial.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[24.375px] tracking-[-0.6px] text-[#202326]/60">
                  {tutorial.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="border-b border-[#202326]/15 pb-4">
            <h2 className="text-[28px] font-medium leading-[36px] tracking-[-2px]">
              Guides and materials
            </h2>
          </div>
          <ul>
            {MATERIALS.map((material) => (
              <li
                key={material.title}
                className="flex items-center gap-5 border-b border-[#202326]/15 py-6"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#E8E2D6]">
                  <FileText className="h-5 w-5 text-[#202326]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[18px] font-medium leading-[26px] tracking-[-1px]">
                    {material.title}
                  </h3>
                  <p className="mt-1 text-[15px] leading-[24.375px] tracking-[-0.6px] text-[#202326]/60">
                    {material.description}
                  </p>
                </div>
                <span className={`${marketingMono.className} shrink-0 text-[11px] leading-5 text-[#202326]/45`}>
                  COMING SOON
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </MarketingPageShell>
  );
}
