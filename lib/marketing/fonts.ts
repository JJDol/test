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
