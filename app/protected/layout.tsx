import { Suspense } from "react";
import "../globals.css";
import NavigationBar from "@/components/ui/navigation-bar";
import { ProtectedLayoutWrapper } from "@/components/ui/protected-layout-wrapper";

/**
 * Protected Layout
 *
 * Auth guard is handled by:
 *   1. middleware.ts — blocks unauthenticated requests before they reach this layout
 *   2. AuthSessionManager (client) — validates session on tab focus, periodic checks, inactivity timeout
 *
 * Previously this layout used `export const dynamic = "force-dynamic"` and ran
 * `validateServerAuth()` on every request, which caused a full server re-render
 * (visible as a page reload) whenever the user switched browser tabs. Removing
 * these allows Next.js to cache the layout shell and only re-render page content.
 *
 * NavigationBar uses useSearchParams() so it must be wrapped in Suspense to
 * allow static generation of pages that don't otherwise need dynamic rendering.
 */
export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedLayoutWrapper>
      <div className="flex flex-1 h-full min-h-[calc(100vh-80px)]">
        <div className="shrink-0 flex">
          <Suspense>
            <NavigationBar />
          </Suspense>
        </div>
        <div className="flex-grow overflow-auto p-4 md:p-6 lg:p-8 border-l border-foreground/10">
          {children}
        </div>
      </div>
    </ProtectedLayoutWrapper>
  );
}
