import { Building2, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  companyName?: string | null;
  selectedCompanyName?: string | null;
  isAdmin: boolean;
  selectedCompanyId?: string | null;
  hasCompany: boolean;
}

export function DashboardHeader({
  companyName,
  selectedCompanyName,
  isAdmin,
  selectedCompanyId,
  hasCompany
}: DashboardHeaderProps) {
  // Determine which header to show
  let headerType: 'company' | 'selected-company' | 'all-companies' | null = null;
  let title = '';
  let icon = <Building2 className="w-6 h-6 text-primary" />;
  let badgeText = '';
  let badgeVariant: "outline" | "secondary" = "outline";

  if (isAdmin && selectedCompanyId) {
    // ADMIN viewing specific company
    headerType = 'selected-company';
    title = `${selectedCompanyName || "Selected Company"} Projects`;
    badgeText = 'ADMIN VIEW';
  } else if (hasCompany && !selectedCompanyId) {
    // Regular user or ADMIN viewing their own company
    headerType = 'company';
    title = `${companyName} Projects`;
  } else if (isAdmin && !selectedCompanyId && !hasCompany) {
    // ADMIN viewing all companies
    headerType = 'all-companies';
    title = 'All Companies Dashboard';
    icon = <Globe className="w-6 h-6 text-primary" />;
    badgeText = 'ADMIN VIEW';
  }

  // Don't render if no header type determined
  if (!headerType) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {icon}
        <h1 className="text-2xl font-bold">{title}</h1>
        {badgeText && (
          <Badge variant={badgeVariant} className="text-xs">
            {badgeText}
          </Badge>
        )}
      </div>
    </div>
  );
}
