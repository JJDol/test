/**
 * Enhanced Variable Extractor
 * 
 * PURPOSE: Extract variables from DOCX content controls during template processing
 * - Core extraction logic used by document-template-parser
 * - Only supports Content Controls (curly bracket syntax removed)
 * - Returns enhanced variable information with metadata
 */

import PizZip from 'pizzip';
import { DOMParser } from 'xmldom';
import { DocumentVariables, DocumentVariable, TextVariable, ImageVariable, DateVariable, DropdownVariable, CheckboxVariable } from '@/lib/types/variable-types';
import { DOCX_XML_FILES_TO_CHECK } from '@/lib/services/core/docx-config';
import { normalizeVariableName } from '@/lib/utils/variable-utils';

/**
 * Check if a template buffer contains content controls
 */
function hasContentControls(buffer: Buffer): boolean {
  try {
    const zip = new PizZip(buffer);
    // TODO: Check all XML files
    const documentXml = zip.file('word/document.xml');
    if (!documentXml) return false;
    
    const xmlContent = documentXml.asText();
    const contentControls = xmlContent.match(/<w:sdt[^>]*>/g) || [];
    return contentControls.length > 0;
  } catch (error) {
    console.error('Error checking for content controls:', error);
    return false;
  }
}


export interface ContentControlInfo {
  tag: string;
  alias: string;
  type: 'text' | 'image' | 'date' | 'number' | 'dropdown' | 'checkbox';
  id: string;
  dateFormat?: string;
  dropdownOptions: { displayText: string; value: string }[];
  currentContent: string;
}

/**
 * Extract template variables from DOCX content controls
 * Main function for template variable extraction - supports all content control types
 */
export function extractTemplateVariables(buffer: Buffer): DocumentVariables {
  // Check if the document has content controls first
  if (!hasContentControls(buffer)) {
    throw new Error('Template must contain Content Controls.');
  }
  
  console.log('Document contains content controls, extracting variables...');
  
  const enhancedVariables = extractVariables(buffer);

  
  
  // Convert to DocumentVariable format based on type
  const documentVariables: DocumentVariables = [];
  const processedTags = new Set<string>();
  
  enhancedVariables.forEach(variable => {
    const normalizedName = normalizeVariableName(variable.tag);

    // Skip if the variable name is empty or only whitespace
    if (!normalizedName || normalizedName.trim() === '') {
      console.warn('Skipping variable with empty name');
      return;
    }

    // Skip if we've already processed this tag
    if (processedTags.has(normalizedName)) {
      return;
    }
    processedTags.add(normalizedName);
    
    // Store original tag for mapping (important for document generation)
    const originalTag = variable.tag;

    switch (variable.type) {
      case 'text':
        documentVariables.push({
          name: normalizedName,
          type: 'text',
          value: variable.currentContent || '',
          originalTag: originalTag
        } as TextVariable & { originalTag: string });
        break;

      case 'image':
        documentVariables.push({
          name: normalizedName,
          type: 'image',
          value: variable.currentContent || '',
          filename: variable.currentContent,
          originalTag: originalTag
        } as ImageVariable & { originalTag: string });
        break;

      case 'date':
        documentVariables.push({
          name: normalizedName,
          type: 'date',
          value: variable.currentContent || '',
          dateFormat: variable.dateFormat,
          originalTag: originalTag
        } as DateVariable & { originalTag: string });
        break;
      case 'dropdown':
        documentVariables.push({
          name: normalizedName,
          type: 'dropdown',
          value: variable.currentContent || '',
          displayText: variable.currentContent,
          dropdownOptions: variable.dropdownOptions,
          originalTag: originalTag
        } as DropdownVariable & { originalTag: string });
        break;

      case 'checkbox':
        documentVariables.push({
          name: normalizedName,
          type: 'checkbox',
          checked: variable.currentContent === 'true' || variable.currentContent === '1',
          value: variable.currentContent === 'true' || variable.currentContent === '1',
          originalTag: originalTag
        } as CheckboxVariable & { originalTag: string });
        break;

      default:
        // Fallback to text
        documentVariables.push({
          name: normalizedName,
          type: 'text',
          value: variable.currentContent || '',
          originalTag: originalTag
        } as TextVariable & { originalTag: string });
    }
  });
  
  return documentVariables;
}

