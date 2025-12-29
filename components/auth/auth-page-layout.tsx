import { AuthPageHeader } from "./auth-page-header";
import { AuthContainer } from "./auth-container";

interface AuthPageLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Auth Page Layout Component
 * 
 * PURPOSE: Provides consistent layout and sizing for all authentication pages
 * - Ensures uniform card dimensions across auth pages
 * - Maintains consistent spacing and alignment
 * - Provides reusable structure for sign-in, sign-up, forgot password, etc.
 * 
 * RESPONSIBILITIES:
 * - Consistent page layout
 * - Uniform card sizing
 * - Standardized spacing
 * - Header integration
 */
export function AuthPageLayout({ title, description, children }: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 w-full max-w-md">
      {/* Fixed width container - exactly the same for all auth pages */}
      <div className="w-full max-w-md">
        {/* Page Header */}
        <AuthPageHeader
          title={title}
          description={description}
        />

        {/* Use unified auth container for consistency */}
        <AuthContainer>
          {children}
        </AuthContainer>
      </div>
    </div>
  );
}
