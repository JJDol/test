# useForm Hook

A generic form management hook that provides consistent form patterns across the application.

## Basic Usage

```typescript
import { useForm } from '@/hooks/forms/use-form';
import { InvitationFormData } from '@/lib/types/forms';

export function MyForm() {
  const { formData, setFormField, updateForm, resetForm } = useForm<InvitationFormData>({
    name: "",
    password: "",
    confirmPassword: ""
  });

  // Update single field
  const handleNameChange = (value: string) => {
    setFormField("name", value);
  };

  // Update multiple fields at once
  const handleApiResponse = (apiData: any) => {
    updateForm({
      name: apiData.name || "",
      password: ""
    });
  };

  // Reset form to initial state
  const handleReset = () => {
    resetForm();
  };

  return (
    <form>
      <input
        value={formData.name}
        onChange={(e) => handleNameChange(e.target.value)}
      />
      {/* ... other fields */}
    </form>
  );
}
```

## Available Methods

### State
- `formData` - Current form data
- `setFormData` - Direct form data setter

### Field Operations
- `setFormField(field, value)` - Update single field
- `updateForm(updates)` - Update multiple fields

### Form Operations
- `resetForm()` - Reset to initial data
- `clearForm()` - Clear all fields to empty
- `setFormDataDirectly(data)` - Set complete form data

### Utility Checks
- `isFormModified()` - Check if form has been modified
- `hasFormValues()` - Check if form has any values

## Benefits

1. **Consistent Patterns** - Same form management across all components
2. **Type Safety** - Full TypeScript support with generic types
3. **Performance** - Uses useCallback for optimized re-renders
4. **Maintainable** - Centralized form logic
5. **Reusable** - Can be used in any form component

## Migration from Manual State

### Before (Manual State)
```typescript
const [formData, setFormData] = useState({ name: "", password: "" });

const handleInputChange = (field: string, value: string) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
};
```

### After (useForm Hook)
```typescript
const { formData, setFormField } = useForm({ name: "", password: "" });

const handleInputChange = (field: keyof FormData, value: string) => {
  setFormField(field, value);
};
```

## Type Safety

The hook is fully typed and will provide autocomplete for field names:

```typescript
interface MyFormData {
  name: string;
  email: string;
  age: number;
}

const { setFormField } = useForm<MyFormData>({ name: "", email: "", age: 0 });

// TypeScript will autocomplete field names
setFormField("name", "John");     // ✅ Valid
setFormField("email", "test");    // ✅ Valid
setFormField("age", 25);          // ✅ Valid
setFormField("invalid", "test");  // ❌ TypeScript error
```