/**
 * Internal function that does the actual DOCX parsing
 * Returns detailed variable information for processing
 * 
 * FEATURE: Handles nested Content Controls recursively
 * - Uses findContentControlsInfo for complete extraction
 * - Finds Content Controls at any nesting level
 */
function extractVariables(buffer: Buffer): ContentControlInfo[] {
  try {
    // Create a copy of the buffer to prevent corruption of the original
    const bufferCopy = Buffer.from(buffer);
    const zip = new PizZip(bufferCopy);
    
    // Use centralized XML files configuration
    const xmlFilesToCheck = DOCX_XML_FILES_TO_CHECK;

    const allContentControls: ContentControlInfo[] = [];

    for (const xmlPath of xmlFilesToCheck) {
      const xmlFile = zip.file(xmlPath);
      if (!xmlFile) continue;
      
      try {
        const xmlContent = xmlFile.asText();
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, 'text/xml');
        
        // Use recursive function to find all Content Controls (including nested ones)
        const contentControls: ContentControlInfo[] = [];
        // TODO: Check if this also extract correct values and we are not losing any information
        findContentControlsInfo(doc, contentControls);
        
        // Add to our collection
        allContentControls.push(...contentControls);
      } catch (error) {
        console.error(`Error processing ${xmlPath}:`, error);
        // Continue with other files even if one fails
      }
    }

    return allContentControls;
    
  } catch (error) {
    console.error('Error extracting enhanced variables:', error);
    return [];
  }
}

/**
 * Extract detailed information from a Content Control
 * Adapted from docx-updater.ts extractContentControlInfo
 */
function extractContentControlInfo(sdt: any): ContentControlInfo | null {
  const sdtPr = sdt.getElementsByTagName('w:sdtPr')[0];
  if (!sdtPr) return null;

  const info: ContentControlInfo = {
    tag: '',
    alias: '',
    type: 'text',
    id: '',
    dropdownOptions: [],
    currentContent: ''
  };

  // Extract basic properties
  const tagElement = sdtPr.getElementsByTagName('w:tag')[0];
  if (tagElement && tagElement.getAttribute('w:val')) {
    info.tag = tagElement.getAttribute('w:val') || '';
  }
  
  const aliasElement = sdtPr.getElementsByTagName('w:alias')[0];
  if (aliasElement && aliasElement.getAttribute('w:val')) {
    info.alias = aliasElement.getAttribute('w:val') || '';
  }
  
  const idElement = sdtPr.getElementsByTagName('w:id')[0];
  if (idElement && idElement.getAttribute('w:val')) {
    info.id = idElement.getAttribute('w:val') || '';
  }

  // Determine Content Control type
  if (sdtPr.getElementsByTagName('w:picture').length > 0) {
    info.type = 'image';
  } else if (sdtPr.getElementsByTagName('w:date').length > 0) {
    info.type = 'date';
    // Extract date format if available
    const dateElement = sdtPr.getElementsByTagName('w:date')[0];
    if (dateElement) {
      const dateFormatElement = dateElement.getElementsByTagName('w:dateFormat')[0];
      if (dateFormatElement && dateFormatElement.getAttribute('w:val')) {
        info.dateFormat = dateFormatElement.getAttribute('w:val');
      }
    }
  } else if (sdtPr.getElementsByTagName('w:dropDownList').length > 0) {
    info.type = 'dropdown';
    // Extract dropdown options
    const dropDownList = sdtPr.getElementsByTagName('w:dropDownList')[0];
    if (dropDownList) {
      const listItems = dropDownList.getElementsByTagName('w:listItem');
      for (let i = 0; i < listItems.length; i++) {
        const item = listItems[i];
        const displayText = item.getAttribute('w:displayText') || '';
        const value = item.getAttribute('w:value') || '';
        info.dropdownOptions.push({ displayText, value });
      }
    }
  } else if (hasCheckboxTagRecursive(sdtPr)) {
    info.type = 'checkbox';
  } else if (sdtPr.getElementsByTagName('w:text').length > 0) {
    // We dont support rich text
    info.type = 'text';
  } else {
    // just a fallback for unknown content control types
    console.warn('Unknown content control type:', sdtPr);
    info.type = 'text';
  }

  // Extract current content if available
  const sdtContent = sdt.getElementsByTagName('w:sdtContent')[0];
  if (sdtContent) {
    info.currentContent = extractCurrentContent(sdtContent);
  }

  return info;
}

