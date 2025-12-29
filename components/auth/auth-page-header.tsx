

interface AuthPageHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

/**
 * Authentication Page Header Component
 * 
 * PURPOSE: Provides consistent header styling for authentication pages
 * - Consistent branding with icon and title
 * - Clear description of the page purpose
 * - Reusable across different auth pages
 * 
 * RESPONSIBILITIES:
 * - Header layout and styling
 * - Icon and title presentation
 * - Description text display
 */
export function AuthPageHeader({ 
  title, 
  description, 
  icon
}: AuthPageHeaderProps) {
  return (
    <div className="text-center mb-8">
      {icon && (
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h1 className="text-3xl font-semibold text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
