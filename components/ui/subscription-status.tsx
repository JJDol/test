"use client"

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, Crown, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface SubscriptionData {
  company: {
    id: string;
    name: string;
    subscription_tier: 'basic' | 'pro' | 'enterprise';
  };
  limits: {
    max_users: number;
    max_projects: number;
    max_storage_gb: number;
  };
  usage: {
    current_users: number;
    current_projects: number;
    current_storage_gb: number;
  };
  usage_percentages: {
    users: number;
    projects: number;
    storage: number;
  };
  limits_reached: {
    users: boolean;
    projects: boolean;
    storage: boolean;
  };
}

interface SubscriptionStatusProps {
  companyId?: string | null; // For ADMIN users to check specific companies
}

export default function SubscriptionStatus({ companyId }: SubscriptionStatusProps) {
  const t = useTranslations("subscription");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, [companyId]);

  const fetchSubscriptionData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let url = "/api/subscription/usage";
      if (companyId) {
        url += `?company_id=${companyId}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch subscription data");
      }
      
      setData(result);
    } catch (error) {
      console.error("Error fetching subscription data:", error);
      setError(error instanceof Error ? error.message : "Failed to load subscription data");
    } finally {
      setIsLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'basic': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'enterprise': return <Crown className="w-4 h-4" />;
      default: return null;
    }
  };

  const getProgressColor = (percentage: number, isLimitReached: boolean) => {
    if (isLimitReached) return "bg-red-500";
    if (percentage >= 90) return "bg-orange-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{tc("loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {t("title")}
          {getTierIcon(data.company.subscription_tier)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subscription Tier */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{tc("plan")}</span>
          <Badge className={getTierColor(data.company.subscription_tier)}>
            {data.company.subscription_tier.toUpperCase()}
          </Badge>
        </div>

        {/* Users Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{t("users")}</span>
              {data.limits_reached.users && (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
            </div>
            <span className={data.limits_reached.users ? "text-red-500 font-medium" : ""}>
              {data.usage.current_users} / {data.limits.max_users}
            </span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${getProgressColor(data.usage_percentages.users, data.limits_reached.users)}`}
              style={{ width: `${Math.min(data.usage_percentages.users, 100)}%` }}
            />
          </div>
        </div>

        {/* Projects Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span>{tn("projects")}</span>
              {data.limits_reached.projects && (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
            </div>
            <span className={data.limits_reached.projects ? "text-red-500 font-medium" : ""}>
              {data.usage.current_projects} / {data.limits.max_projects}
            </span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${getProgressColor(data.usage_percentages.projects, data.limits_reached.projects)}`}
              style={{ width: `${Math.min(data.usage_percentages.projects, 100)}%` }}
            />
          </div>
        </div>

        {/* Warning messages */}
        {(data.limits_reached.users || data.limits_reached.projects) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">{t("limitReached")}</p>
                <p className="text-red-600">
                  {data.limits_reached.users && `${t("cannotAddUsers")} `}
                  {data.limits_reached.projects && `${t("cannotCreateProjects")} `}
                  {t("pleaseUpgrade")}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 