/**
 * Extract current content from SDT content
 */
function extractCurrentContent(sdtContent: any): string {
  if (!sdtContent) return '';

  // For text content, look for w:t elements
  const textContent = findTextContent(sdtContent);
  if (textContent) return textContent;

  // For image content, indicate it's an image
  if (hasImageContent(sdtContent)) return '[IMAGE]';

  return '';
}

/**
 * Find text content recursively
 */
function findTextContent(obj: any): string {
  if (!obj || typeof obj !== 'object') return '';

  if (obj.getElementsByTagName) {
    const textElements = obj.getElementsByTagName('w:t');
    if (textElements.length > 0) {
      return textElements[0].textContent || '';
    }
  }

  // Recursively search in child nodes
  if (obj.childNodes) {
    for (let i = 0; i < obj.childNodes.length; i++) {
      const text = findTextContent(obj.childNodes[i]);
      if (text) return text;
    }
  }

  return '';
}

/**
 * Check if content contains image
 */
function hasImageContent(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  if (obj.getElementsByTagName) {
    if (obj.getElementsByTagName('w:drawing').length > 0 || 
        obj.getElementsByTagName('w:pict').length > 0) {
      return true;
    }
  }

  // Recursively search in child nodes
  if (obj.childNodes) {
    for (let i = 0; i < obj.childNodes.length; i++) {
      if (hasImageContent(obj.childNodes[i])) return true;
    }
  }

  return false;
}


/**
 * Scan document for Content Controls and their properties
 * This function can be used for debugging and analysis
 */
export async function scanContentControls(inputPath: string): Promise<ContentControlInfo[]> {
  try {
    console.log(`🔍 Scanning Content Controls in: ${inputPath}`);
    
    // Read the DOCX file
    const fs = require('fs');
    const docxBuffer = fs.readFileSync(inputPath);
    const zip = new PizZip(docxBuffer);
    
    // Get document XML
    const documentXml = zip.file('word/document.xml')?.asText();
    if (!documentXml) {
      throw new Error('Could not find document.xml');
    }

    const contentControls: ContentControlInfo[] = [];
    
    // Parse XML to find Content Controls
    const parser = new DOMParser();
    const doc = parser.parseFromString(documentXml, 'text/xml');
    
    findContentControlsInfo(doc, contentControls);
    return contentControls;
    
  } catch (error) {
    console.error('❌ Error scanning Content Controls:', error);
    throw error;
  }
}

/**
 * Recursively find Content Controls and extract their information
 */
function findContentControlsInfo(obj: any, contentControls: ContentControlInfo[]): void {
  if (!obj || typeof obj !== 'object') return;

  // Check if this is a Content Control (sdt = Structured Document Tag)
  if (obj.getElementsByTagName) {
    const sdtElements = obj.getElementsByTagName('w:sdt');
    
    for (let i = 0; i < sdtElements.length; i++) {
      const info = extractContentControlInfo(sdtElements[i]);
      if (info) {
        contentControls.push(info);
      }
    }
  }

  // Recursively search in child nodes
  if (obj.childNodes) {
    for (let i = 0; i < obj.childNodes.length; i++) {
      findContentControlsInfo(obj.childNodes[i], contentControls);
    }
  }
} 

// Helper: Recursively search for a tag in a DOM node (namespace-agnostic)
function hasCheckboxTagRecursive(node: any): boolean {
  if (!node) return false;
  if (typeof node.nodeName === 'string' && node.nodeName.toLowerCase().endsWith(':checkbox')) return true;
  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      if (hasCheckboxTagRecursive(node.childNodes[i])) return true;
    }
  }
  return false;
}