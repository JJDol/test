/**
 * Service Unavailable Component
 * 
 * PURPOSE: Professional message when authentication service is unavailable
 * - No technical details exposed to users
 * - Professional maintenance messaging
 * - Graceful degradation of functionality
 */

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";

export function ServiceUnavailable() {
  return (
    <div className="flex items-center gap-4">
      <Alert className="border-amber-200 bg-amber-50 max-w-md">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          Authentication service temporarily unavailable. Please try again later.
        </AlertDescription>
      </Alert>
      
      <Button
        variant="outline"
        size="sm"
        disabled
        className="opacity-50"
      >
        Contact Support
      </Button>
    </div>
  );
}

/**
 * @deprecated Use ServiceUnavailable instead
 * Kept for backward compatibility during transition
 */
export function EnvVarWarning() {
  return <ServiceUnavailable />;
}
