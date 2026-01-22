"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface CompanyHeaderProps {
  className?: string;
}

export default function CompanyHeader({ className = "" }: CompanyHeaderProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const { currentUser, user, isLoading: authLoading } = useAuth();

  // Check if we're on a protected page (should fetch company data)
  const isProtectedPage = pathname?.startsWith('/protected') || false;
  
  // Check if we're on an auth page
  const isAuthPage = pathname?.startsWith('/sign-in') || 
                    pathname?.startsWith('/sign-up') || 
                    pathname?.startsWith('/forgot-password') || 
                    pathname?.startsWith('/reset-password') ||
                    pathname?.startsWith('/auth/');

  useEffect(() => {
    // Only fetch company data if we're on a protected page and user is authenticated
    if (!isProtectedPage || authLoading || !user || !currentUser) {
      setIsLoading(false);
      return;
    }

    // Reset states when entering a protected page
    setError(null);
    setCompany(null);
    setUserRole("");
    setIsLoading(true);

    const fetchCompanyInfo = async () => {
      try {
        const response = await fetch("/api/company");
        
        if (response.ok) {
          const data = await response.json();
          setCompany(data.company);
          setUserRole(data.userRole);
        } else {
          const errorData = await response.text();
          console.error("Company header API error:", response.status, errorData);
          setError(`API Error: ${response.status} - ${errorData}`);
        }
      } catch (error) {
        console.error("Company header fetch error:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyInfo();
  }, [isProtectedPage, authLoading, user, currentUser]);

  // Don't render anything on non-protected pages, auth pages, or if not authenticated
  if (!isProtectedPage || isAuthPage || !user || !currentUser) {
    return null;
  }

  if (authLoading || isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-300 rounded"></div>
          <div className="w-24 h-4 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-red-500 ${className}`}>
        <span className="text-xs">Company Error: {error}</span>
      </div>
    );
  }

  if (!company) {
    return (
      <div className={`flex items-center gap-2 text-yellow-600 ${className}`}>
        <span className="text-xs">No Company Assigned</span>
      </div>
    );
  }

  // Check if we're in vertical/stacked layout (flex-col class)
  const isVertical = className.includes('flex-col');

  if (isVertical) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <div className="flex items-center gap-2 justify-center">
          <span className="font-medium text-foreground text-sm leading-tight">
            {company.name}
          </span>
        </div>
        {userRole && (
          <Badge variant="secondary" className="text-xs mx-auto">
            {userRole.replace('_', ' ')}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-medium text-foreground">
        {company.name}
      </span>
      {userRole && (
        <Badge variant="secondary" className="text-xs">
          {userRole.replace('_', ' ')}
        </Badge>
      )}
    </div>
  );
} 