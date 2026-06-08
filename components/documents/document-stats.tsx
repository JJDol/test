/**
 * 🏢 Document Statistics - Reusable Statistics Display Component
 * 
 * PURPOSE: Clean display of document statistics
 * - Shows total, personal, company, public, and processing counts
 * - Highlights processing documents when active
 * - Reusable across different document contexts
 */

"use client";

import { useTranslations } from "next-intl";

interface DocumentStatsProps {
  stats: {
    total: number;
    personal: number;
    company: number;
    public: number;
    processing: number;
  };
  className?: string;
}

export function DocumentStats({ stats, className = "" }: DocumentStatsProps) {
  const t = useTranslations("documents");
  return (
    <div className={`flex gap-4 mt-2 text-sm text-muted-foreground ${className}`}>
      <span>{t("title")}: <span className="font-medium">{stats.total}</span></span>
      <span>{t("personal")}: <span className="font-medium">{stats.personal}</span></span>
      <span>{t("company")}: <span className="font-medium">{stats.company}</span></span>
      <span>{t("public")}: <span className="font-medium">{stats.public}</span></span>
      {stats.processing > 0 && (
        <span className="text-blue-600">
          {t("processingDocuments")}: <span className="font-medium">{stats.processing}</span>
        </span>
      )}
    </div>
  );
}
