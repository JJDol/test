import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Toaster } from "@/components/ui/toaster";
import CompanyHeader from "@/components/ui/company-header";
import { AuthSessionManager } from "@/components/auth-session-manager";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
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
  // Simple UI decision: always link to dashboard
  const titleHref = "/protected/dashboard";

  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen flex flex-col">
            {/* Header - full width */}
            <header className="w-full">
              <nav className="w-full flex justify-between border-b border-b-foreground/10 h-16 items-center px-4 md:px-6">
                <div className="flex items-center gap-6">
                  <div className="font-semibold text-2xl md:text-3xl">
                    <Link href={titleHref}>AutoDOC - beta</Link>
                  </div>
                  {/* CompanyHeader will handle its own auth check client-side */}
                  <CompanyHeader />
                </div>
                <div className="flex items-center">
                  <HeaderAuth />
                </div>
              </nav>
            </header>
  
            {/* Main content area - takes up all available height */}
            <main className="flex-1 flex w-full">
              {children}
            </main>
  
            {/* Footer - full width */}
            <footer className="w-full flex items-center justify-between border-t px-4 md:px-6 py-4">
              <p>
                <a
                  href="https://aticon.dk"
                  target="_blank"
                  className="font-bold hover:underline"
                  rel="noreferrer"
                >
                  Aticon
                </a>
              </p>
              <ThemeSwitcher />
            </footer>
          </div>
          <Toaster />
          <AuthSessionManager />
        </ThemeProvider>
      </body>
    </html>
  );
}
