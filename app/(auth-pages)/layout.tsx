/**
 * Layout for authentication pages
 * 
 * PURPOSE: Provides consistent layout wrapper for all auth pages (sign-in, sign-up, forgot-password)
 * - Ensures consistent styling across all auth pages
 * - Single source of truth for auth page layout
 * 
 * USED BY:
 * - /sign-in
 * - /sign-up  
 * - /forgot-password
 */
export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md mx-auto">
        {children}
      </div>
    </div>
  );
}
