/**
 * 🏢 ViewModeSelector - Enterprise View Mode Selection Component
 * 
 * PURPOSE: Reusable view mode selector for filtering content
 * - Consistent view mode selection across components
 * - Professional button group styling
 * - Type-safe view mode handling
 * - Configurable view modes and labels
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Reusable across multiple components
 * - Consistent UX across the application
 * - Professional visual design
 * - Accessible and responsive
 */

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type ViewMode = 'all' | 'public' | 'private';

interface ViewModeOption {
  value: ViewMode;
  label: string;
}

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  options?: ViewModeOption[];
  className?: string;
}

export function ViewModeSelector({
  viewMode,
  onViewModeChange,
  options,
  className = ""
}: ViewModeSelectorProps) {
  const t = useTranslations("templates");
  const defaultOptions: ViewModeOption[] = [
    { value: 'all', label: t("all") },
    { value: 'public', label: t("public") },
    { value: 'private', label: t("myTemplates") }
  ];
  const resolvedOptions = options ?? defaultOptions;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {resolvedOptions.map((option) => (
        <Button
          key={option.value}
          variant={viewMode === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
