const FEATURES = [
  {
    title: "Automated generation",
    image: "/images/marketing/feature-generation.png",
    short:
      "Enter project information once, and AutoDoc automatically applies it wherever it belongs, keeping the information consistent and saving valuable time throughout the project.",
    further: "Autogeneration in a document-centric environment.",
    href: "#how-it-works",
  },
  {
    title: "AI-powered information validation",
    image: "/images/marketing/feature-validation.png",
    short:
      "AutoDoc’s AI understands the context of the project and its documents, searches trusted knowledge, and brings the most relevant guidance into the workflow.",
    further: "From your company’s projects, experience, and current standards.",
    href: "#how-it-works",
  },
  {
    title: "Collaboration",
    image: "/images/marketing/feature-collaboration.png",
    short:
      "AutoDoc assists with collaboration and document management, providing a comprehensive overview of documents, progress, and updates.",
    further: "Keeping everyone up to date.",
    href: "#how-it-works",
  },
] as const;

export function KeyFeaturesSection() {
  return (
    <section id="features" className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
      <p className="text-sm text-[#1a1a1a]/45">Why use Autodoc?</p>

      <div className="mt-10 grid gap-12 md:grid-cols-3 md:gap-x-10 lg:gap-x-16">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="flex flex-col">
            <h3 className="min-h-[2.4em] text-[28px] font-medium leading-[1.15] tracking-tight text-[#1a1a1a] md:text-[32px]">
              {feature.title}
            </h3>
            <img
              src={feature.image}
              alt=""
              className="mt-6 aspect-[4/3] w-full rounded-xl object-cover"
            />
            <p className="mt-6 text-[17px] leading-relaxed text-[#1a1a1a]">{feature.short}</p>
            <p className="mt-3 font-mono text-[12px] tracking-[0.02em] text-[#1a1a1a]/45">{feature.further}</p>
            <a
              href={feature.href}
              className="mt-8 inline-flex w-fit items-center rounded-full bg-[#D8D3CA] px-6 py-2.5 text-[12px] font-medium tracking-[0.14em] text-[#1a1a1a]"
            >
              LEARN MORE
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
