import "../globals.css";
import NavigationBar from "@/components/ui/navigation-bar";
import { validateServerAuth } from "@/utils/server-auth";
import { ProtectedLayoutWrapper } from "@/components/ui/protected-layout-wrapper";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side authentication guard using shared utility
  // Handles all validation: user exists, session not expired, profile valid
  const authResult = await validateServerAuth();
  
  // If we get here, user is fully authenticated and validated
  // authResult contains: { user, profile, isAdmin, hasCompany }

  return (
    <ProtectedLayoutWrapper>
      <div className="flex flex-1 h-full min-h-[calc(100vh-80px)]">
        {/* Navigation sidebar - full height from header to footer */}
        <div className="shrink-0 flex">
          <NavigationBar />
        </div>

        {/* Content area with border - grows to fill available space */}
        <div className="flex-grow overflow-auto p-4 md:p-6 lg:p-8 border-l border-foreground/10">
          {children}
        </div>
      </div>
    </ProtectedLayoutWrapper>
  );
}
