import Link from "next/link";
import { marketingMono } from "@/lib/marketing/fonts";
import { cn } from "@/lib/utils";

export const MARKETING_FEATURES = [
  {
    id: "automated-generation",
    title: "Automated generation",
    image: "/images/marketing/feature-generation.png",
    short:
      "Enter project information once, and AutoDoc automatically applies it wherever it belongs, keeping the information consistent and saving valuable time throughout the project.",
    detail:
      "Enter project information once, and AutoDoc automatically applies it wherever it belongs across your document set. Instead of copying the same client name, address, or project reference into dozens of templates by hand, AutoDoc propagates verified values from a single source of truth. That consistency reduces rework late in the process and keeps discipline packages aligned from the first draft through final submission.",
    further: "Autogeneration in a document-centric environment.",
  },
  {
    id: "ai-powered-information-validation",
    title: "AI-powered information validation",
    image: "/images/marketing/feature-validation.png",
    short:
      "AutoDoc’s AI understands the context of the project and its documents, searches trusted knowledge, and brings the most relevant guidance into the workflow.",
    detail:
      "AutoDoc’s AI understands the context of the project and its documents, then searches your company’s trusted knowledge and current standards to surface what matters for each deliverable. When a requirement changes or a standard is updated, the guidance stays connected to the documents you are actually producing—not buried in separate reference files. Teams spend less time hunting for answers and more time reviewing work that is already grounded in the right rules.",
    further: "Your knowledge base, plus current standards.",
  },
  {
    id: "collaboration",
    title: "Collaboration",
    image: "/images/marketing/feature-collaboration.png",
    short:
      "AutoDoc assists with collaboration and document management, providing a comprehensive overview of documents, progress, and updates.",
    detail:
      "AutoDoc assists with collaboration and document management by giving everyone a shared view of what exists, what is in progress, and what still needs attention. Project leads can see document status at a glance, while contributors know exactly which packages they own and when updates land. That clarity keeps teams aligned without constant check-ins or version confusion across disciplines.",
    further: "Keeping everyone up to date.",
  },
] as const;

export function KeyFeaturesSection() {
  return (
    <section id="features" className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:pb-24 md:pt-[136px] lg:px-10">
      <p className={`${marketingMono.className} text-[12px] leading-5 text-[#202326]/45`}>Why choose Autodoc?</p>

      <div className="mt-2 grid gap-12 md:grid-cols-3 md:gap-x-10 lg:gap-x-16">
        {MARKETING_FEATURES.map((feature) => (
          <article key={feature.title} className="flex flex-col">
            <h3
              className={cn(
                "text-[24px] font-medium leading-[30px] tracking-[-1.92px] text-[#202326] md:text-[28px] md:tracking-[-2.24px]",
                feature.title.length <= 24 && "md:whitespace-nowrap",
              )}
            >
              {feature.title}
            </h3>
            <Link
              href={`/features#${feature.id}`}
              aria-label={`Learn more about ${feature.title}`}
              className="group relative mt-6 block aspect-[4/3] w-full overflow-hidden rounded-xl transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#202326]"
            >
              <img
                src={feature.image}
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <span className="pointer-events-none absolute inset-0 bg-[#7697e5]/0 transition-colors duration-500 group-hover:bg-[#7697e5]/10" />
            </Link>
            <p className="mt-6 text-[22px] font-medium leading-[30px] tracking-[-1.92px] text-[#202326]/45 md:text-[24px]">
              {feature.further}
            </p>
            <p className="mt-6 text-justify text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]">{feature.short}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
