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

import { Button } from "@/components/ui/button";
import { DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";
import Image from "next/image";

interface CategorySelectorProps {
  selectedCategory: DocumentCategory | 'ALL';
  onCategoryChange: (category: DocumentCategory | 'ALL') => void;
  showAllOption?: boolean;
  className?: string;
}

export function CategorySelector({
  selectedCategory,
  onCategoryChange,
  showAllOption = true,
  className = ""
}: CategorySelectorProps) {
  const categories = showAllOption 
    ? ['ALL', ...Object.values(DocumentCategory)] as (DocumentCategory | 'ALL')[]
    : Object.values(DocumentCategory);

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
        const label = cat === 'ALL' ? 'All' : getCategoryDisplayName(cat as DocumentCategory);
        
        return (
          <Button
            key={cat as string}
            variant={isActive ? 'default' : 'outline'}
            onClick={() => onCategoryChange(cat)}
            className="flex items-center gap-2"
          >
            {cat !== 'ALL' && (
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
