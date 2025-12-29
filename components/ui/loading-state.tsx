import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface LoadingStateProps {
  title?: string;
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "page" | "inline" | "card" | "dialog";
  open?: boolean;
  hideCloseButton?: boolean;
}

/**
 * Reusable Loading State Component
 * 
 * PURPOSE: Standardized loading UI across the application
 * - Consistent loading indicators and messaging
 * - Multiple variants for different use cases
 * - Professional loading experience
 * 
 * VARIANTS:
 * - page: Full page loading (min-h-screen)
 * - inline: Inline loading within components
 * - card: Loading within card containers
 * - dialog: Modal overlay loading (replaces LoadingDialog)
 * 
 * USAGE:
 * - Token validation loading
 * - Form submission loading
 * - Data fetching loading
 * - Any async operation loading
 * 
 * ENTERPRISE BENEFITS:
 * - Consistent UX across all loading states
 * - Single component to maintain and update
 * - Professional, polished loading experience
 */
export function LoadingState({
  title = "Loading",
  message = "Please wait...",
  size = "md",
  variant = "page",
  open = true,
  hideCloseButton = true
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  const iconBgClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20"
  };

  const titleClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl"
  };

  if (variant === "dialog") {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" hideCloseButton={hideCloseButton}>
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className={`${sizeClasses.lg} animate-spin text-primary`} />
            <div className="text-center">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className={`${sizeClasses[size]} animate-spin mx-auto mb-2`} />
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="w-full flex items-center justify-center p-4 bg-gray-50 min-h-[calc(100vh-8rem)]">
        <div className="text-center">
          <Loader2 className={`${sizeClasses[size]} animate-spin mx-auto mb-4`} />
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }

  // Default: page variant
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className={`mx-auto ${iconBgClasses[size]} bg-primary/10 rounded-full flex items-center justify-center mb-4`}>
          <Loader2 className={`${sizeClasses[size]} text-primary animate-spin`} />
        </div>
        <h1 className={`${titleClasses[size]} font-semibold text-foreground mb-2`}>{title}</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
