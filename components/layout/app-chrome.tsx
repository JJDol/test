"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import CompanyHeader from "@/components/ui/company-header";
import { AuthSessionManager } from "@/components/auth-session-manager";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketingHome = pathname === "/";

  if (isMarketingHome) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full">
        <nav className="w-full flex justify-between border-b border-b-foreground/10 h-16 items-center px-4 md:px-6">
          <div className="flex items-center gap-6">
            <div className="font-semibold text-2xl md:text-3xl">
              <Link href="/protected/dashboard">AutoDOC - beta</Link>
            </div>
            <CompanyHeader />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <HeaderAuth />
          </div>
        </nav>
      </header>

      <main className="flex-1 flex w-full">{children}</main>

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
      <AuthSessionManager />
    </div>
  );
}
