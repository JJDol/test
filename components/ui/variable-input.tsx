"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { getVariableTypeStyle, VariableType } from "@/utils/variable-type-styles";


interface VariableInputProps {
  name: string;
  type: VariableType;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  placeholder?: string;
  // For image uploads
  projectId?: string;
  templateName?: string;
}

interface TableRow {
  [key: string]: string;
}

export function VariableInput({ name, type, value, onChange, disabled = false, placeholder, projectId, templateName }: VariableInputProps) {
  const [date, setDate] = useState<Date | undefined>(
    type === 'date' && value ? new Date(value) : undefined
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [imageRemoving, setImageRemoving] = useState(false);

  // Update date state when value prop changes
  useEffect(() => {
    if (type === 'date') {
      setDate(value ? new Date(value) : undefined);
    }
  }, [value, type]);

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    onChange(newDate ? newDate.toISOString() : '');
  };

  const handleImageUpload = async (file: File) => {
    if (!projectId || !templateName) {
      console.error('Project ID and template name are required for image upload');
      return;
    }

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('variableName', name);
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
        alt: name
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      // No fallback to base64, just show error
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
    
    if (typeof value === 'object' && value.type === 'image' && value.value) {
      filePath = value.value;
    } else if (typeof value === 'string' && value.includes('/images/')) {
      filePath = value;
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
            variableName: name
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to remove image from storage');
        }

        console.log('Image removed from storage successfully');
      } catch (error) {
        console.error('Error removing image from storage:', error);
        // Still clear the value even if storage deletion fails
      } finally {
        setImageRemoving(false);
      }
    }

    // Clear the value regardless of storage deletion result
    onChange('');
  };

  const formatVariableName = (varName: string) => {
    return varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };


  // Table helpers
  const addTableRow = () => {
    const tableData = Array.isArray(value) ? value : [];
    const newRow: TableRow = {};
    // If there are existing rows, copy the structure
    if (tableData.length > 0) {
      Object.keys(tableData[0]).forEach(key => {
        newRow[key] = '';
      });
    } else {
      // Default structure for new table
      newRow['item'] = '';
      newRow['description'] = '';
      newRow['quantity'] = '';
    }
    onChange([...tableData, newRow]);
  };

  const removeTableRow = (index: number) => {
    const tableData = Array.isArray(value) ? value : [];
    const newData = tableData.filter((_, i) => i !== index);
    onChange(newData);
  };

  const updateTableCell = (rowIndex: number, column: string, cellValue: string) => {
    const tableData = Array.isArray(value) ? value : [];
    const newData = [...tableData];
    if (newData[rowIndex]) {
      newData[rowIndex] = { ...newData[rowIndex], [column]: cellValue };
      onChange(newData);
    }
  };

  const addTableColumn = () => {
    const tableData = Array.isArray(value) ? value : [];
    const columnName = `column_${Date.now()}`;
    const newData = tableData.map(row => ({ ...row, [columnName]: '' }));
    onChange(newData);
  };

  const removeTableColumn = (columnToRemove: string) => {
    const tableData = Array.isArray(value) ? value : [];
    const newData = tableData.map(row => {
      const { [columnToRemove]: removed, ...rest } = row;
      return rest;
    });
    onChange(newData);
  };

  const renderInput = () => {
    switch (type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder || `Enter ${formatVariableName(name)}`}
            className="w-full"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder || `Enter ${formatVariableName(name)}`}
            className="w-full"
          />
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'image':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
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
                id={`image-${name}`}
              />
              <Label
                htmlFor={disabled || imageUploading ? undefined : `image-${name}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                  disabled || imageUploading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-700 hover:bg-gray-800 text-white cursor-pointer'
                }`}
              >
                <Upload className="h-4 w-4" />
                {imageUploading ? 'Uploading...' : 'Choose Image'}
              </Label>
              {value && !imageUploading && (
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
            {value && (
              <div className="border rounded-md p-2">
                {typeof value === 'object' && value.type === 'image' && value.value && !value.value.startsWith('data:') ? (
                  // File path - need to construct URL
                  <img 
                    src={`/api/projects/${projectId}/images?filePath=${encodeURIComponent(value.value)}`} 
                    alt={name} 
                    className="max-w-full h-32 object-contain"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNkM4LjY4NjI5IDE2IDYgMTMuMzEzNyA2IDEwQzYgNi42ODYyOSA4LjY4NjI5IDQgMTIgNEMxNS4zMTM3IDQgMTggNi42ODYyOSAxOCAxMEMxOCAxMy4zMTM3IDE1LjMxMzcgMTYgMTIgMTZaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMiAxNEMxMy4xMDQ2IDE0IDE0IDEzLjEwNDYgMTQgMTJDMTQgMTAuODk1NCAxMy4xMDQ2IDEwIDEyIDEwQzEwLjg5NTQgMTAgMTAgMTAuODk1NCAxMCAxMkMxMCAxMy4xMDQ2IDEwLjg5NTQgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
                    }}
                  />
                ) : (
                  // Base64 image (fallback)
                  <img src={typeof value === 'object' ? value.value : value} alt={name} className="max-w-full h-32 object-contain" />
                )}
              </div>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder || `Enter ${formatVariableName(name)}`}
            className="w-full"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={name} className="text-sm font-medium">
          {formatVariableName(name)}
        </Label>
        <Badge className="text-xs" style={getVariableTypeStyle(type)}>
          {type}
        </Badge>
      </div>
      {renderInput()}
    </div>
  );
} 