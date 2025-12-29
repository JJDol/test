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
import { ImageIcon, CalendarIcon, ChevronDownIcon, CheckIcon, TypeIcon, FileTextIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DocumentVariable } from '@/lib/types/variable-types';
import { Select } from '@/components/ui/select';


interface EnhancedVariableInputProps {
  variable: DocumentVariable;
  onChange: (value: any) => void;
  disabled?: boolean;
  className?: string;
  // For image uploads
  projectId?: string;
  templateName?: string;
}

export function EnhancedVariableInput({ 
  variable, 
  onChange, 
  disabled = false,
  className,
  projectId,
  templateName
}: EnhancedVariableInputProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageRemoving, setImageRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'date':
        return <CalendarIcon className="h-4 w-4" />;
      case 'dropdown':
        return <ChevronDownIcon className="h-4 w-4" />;
      case 'checkbox':
        return <CheckIcon className="h-4 w-4" />;
      default:
        return <TypeIcon className="h-4 w-4" />;
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
      case 'text':
        return 'Text';
      // TODO: Eventually support also number type
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

  const renderInput = () => {
    // Only support text inputs for now
    return (
      <Input
        value={typeof variable.value === 'string' ? variable.value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${variable.name}...`}
        disabled={disabled}
      />
    );

    // COMMENTED OUT - Other input types for future use
    // switch (variable.type) {
    //   case 'image':
    //     return (
    //       <div className="space-y-2">
    //         {(value?.value || (typeof value === 'string' && value)) && (
    //           <div className="relative">
    //             {(() => {
    //               // Handle different data structures
    //               let imageSrc = '';
    //               let imageAlt = '';
                  
    //               if (typeof value === 'string') {
    //                 // Direct string value (file path or base64)
    //                 imageSrc = value;
    //                 imageAlt = variable.name;
    //               } else if (value?.value) {
    //                 // Object with value property
    //                 imageSrc = value.value;
    //                 imageAlt = value.alt || variable.name;
    //               }
                  
    //               // Check if it's a file path (contains /images/ and not base64)
    //               if (typeof imageSrc === 'string' && imageSrc.includes('/images/') && !imageSrc.startsWith('data:')) {
    //                 return (
    //                   <img 
    //                     src={`/api/projects/${projectId}/images?filePath=${encodeURIComponent(imageSrc)}`} 
    //                     alt={imageAlt} 
    //                     className="max-w-full h-32 object-contain border rounded-md"
    //                     onError={(e) => {
    //                       console.error('Image failed to load:', imageSrc);
    //                       e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNkM4LjY4NjI5IDE2IDYgMTMuMzEzNyA2IDEwQzYgNi42ODYyOSA4LjY4NjI5IDQgMTIgNEMxNS4zMTM3IDQgMTggNi42ODYyOSAxOCAxMEMxOCAxMy4zMTM3IDE1LjMxMzcgMTYgMTIgMTZaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMiAxNEMxMy4xMDQ2IDE0IDE0IDEzLjEwNDYgMTQgMTJDMTQgMTAuODk1NCAxMy4xMDQ2IDEwIDEyIDEwQzEwLjg5NTQgMTAgMTAgMTAuODk1NCAxMCAxMkMxMCAxMy4xMDQ2IDEwLjg5NTQgMTAgMTAgMTAuODk1NCAxMCAxMkMxMCAxMy4xMDQ2IDEwLjg5NTQgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
    //                     }}
    //                   />
    //                 );
    //               } else if (typeof imageSrc === 'string' && imageSrc.startsWith('data:')) {
    //                 // Base64 image
    //                 return (
    //                   <img 
    //                     src={imageSrc} 
    //                     alt={imageAlt}
    //                     className="max-w-full h-32 object-contain border rounded-md"
    //                   />
    //                 );
    //               } else {
    //                 // Fallback - try to display as is
    //                 return (
    //                   <div className="flex items-center justify-center h-32 border rounded-md bg-gray-100">
    //                     <span className="text-gray-500">Invalid image data</span>
    //                   </div>
    //                 );
    //               }
    //             })()}
    //             <Button
    //               type="button"
    //               variant="destructive"
    //               size="sm"
    //               className="absolute top-1 right-1"
    //               onClick={handleImageRemove}
    //               disabled={disabled || imageRemoving}
    //             >
    //               {imageRemoving ? 'Removing...' : 'Remove'}
    //             </Button>
    //           </div>
    //         )}
    //         <Button
    //           type="button"
    //           variant="outline"
    //           onClick={() => fileInputRef.current?.click()}
    //           disabled={disabled || imageUploading}
    //           className="w-full"
    //         >
    //           <ImageIcon className="h-4 w-4 mr-2" />
    //           {imageUploading ? 'Uploading...' : ((value?.value || (typeof value === 'string' && value)) ? 'Change Image' : 'Upload Image')}
    //         </Button>
    //         <input
    //           ref={fileInputRef}
    //           type="file"
    //           accept="image/*"
    //           onChange={handleImageUpload}
    //           className="hidden"
    //           disabled={disabled || imageUploading}
    //         />
    //       </div>
    //     );

    //   case 'date':
    //     return (
    //       <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
    //         <PopoverTrigger asChild>
    //           <Button
    //             variant="outline"
    //             className={cn(
    //               "w-full justify-start text-left font-normal",
    //               !value?.value && "text-muted-foreground"
    //             )}
    //             disabled={disabled}
    //           >
    //             <CalendarIcon className="mr-2 h-4 w-4" />
    //             {value?.value ? format(new Date(value.value), 'PPP') : 'Pick a date'}
    //           </Button>
    //         </PopoverTrigger>
    //         <PopoverContent className="w-auto p-0">
    //           <Calendar
    //             mode="single"
    //             selected={value?.value ? new Date(value.value) : undefined}
    //             onSelect={handleDateChange}
    //             initialFocus
    //           />
    //         </PopoverContent>
    //       </Popover>
    //     );

    //   case 'dropdown':
    //     return (
    //     <Select
    //       value={value?.value || ''}
    //       onValueChange={handleDropdownChange}
    //       disabled={disabled}
    //     />
    //   );

    //   case 'checkbox':
    //     return (
    //       <div className="flex items-center space-x-2">
    //         <Checkbox
    //           checked={value?.value || false}
    //           onCheckedChange={handleCheckboxChange}
    //           disabled={disabled}
    //         />
    //         <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
    //           {value?.value ? 'Checked' : 'Unchecked'}
    //         </Label>
    //       </div>
    //     );

    //   // TODO: This is not actively used right now
    //   case 'number':
    //     return (
    //       <Input
    //         type="number"
    //         value={typeof value === 'string' ? value : value?.value || ''}
    //         onChange={(e) => onChange(e.target.value)}
    //         placeholder={`Enter ${variable.name}...`}
    //         disabled={disabled}
    //       />
    //     );

    //   case 'text':
    //     return (
    //       <Input
    //         value={typeof value === 'string' ? value : value?.value || ''}
    //         onChange={(e) => onChange(e.target.value)}
    //         placeholder={`Enter ${variable.name}...`}
    //         disabled={disabled}
    //       />
    //     );  
    // }
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
        {variable.value && (
          <p className="text-xs text-muted-foreground">
            Current: {variable.value}
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