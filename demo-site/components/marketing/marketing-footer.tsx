import { FOOTER_COLUMNS } from "@/lib/marketing/links";
import { marketingMono } from "@/lib/marketing/fonts";

export function MarketingFooter() {
  return (
    <footer id="site-footer" className="border-t border-[#1a1a1a]/12 bg-[#F5F2EB] text-[#1a1a1a]">
      <div className="mx-auto grid w-full max-w-[1760px] gap-12 px-5 py-14 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:px-8 md:py-16 lg:px-10">
        <img
          src="/images/marketing/atilab-logo.svg"
          alt="ATI:lab"
          width={268}
          height={55}
          className="h-auto w-[268px]"
        />

        {FOOTER_COLUMNS.map((column) => (
          <FooterColumn key={column.title} title={column.title} links={[...column.links]} />
        ))}
      </div>

      <div className={`${marketingMono.className} mx-auto flex w-full max-w-[1760px] items-center justify-between px-5 pb-8 text-[12px] leading-5 text-[#1a1a1a]/45 md:px-8 lg:px-10`}>
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
      <p className="text-[11px] font-medium tracking-[0.18em] text-[#1a1a1a]/45">{title}</p>
      <ul className="mt-4 space-y-2.5 text-[15px]">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="text-[#1a1a1a]/80 transition hover:text-[#1a1a1a]">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
