import {   
  DocumentVariables, 
  DocumentVariable,
  ImageVariable, 
  DateVariable,
  DropdownVariable,
  CheckboxVariable,
  TextVariable,
  NumberVariable
} from '@/lib/types/variable-types';

/**
 * Helper functions for creating and working with enhanced document variables
 */

/**
 * Creates a text variable
 */
export function createTextVariable(name: string, value: string): TextVariable {
  return {
    name,
    type: 'text',
    value: value
  };
}

/**
 * Creates an image variable
 */
export function createImageVariable(
  name: string,
  buffer: Buffer,
  options: {
    width?: number;
    height?: number;
    alt?: string;
    filename?: string;
    mimeType?: string;
    value?: string; // For file paths
  } = {}
): ImageVariable {
  return {
    name,
    type: 'image',
    buffer,
    ...options
  };
}

/**
 * Creates a date variable
 */
export function createDateVariable(name: string, date: Date, format?: string): DateVariable {
  const formatDate = (d: Date, fmt?: string): string => {
    if (fmt === 'short') {
      return d.toLocaleDateString();
    } else if (fmt === 'long') {
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (fmt === 'iso') {
      return d.toISOString().split('T')[0];
    } else {
      return d.toLocaleDateString();
    }
  };

  return {
    name,
    type: 'date',
    value: formatDate(date, format),
    dateFormat: format
  };
}

/**
 * Creates a number variable
 */
export function createNumberVariable(
  name: string,
  value: number,
  options: {
    decimals?: number;
    currency?: string;
    percentage?: boolean;
  } = {}
): NumberVariable {
  return {
    name,
    type: 'number',
    value,
    ...options
  };
}

/**
 * Creates a dropdown variable
 */
export function createDropdownVariable(
  name: string,
  value: string,
  displayText?: string,
  dropdownOptions?: { displayText: string; value: string }[]
): DropdownVariable {
  return {
    name,
    type: 'dropdown',
    value,
    displayText,
    dropdownOptions
  };
}

/**
 * Creates a checkbox variable
 */
export function createCheckboxVariable(
  name: string,
  checked: boolean
): CheckboxVariable {
  return {
    name,
    type: 'checkbox',
    checked,
    value: checked
  };
}



/**
 * Extracts simple string values from DocumentVariables for backward compatibility
 */
export function extractSimpleValues(variables: DocumentVariables): Record<string, string> {
  const result: Record<string, string> = {};

  Object.entries(variables).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      result[key] = '';
    } else if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'object') {
      if (typeof value.value === 'string') {
        result[key] = value.value;
      } else {
        result[key] = `[${value.type.toUpperCase()}]`;
      }
    } else {
      result[key] = String(value);
    }
  });

  return result;
} 