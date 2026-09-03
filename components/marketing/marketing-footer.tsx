import { FOOTER_COLUMNS } from "@/lib/marketing/links";
import { marketingMono } from "@/lib/marketing/fonts";

export function MarketingFooter() {
  const [productColumn] = FOOTER_COLUMNS;

  return (
    <footer id="site-footer" className="border-t border-[#202326]/12 bg-[#F5F2EB] text-[#202326]">
      <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-12 px-5 py-14 md:flex-row md:items-center md:px-8 md:py-16 lg:px-10">
        <img
          src="/images/marketing/atilab-logo.svg"
          alt="ATI:lab"
          width={214}
          height={44}
          className="h-auto w-[214px] shrink-0"
        />

        <div aria-hidden className="pointer-events-none hidden shrink-0 md:invisible md:block">
          <FooterColumn title={productColumn.title} links={[...productColumn.links]} />
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-12 md:flex-row md:justify-between">
          {FOOTER_COLUMNS.map((column) => (
            <FooterColumn key={column.title} title={column.title} links={[...column.links]} />
          ))}
        </div>
      </div>

      <div className={`${marketingMono.className} mx-auto flex w-full max-w-[1760px] items-center justify-between px-5 pb-8 text-[12px] leading-5 text-[#202326]/45 md:px-8 lg:px-10`}>
        <p>© Ati:lab 2026</p>
        <p>All rights reserved</p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.18em] text-[#202326]/45">{title}</p>
      <ul className="mt-4 space-y-2.5 text-[15px]">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="text-[#202326]/80 transition hover:text-[#202326]">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
