import { Building2, FolderOpen, Users, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  companyName?: string | null;
  selectedCompanyName?: string | null;
  isAdmin: boolean;
  selectedCompanyId?: string | null;
  hasCompany: boolean;
  projectsCount: number;
  activeProjectsCount: number;
  overdueProjectsCount: number;
}

export function DashboardHeader({
  companyName,
  selectedCompanyName,
  isAdmin,
  selectedCompanyId,
  hasCompany,
  projectsCount,
  activeProjectsCount,
  overdueProjectsCount
}: DashboardHeaderProps) {
  // Determine which header to show
  let headerType: 'company' | 'selected-company' | 'all-companies' | null = null;
  let title = '';
  let icon = <Building2 className="w-6 h-6 text-primary" />;
  let bgColor = 'bg-muted/30';
  let borderColor = 'border';
  let badgeText = '';
  let badgeVariant: "outline" | "secondary" = "outline";

  if (isAdmin && selectedCompanyId) {
    // ADMIN viewing specific company
    headerType = 'selected-company';
    title = `${selectedCompanyName || "Selected Company"} Projects`;
    bgColor = 'bg-primary/10';
    borderColor = 'border-primary/20';
    badgeText = 'ADMIN VIEW';
  } else if (hasCompany && !selectedCompanyId) {
    // Regular user or ADMIN viewing their own company
    headerType = 'company';
    title = `${companyName} Projects`;
    bgColor = 'bg-muted/30';
    borderColor = 'border';
  } else if (isAdmin && !selectedCompanyId && !hasCompany) {
    // ADMIN viewing all companies
    headerType = 'all-companies';
    title = 'All Companies Dashboard';
    icon = <Globe className="w-6 h-6 text-primary" />;
    bgColor = 'bg-gradient-to-r from-blue-50 to-purple-50';
    borderColor = 'border-blue-200';
    badgeText = 'ADMIN VIEW';
  }

  // Don't render if no header type determined
  if (!headerType) return null;

  return (
    <div className={`mb-6 p-4 ${bgColor} rounded-lg ${borderColor}`}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h1 className="text-2xl font-bold">{title}</h1>
        {badgeText && (
          <Badge variant={badgeVariant} className="text-xs">
            {badgeText}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          <span>{projectsCount} Total Projects</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{activeProjectsCount} Active</span>
        </div>
        {overdueProjectsCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {overdueProjectsCount} Overdue
          </Badge>
        )}
      </div>
    </div>
  );
}
