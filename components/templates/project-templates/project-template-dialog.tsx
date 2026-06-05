/**
 * 🏢 ProjectTemplateDialog - Unified Project Template Dialog
 * 
 * PURPOSE: Unified modal dialog for creating and editing project templates
 * - Handles project template name and category selection
 * - Manages document template assignment
 * - Professional form validation and UX
 * - Supports both create and edit modes
 */

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ViewModeSelector } from "@/components/ui/view-mode-selector";
import { DocumentCategory, getCategoryDisplayName, DocumentTemplate } from "@/lib/types/types";

interface ProjectTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  projectTemplate: {
    name: string;
    templates: string[];
    category: DocumentCategory;
  };
  documentTemplates: DocumentTemplate[];
  documentViewMode: 'all' | 'public' | 'private';
  onDocumentViewModeChange: (mode: 'all' | 'public' | 'private') => void;
  onNameChange: (name: string) => void;
  onCategoryChange: (category: DocumentCategory) => void;
  onTemplatesChange: (templates: string[]) => void;
  onAddTemplate: (templateName: string) => void;
  onRemoveTemplate: (templateName: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function ProjectTemplateDialog({
  open,
  onOpenChange,
  mode,
  projectTemplate,
  documentTemplates,
  documentViewMode,
  onDocumentViewModeChange,
  onNameChange,
  onCategoryChange,
  onTemplatesChange,
  onAddTemplate,
  onRemoveTemplate,
  onSave,
  onCancel,
  loading,
}: ProjectTemplateDialogProps) {
  const t = useTranslations("templates");
  const tc = useTranslations("common");

  const handleTemplateToggle = (templateName: string, checked: boolean) => {
    if (checked) {
      onAddTemplate(templateName);
    } else {
      onRemoveTemplate(templateName);
    }
  };

  const handleSave = async () => {
    await onSave();
  };

  const isCreate = mode === 'create';
  const inputPrefix = isCreate ? '' : 'edit-pt-';
  const checkboxPrefix = isCreate ? '' : 'edit-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isCreate ? t('createProjectTemplate') : t('editProjectTemplate')}
          </DialogTitle>
          <DialogDescription>
            {isCreate 
              ? t('createDescription')
              : t('editDescription')
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 pb-6">
          <div className="grid gap-2">
            <Label htmlFor={`${inputPrefix}name`}>{t("templateName")}</Label>
            <Input
              id={`${inputPrefix}name`}
              value={projectTemplate.name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={t("templateNamePlaceholder")}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${inputPrefix}category`}>{t("category")}</Label>
            <Select 
              value={projectTemplate.category} 
              onValueChange={(value) => onCategoryChange(value as DocumentCategory)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DocumentCategory).map((category) => (
                  <SelectItem key={category} value={category}>
                    {getCategoryDisplayName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Template Filter Selection */}
          <div className="grid gap-2">
            <Label>{t("templateFilter")}</Label>
            <ViewModeSelector
              viewMode={documentViewMode}
              onViewModeChange={onDocumentViewModeChange}
              className="flex gap-2"
            />
          </div>

          {projectTemplate.category && (
            <div className="grid gap-2">
              <Label>{t("availableTemplates")}</Label>
              <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                {documentTemplates
                  .filter(template => template.category === projectTemplate.category)
                  .map((template) => (
                    <div key={template.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${checkboxPrefix}${template.name}`}
                        checked={projectTemplate.templates.includes(template.name)}
                        onCheckedChange={(checked) => handleTemplateToggle(template.name, !!checked)}
                        disabled={loading}
                      />
                      <Label htmlFor={`${checkboxPrefix}${template.name}`} className="flex-1">
                        {template.name}
                        {template.description && (
                          <span className="text-sm text-gray-500 block">
                            {template.description}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <h4 className="font-medium mb-2">{t("selectedTemplates")}</h4>
            <div className="flex flex-wrap gap-2">
              {projectTemplate.templates.map((templateName) => (
                <Badge 
                  key={templateName} 
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {templateName}
                  <button
                    onClick={() => onRemoveTemplate(templateName)}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                    disabled={loading}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading 
              ? (isCreate ? tc('creatingEllipsis') : tc('updatingEllipsis')) 
              : (isCreate ? t('createTemplate') : tc('saveChanges'))
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
