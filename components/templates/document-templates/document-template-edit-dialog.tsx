/**
 * 🏢 TemplateEditDialog - Enterprise Template Edit Dialog Component
 * 
 * PURPOSE: Modal dialog for editing template metadata
 * - Handles template name, description, and category editing
 * - Professional form validation and error handling
 * - Clean separation from business logic
 */

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentTemplate, DocumentCategory, getCategoryTranslationKey } from "@/lib/types/types";

interface DocumentTemplateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateToEdit: DocumentTemplate | null;
  editName: string;
  editDescription: string;
  editCategory: DocumentCategory;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onCategoryChange: (category: DocumentCategory) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function DocumentTemplateEditDialog({
  open,
  onOpenChange,
  templateToEdit,
  editName,
  editDescription,
  editCategory,
  onNameChange,
  onDescriptionChange,
  onCategoryChange,
  onSave,
  onCancel,
  loading,
}: DocumentTemplateEditDialogProps) {
  const t = useTranslations("templates");
  const tc = useTranslations("common");

  const handleSave = async () => {
    await onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("editTemplate")}</DialogTitle>
          <DialogDescription>
            {t("editDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 pb-6">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">{tc("name")}</Label>
            <Input 
              id="edit-name" 
              value={editName} 
              onChange={(e) => onNameChange(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description">{tc("description")}</Label>
            <Textarea 
              id="edit-description" 
              value={editDescription} 
              onChange={(e) => onDescriptionChange(e.target.value)} 
              rows={3}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("category")}</Label>
            <Select 
              value={editCategory} 
              onValueChange={(v) => onCategoryChange(v as DocumentCategory)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(DocumentCategory).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {tc(getCategoryTranslationKey(cat))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? tc("updatingEllipsis") : tc("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

