'use client';

import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, CalendarIcon, CheckIcon, CheckSquare, Hash, FileTextIcon, Upload, X, Plus, Trash2, Pencil } from 'lucide-react';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { DocumentVariable } from '@/lib/types/variable-types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';


interface EnhancedVariableInputProps {
  variable: DocumentVariable;
  onChange: (value: any) => void;
  disabled?: boolean;
  className?: string;
  // For image uploads
  projectId?: string;
  templateName?: string;
  // For dropdown options editing
  onDropdownOptionsChange?: (options: { displayText: string; value: string }[]) => void;
}

export function EnhancedVariableInput({
  variable,
  onChange,
  disabled = false,
  className,
  projectId,
  templateName,
  onDropdownOptionsChange
}: EnhancedVariableInputProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEditingDropdownOptions, setIsEditingDropdownOptions] = useState(false);
  const [editedOptions, setEditedOptions] = useState<{ displayText: string; value: string }[]>([]);
  const [newOptionText, setNewOptionText] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageRemoving, setImageRemoving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!projectId || !templateName) {
      console.error('Project ID and template name are required for image upload');
      return;
    }

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('variableName', variable.name);
      formData.append('templateName', templateName);

      const response = await fetch(`/api/projects/${projectId}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      // Store the file path as an image variable object
      onChange({
        type: 'image',
        value: result.filePath,
        filename: file.name,
        alt: variable.name
      });
      // Start loading state - waiting for image to render
      setImageLoading(true);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageRemove = async () => {
    if (!projectId || !templateName) {
      console.error('Project ID and template name are required for image removal');
      return;
    }

    // Extract the file path from the current value
    let filePath: string | null = null;
    const val = variable.value as any;

    if (typeof val === 'object' && val && 'value' in val) {
      filePath = val.value;
    } else if (typeof val === 'string' && val.includes('/images/')) {
      filePath = val;
    }

    if (filePath) {
      setImageRemoving(true);
      try {
        console.log(`Removing image: ${filePath}`);

        // Call the API to delete the image from storage
        const response = await fetch(`/api/projects/${projectId}/images`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath: filePath,
            templateName: templateName,
            variableName: variable.name
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to remove image from storage');
        }

        console.log('Image removed from storage successfully');
      } catch (error) {
        console.error('Error removing image from storage:', error);
      } finally {
        setImageRemoving(false);
      }
    }

    // Clear the value regardless of storage deletion result
    onChange('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'date':
        return <CalendarIcon className="h-4 w-4" />;
      case 'dropdown':
        return <img src="/images/icons/dropdown_input_fields.svg" alt="Dropdown" className="h-6 w-6" />;
      case 'checkbox':
        return <CheckSquare className="h-4 w-4" />;
      case 'number':
        return <Hash className="h-4 w-4" />;
      case 'text':
        return <img src="/images/icons/text_input_fields.svg" alt="Text" className="h-6 w-6" />;
      default:
        return <img src="/images/icons/text_input_fields.svg" alt="Text" className="h-6 w-6" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'image':
        return 'Image';
      case 'date':
        return 'Date';
      case 'dropdown':
        return 'Dropdown';
      case 'checkbox':
        return 'Checkbox';
      case 'number':
        return 'Number';
      case 'text':
        return 'Text';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;

  //   if (!projectId || !templateName) {
  //     console.error('Project ID and template name are required for image upload');
  //     return;
  //   }

  //   setImageUploading(true);
  //   try {
  //     const formData = new FormData();
  //     formData.append('file', file);
  //     formData.append('variableName', variable.name);
  //     formData.append('templateName', templateName);

  //     const response = await fetch(`/api/projects/${projectId}/images`, {
  //       method: 'POST',
  //       body: formData,
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to upload image');
  //     }

  //     const result = await response.json();
  //     // Store the file path as an image variable object
  //     onChange({
  //       type: 'image',
  //       value: result.filePath,
  //       filename: file.name,
  //       alt: variable.name
  //     });
  //   } catch (error) {
  //     console.error('Error uploading image:', error);
  //     // No fallback to base64, just show error
  //   } finally {
  //     setImageUploading(false);
  //   }
  // };

  // const handleImageRemove = async () => {
  //   if (!projectId || !templateName) {
  //     console.error('Project ID and template name are required for image removal');
  //     return;
  //   }

  //   // Extract the file path from the current value
  //   let filePath: string | null = null;

  //   if (variable.type === 'image') {
  //     if (typeof variable.value === 'object' && variable.value && 'value' in variable.value) {
  //       filePath = (variable.value as any).value;
  //     } else if (typeof variable.value === 'string') {
  //       filePath = variable.value;
  //     }
  //   }


  //   if (filePath) {
  //     setImageRemoving(true);
  //     try {
  //       console.log(`Removing image: ${filePath}`);
        
  //       // Call the API to delete the image from storage
  //       const response = await fetch(`/api/projects/${projectId}/images`, {
  //         method: 'DELETE',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           filePath: filePath,
  //           templateName: templateName,
  //           variableName: variable.name
  //         }),
  //       });

  //       if (!response.ok) {
  //         throw new Error('Failed to remove image from storage');
  //       }

  //       console.log('Image removed from storage successfully');
  //     } catch (error) {
  //       console.error('Error removing image from storage:', error);
  //       // Still clear the value even if storage deletion fails
  //     } finally {
  //       setImageRemoving(false);
  //     }
  //   }

  //   // Clear the value regardless of storage deletion result
  //   onChange(null);
  // };

  // const handleDateChange = (date: Date | undefined) => {
  //   if (date) {
  //     const dateFormat = variable.type === 'date' && 'dateFormat' in variable;
  //     onChange({
  //       type: 'date',
  //       value: date.toISOString(),
  //       format: dateFormat || 'dd/MM/yyyy'
  //     });
  //   }
  //   setIsCalendarOpen(false);
  // };

  // const handleDropdownChange = (selectedValue: string) => {
  //   const dropdownOptions = variable.type === 'dropdown' && 'dropdownOptions' in variable ? variable.dropdownOptions : [];
  //   const option = dropdownOptions?.find(opt => opt.value === selectedValue);
  //   onChange({
  //     type: 'dropdown',
  //     value: selectedValue,
  //     displayText: option?.displayText || selectedValue
  //   });
  // };

  // const handleCheckboxChange = (checked: boolean) => {
  //   onChange({
  //     type: 'checkbox',
  //     value: checked
  //   });
  // };

  // Helper to get image value
  const getImageValue = (): string | null => {
    const val = variable.value as any;
    if (typeof val === 'object' && val && 'value' in val) {
      return val.value;
    }
    if (typeof val === 'string') {
      return val;
    }
    return null;
  };

  const hasImage = Boolean(getImageValue());

  const renderInput = () => {
    // Handle image type with upload functionality
    if (variable.type === 'image') {
      const imageValue = getImageValue();

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file);
                }
              }}
              disabled={disabled || imageUploading}
              className="hidden"
              id={`image-${variable.name}`}
            />
            <Label
              htmlFor={disabled || imageUploading || imageLoading ? undefined : `image-${variable.name}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                disabled || imageUploading || imageLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-800 text-white cursor-pointer'
              }`}
            >
              <Upload className="h-4 w-4" />
              {imageUploading ? 'Uploading...' : imageLoading ? 'Loading...' : 'Choose Image'}
            </Label>
            {hasImage && !imageUploading && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImageRemove}
                disabled={disabled || imageRemoving}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {imageValue && (
            <div className="border rounded-md p-2">
              {typeof imageValue === 'string' && imageValue.includes('/images/') && !imageValue.startsWith('data:') ? (
                // File path - need to construct URL
                <img
                  src={`/api/projects/${projectId}/images?filePath=${encodeURIComponent(imageValue)}`}
                  alt={variable.name}
                  className="max-w-full h-32 object-contain"
                  onLoad={() => setImageLoading(false)}
                  onError={(e) => {
                    setImageLoading(false);
                    // Fallback if image fails to load
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNkM4LjY4NjI5IDE2IDYgMTMuMzEzNyA2IDEwQzYgNi42ODYyOSA4LjY4NjI5IDQgMTIgNEMxNS4zMTM3IDQgMTggNi42ODYyOSAxOCAxMEMxOCAxMy4zMTM3IDE1LjMxMzcgMTYgMTIgMTZaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPg==';
                  }}
                />
              ) : typeof imageValue === 'string' && imageValue.startsWith('data:') ? (
                // Base64 image
                <img
                  src={imageValue}
                  alt={variable.name}
                  className="max-w-full h-32 object-contain"
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              ) : (
                // Fallback
                <div className="flex items-center justify-center h-32 border rounded-md bg-gray-100">
                  <span className="text-gray-500">Invalid image data</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Handle date type with calendar picker
    if (variable.type === 'date') {
      // Parse the current date value
      let currentDate: Date | undefined;
      if (variable.value) {
        // Handle both string value and potential legacy object format
        const rawValue = variable.value as unknown;
        const dateStr = typeof rawValue === 'string' 
          ? rawValue 
          : typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue
            ? (rawValue as { value: string }).value
            : null;
        
        if (dateStr) {
          // Try to parse dd/MM/yyyy format first (our stored format)
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
            if (!isNaN(parsed.getTime())) {
              currentDate = parsed;
            }
          } else {
            // Fallback to standard Date parsing (ISO format, etc.)
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              currentDate = parsed;
            }
          }
        }
      }

      // Get the date format from the variable if available
      const dateFormat = 'dateFormat' in variable && variable.dateFormat 
        ? variable.dateFormat 
        : 'dd/MM/yyyy';

      return (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !currentDate && "text-muted-foreground"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {currentDate ? format(currentDate, dateFormat) : `Select date...`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => {
                if (date) {
                  // Store date in dd/MM/yyyy format for document generation
                  const formattedDate = format(date, 'dd/MM/yyyy');
                  onChange(formattedDate);
                }
                setIsCalendarOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    }

    // Handle checkbox type
    if (variable.type === 'checkbox') {
      // Parse the current checkbox value - handle both typed value and potential legacy formats
      let isChecked = false;
      const rawValue = variable.value as unknown;
      if (rawValue !== undefined && rawValue !== null) {
        if (typeof rawValue === 'boolean') {
          isChecked = rawValue;
        } else if (typeof rawValue === 'string') {
          isChecked = rawValue === 'true' || rawValue === '1';
        } else if (typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue) {
          const val = (rawValue as { value: unknown }).value;
          isChecked = val === true || val === 'true' || val === '1';
        }
      }

      return (
        <div className="flex items-center space-x-3">
          <Checkbox
            id={`checkbox-${variable.name}`}
            checked={isChecked}
            onCheckedChange={(checked) => {
              onChange(checked === true);
            }}
            disabled={disabled}
          />
          <Label 
            htmlFor={`checkbox-${variable.name}`}
            className="text-sm font-normal cursor-pointer"
          >
            {isChecked ? 'Checked' : 'Unchecked'}
          </Label>
        </div>
      );
    }

    // Handle dropdown type
    if (variable.type === 'dropdown') {
      // Get dropdown options from the variable
      const dropdownOptions = 'dropdownOptions' in variable && Array.isArray(variable.dropdownOptions) 
        ? variable.dropdownOptions 
        : [];
      
      // Get current selected value - handle both typed value and potential legacy formats
      let currentValue = '';
      const rawValue = variable.value as unknown;
      if (typeof rawValue === 'string') {
        currentValue = rawValue;
      } else if (typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue) {
        currentValue = String((rawValue as { value: unknown }).value);
      }

      // Find display text for current value
      const selectedOption = dropdownOptions.find(opt => opt.value === currentValue);
      
      // Use edited options if editing, otherwise use original options
      const displayOptions = isEditingDropdownOptions ? editedOptions : dropdownOptions;
      
      const startEditing = () => {
        setEditedOptions([...dropdownOptions]);
        setIsEditingDropdownOptions(true);
        setNewOptionText('');
      };
      
      const cancelEditing = () => {
        setIsEditingDropdownOptions(false);
        setEditedOptions([]);
        setNewOptionText('');
      };
      
      const saveOptions = () => {
        if (onDropdownOptionsChange) {
          // Filter out empty options
          const validOptions = editedOptions.filter(opt => opt.value.trim() !== '');
          onDropdownOptionsChange(validOptions);
        }
        setIsEditingDropdownOptions(false);
        setNewOptionText('');
      };
      
      const addOption = () => {
        if (newOptionText.trim()) {
          setEditedOptions([...editedOptions, { displayText: newOptionText.trim(), value: newOptionText.trim() }]);
          setNewOptionText('');
        }
      };
      
      const removeOption = (index: number) => {
        setEditedOptions(editedOptions.filter((_, i) => i !== index));
      };
      
      const updateOption = (index: number, newValue: string) => {
        const updated = [...editedOptions];
        updated[index] = { displayText: newValue, value: newValue };
        setEditedOptions(updated);
      };
      
      return (
        <div className="space-y-3">
          {/* Dropdown select */}
          {!isEditingDropdownOptions && (
            <div className="flex items-center gap-2">
              <Select
                value={currentValue}
                onValueChange={(value) => {
                  onChange(value);
                }}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an option...">
                    {selectedOption?.displayText || currentValue || "Select an option..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.length > 0 ? (
                    dropdownOptions.map((option, index) => (
                      <SelectItem key={`${option.value}-${index}`} value={option.value}>
                        {option.displayText || option.value}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No options available
                    </div>
                  )}
                </SelectContent>
              </Select>
              
              {/* Edit options button */}
              {onDropdownOptionsChange && !disabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                  className="shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          
          {/* Edit mode */}
          {isEditingDropdownOptions && (
            <div className="space-y-3 border rounded-md p-3 bg-muted/30">
              <div className="text-sm font-medium">Edit Options</div>
              
              {/* Existing options */}
              <div className="space-y-2">
                {editedOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.displayText}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder="Option text..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Add new option */}
              <div className="flex items-center gap-2">
                <Input
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  placeholder="Add new option..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={!newOptionText.trim()}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Save/Cancel buttons */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={saveOptions}
                >
                  Save Options
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelEditing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {/* Show current options for reference (when not editing) */}
          {!isEditingDropdownOptions && dropdownOptions.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Options: {dropdownOptions.map(o => o.displayText || o.value).join(', ')}
            </div>
          )}
        </div>
      );
    }

    // Default: text input for other types
    return (
      <Input
        value={typeof variable.value === 'string' ? variable.value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${variable.name}...`}
        disabled={disabled}
      />
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(variable.type)}
            <CardTitle className="text-sm font-medium">
              {variable.name}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {getTypeLabel(variable.type)}
          </Badge>
        </div>
        {variable.value && variable.type !== 'image' && (
          <p className="text-xs text-muted-foreground">
            Current: {typeof variable.value === 'string' ? variable.value : JSON.stringify(variable.value)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {renderInput()}
      </CardContent>
    </Card>
  );
}

interface EnhancedVariableFormProps {
  variables: DocumentVariable[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  disabled?: boolean;
  className?: string;
}

export function EnhancedVariableForm({
  variables,
  values,
  onChange,
  disabled = false,
  className
}: EnhancedVariableFormProps) {
  if (variables.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No variables found in this template.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {variables.map((variable) => (
        <EnhancedVariableInput
          key={variable.name}
          variable={variable}
          onChange={(value) => onChange(variable.name, value)}
          disabled={disabled}
        />
      ))}
    </div>
  );
} 