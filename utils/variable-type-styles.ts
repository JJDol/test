/**
 * 🏢 Variable Type Styles - Centralized styling for variable types
 * 
 * PURPOSE: Single source of truth for variable type colors and styling
 * - Consistent visual representation across all components
 * - Easy to maintain and update colors
 * - Type-safe styling system
 */

export type VariableType = 'text' | 'image' | 'date' | 'number' | 'dropdown' | 'checkbox';

export interface VariableTypeStyle {
  backgroundColor: string;
  color: string;
}

export const VARIABLE_TYPE_STYLES: Record<VariableType, VariableTypeStyle> = {
  text: { backgroundColor: '#3b82f6', color: 'white' },
  image: { backgroundColor: '#10b981', color: 'white' },
  date: { backgroundColor: '#f59e0b', color: 'white' },
  number: { backgroundColor: '#eab308', color: 'black' },
  dropdown: { backgroundColor: '#0ea5e9', color: 'white' },
  checkbox: { backgroundColor: '#22c55e', color: 'white' },
};

export const getVariableTypeStyle = (type: string): VariableTypeStyle => {
  return VARIABLE_TYPE_STYLES[type as VariableType] || VARIABLE_TYPE_STYLES.text;
};

export const getVariableTypeDisplayName = (type: string): string => {
  const displayNames: Record<VariableType, string> = {
    text: 'Text',
    image: 'Image',
    date: 'Date',
    number: 'Number',
    dropdown: 'Dropdown',
    checkbox: 'Checkbox',
  };
  return displayNames[type as VariableType] || 'Text';
};
