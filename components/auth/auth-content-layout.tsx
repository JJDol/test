interface AuthContentLayoutProps {
  children: React.ReactNode;
}

/**
 * Auth Content Layout Component
 * 
 * PURPOSE: Ensures all auth pages have identical content structure
 * - Standardized spacing between sections
 * - Consistent content distribution
 * - Uniform visual appearance
 * 
 * RESPONSIBILITIES:
 * - Content spacing consistency
 * - Section distribution
 * - Visual uniformity
 */
export function AuthContentLayout({ children }: AuthContentLayoutProps) {
  return (
    <div className="w-full flex flex-col space-y-6">
      {children}
    </div>
  );
}
