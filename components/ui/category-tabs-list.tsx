import { DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CategoryTabsListProps {
  categories: DocumentCategory[];
  selectedTemplates: { [key in DocumentCategory]?: string | string[] };
  templateCounts?: { [key in DocumentCategory]?: number };
  gridCols?: number;
}

export function CategoryTabsList({
  categories,
  selectedTemplates,
  templateCounts,
  gridCols = 4,
}: CategoryTabsListProps) {
  return (
    <TabsList className="inline-flex h-9 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground gap-1">
      <div className={`grid grid-cols-${gridCols} gap-1 w-full`}>
        {categories.map((category) => {
          const sel = selectedTemplates[category];
          const selectedCount = Array.isArray(sel) ? sel.length : (sel && sel !== "none" ? 1 : 0);
          const totalCount = templateCounts?.[category] ?? 0;
          return (
            <TabsTrigger
              key={category}
              value={category}
              className="group whitespace-nowrap relative gap-1.5"
            >
              <span>{getCategoryDisplayName(category)}</span>
              {templateCounts && (
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                    selectedCount > 0 ? "bg-primary text-primary-foreground" : "bg-black text-white"
                  }`}
                  aria-label={`${selectedCount} selected of ${totalCount} templates`}
                >
                  {selectedCount > 0 ? selectedCount : totalCount}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </div>
    </TabsList>
  );
}
