export type NewsArticle = {
  slug: string;
  date: string;
  title: string;
  preview: string;
  image: string;
  byline: string;
  body: { heading?: string; paragraphs: string[] }[];
  external?: { label: string; href: string };
};

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    slug: "autodoc-version-2",
    date: "August 24, 2026",
    title: "AutoDoc starts work on Version 2 for document control",
    preview:
      "Version 2 will add AI-assisted document control: help you write correctly, validate information as you go, and raise the quality of your company's documentation.",
    image: "/images/marketing/news-still-02.png",
    byline: "ATI:lab",
    body: [
      {
        paragraphs: [
          "AutoDoc Version 2 is in development, with a focus on AI-assisted document control rather than generation alone.",
          "The next release is meant to help teams write correctly, validate information as they go, and raise the quality of a company’s documentation — not only fill templates faster.",
          "That work sits on the same project card and knowledge base already used for generation and AutoDoc Chat, so control stays in the same environment as the documents themselves.",
        ],
      },
    ],
  },
  {
    slug: "homepage-demo",
    date: "August 22, 2026",
    title: "Try AutoDoc from the homepage",
    preview:
      "A simulated demo now runs from contract to finished documents — upload, type once, generate, and ask AutoDoc — without creating an account.",
    image: "/images/marketing/news-still-03.png",
    byline: "ATI:lab",
    body: [
      {
        paragraphs: [
          "The AutoDoc homepage now includes a simulated walkthrough from contract to finished documents.",
          "You can upload a contract, create a project, type information once, generate documents, and ask AutoDoc — without creating an account.",
          "The demo is fictional Copenhagen project data, built so visitors can see the flow before they sign in.",
        ],
      },
    ],
  },
  {
    slug: "autodoc-chat",
    date: "May 15, 2025",
    title: "AutoDoc Chat is launched",
    preview:
      "It is ready to answer from knowledge bases such as BR18, SBi standards, and your company projects. You can also customize your own knowledge base by uploading your materials.",
    image: "/images/marketing/news-still-04.png",
    byline: "ATI:lab",
    body: [
      {
        paragraphs: [
          "AutoDoc Chat is launched. It answers from knowledge bases such as BR18, SBi standards, and your company projects.",
          "You can also customize your own knowledge base by uploading your materials, so the assistant stays inside the documents and standards the team actually uses.",
          "Questions stay attached to sources, so the team can check the text instead of trusting a free-standing answer.",
        ],
      },
    ],
  },
  {
    slug: "atilab-buildersgate-partnership",
    date: "August 18, 2026",
    title: "ATI:lab and Buildersgate start a long-term partnership",
    preview:
      "Buildersgate is our joint-development partner in South Korea. The Seoul studio pairs senior engineers with AI to deliver systems for enterprise and public clients — including LG, KT, and national hospitals.",
    image: "/images/marketing/atilab-buildersgate-partnership.png",
    byline: "ATI:lab",
    body: [
      {
        paragraphs: [
          "ATI:lab and Buildersgate have started a long-term partnership to build AutoDoc and related systems for architecture and construction teams.",
          "Buildersgate is our joint-development partner in South Korea. The Seoul studio pairs senior engineers with AI to deliver systems for enterprise and public clients — including LG, KT, and national hospitals.",
          "The collaboration brings Korean delivery capacity together with ATI:lab’s work on project documentation, so AutoDoc can move faster from prototype to production without splitting the product across two codebases.",
        ],
      },
    ],
    external: { label: "Visit Buildersgate", href: "https://www.buildersgate.com/" },
  },
];

export function getNewsArticle(slug: string) {
  return NEWS_ARTICLES.find((article) => article.slug === slug);
}

export function getOtherNews(slug: string) {
  return NEWS_ARTICLES.filter((article) => article.slug !== slug);
}
