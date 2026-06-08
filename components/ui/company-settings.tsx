"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface CompanySettingsProps {
  isAdmin: boolean;
  isCompanyAdmin: boolean;
}

export default function CompanySettings({ isAdmin, isCompanyAdmin }: CompanySettingsProps) {
  const t = useTranslations("company");
  const tc = useTranslations("common");
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch("/api/company");
      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
        setFormData({
          name: data.company.name || ""
        });
      }
    } catch (error) {
      console.error("Error fetching company info:", error);
      toast({
        title: tc("error"),
        description: t("failedToLoadCompany"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: tc("error"),
        description: t("companyNameRequired"),
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/company", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setCompany(data.company);
        toast({
          title: tc("success"),
          description: t("companyUpdatedSuccess")
        });
      } else {
        toast({
          title: tc("error"),
          description: data.message || t("failedToUpdateCompany"),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating company:", error);
      toast({
        title: tc("error"),
        description: t("failedToUpdateCompany"),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isCompanyAdmin && !isAdmin) {
    return null;
  }

  const renderHeader = () => (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        {t("companySettings")}
      </CardTitle>
      <CardDescription>
        {t("manageCompanyInfo")}
      </CardDescription>
    </CardHeader>
  );

  if (isLoading) {
    return (
      <Card>
        {renderHeader()}
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
            <div className="h-10 bg-gray-300 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {renderHeader()}
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-name">{t("companyName")}</Label>
          <Input
            id="company-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t("enterCompanyName")}
          />
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("savingEllipsis")}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t("saveCompanyInfo")}
            </>
          )}
        </Button>

        {company && (
          <div className="text-sm text-muted-foreground pt-4 border-t">
            <p>{t("companyId")}: {company.id}</p>
            <p>{t("created")}: {new Date(company.created_at).toLocaleDateString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 