/**
 * 🏢 TemplateCard - Enterprise Template Card Component
 * 
 * PURPOSE: Individual template display card with actions
 * - Displays template information and variables
 * - Handles template actions (download, edit, delete)
 * - Expandable/collapsible design
 * - Professional styling and interactions
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentTemplate } from "@/lib/types/types";
import { ChevronDown, DownloadIcon, Loader2, Pencil, Trash2, UploadCloud } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { getVariableTypeStyle } from "@/utils/variable-type-styles";

interface DocumentTemplateCardProps {
  template: DocumentTemplate;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReupload: () => void;
}

export function DocumentTemplateCard({
  template,
  isExpanded,
  onToggleExpanded,
  onEdit,
  onDelete,
  onReupload,
}: DocumentTemplateCardProps) {
  const t = useTranslations("templates");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      console.log('Starting template download for:', template.name);

      const response = await fetch(`/api/document-templates/${encodeURIComponent(template.name)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Download response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed with response:', errorText);
        
        let errorMessage = 'Download failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      console.log('Downloaded blob size:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.original_file_name || `${template.name}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Template download completed successfully');
      // TODO: This toast doesnt show
      toast({
        title: tc("success"),
        description: t("templateDownloaded"),
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("failedToDownload"),
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // TODO: Consider make this util or make it more efficient
  const typeCounts = template.variables?.reduce<Record<string, number>>((acc, v) => {
    const t = (v?.type as string) || 'text';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div
      className={`py-3 border-b border-foreground/10 cursor-pointer transition-colors ${isExpanded ? 'bg-muted/20' : 'hover:bg-muted/10'}`}
      onClick={onToggleExpanded}
    >
      <div className="flex items-center justify-between">
        {/* Left: chevron + title + badges */}
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          <span className="text-base font-medium truncate">{template.name}</span>
          <Badge variant={template.is_public ? "default" : "secondary"} className="shrink-0">
            {template.is_public ? t("public") : t("private")}
          </Badge>
          <Badge variant="outline" className="text-xs shrink-0">
            v{template.current_version || 1}
          </Badge>
        </div>

        {/* Right: modified + actions */}
        <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-sm text-muted-foreground hidden sm:inline whitespace-nowrap">
            {t("lastUpdated")}: {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : '—'}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/70 hover:text-foreground"
              title={isDownloading ? tc("loading") : tc("download")}
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DownloadIcon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/70 hover:text-foreground"
              title={t("reuploadTemplate")}
              onClick={onReupload}
            >
              <UploadCloud className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/70 hover:text-foreground"
              title={tc("edit")}
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-400 hover:text-red-500"
              title={tc("delete")}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pl-6">
          {template.variables && template.variables.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeCounts).map(([type, count]) => (
                  <Badge key={type} style={getVariableTypeStyle(type)} className="capitalize">
                    {type} · {count}
                  </Badge>
                ))}
              </div>
              <div className="border rounded-md p-3 max-h-[220px] overflow-y-auto bg-background">
                <div className="grid gap-2">
                  {template.variables.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="font-mono text-xs truncate max-w-[260px]">
                          {v.name}
                        </Badge>
                        <Badge className="text-xs capitalize" style={getVariableTypeStyle(v.type)}>
                          {v.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No variables detected for this template.</p>
          )}
        </div>
      )}
    </div>
  );
}
