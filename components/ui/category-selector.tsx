/**
 * 🏢 CategorySelector - Enterprise Category Selection Component
 * 
 * PURPOSE: Reusable category selector with icons and professional styling
 * - Consistent category selection across document and project templates
 * - Professional icon display with proper accessibility
 * - Responsive design with proper spacing
 * - Type-safe category handling
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
import { DocumentCategory, getCategoryTranslationKey } from "@/lib/types/types";
import Image from "next/image";

type AllOptionValue = 'ALL' | 'GLOBAL';

interface CategorySelectorProps<T extends AllOptionValue = 'ALL'> {
  selectedCategory: DocumentCategory | T;
  onCategoryChange: (category: DocumentCategory | T) => void;
  showAllOption?: boolean;
  className?: string;
  allLabel?: string;
  allValue?: T;
}

export function CategorySelector<T extends AllOptionValue = 'ALL'>({
  selectedCategory,
  onCategoryChange,
  showAllOption = true,
  className = "",
  allLabel = "All",
  allValue = "ALL" as T
}: CategorySelectorProps<T>) {
  const tc = useTranslations("common");
  const categories = showAllOption
    ? [allValue, ...Object.values(DocumentCategory)] as (DocumentCategory | T)[]
    : Object.values(DocumentCategory) as (DocumentCategory | T)[];

  const imgMap: Record<string, string> = {
    [DocumentCategory.ARCHITECTURE]: '/images/categories/architecture.svg',
    [DocumentCategory.CONSTRUCTIONS]: '/images/categories/construction.svg',
    [DocumentCategory.FIRE]: '/images/categories/fire.svg',
    [DocumentCategory.ENERGY]: '/images/categories/energy.svg',
    [DocumentCategory.HVAC]: '/images/categories/vvs.svg',
    [DocumentCategory.EXECUTION_CONTROL]: '/images/categories/udførelseskontrol.svg',
    [DocumentCategory.AUTHORITY_PROCESSING]: '/images/categories/architecture.svg',
    ALL: '/images/categories/architecture.svg',
  };

  return (
    <div className={`flex items-center gap-3 mb-6 flex-wrap ${className}`}>
      {categories.map((cat) => {
        const isActive = selectedCategory === cat;
        const isAllOption = cat === allValue;
        const label = isAllOption ? allLabel : tc(getCategoryTranslationKey(cat as DocumentCategory));

        return (
          <Button
            key={cat as string}
            variant={isActive ? 'default' : 'outline'}
            onClick={() => onCategoryChange(cat)}
            className="flex items-center gap-2"
          >
            {!isAllOption && (
              <span
                className={`h-8 w-8 rounded-md flex items-center justify-center ${
                  isActive ? 'bg-foreground/20' : 'bg-foreground/10'
                }`}
              >
                <Image
                  src={imgMap[cat as string]}
                  alt={label}
                  width={20}
                  height={20}
                  className="opacity-95"
                />
              </span>
            )}
            {label}
          </Button>
        );
      })}
    </div>
  );
}
