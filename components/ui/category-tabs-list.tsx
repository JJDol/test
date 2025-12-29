import { DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CategoryTabsListProps {
  categories: DocumentCategory[];
  selectedTemplates: { [key in DocumentCategory]?: string };
  gridCols?: number;
}

export function CategoryTabsList({ 
  categories, 
  selectedTemplates, 
  gridCols = 4 
}: CategoryTabsListProps) {
  return (
    <TabsList className="inline-flex h-9 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground gap-1">
      <div className={`grid grid-cols-${gridCols} gap-1 w-full`}>
        {categories.map((category) => (
          <TabsTrigger key={category} value={category} className="whitespace-nowrap relative">
            {getCategoryDisplayName(category)}
            {selectedTemplates[category] && selectedTemplates[category] !== 'none' && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary" />
            )}
          </TabsTrigger>
        ))}
      </div>
    </TabsList>
  );
}
