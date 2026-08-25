import Link from "next/link";
import { NEWS_ARTICLES } from "@/lib/marketing/news";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingMono } from "@/lib/marketing/fonts";

const articles = [...NEWS_ARTICLES].sort(
  (a, b) => Date.parse(b.date) - Date.parse(a.date),
);

export function NewsIndex() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-[1760px] px-5 py-16 md:px-8 md:py-24 lg:px-10">
        <p className={`${marketingMono.className} text-[12px] leading-5 text-[#1a1a1a]/45`}>Resources</p>
        <h1 className="mt-4 text-[40px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px]">News</h1>

        <ul className="mt-12 border-t border-[#1a1a1a]/12">
          {articles.map((article) => (
            <li key={article.slug} className="border-b border-[#1a1a1a]/12">
              <Link
                href={`/news/${article.slug}`}
                className="group flex gap-5 py-7 md:gap-8 md:py-8"
              >
                <img
                  src={article.image}
                  alt=""
                  className="h-20 w-[7.5rem] shrink-0 rounded-lg object-cover sm:h-24 sm:w-40 md:h-28 md:w-48"
                />
                <div className="min-w-0 flex-1">
                  <p className={`${marketingMono.className} text-[12px] leading-5 text-[#1a1a1a]/45`}>{article.date}</p>
                  <h2 className="mt-1 text-[18px] font-medium leading-[30px] tracking-[-1.76px] group-hover:underline md:text-[22px]">
                    {article.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-[15px] leading-[24.375px] tracking-[-0.6px] text-[#1a1a1a]/60">
                    {article.preview}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </MarketingPageShell>
  );
}
