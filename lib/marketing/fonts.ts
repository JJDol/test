import { Roboto_Mono, Work_Sans } from "next/font/google";

export const marketingSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const marketingMono = Roboto_Mono({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const marketingTitleDisplay =
  "text-[40px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px]";

/** Use on short page titles that should stay on one line from md up. */
export const marketingTitleDisplayNowrap = `${marketingTitleDisplay} md:whitespace-nowrap`;

export const marketingTitleTab =
  "text-[36px] font-normal leading-[1.15] tracking-[-1px] md:text-[48px] md:leading-[60px] md:whitespace-nowrap";

export const marketingTitleSection =
  "text-[28px] font-medium leading-[30px] tracking-[-2.24px] md:whitespace-nowrap";

export const marketingTitleSectionWide =
  "text-[28px] font-medium leading-[36px] tracking-[-2px] md:whitespace-nowrap";

export const marketingTitleFeature =
  "mt-3 text-[30px] font-medium leading-[38px] tracking-[-2px] md:text-[38px] md:leading-[46px]";

export const marketingTitleCard =
  "text-[22px] font-medium leading-[30px] tracking-[-1.76px] md:whitespace-nowrap";
