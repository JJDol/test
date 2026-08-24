import { notFound } from "next/navigation";
import { NEWS_ARTICLES, getNewsArticle } from "@/lib/marketing/news";
import { NewsArticlePage } from "@/components/marketing/news-article";

export function generateStaticParams() {
  return NEWS_ARTICLES.map((article) => ({ slug: article.slug }));
}

export default async function NewsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getNewsArticle(slug);
  if (!article) notFound();
  return <NewsArticlePage article={article} />;
}
