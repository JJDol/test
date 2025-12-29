/**
 * DOCX Configuration Constants
 * 
 * PURPOSE: Centralized configuration for DOCX document processing
 * - Single source of truth for XML file paths
 * - Eliminates duplication across extractors and processors
 * - Easy to maintain and extend
 * 
 * ENTERPRISE BENEFITS:
 * - DRY principle compliance
 * - Consistent document processing across all services
 * - Easy to add new XML file types
 * - Clear documentation of supported DOCX parts
 */

/**
 * XML files to check for content controls in DOCX documents
 * These represent all possible locations where content controls can exist
 */
export const DOCX_XML_FILES_TO_CHECK = [
  // Main document
  'word/document.xml',
  
  // Headers (up to 9 supported by Word)
  'word/header1.xml',
  'word/header2.xml',
  'word/header3.xml',
  'word/header4.xml',
  'word/header5.xml',
  'word/header6.xml',
  'word/header7.xml',
  'word/header8.xml',
  'word/header9.xml',
  
  // Footers (up to 9 supported by Word)
  'word/footer1.xml',
  'word/footer2.xml',
  'word/footer3.xml',
  'word/footer4.xml',
  'word/footer5.xml',
  'word/footer6.xml',
  'word/footer7.xml',
  'word/footer8.xml',
  'word/footer9.xml',
  
  // Additional document parts
  'word/footnotes.xml',         // Footnotes
  'word/endnotes.xml',          // Endnotes
  'word/glossary/document.xml', // Glossary
  'word/comments.xml',          // Comments
  'word/textbox.xml'            // Text boxes
] as const;

/**
 * Type for DOCX XML file paths
 */
export type DocxXmlFilePath = typeof DOCX_XML_FILES_TO_CHECK[number];

/**
 * Check if a file path is a valid DOCX XML file
 */
export function isValidDocxXmlFile(path: string): path is DocxXmlFilePath {
  return DOCX_XML_FILES_TO_CHECK.includes(path as DocxXmlFilePath);
}

/**
 * Get XML files by category for more specific processing
 */
export const DOCX_XML_CATEGORIES = {
  MAIN_DOCUMENT: ['word/document.xml'],
  HEADERS: DOCX_XML_FILES_TO_CHECK.filter(path => path.startsWith('word/header')),
  FOOTERS: DOCX_XML_FILES_TO_CHECK.filter(path => path.startsWith('word/footer')),
  ADDITIONAL: DOCX_XML_FILES_TO_CHECK.filter(path => 
    !path.startsWith('word/header') && 
    !path.startsWith('word/footer') && 
    path !== 'word/document.xml'
  )
} as const;
