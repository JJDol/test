/**
 * 🏢 Document Search & Filter - Reusable Search and Filter Component
 * 
 * PURPOSE: Standardized search and filtering interface
 * - Search by name, description, or tags
 * - Filter by document type (all, personal, company, public)
 * - Reusable across different document views
 */

"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

type FilterType = 'all' | 'personal' | 'company' | 'public';

interface DocumentSearchFilterProps {
  searchTerm: string;
  filterType: FilterType;
  onSearchChange: (term: string) => void;
  onFilterChange: (type: FilterType) => void;
  className?: string;
}

export function DocumentSearchFilter({
  searchTerm,
  filterType,
  onSearchChange,
  onFilterChange,
  className = ""
}: DocumentSearchFilterProps) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{tc("search")} & {tc("filter")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchDocuments")}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterType} onValueChange={onFilterChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={tc("filter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allDocuments")}</SelectItem>
              <SelectItem value="personal">{t("personalOnly")}</SelectItem>
              <SelectItem value="company">{t("companyWide")}</SelectItem>
              <SelectItem value="public">{t("public")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
