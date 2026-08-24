export const APP_SIGN_IN = "https://aticon-autodoc.vercel.app/sign-in";
export const APP_SIGN_UP = "https://aticon-autodoc.vercel.app/sign-up";

export const MARKETING_NAV = [
  {
    label: "Product",
    href: "/#how-it-works",
    items: [
      { label: "Sign up", href: "/signup" },
      { label: "Tutorials", href: "/#how-it-works" },
      { label: "Demo", href: "/#how-it-works" },
    ],
  },
  {
    label: "About us",
    href: "/about",
    items: [
      { label: "Our Vision", href: "/about#vision" },
      { label: "Careers", href: "/about#careers" },
      { label: "Contact", href: "/about#contact" },
    ],
  },
  {
    label: "Resources",
    href: "/news",
    items: [
      { label: "News", href: "/news" },
      { label: "Support", href: "/support" },
      { label: "Terms of Use", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Security", href: "/security" },
    ],
  },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "PRODUCT",
    links: [
      { label: "Sign up", href: "/signup" },
      { label: "Tutorials", href: "/#how-it-works" },
      { label: "Demo", href: "/#how-it-works" },
    ],
  },
  {
    title: "ABOUT US",
    links: [
      { label: "Our Vision", href: "/about#vision" },
      { label: "Careers", href: "/about#careers" },
      { label: "Contact", href: "/about#contact" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "News", href: "/news" },
      { label: "Support", href: "/support" },
      { label: "Terms of Use", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Security", href: "/security" },
    ],
  },
] as const;

export function isMarketingPath(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname === "/" ||
    pathname === "/new" ||
    pathname === "/signup" ||
    pathname === "/about" ||
    pathname === "/news" ||
    pathname.startsWith("/news/") ||
    pathname === "/support" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/security"
  );
}
