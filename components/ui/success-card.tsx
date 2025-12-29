import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SuccessCardProps {
  title: string;
  message: string;
  buttonText?: string;
  redirectPath?: string;
  onRedirect?: () => void;
  autoRedirect?: boolean;
  autoRedirectDelay?: number;
}

/**
 * Reusable Success Card Component
 * 
 * PURPOSE: Standardized success state across the application
 * - Consistent success messaging and UX
 * - Configurable titles, messages, and redirect behavior
 * - Professional celebration UI with clear next steps
 * 
 * USAGE:
 * - Invitation acceptance success
 * - Password reset success  
 * - Account verification success
 * - Any other success states that redirect to sign-in
 * 
 * ENTERPRISE BENEFITS:
 * - Consistent UX across all success flows
 * - Single component to maintain and update
 * - Professional, polished user experience
 */
export function SuccessCard({
  title,
  message,
  buttonText = "Continue",
  redirectPath = "/sign-in",
  onRedirect,
  autoRedirect = false,
  autoRedirectDelay = 3000
}: SuccessCardProps) {
  const router = useRouter();

  const handleRedirect = () => {
    if (onRedirect) {
      onRedirect();
    } else {
      router.push(redirectPath);
    }
  };

  // Auto redirect if enabled
  if (autoRedirect) {
    setTimeout(handleRedirect, autoRedirectDelay);
  }

  return (
    <div className="w-full flex items-center justify-center p-4 bg-gray-50 min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{message}</p>
          <Button onClick={handleRedirect} className="w-full">
            {buttonText}
          </Button>
          {autoRedirect && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Redirecting automatically in {autoRedirectDelay / 1000} seconds...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
