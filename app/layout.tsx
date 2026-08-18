import { Toaster } from "@/components/ui/toaster";
import { AppChrome } from "@/components/layout/app-chrome";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || (process.env.NODE_ENV === 'development' ? "http://localhost:3000" : "https://aticon.vercel.app");

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Aticon management tool",
  description: "Tool for optimizing workflow at Aticon",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppChrome>{children}</AppChrome>
          <Toaster />
        </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
