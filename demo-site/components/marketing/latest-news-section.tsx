import Link from "next/link";
import { Instrument_Serif } from "next/font/google";
import { ChevronRight } from "lucide-react";
import { NEWS_ARTICLES } from "@/lib/marketing/news";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export function LatestNewsSection() {
  return (
    <section id="news" className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
      <h2
        className={`${instrumentSerif.className} max-w-4xl text-4xl leading-[1.12] text-[#1a1a1a] md:text-6xl`}
      >
        See the latest from AutoDoc
      </h2>

      <div className="mt-14 grid gap-x-12 gap-y-14 md:grid-cols-2 md:gap-x-16 md:gap-y-16 lg:gap-x-24 lg:gap-y-20">
        {NEWS_ARTICLES.map((item) => (
          <article key={item.slug} className="flex gap-5 md:gap-6">
            <img
              src={item.image}
              alt={item.title}
              className="h-[7.5rem] w-[42%] shrink-0 rounded-xl object-cover sm:h-36 md:h-40"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              <div>
                <h3 className="text-[18px] font-medium tracking-tight text-[#1a1a1a] md:text-[20px]">{item.title}</h3>
                <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-[#1a1a1a]/55">{item.preview}</p>
              </div>
              <Link
                href={`/news/${item.slug}`}
                className="mt-2 inline-flex items-center gap-0.5 text-[14px] font-medium text-[#1a1a1a]"
              >
                Learn more
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
