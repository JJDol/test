import { processDocumentWithEnhancedVariables} from '@/lib/services/processors/content-control-processor';
import { processDocxWithImages } from '@/lib/services/processors/docx-image-processor';
import PizZip from 'pizzip';

/**
 * Check if a template buffer contains content controls
 */
function hasContentControlsInBuffer(buffer: Buffer): boolean {
  try {
    const zip = new PizZip(buffer);
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

/**
 * Shared document processing function that determines the best processor to use
 * based on template characteristics and processes the document accordingly.
 * 
 * This function extracts the logic from the working download functionality
 * so it can be reused for both single document generation and project downloads.
 */
export async function processDocumentWithSmartProcessor(
  templateBuffer: Buffer,
  variables: { [key: string]: any },
  template: any,
  companyId: string
): Promise<Buffer> {
  try {
    console.log(`Processing template: ${template.name}`);

    // Validate input template is a valid DOCX before processing
    try {
      const inputValidationZip = new PizZip(templateBuffer);
      const hasInputDocXml = inputValidationZip.file('word/document.xml') !== null;
      const hasInputContentTypes = inputValidationZip.file('[Content_Types].xml') !== null;

      if (!hasInputDocXml || !hasInputContentTypes) {
        console.error(`[INPUT VALIDATION FAILED] Template ${template.name}: Stored template is corrupted - document.xml: ${hasInputDocXml}, [Content_Types].xml: ${hasInputContentTypes}`);
        throw new Error('Stored template file is corrupted or invalid. Please re-upload the template.');
      }
      console.log(`[INPUT VALIDATION OK] Template ${template.name}: Input template is valid (${templateBuffer.length} bytes)`);
    } catch (inputValidationError) {
      if (inputValidationError instanceof Error && inputValidationError.message.includes('Stored template')) {
        throw inputValidationError;
      }
      console.error(`[INPUT VALIDATION ERROR] Template ${template.name}: Cannot parse template as ZIP:`, inputValidationError);
      throw new Error('Stored template file is corrupted or invalid. Please re-upload the template.');
    }

    // Determine processing method (avoid creating multiple buffer copies)
    const extractionMethod = 'content-control';
    
    console.log(`Template ${template.name} - Extraction: ${extractionMethod}`);

    // Check if template has image variables
    const hasImages = Object.values(variables).some((value: any) => {
      if (typeof value === 'string') {
        return value.includes('/images/') || value.startsWith('data:image/');
      } else if (typeof value === 'object' && value !== null) {
        // Check if it's an image object with a file path
        return value.type === 'image' &&
               typeof value.value === 'string' &&
               (value.value.includes('/images/') || value.value.startsWith('data:image/'));
      }
      return false;
    });

    console.log(`Template ${template.name} - Has images: ${hasImages}`);
    
    // Check if template uses Content Controls - FIXED: Check actual template file, not database metadata
    const hasContentControlsInFile = hasContentControlsInBuffer(templateBuffer);
    const hasContentControlsInDB = template.variables && template.variables.length > 0 && 
                                 template.variables.some((v: any) => v.extractionMethod === 'content-control');
    
    console.log(`Template ${template.name} - Content Controls: File=${hasContentControlsInFile}, DB=${hasContentControlsInDB}`);
    
    // Use file-based detection as primary, fallback to DB metadata
    const shouldUseContentControlProcessor = hasContentControlsInFile || hasContentControlsInDB;
    
    let generatedDoc: Buffer;

    if (hasImages) {
      // Use Content Control processor with image support
      console.log(`Template ${template.name} contains images, using Content Control processor with image support`);
      try {
        generatedDoc = await processDocumentWithEnhancedVariables(templateBuffer, variables, companyId);
      } catch (error) {
        console.error(`Content Control processor failed for ${template.name}:`, error);
        // Try docx-templates as fallback for non-Content Control templates
        try {
          generatedDoc = await processDocxWithImages(templateBuffer, variables, companyId);
        } catch (fallbackError) {
          console.error(`Docx-templates also failed for ${template.name}:`, fallbackError);
          throw error;
        }
      }
    } else if (shouldUseContentControlProcessor) {
      // Use enhanced Content Control processor for templates with Content Controls
      console.log(`Template ${template.name} uses Content Controls, using enhanced Content Control processor`);
      try {
        generatedDoc = await processDocumentWithEnhancedVariables(templateBuffer, variables, companyId);
      } catch (error) {
        console.error(`Enhanced Content Control processor failed for ${template.name}, falling back to standard processor:`, error);
        generatedDoc = await processDocumentWithEnhancedVariables(templateBuffer, variables, companyId);
      }
    } else {
      // Use standard Content Control processor
      console.log(`Template ${template.name} has no images, using standard processor`);
      generatedDoc = await processDocumentWithEnhancedVariables(templateBuffer, variables, companyId);
    }

    // Validate the generated document is a valid DOCX (ZIP file)
    try {
      const validationZip = new PizZip(generatedDoc);
      const hasDocumentXml = validationZip.file('word/document.xml') !== null;
      const hasContentTypes = validationZip.file('[Content_Types].xml') !== null;

      if (!hasDocumentXml || !hasContentTypes) {
        console.error(`[VALIDATION FAILED] Template ${template.name}: Missing required files - document.xml: ${hasDocumentXml}, [Content_Types].xml: ${hasContentTypes}`);
        throw new Error('Generated document is missing required files');
      }

      // Check document.xml is valid XML
      const docXml = validationZip.file('word/document.xml')?.asText();
      if (docXml && docXml.includes('__IMAGE_PLACEHOLDER_')) {
        console.error(`[VALIDATION FAILED] Template ${template.name}: Document contains unprocessed image placeholders`);
        throw new Error('Document contains unprocessed image placeholders');
      }

      // Validate XML is well-formed using DOMParser
      const { DOMParser } = require('xmldom');
      const parser = new DOMParser({
        errorHandler: {
          warning: (msg: string) => console.warn(`[XML WARNING] ${template.name}:`, msg),
          error: (msg: string) => console.error(`[XML ERROR] ${template.name}:`, msg),
          fatalError: (msg: string) => console.error(`[XML FATAL] ${template.name}:`, msg)
        }
      });

      // Check main document.xml
      if (docXml) {
        const docParsed = parser.parseFromString(docXml, 'text/xml');
        const parseErrors = docParsed.getElementsByTagName('parsererror');
        if (parseErrors.length > 0) {
          console.error(`[VALIDATION FAILED] Template ${template.name}: document.xml has parse errors`);
          throw new Error('Generated document.xml has XML parse errors');
        }
      }

      // Check [Content_Types].xml
      const contentTypesXml = validationZip.file('[Content_Types].xml')?.asText();
      if (contentTypesXml) {
        const ctParsed = parser.parseFromString(contentTypesXml, 'text/xml');
        const ctParseErrors = ctParsed.getElementsByTagName('parsererror');
        if (ctParseErrors.length > 0) {
          console.error(`[VALIDATION FAILED] Template ${template.name}: [Content_Types].xml has parse errors`);
          throw new Error('Generated [Content_Types].xml has XML parse errors');
        }
      }

      // Check word/_rels/document.xml.rels
      const relsXml = validationZip.file('word/_rels/document.xml.rels')?.asText();
      if (relsXml) {
        const relsParsed = parser.parseFromString(relsXml, 'text/xml');
        const relsParseErrors = relsParsed.getElementsByTagName('parsererror');
        if (relsParseErrors.length > 0) {
          console.error(`[VALIDATION FAILED] Template ${template.name}: document.xml.rels has parse errors`);
          throw new Error('Generated document.xml.rels has XML parse errors');
        }
      }

      console.log(`[VALIDATION OK] Template ${template.name}: Generated document is valid (${generatedDoc.length} bytes)`);
    } catch (validationError) {
      console.error(`[VALIDATION ERROR] Template ${template.name}:`, validationError);
      throw validationError;
    }

    return generatedDoc;
  } catch (error) {
    console.error(`Error processing template ${template.name}:`, error);
    throw error;
  }
}
