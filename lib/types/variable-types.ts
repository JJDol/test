/**
 * 🏢 Unified Variable Type System
 * 
 * PURPOSE: Single source of truth for all variable-related types
 * - Consolidates all variable types in one place
 * - Eliminates duplicate definitions across files
 * - Provides clear hierarchy for different use cases
 * 
 * ENTERPRISE BENEFITS:
 * - Single responsibility principle
 * - Type safety and consistency
 * - Easier maintenance and refactoring
 * - Clear data flow understanding
 */

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Base variable type - minimal interface that all variables share
 * Contains only the essential fields needed by all variable types
 */
export interface BaseVariable {
  name: string;
  type: 'text' | 'image' | 'date' | 'number' | 'dropdown' | 'checkbox';
}

// ============================================================================
// SPECIALIZED VARIABLE TYPES (extending BaseVariable)
// ============================================================================

/**
 * Text variable - extends BaseVariable with text-specific fields
 */
export interface TextVariable extends BaseVariable {
  type: 'text';
  value?: string;
}

/**
 * Image variable - extends BaseVariable with image-specific fields
 */
export interface ImageVariable extends BaseVariable {
  type: 'image';
  buffer?: Buffer;
  width?: number;
  height?: number;
  alt?: string;
  filename?: string;
  mimeType?: string;
  value?: string; // For file paths or data URLs
}

/**
 * Date variable - extends BaseVariable with date-specific fields
 */
export interface DateVariable extends BaseVariable {
  type: 'date';
  value?: string; // ISO date string
  dateFormat?: string; // Display format
}

/**
 * Number variable - extends BaseVariable with number-specific fields
 * TODO: This is not used in the project yet
 */
export interface NumberVariable extends BaseVariable {
  type: 'number';
  value?: number;
  decimals?: number;
  currency?: string;
  percentage?: boolean;
}

/**
 * Dropdown variable - extends BaseVariable with dropdown-specific fields
 */
export interface DropdownVariable extends BaseVariable {
  type: 'dropdown';
  value?: string; // Selected value
  displayText?: string; // Display text
  dropdownOptions?: { displayText: string; value: string }[];
}

/**
 * Checkbox variable - extends BaseVariable with checkbox-specific fields
 */
export interface CheckboxVariable extends BaseVariable {
  type: 'checkbox';
  checked?: boolean; // true for checked, false for unchecked
  value?: boolean;
}

// ============================================================================
// TEMPLATE & PROJECT TYPES (extending BaseVariable)
// ============================================================================

/**
 * Template-level variable (for parsing and input)
 * Adds template-specific metadata to BaseVariable
 */
export interface TemplateVariable extends BaseVariable {
  originalTag?: string; // Original tag from template
  tag?: string; // Alternative tag reference
}

/**
 * Project-level variable (with processing context)
 * Adds project-specific metadata to BaseVariable
 */
export interface ProjectVariable extends BaseVariable {
  documents: string[];
  isGeneral: boolean;
  category?: string;
  value?: any; // Current value in the project
}

// ============================================================================
// DOCUMENT PROCESSING TYPES
// ============================================================================

/**
 * Union type of all specific variable types
 */
export type AnyVariable = TextVariable | ImageVariable | DateVariable | NumberVariable | DropdownVariable | CheckboxVariable;

/**
 * Document variable for processing (used in content-control-processor)
 * Type-dependent union that contains the actual specialized variable types
 */
export type DocumentVariable = 
  | TextVariable 
  | ImageVariable 
  | NumberVariable 
  | DateVariable 
  | DropdownVariable 
  | CheckboxVariable;

/**
 * Document variables collection
 * Can contain string values (for simple text) or DocumentVariable objects (for complex types)
 */
export type DocumentVariables = DocumentVariable[];


// Type guards for runtime type checking
export function isProjectVariable(variable: any): variable is ProjectVariable {
  return variable && 
         typeof variable.name === 'string' && 
         Array.isArray(variable.documents) && 
         typeof variable.isGeneral === 'boolean';
}

export function isTemplateVariable(variable: any): variable is TemplateVariable {
  return variable && 
         typeof variable.name === 'string' && 
         typeof variable.type === 'string' &&
         !('documents' in variable);
}

// Utility type for variable collections
export type VariableCollection<T extends BaseVariable> = {
  [key: string]: T;
};

// Utility type for category-based variable collections
export type CategoryVariableCollection<T extends ProjectVariable> = {
  [category: string]: T[];
};

