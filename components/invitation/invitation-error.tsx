import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InvitationErrorProps {
  error: string;
}

/**
 * Invitation Error Component
 * 
 * PURPOSE: Shows error state for invalid/expired invitations
 * - Full page error display for critical failures
 * - Clear call-to-action for user recovery
 * - Professional error messaging
 */
export function InvitationError({ error }: InvitationErrorProps) {
  const router = useRouter();

  return (
    <div className="w-full flex items-center justify-center p-4 bg-gray-50 min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">Please contact admin.</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push('/sign-in')} className="w-full">
            Go to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
