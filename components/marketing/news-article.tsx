import Link from "next/link";
import { Instrument_Serif } from "next/font/google";
import { ChevronRight } from "lucide-react";
import { getOtherNews, type NewsArticle } from "@/lib/marketing/news";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export function NewsArticlePage({ article }: { article: NewsArticle }) {
  const related = getOtherNews(article.slug).slice(0, 3);

  return (
    <div className="min-h-svh bg-[#F5F2EB] text-[#1a1a1a]">
      <MarketingHeader />

      <article className="mx-auto w-full max-w-[880px] px-5 py-16 md:px-8 md:py-24">
        <p className="text-[13px] text-[#1a1a1a]/45">{article.date}</p>
        <p className="mt-1 text-[13px] text-[#1a1a1a]/45">by {article.byline}</p>
        <h1 className={`${instrumentSerif.className} mt-6 text-4xl leading-[1.12] md:text-6xl`}>
          {article.title}
        </h1>
        <p className="mt-6 text-[18px] leading-relaxed text-[#1a1a1a]/70">{article.preview}</p>
        <img
          src={article.image}
          alt=""
          className="mt-12 aspect-[16/9] w-full rounded-xl object-cover"
        />

        <div className="mt-12 space-y-10">
          {article.body.map((section, index) => (
            <div key={index}>
              {section.heading ? (
                <h2 className="text-[22px] font-medium tracking-tight">{section.heading}</h2>
              ) : null}
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className={`text-[17px] leading-[1.7] text-[#1a1a1a]/80 ${section.heading ? "mt-4" : "mt-5 first:mt-0"}`}
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

      <section className="mx-auto w-full max-w-[1760px] px-5 pb-24 md:px-8 lg:px-10">
        <h2 className={`${instrumentSerif.className} text-3xl md:text-4xl`}>Discover more</h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          {related.map((item) => (
            <Link key={item.slug} href={`/news/${item.slug}`} className="group block">
              <img src={item.image} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />
              <p className="mt-4 text-[13px] text-[#1a1a1a]/45">{item.date}</p>
              <h3 className="mt-1 text-[17px] font-medium leading-snug group-hover:underline">{item.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
