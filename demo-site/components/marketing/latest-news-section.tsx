import { Instrument_Serif } from "next/font/google";
import { ChevronRight } from "lucide-react";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const NEWS: {
  title: string;
  preview: string;
  href: string;
  external: boolean;
  image?: string;
}[] = [
  {
    title: "ATI:lab and Buildersgate start a long-term partnership",
    preview:
      "Buildersgate is our joint-development partner in South Korea. The Seoul studio pairs senior engineers with AI to deliver systems for enterprise and public clients — including LG, KT, and national hospitals.",
    href: "https://www.buildersgate.com/",
    external: true,
    image: "/images/marketing/atilab-buildersgate-partnership.png",
  },
  {
    title: "AutoDoc starts work on Version 2 for document control",
    preview:
      "Version 2 will add AI-assisted document control: help you write correctly, validate information as you go, and raise the quality of your company's documentation.",
    href: "#features",
    external: false,
    image: "/images/marketing/news-still-02.png",
  },
  {
    title: "Try AutoDoc from the homepage",
    preview:
      "A simulated demo now runs from contract to finished documents — upload, type once, generate, and ask AutoDoc — without creating an account.",
    href: "#how-it-works",
    external: false,
    image: "/images/marketing/news-still-03.png",
  },
  {
    title: "AutoDoc Chat is launched",
    preview:
      "It is ready to answer from knowledge bases such as BR18, SBi standards, and your company projects. You can also customize your own knowledge base by uploading your materials.",
    href: "#how-it-works",
    external: false,
    image: "/images/marketing/news-still-04.png",
  },
];

export function LatestNewsSection() {
  return (
    <section id="news" className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
      <h2
        className={`${instrumentSerif.className} max-w-4xl text-4xl leading-[1.12] text-[#1a1a1a] md:text-6xl`}
      >
        See the latest from AutoDoc
      </h2>

      <div className="mt-14 grid gap-x-12 gap-y-14 md:grid-cols-2 md:gap-x-16 md:gap-y-16 lg:gap-x-24 lg:gap-y-20">
        {NEWS.map((item) => (
          <article key={item.title} className="flex gap-5 md:gap-6">
            {item.image ? (
              <img
                src={item.image}
                alt={`${item.title}`}
                className="h-[7.5rem] w-[42%] shrink-0 rounded-xl object-cover sm:h-36 md:h-40"
              />
            ) : (
              <div className="h-[7.5rem] w-[42%] shrink-0 rounded-xl bg-[#D4CFC6] sm:h-36 md:h-40" />
            )}
            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              <div>
                <h3 className="text-[18px] font-medium tracking-tight text-[#1a1a1a] md:text-[20px]">{item.title}</h3>
                <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-[#1a1a1a]/55">{item.preview}</p>
              </div>
              <a
                href={item.href}
                className="mt-2 inline-flex items-center gap-0.5 text-[14px] font-medium text-[#1a1a1a]"
                {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                Learn more
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
