# Component Extraction Proposals

## Overview

This document outlines proposed component extractions and refactoring opportunities identified during code analysis. These proposals are for future implementation to improve code reusability, maintainability, and consistency across the application.

## Current State Analysis

### Document Template Card Component
- **File**: `components/templates/document-templates/document-template-card.tsx`
- **Size**: 213 lines
- **Complexity**: High - contains multiple responsibilities
- **Issues**: 
  - 60+ lines of download logic
  - Inline action buttons pattern
  - Complex variable type counting logic
  - Mixed UI and business logic

### Project Template Card Pattern
- **File**: `components/templates/project-templates/project-templates-tab.tsx`
- **Pattern**: Uses DropdownMenu for actions
- **Difference**: Different UI pattern for same functionality

## Proposed Extractions

### 1. Download Handler Hook ⭐ **HIGH PRIORITY**

**Current Problem:**
- 60+ lines of complex download logic embedded in component
- Duplicated download patterns across components
- Hard to test and maintain

**Proposed Solution:**
```typescript
// hooks/use-download-handler.ts
export function useDownloadHandler() {
  const { toast } = useToast();
  
  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
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
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive",
      });
    }
  };
  
  return { downloadFile };
}
```

**Benefits:**
- Reusable across all components
- Centralized error handling
- Easy to test
- Consistent download behavior

### 2. Action Button Group Component ⭐ **HIGH PRIORITY**

**Current Problem:**
- Inconsistent action button patterns (inline vs dropdown)
- Duplicated button styling and behavior
- Hard to maintain consistent UX

**Proposed Solution:**
```typescript
// components/ui/action-button-group.tsx
interface ActionButton {
  id: string;
  label: string;
  icon: React.ComponentType;
  variant?: 'default' | 'destructive' | 'disabled';
  disabled?: boolean;
  onClick: () => void;
}

interface ActionButtonGroupProps {
  variant: 'inline' | 'dropdown';
  actions: ActionButton[];
  className?: string;
}

export function ActionButtonGroup({ variant, actions, className }: ActionButtonGroupProps) {
  if (variant === 'dropdown') {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action) => (
            <DropdownMenuItem 
              key={action.id}
              onClick={action.onClick}
              className={action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="ghost"
          size="icon"
          className={`h-9 w-9 ${
            action.variant === 'destructive' 
              ? 'text-red-400 hover:text-red-500' 
              : 'text-foreground/70 hover:text-foreground'
          }`}
          title={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          <action.icon className="h-5 w-5" />
        </Button>
      ))}
    </div>
  );
}
```

**Usage Examples:**
```typescript
// Document template actions
<ActionButtonGroup
  variant="inline"
  actions={[
    {
      id: 'download',
      label: 'Download',
      icon: DownloadIcon,
      onClick: () => handleDownload(template)
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: Pencil,
      onClick: () => onEdit()
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      onClick: () => onDelete()
    }
  ]}
/>

// Project template actions
<ActionButtonGroup
  variant="dropdown"
  actions={[
    {
      id: 'download',
      label: 'Download',
      icon: DownloadIcon,
      onClick: () => handleDownloadProjectTemplate(pt)
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: Pencil,
      onClick: () => actions.openEditDialog(pt)
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      onClick: () => actions.openDeleteDialog(pt)
    }
  ]}
/>
```

**Benefits:**
- Consistent action button patterns
- Reusable across different card types
- Easy to maintain and update
- Supports both inline and dropdown variants

### 3. Variable Type Counter Utility ⭐ **MEDIUM PRIORITY**

**Current Problem:**
- TODO comment indicates it should be a util
- Duplicated logic across components
- Not easily testable

**Proposed Solution:**
```typescript
// utils/variable-type-counter.ts
import { Variable } from '@/lib/types';

export function getVariableTypeCounts(variables: Variable[]): Record<string, number> {
  return variables?.reduce<Record<string, number>>((acc, v) => {
    const t = (v?.type as string) || 'text';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {}) || {};
}

export function getVariableTypeStats(variables: Variable[]): {
  total: number;
  byType: Record<string, number>;
  types: string[];
} {
  const byType = getVariableTypeCounts(variables);
  const types = Object.keys(byType);
  const total = variables?.length || 0;
  
  return {
    total,
    byType,
    types
  };
}
```

**Benefits:**
- Pure function, easy to test
- Reusable across components
- Centralized variable counting logic
- Additional utility functions available

### 4. Template Card Header Component ⭐ **LOW PRIORITY**

**Current Problem:**
- Similar header pattern across different card types
- Inconsistent template info display

