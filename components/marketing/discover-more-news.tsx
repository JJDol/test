"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { NewsArticle } from "@/lib/marketing/news";
import { marketingMono, marketingTitleSection } from "@/lib/marketing/fonts";

const VISIBLE_COUNT = 3;
const GAP_PX = 40;

export function DiscoverMoreNews({ articles }: { articles: NewsArticle[] }) {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(true);

  const needsLoop = articles.length <= VISIBLE_COUNT;
  const trackArticles = useMemo(
    () => (needsLoop ? [...articles, ...articles] : articles),
    [articles, needsLoop],
  );

  const maxIndex = needsLoop ? articles.length : articles.length - VISIBLE_COUNT;
  const canSlide = articles.length > 1;
  const cardWidthExpr = `(100% - ${(VISIBLE_COUNT - 1) * GAP_PX}px) / ${VISIBLE_COUNT}`;

  const goPrev = () => {
    setAnimating(true);
    setIndex((value) => {
      if (value <= 0) return needsLoop ? articles.length - 1 : maxIndex;
      return value - 1;
    });
  };

  const goNext = () => {
    setAnimating(true);
    setIndex((value) => {
      if (value >= maxIndex) return 0;
      return value + 1;
    });
  };

  const handleTransitionEnd = () => {
    if (needsLoop && index === articles.length) {
      setAnimating(false);
      setIndex(0);
    }
  };

  useEffect(() => {
    if (!animating) {
      requestAnimationFrame(() => setAnimating(true));
    }
  }, [animating]);

  if (articles.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[880px] px-5 pb-24 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className={marketingTitleSection}>Discover more</h2>
        {canSlide ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Show previous news"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#202326]/15 text-[#202326]/70 transition hover:border-[#202326]/30 hover:text-[#202326]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Show next news"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-[#202326]/15 text-[#202326]/70 transition hover:border-[#202326]/30 hover:text-[#202326]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-10 overflow-hidden">
        <div
          className={animating ? "flex transition-transform duration-500 ease-out" : "flex"}
          style={{
            gap: `${GAP_PX}px`,
            transform: `translateX(calc(-${index} * ((${cardWidthExpr}) + ${GAP_PX}px)))`,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {trackArticles.map((item, itemIndex) => (
            <Link
              key={`${item.slug}-${itemIndex}`}
              href={`/news/${item.slug}`}
              className="group block shrink-0"
              style={{ width: `calc(${cardWidthExpr})` }}
            >
              <img src={item.image} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />
              <p className={`${marketingMono.className} mt-4 text-[12px] leading-5 text-[#202326]/45`}>
                {item.date}
              </p>
              <h3 className="mt-1 text-[17px] font-medium leading-[24.375px] tracking-[-1px] group-hover:underline">
                {item.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
