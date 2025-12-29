import { Card, CardContent } from "@/components/ui/card";

interface AuthContainerProps {
  children: React.ReactNode;
}

/**
 * Auth Container Component
 * 
 * PURPOSE: Provides a unified container for all authentication pages
 * - Ensures exact same dimensions across all auth pages
 * - Forces consistent content width and spacing
 * - Creates uniform appearance regardless of content amount
 * 
 * RESPONSIBILITIES:
 * - Fixed dimensions for consistency
 * - Uniform content distribution
 * - Standardized spacing
 */
export function AuthContainer({ children }: AuthContainerProps) {
  return (
    <Card className="w-full shadow-lg border-0 bg-card min-h-[500px]">
      <CardContent className="w-full p-6 flex flex-col h-full">
        {/* Force content to take full width and distribute evenly */}
        <div className="w-full flex-1 flex flex-col space-y-6">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
