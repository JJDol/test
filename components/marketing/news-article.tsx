import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DiscoverMoreNews } from "@/components/marketing/discover-more-news";
import { getOtherNews, type NewsArticle } from "@/lib/marketing/news";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingMono } from "@/lib/marketing/fonts";

export function NewsArticlePage({ article }: { article: NewsArticle }) {
  const related = getOtherNews(article.slug);

  return (
    <MarketingPageShell>
      <article className="mx-auto w-full max-w-[880px] px-5 py-16 md:px-8 md:py-24">
        <p className={`${marketingMono.className} text-[12px] leading-5 text-[#202326]/45`}>{article.date}</p>
        <p className={`${marketingMono.className} mt-1 text-[12px] leading-5 text-[#202326]/45`}>by {article.byline}</p>
        <h1 className="mt-6 text-[40px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px]">
          {article.title}
        </h1>
        <p className="mt-6 text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/70">{article.preview}</p>
        <img
          src={article.image}
          alt=""
          className="mt-12 aspect-[16/9] w-full rounded-xl object-cover"
        />

        <div className="mt-12 space-y-10">
          {article.body.map((section, index) => (
            <div key={index}>
              {section.heading ? (
                <h2 className="text-[22px] font-medium leading-[30px] tracking-[-1.76px]">{section.heading}</h2>
              ) : null}
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className={`text-[17px] leading-[24.375px] tracking-[-1px] text-[#202326]/80 ${section.heading ? "mt-4" : "mt-5 first:mt-0"}`}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>

        {article.external ? (
          <a
            href={article.external.href}
            target="_blank"
            rel="noreferrer"
            className="mt-10 inline-flex items-center gap-0.5 text-[15px] font-medium"
          >
            {article.external.label}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </a>
        ) : null}
      </article>

      <DiscoverMoreNews articles={related} />

    </MarketingPageShell>
  );
}