**Proposed Solution:**
```typescript
// components/templates/template-card-header.tsx
interface TemplateCardHeaderProps {
  title: string;
  description?: string;
  isPublic: boolean;
  modifiedDate: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  actions: React.ReactNode;
  className?: string;
}

export function TemplateCardHeader({
  title,
  description,
  isPublic,
  modifiedDate,
  isExpanded,
  onToggleExpanded,
  actions,
  className
}: TemplateCardHeaderProps) {
  return (
    <div className={`flex items-start justify-between ${className}`}>
      {/* Left: title + description */}
      <div className="min-w-0 pr-4" onClick={onToggleExpanded}>
        <div className="flex items-center gap-3">
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          <span className="text-base font-medium truncate">{title}</span>
          <Badge variant={isPublic ? "default" : "secondary"}>
            {isPublic ? "Public" : "Private"}
          </Badge>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}
      </div>

      {/* Right: modified + actions */}
      <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Modified {new Date(modifiedDate).toLocaleDateString()}
        </span>
        {actions}
      </div>
    </div>
  );
}
```

**Benefits:**
- Consistent header layout
- Reusable across template types
- Standardized template info display

### 5. Variable Display Component ⭐ **LOW PRIORITY**

**Current Problem:**
- Complex variable display logic (30+ lines)
- Could be reused in other template views

**Proposed Solution:**
```typescript
// components/templates/variable-display.tsx
interface VariableDisplayProps {
  variables: Variable[];
  showCounts?: boolean;
  showDetails?: boolean;
  maxHeight?: string;
  className?: string;
}

export function VariableDisplay({
  variables,
  showCounts = true,
  showDetails = true,
  maxHeight = "220px",
  className
}: VariableDisplayProps) {
  const typeCounts = getVariableTypeCounts(variables);

  if (!variables || variables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No variables detected.</p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {showCounts && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeCounts).map(([type, count]) => (
            <Badge key={type} style={getVariableTypeStyle(type)} className="capitalize">
              {type} · {count}
            </Badge>
          ))}
        </div>
      )}
      
      {showDetails && (
        <div className={`border rounded-md p-3 overflow-y-auto bg-background`} style={{ maxHeight }}>
          <div className="grid gap-2">
            {variables.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="font-mono text-xs truncate max-w-[260px]">
                    {v.name}
                  </Badge>
                  <Badge className="text-xs capitalize" style={getVariableTypeStyle(v.type)}>
                    {v.type}
                  </Badge>
                </div>
                {v.originalTag && (
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[50%]">
                    {v.originalTag}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Benefits:**
- Reusable variable display logic
- Configurable display options
- Consistent variable presentation

## Implementation Priority

### Phase 1: High Impact, Low Risk
1. **Download Handler Hook** - Immediate complexity reduction
2. **Variable Type Counter Utility** - Simple, safe extraction

### Phase 2: Medium Impact, Medium Risk
3. **Action Button Group Component** - Standardizes patterns

### Phase 3: Low Impact, Low Risk
4. **Template Card Header Component** - Nice to have
5. **Variable Display Component** - Nice to have

## Expected Benefits

### Code Quality
- **Reduced complexity**: Components become more focused
- **Better testability**: Isolated logic is easier to test
- **Improved maintainability**: Changes in one place affect all usages

### Developer Experience
- **Consistency**: Standardized patterns across the application
- **Reusability**: Components can be used in multiple contexts
- **Documentation**: Clear interfaces and usage examples

### Performance
- **Code splitting**: Smaller, focused components
- **Bundle optimization**: Reusable utilities reduce duplication

## Migration Strategy

### Gradual Migration
1. Create new components alongside existing code
2. Migrate one component at a time
3. Update imports and usage
4. Remove old code after migration is complete

### Testing Strategy
1. Unit tests for utilities and hooks
2. Component tests for UI components
3. Integration tests for complete workflows

### Documentation
1. Update component documentation
2. Create usage examples
3. Update architecture documentation

## Future Considerations

### Additional Extractions
- **Template Upload Logic**: Could be extracted into a hook
- **Form Validation**: Already partially extracted, could be expanded
- **API Error Handling**: Could be centralized

### Performance Optimizations
- **Memoization**: Add React.memo where appropriate
- **Lazy Loading**: Consider code splitting for large components
- **Virtualization**: For large lists of templates

### Accessibility Improvements
- **Keyboard Navigation**: Ensure all components are keyboard accessible
- **Screen Reader Support**: Add proper ARIA labels
- **Focus Management**: Proper focus handling in modals and dropdowns

## Conclusion

These component extractions will significantly improve the codebase's maintainability, reusability, and consistency. The proposed implementation order prioritizes high-impact, low-risk changes first, followed by more comprehensive refactoring.

The modular approach allows for gradual implementation without disrupting existing functionality, making it suitable for future development cycles.
