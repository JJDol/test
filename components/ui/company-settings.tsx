"use client";

import { useState, useEffect } from "react";
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
        title: "Error",
        description: "Failed to load company information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Company name is required",
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
          title: "Success",
          description: "Company information updated successfully"
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update company information",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating company:", error);
      toast({
        title: "Error",
        description: "Failed to update company information",
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
        Company Settings
      </CardTitle>
      <CardDescription>
        Manage your company information and branding
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
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter company name"
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
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Company Information
            </>
          )}
        </Button>

        {company && (
          <div className="text-sm text-muted-foreground pt-4 border-t">
            <p>Company ID: {company.id}</p>
            <p>Created: {new Date(company.created_at).toLocaleDateString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 