import { useState, useCallback } from 'react';

/**
 * Generic form hook for managing form state
 * Provides consistent form management patterns across the application
 * 
 * @template T - The form data type (must be a record with string keys)
 * @param initialData - Initial form data
 * @returns Form management utilities
 */
export function useForm<T extends Record<string, any>>(initialData: T) {
  const [formData, setFormData] = useState<T>(initialData);

  /**
   * Update a single form field
   * @param field - The field name to update
   * @param value - The new value for the field
   */
  const setFormField = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  /**
   * Update multiple form fields at once
   * @param updates - Object containing field updates
   */
  const updateForm = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  /**
   * Reset form to initial data
   */
  const resetForm = useCallback(() => {
    setFormData(initialData);
  }, [initialData]);

  /**
   * Reset form to completely empty values
   * Useful for clearing forms after submission
   */
  const clearForm = useCallback(() => {
    const emptyData = Object.keys(initialData).reduce((acc, key) => {
      acc[key as keyof T] = '' as any;
      return acc;
    }, {} as T);
    setFormData(emptyData);
  }, [initialData]);

  /**
   * Set form data directly (useful for API responses)
   * @param data - Complete form data to set
   */
  const setFormDataDirectly = useCallback((data: T) => {
    setFormData(data);
  }, []);

  /**
   * Check if form has been modified from initial state
   */
  const isFormModified = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  /**
   * Check if form has any values (not all empty)
   */
  const hasFormValues = useCallback(() => {
    return Object.values(formData).some(value => 
      value !== null && value !== undefined && value !== ''
    );
  }, [formData]);

  return {
    // State
    formData,
    setFormData,
    
    // Field operations
    setFormField,
    updateForm,
    
    // Form operations
    resetForm,
    clearForm,
    setFormDataDirectly,
    
    // Utility checks
    isFormModified,
    hasFormValues
  };
}
