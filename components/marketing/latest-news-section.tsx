import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NEWS_ARTICLES } from "@/lib/marketing/news";

const FEATURED_ORDER = [
  "atilab-buildersgate-partnership",
  "autodoc-version-2",
  "homepage-demo",
  "autodoc-chat",
] as const;

const featuredArticles = FEATURED_ORDER.flatMap((slug) => {
  const article = NEWS_ARTICLES.find((item) => item.slug === slug);
  return article ? [article] : [];
});

export function LatestNewsSection() {
  return (
    <section id="news" className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
      <h2 className="max-w-[896px] text-[40px] font-normal leading-[1.15] tracking-[-1px] text-[#1a1a1a] md:text-[48px] md:leading-[60px]">
        See the latest from AutoDoc
      </h2>

      <div className="mt-14 grid gap-x-12 gap-y-14 md:grid-cols-2 md:gap-x-16 md:gap-y-16 lg:gap-x-24 lg:gap-y-20">
        {featuredArticles.map((item) => (
          <article key={item.slug} className="flex gap-5 md:gap-6">
            <img
              src={item.image}
              alt={item.title}
              className="h-[7.5rem] w-[42%] shrink-0 rounded-xl object-cover sm:h-36 md:h-[172px]"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              <div>
                <h3 className="text-[22px] font-medium leading-[30px] tracking-[-1.76px] text-[#1a1a1a] md:text-[28px] md:tracking-[-2.24px]">{item.title}</h3>
                <p className="mt-2 line-clamp-3 text-[15px] leading-[24.375px] tracking-[-0.6px] text-[#1a1a1a]/55">{item.preview}</p>
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
