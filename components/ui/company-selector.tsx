"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2, Globe } from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface CompanySelectorProps {
  selectedCompanyId: string | null;
  onCompanyChange: (companyId: string | null, companyName: string | null) => void;
  userRole: string;
}

export default function CompanySelector({ 
  selectedCompanyId, 
  onCompanyChange, 
  userRole 
}: CompanySelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch("/api/companies");
        
        if (response.ok) {
          const data = await response.json();
          setCompanies(data.companies || []);
        } else {
          const errorData = await response.json();
          setError(errorData.message || "Failed to fetch companies");
        }
      } catch (error) {
        console.error("Company selector fetch error:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch companies for ADMIN users
    if (userRole === 'ADMIN') {
      fetchCompanies();
    } else {
      setIsLoading(false);
    }
  }, [userRole]);

  // Only show for ADMIN users
  if (userRole !== 'ADMIN') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Company Dashboard</Label>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Company Dashboard</Label>
        <div className="text-red-500 text-sm">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Company Dashboard
      </Label>
      <Select 
        value={selectedCompanyId || "all"} 
        onValueChange={(value) => {
          const companyId = value === "all" ? null : value;
          const companyName = companyId 
            ? companies.find(c => c.id === companyId)?.name || null
            : null;
          onCompanyChange(companyId, companyName);
        }}
      >
        <SelectTrigger className="bg-muted/50 border-muted-foreground/20">
          <SelectValue placeholder="Select company dashboard" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              All Companies
            </div>
          </SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {company.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedCompanyId && (
        <div className="text-xs text-muted-foreground">
          Viewing: {companies.find(c => c.id === selectedCompanyId)?.name || "Unknown Company"}
        </div>
      )}
      {!selectedCompanyId && (
        <div className="text-xs text-muted-foreground">
          Viewing: All companies combined
        </div>
      )}
    </div>
  );
} 