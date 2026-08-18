import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoDOC · Simulated demo",
  description: "A fictional walkthrough of AutoDoc, from contract to project.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.className}>
      <body>{children}</body>
    </html>
  );
}
