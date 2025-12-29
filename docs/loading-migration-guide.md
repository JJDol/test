# Loading Component Migration Guide

## Summary
We've consolidated all loading patterns into a single `LoadingState` component with multiple variants. This replaces the separate `LoadingDialog` component and provides consistent loading UX across the application.

## Migration: LoadingDialog → LoadingState

### ❌ Old Incorrect Pattern (Dashboard/Kanban)
```typescript
// This was WRONG - returning a dialog as entire page content
if (isLoading) {
  return (
    <LoadingDialog 
      open={true}
      title="Loading Dashboard"
      message="Please wait while we load your dashboard..."
    />
  );
}
```

### ✅ New Correct Pattern - Option 1: Page Loading
```typescript
// Better: Use page variant for initial page loads
if (isLoading) {
  return (
    <LoadingState
      title="Loading Dashboard"
      message="Please wait while we load your dashboard..."
      variant="page"
    />
  );
}
```

### ✅ New Correct Pattern - Option 2: Dialog Loading
```typescript
// Best: Use dialog variant for overlay loading during operations
return (
  <div>
    {/* Your page content */}
    <DashboardContent />
    
    {/* Loading overlay when needed */}
    <LoadingState
      title="Loading Dashboard"
      message="Please wait while we load your dashboard..."
      variant="dialog"
      open={isLoading}
    />
  </div>
);
```

## All LoadingState Variants

### 1. Page Loading (`variant="page"`)
```typescript
<LoadingState
  title="Validating Token"
  message="Please wait while we verify your token..."
  variant="page"
/>
```
- **Use for**: Initial page loads, token validation, redirects
- **Appearance**: Full screen with background circle and large text

### 2. Card Loading (`variant="card"`)
```typescript
<LoadingState
  title="Processing"
  message="Please wait..."
  variant="card"
/>
```
- **Use for**: Form submissions, card-based layouts
- **Appearance**: Card container with gray background

### 3. Inline Loading (`variant="inline"`)
```typescript
<LoadingState
  message="Loading documents..."
  variant="inline"
  size="sm"
/>
```
- **Use for**: Component-level loading, list items
- **Appearance**: Simple spinner with message

### 4. Dialog Loading (`variant="dialog"`)
```typescript
<LoadingState
  title="Saving Changes"
  message="Please wait while we save your changes..."
  variant="dialog"
  open={isSaving}
/>
```
- **Use for**: Overlay loading during operations
- **Appearance**: Modal dialog with spinner

## Size Options
- `size="sm"` - Small (24px spinner)
- `size="md"` - Medium (32px spinner) - Default
- `size="lg"` - Large (48px spinner)

## Migration Checklist
- [ ] Replace `LoadingDialog` imports with `LoadingState`
- [ ] Change incorrect page returns to proper page variant
- [ ] Use dialog variant for true overlay scenarios
- [ ] Update props (open, hideCloseButton → variant, size)
- [ ] Test all loading states for consistency

## Benefits
✅ Consistent loading experience across entire app
✅ Single component to maintain and update  
✅ Proper semantic usage (page vs overlay loading)
✅ Professional, polished user experience
✅ Smaller bundle size (consolidated components)
