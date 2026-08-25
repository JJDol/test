import { marketingMono } from "@/lib/marketing/fonts";

const FEATURES = [
  {
    title: "Automated generation",
    image: "/images/marketing/feature-generation.png",
    short:
      "Enter project information once, and AutoDoc automatically applies it wherever it belongs, keeping the information consistent and saving valuable time throughout the project.",
    further: "Autogeneration in a document-centric environment.",
  },
  {
    title: "AI-powered information validation",
    image: "/images/marketing/feature-validation.png",
    short:
      "AutoDoc’s AI understands the context of the project and its documents, searches trusted knowledge, and brings the most relevant guidance into the workflow.",
    further: "Your knowledge base, plus current standards.",
  },
  {
    title: "Collaboration",
    image: "/images/marketing/feature-collaboration.png",
    short:
      "AutoDoc assists with collaboration and document management, providing a comprehensive overview of documents, progress, and updates.",
    further: "Keeping everyone up to date.",
  },
] as const;

export function KeyFeaturesSection() {
  return (
    <section id="features" className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:pb-24 md:pt-[136px] lg:px-10">
      <p className={`${marketingMono.className} text-[12px] leading-5 text-[#1a1a1a]/45`}>Why choose Autodoc?</p>

      <div className="mt-2 grid gap-12 md:grid-cols-3 md:gap-x-10 lg:gap-x-16">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="flex flex-col">
            <h3 className="text-[24px] font-medium leading-[30px] tracking-[-1.92px] text-[#1a1a1a] md:text-[28px] md:tracking-[-2.24px]">
              {feature.title}
            </h3>
            <img
              src={feature.image}
              alt=""
              className="mt-6 aspect-[4/3] w-full rounded-xl object-cover"
            />
            <p className="mt-6 text-[22px] font-medium leading-[30px] tracking-[-1.92px] text-[#1a1a1a]/45 md:text-[24px]">
              {feature.further}
            </p>
            <p className="mt-6 text-justify text-[17px] leading-[24.375px] tracking-[-1px] text-[#1a1a1a]">{feature.short}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
