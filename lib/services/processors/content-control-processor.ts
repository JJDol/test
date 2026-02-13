import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { DOCX_XML_FILES_TO_CHECK } from '@/lib/services/core/docx-config';
import { normalizeVariableName } from '@/lib/utils/variable-utils';
import {
  DocumentVariable,
  DocumentVariables,
  ImageVariable,
  DateVariable,
  DropdownVariable,
  CheckboxVariable,
} from '@/lib/types/variable-types';
import { storageService } from '@/lib/services/integrations/storage-service';


export async function processDocumentWithEnhancedVariables(
  templateBuffer: Buffer,
  variables: { [key: string]: string | null },
  companyId?: string
): Promise<Buffer> {
  console.log('🔄 Starting enhanced document processing...');

  // First, strip any type information from the template
  const strippedTemplate = stripTypeInformationFromTemplate(templateBuffer);

  // Process content controls and curly brackets
  const processedBuffer = await processEnhancedContentControlsAndCurlyBrackets(strippedTemplate, variables, companyId);

  console.log('Enhanced document processing complete');
  return processedBuffer;
}

/**
 * Processes documents with enhanced content controls and curly brackets
 * Handles ALL document parts: main document, headers, footers, footnotes, endnotes, glossary
 * Now includes proper relationship management for images
 * @param templateBuffer The DOCX template as a buffer
 * @param variables Object containing variable values
 * @param companyId Company ID for accessing images from storage
 * @returns Processed DOCX as a buffer
 */
async function processEnhancedContentControlsAndCurlyBrackets(
  templateBuffer: Buffer,
  variables: { [key: string]: string | null },
  companyId?: string
): Promise<Buffer> {
  const zip = new PizZip(templateBuffer);

  // Track relationships for images
  const relationshipManager = new RelationshipManager(zip);

  // Use centralized XML files configuration
  const xmlFilesToProcess = DOCX_XML_FILES_TO_CHECK;

  let processedCount = 0;
  let totalContentControls = 0;

  // Process each XML file that exists in the document
  for (const xmlPath of xmlFilesToProcess) {
    const xmlFile = zip.file(xmlPath);
    if (xmlFile) {
      try {
        console.log(`Processing enhanced content controls in: ${xmlPath}`);

        let xmlContent = xmlFile.asText();

        // Count content controls before processing
        const beforeCount = (xmlContent.match(/<w:sdt[^>]*>/g) || []).length;
        totalContentControls += beforeCount;

        // Skip files with no content controls to avoid unnecessary re-serialization
        if (beforeCount === 0) {
          console.log(`[DOCX] Skipping ${xmlPath} - no content controls found`);
          continue;
        }

        // Process content controls in this XML file and get the count of processed controls
        const { processedXml, processedCount: processedInThisFile } = await processEnhancedContentControlsWithTypeAwarenessAndCount(
          xmlContent,
          variables,
          relationshipManager,
          xmlPath,
          companyId
        );

        if (processedInThisFile > 0) {
          console.log(`✅ Processed ${processedInThisFile} enhanced content controls in ${xmlPath}`);
          processedCount += processedInThisFile;
          // Only update the XML file if we actually processed something
          zip.file(xmlPath, processedXml);
        } else {
          console.log(`[DOCX] No variables matched in ${xmlPath}, keeping original`);
        }

      } catch (error) {
        console.error(`Error processing ${xmlPath}:`, error);
        // Continue with other files even if one fails
      }
    }
  }

  console.log(`📊 Total content controls found: ${totalContentControls}`);
  console.log(`✅ Total content controls processed: ${processedCount}`);

  if (totalContentControls > 0 && processedCount === 0) {
    console.warn('⚠️  Warning: Found content controls but none were processed - check variable names');
    // CRITICAL: If no content controls were processed, return the ORIGINAL template buffer
    // This completely avoids any XML re-serialization that could corrupt the document
    console.log(`[DOCX] Returning original template buffer to prevent corruption`);
    return templateBuffer;
  }

  // If no content controls at all, also return original
  if (totalContentControls === 0) {
    console.log(`[DOCX] No content controls in document, returning original buffer`);
    return templateBuffer;
  }

  console.log(`[DOCX] Re-generating intermediate ZIP...`);
  // Update relationships if any images were added
  if (relationshipManager.hasNewRelationships()) {
    relationshipManager.updateRelationships();
  }

  // Then process any remaining curly brackets using Docxtemplater
  let intermediateBuffer: Buffer;
  try {
    // Use DEFLATE compression for Word compatibility
    intermediateBuffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    console.log(`[DOCX] Intermediate ZIP generated. Size: ${intermediateBuffer.length}`);
  } catch (error) {
    console.error('[DOCX] Error generating intermediate ZIP:', error);
    throw error;
  }

  // Check if document has any curly bracket variables that need Docxtemplater
  const mainDocXml = zip.file('word/document.xml')?.asText() || '';
  const hasCurlyBrackets = /\{\{[^}]+\}\}/.test(mainDocXml);

  if (!hasCurlyBrackets) {
    console.log(`[DOCX] No curly bracket variables found, skipping Docxtemplater`);
    return intermediateBuffer;
  }

  // Preprocess to strip type information from remaining curly brackets
  // OPTIMIZATION: Removed redundant call to stripTypeInformationFromTemplate
  // The input buffer was already stripped at the beginning of processDocumentWithEnhancedVariables
  // const preprocessedBuffer = stripTypeInformationFromTemplate(intermediateBuffer);

  console.log(`[DOCX] initializing Docxtemplater...`);
  const updatedZip = new PizZip(intermediateBuffer);

  // Process curly brackets with Docxtemplater
  const doc = new Docxtemplater(updatedZip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Convert variables to simple variables for Docxtemplater
  const simpleVariables: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === 'string') {
      simpleVariables[key] = value;
    } else if (value && typeof value === 'object' && 'type' in value) {
      // For enhanced variables, extract the display value
      const enhancedVar = value as DocumentVariable;
      if (enhancedVar.type === 'text') {
        simpleVariables[key] = String(enhancedVar.value);
        // } else if (enhancedVar.type === 'checkbox') {
        //   const checkboxVar = enhancedVar.value as CheckboxVariable;
        //   simpleVariables[key] = checkboxVar.checked ? '☑' : '☐';
        // } else if (enhancedVar.type === 'dropdown') {
        //   const dropdownVar = enhancedVar.value as DropdownVariable;
        //   simpleVariables[key] = dropdownVar.displayText || String(dropdownVar.value);
        // } else if (enhancedVar.type === 'date') {
        //   const dateVar = enhancedVar.value as DateVariable;
        //   simpleVariables[key] = formatDateForDocument(dateVar.date);
      } else {
        // For other types, use a placeholder
        simpleVariables[key] = `***[${key}]***`;
      }
    }
  }

  // Use only the synchronous API
  try {
    console.log(`[DOCX] Rendering Docxtemplater...`);
    doc.render(simpleVariables);
    console.log(`[DOCX] Docxtemplater render complete`);

    // Return the final processed document
    console.log(`[DOCX] Generating final ZIP...`);
    const finalBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }  // Use moderate compression (default is 6)
    });
    console.log(`[DOCX] Final ZIP generated. Size: ${finalBuffer.length}`);
    return finalBuffer;
  } catch (error) {
    console.error('[DOCX] Error in final generation:', error);
    throw error;
  }
}

/**
 * Relationship manager for handling image relationships in DOCX
 */
class RelationshipManager {
  private zip: PizZip;
  private newRelationships: Map<string, string> = new Map();
  private existingRelationships: Map<string, string> = new Map();
  private nextRelId = 1;
  private relsXml: string | null = null;
  private addedImageExtensions: Set<string> = new Set();

  constructor(zip: PizZip) {
    this.zip = zip;
    this.loadExistingRelationships();
  }

  private loadExistingRelationships(): void {
    try {
      const relsFile = this.zip.file('word/_rels/document.xml.rels');
      if (relsFile) {
        this.relsXml = relsFile.asText();
        const { DOMParser } = require('xmldom');
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.relsXml, 'text/xml');

        const relationshipElements = doc.getElementsByTagName('Relationship');
        for (let i = 0; i < relationshipElements.length; i++) {
          const rel = relationshipElements[i];
          const id = rel.getAttribute('Id');
          const target = rel.getAttribute('Target');
          if (id && target) {
            this.existingRelationships.set(id, target);
            // Track the highest relationship ID
            const idNum = parseInt(id.replace('rId', ''));
            if (idNum >= this.nextRelId) {
              this.nextRelId = idNum + 1;
            }
          }
        }
      } else {
        // Create a basic relationships structure if it doesn't exist
        this.relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`;
        this.nextRelId = 3; // Start from rId3 for new relationships
      }
    } catch (error) {
      console.warn('Could not load existing relationships:', error);
      // Create a basic relationships structure as fallback
      this.relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`;
      this.nextRelId = 3;
    }
  }

  /**
   * Add an image to the document and return the relationship ID
   */
  addImage(imageBuffer: Buffer, filename: string): string {
    const imageExtension = this.getImageExtension(filename);
    const imageName = `image${this.nextRelId}${imageExtension}`;

    // Track the extension for Content_Types.xml update
    this.addedImageExtensions.add(imageExtension.replace('.', ''));

    // Ensure media directory exists (create empty directory if needed)
    if (!this.zip.file('word/media/')) {
      this.zip.file('word/media/', '', { dir: true });
    }

    // Add image to the media folder
    this.zip.file(`word/media/${imageName}`, imageBuffer);

    // Create new relationship
    const relationshipId = `rId${this.nextRelId}`;
    this.newRelationships.set(relationshipId, `media/${imageName}`);
    this.nextRelId++;

    console.log(`[RELATIONSHIP] Added image ${imageName} with relationship ${relationshipId}`);

    return relationshipId;
  }

  /**
   * Check if there are any new relationships to add
   */
  hasNewRelationships(): boolean {
    return this.newRelationships.size > 0;
  }

  private getImageExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'].includes(ext)) {
      return `.${ext}`;
    }
    return '.png'; // Default to PNG
  }

  /**
   * Update the relationships XML file using string-based insertion
   * Avoids xmldom serialization to prevent XML corruption
   */
  updateRelationships(): void {
    if (!this.relsXml) {
      console.warn('No relationships XML available for update');
      return;
    }

    try {
      let updatedXml = this.relsXml;

      // Add new relationships using string insertion
      for (const [id, target] of Array.from(this.newRelationships.entries())) {
        // Check if this relationship ID already exists
        if (updatedXml.includes(`Id="${id}"`)) {
          console.log(`Relationship ${id} already exists, skipping`);
          continue;
        }

        // Create the new relationship XML element
        const newRelXml = `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/>`;

        // Insert before the closing </Relationships> tag
        updatedXml = updatedXml.replace(
          /<\/Relationships>/,
          `${newRelXml}</Relationships>`
        );

        console.log(`Added new relationship: ${id} -> ${target}`);
      }

      // Update the relationships file
      this.zip.file('word/_rels/document.xml.rels', updatedXml);
      console.log(`Updated relationships file with ${this.newRelationships.size} new relationships`);

      // Also update Content_Types.xml for image extensions
      this.updateContentTypes();
    } catch (error) {
      console.error('Error updating relationships:', error);
    }
  }

  /**
   * Update [Content_Types].xml to include image content types
   * Uses string-based insertion to avoid XML corruption
   */
  private updateContentTypes(): void {
    if (this.addedImageExtensions.size === 0) return;

    try {
      const contentTypesFile = this.zip.file('[Content_Types].xml');
      if (!contentTypesFile) {
        console.warn('[Content_Types].xml not found');
        return;
      }

      let contentTypesXml = contentTypesFile.asText();

      // Map of extensions to content types
      const contentTypeMap: { [key: string]: string } = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'tiff': 'image/tiff',
        'webp': 'image/webp'
      };

      // Add missing content types using string insertion
      for (const ext of Array.from(this.addedImageExtensions)) {
        const extLower = ext.toLowerCase();
        const contentType = contentTypeMap[extLower];

        if (!contentType) continue;

        // Check if this extension already exists
        if (contentTypesXml.includes(`Extension="${extLower}"`) ||
            contentTypesXml.includes(`Extension="${ext}"`)) {
          console.log(`[Content_Types] Extension .${ext} already exists, skipping`);
          continue;
        }

        // Create the new Default element
        const newDefaultXml = `<Default Extension="${extLower}" ContentType="${contentType}"/>`;

        // Insert before the closing </Types> tag
        contentTypesXml = contentTypesXml.replace(
          /<\/Types>/,
          `${newDefaultXml}</Types>`
        );

        console.log(`[Content_Types] Added content type for .${ext}: ${contentType}`);
      }

      // Update the file
      this.zip.file('[Content_Types].xml', contentTypesXml);
      console.log('[Content_Types] Updated successfully');
    } catch (error) {
      console.error('Error updating [Content_Types].xml:', error);
    }
  }
}

/**
 * Ensures all content controls are properly wrapped in paragraphs
 * Uses smart detection to avoid wrapping nested content controls
 * @param xmlContent The XML content to process
 * @returns XML content with content controls properly wrapped
 */
function wrapContentControlsInParagraphs(xmlContent: string): string {
  const { DOMParser, XMLSerializer } = require('xmldom');
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  const sdtNodes = doc.getElementsByTagName('w:sdt');

  // Collect nodes to wrap (can't modify live NodeList)
  const toWrap: Element[] = [];

  for (let i = 0; i < sdtNodes.length; i++) {
    const sdt = sdtNodes[i];
    const parent = sdt.parentNode;
    if (!parent) continue;

    // Skip if already inside a paragraph
    if (parent.nodeName === 'w:p') {
      continue;
    }

    // Enhanced nested structure detection
    let isNested = false;
    let currentNode = parent;

    // Check all ancestors to see if this content control is nested inside another content control
    while (currentNode && currentNode.nodeType === 1) { // Element node
      if (currentNode.nodeName === 'w:sdt' || currentNode.nodeName === 'w:sdtContent') {
        isNested = true;
        break;
      }
      currentNode = currentNode.parentNode;
    }

    if (isNested) {
      console.log(`[DOCX] Skipping nested content control - already inside another content control structure`);
      continue;
    }

    // Skip if inside table cell, header, footer, etc. (these have their own structure)
    if (parent.nodeName === 'w:tc' || parent.nodeName === 'w:hdr' || parent.nodeName === 'w:ftr') {
      continue;
    }

    // Skip if content control contains table cells (like signature controls)
    const sdtContent = sdt.getElementsByTagName('w:sdtContent')[0];
    if (sdtContent) {
      const hasTableCells = sdtContent.getElementsByTagName('w:tc').length > 0;
      if (hasTableCells) {
        console.log(`[DOCX] Skipping content control that contains table cells`);
        continue;
      }
    }

    // Skip if inside other structural elements that shouldn't be wrapped
    if (parent.nodeName === 'w:footnote' || parent.nodeName === 'w:endnote' ||
      parent.nodeName === 'w:comment' || parent.nodeName === 'w:commentRangeStart' ||
      parent.nodeName === 'w:commentRangeEnd' || parent.nodeName === 'w:commentReference') {
      continue;
    }

    // Only wrap if it's a direct child of body, section, or other block-level elements
    const shouldWrap = (
      parent.nodeName === 'w:body' ||
      parent.nodeName === 'w:sectPr' ||
      parent.nodeName === 'w:docDefaults' ||
      parent.nodeName === 'w:r' // Sometimes content controls are direct children of runs
    );

    if (shouldWrap) {
      toWrap.push(sdt);
    }
  }

  // Process wrapping in reverse order to avoid index issues
  for (let i = toWrap.length - 1; i >= 0; i--) {
    const sdt = toWrap[i];
    const parent = sdt.parentNode;
    if (!parent) continue;

    // Create new <w:p> and move sdt inside
    const p = doc.createElement('w:p');
    p.appendChild(sdt.cloneNode(true));

    // Replace sdt in parent with <w:p>
    parent.replaceChild(p, sdt);
  }

  return serializer.serializeToString(doc);
}


/**
 * Find all content controls in XML, properly handling nested structures
 * Returns array of objects with start/end positions and content
 */
function findAllContentControls(xml: string): Array<{
  start: number;
  end: number;
  content: string;
}> {
  const results: Array<{ start: number; end: number; content: string }> = [];
  let searchPos = 0;

  while (searchPos < xml.length) {
    // Find next <w:sdt> or <w:sdt ...> (but NOT <w:sdtContent> or <w:sdtPr>)
    let startIdx = -1;
    let tempPos = searchPos;

    while (tempPos < xml.length) {
      const idx = xml.indexOf('<w:sdt', tempPos);
      if (idx === -1) break;

      // Check the character after '<w:sdt' to ensure it's not 'Content' or 'Pr' or 'EndPr'
      const nextChar = xml[idx + 6]; // Character after '<w:sdt'
      if (nextChar === '>' || nextChar === ' ' || nextChar === '\n' || nextChar === '\r' || nextChar === '\t') {
        // This is a proper <w:sdt> tag
        startIdx = idx;
        break;
      }
      // Otherwise it's <w:sdtContent>, <w:sdtPr>, or <w:sdtEndPr> - skip it
      tempPos = idx + 1;
    }

    if (startIdx === -1) break;

    // Find the end of the opening tag
    const openTagEnd = xml.indexOf('>', startIdx);
    if (openTagEnd === -1) break;

    // Track nesting depth to find matching </w:sdt>
    let depth = 1;
    let pos = openTagEnd + 1;

    while (depth > 0 && pos < xml.length) {
      // Find next <w:sdt> (not <w:sdtContent> etc.)
      let nextOpen = -1;
      let tempOpenPos = pos;
      while (tempOpenPos < xml.length) {
        const idx = xml.indexOf('<w:sdt', tempOpenPos);
        if (idx === -1) break;
        const nextChar = xml[idx + 6];
        if (nextChar === '>' || nextChar === ' ' || nextChar === '\n' || nextChar === '\r' || nextChar === '\t') {
          nextOpen = idx;
          break;
        }
        tempOpenPos = idx + 1;
      }

      const nextClose = xml.indexOf('</w:sdt>', pos);

      if (nextClose === -1) {
        // Malformed XML - no closing tag found
        break;
      }

      if (nextOpen !== -1 && nextOpen < nextClose) {
        // Found nested opening tag
        depth++;
        pos = nextOpen + 6;
      } else {
        // Found closing tag
        depth--;
        if (depth === 0) {
          const endIdx = nextClose + 9; // '</w:sdt>'.length = 9
          results.push({
            start: startIdx,
            end: endIdx,
            content: xml.substring(startIdx, endIdx)
          });
        }
        pos = nextClose + 9;
      }
    }

    searchPos = startIdx + 1;
  }

  return results;
}

/**
 * Processes Enhanced Content Controls with type-aware handling to prevent corruption
 * Uses STRING-BASED replacement to preserve original XML structure
 * Properly handles NESTED content controls by tracking nesting depth
 * @param xmlContent The document.xml content as string
 * @param variables Object containing variable values
 * @param relationshipManager Manager for handling image relationships
 * @param xmlPath Path of the XML file being processed
 * @param companyId Company ID for accessing images from storage
 * @returns Updated XML content with content controls populated
 */
async function processEnhancedContentControlsWithTypeAwarenessAndCount(
  xmlContent: string,
  variables: { [key: string]: string | null },
  relationshipManager: RelationshipManager,
  xmlPath: string,
  companyId?: string
): Promise<{ processedXml: string; processedCount: number }> {
  try {
    console.log(`[DOCX] Processing ${xmlPath} with nested-aware string replacement...`);

    // Build a map of variable names to values for quick lookup
    const variableMap = new Map<string, any>();
    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined && value !== null && value !== '') {
        variableMap.set(normalizeVariableName(key), value);
        variableMap.set(key, value); // Also store original key
      }
    }

    console.log(`[DOCX] Available variables: ${Array.from(variableMap.keys()).join(', ')}`);

    // Debug: Log all variable values
    for (const [key, value] of Array.from(variableMap.entries())) {
      const valuePreview = typeof value === 'string' ? value.substring(0, 50) : JSON.stringify(value).substring(0, 50);
      console.log(`[DOCX] Variable "${key}" = "${valuePreview}"`);
    }

    // Find all content controls with proper nesting handling
    const allControls = findAllContentControls(xmlContent);
    console.log(`[DOCX] Found ${allControls.length} content controls (including nested)`);

    // Collect all replacements with their positions
    const replacements: Array<{
      start: number;
      end: number;
      originalContent: string;
      newContent: string;
      variableName: string;
    }> = [];

    // Debug: Log first few content controls to understand structure
    if (allControls.length > 0) {
      console.log(`[DOCX] First control preview (500 chars): ${allControls[0].content.substring(0, 500)}`);
    }

    for (const control of allControls) {
      const fullMatch = control.content;

      // Extract tag value from w:tag element
      // Look for the FIRST w:tag in the sdtPr section (before sdtContent)
      // Try multiple patterns for sdtPr extraction
      let sdtPrMatch = fullMatch.match(/<w:sdtPr\b[^>]*>([\s\S]*?)<\/w:sdtPr>/);

      // If not found, try without namespace or with different structure
      if (!sdtPrMatch) {
        // Maybe sdtPr has attributes we're not capturing
        sdtPrMatch = fullMatch.match(/<w:sdtPr>([\s\S]*?)<\/w:sdtPr>/);
      }

      // Try to find sdtPr with proper nesting handling (in case of nested content)
      if (!sdtPrMatch) {
        const sdtPrStart = fullMatch.indexOf('<w:sdtPr');
        if (sdtPrStart !== -1) {
          const sdtPrEnd = fullMatch.indexOf('</w:sdtPr>', sdtPrStart);
          if (sdtPrEnd !== -1) {
            const sdtPrContent = fullMatch.substring(sdtPrStart, sdtPrEnd + 11);
            const innerMatch = sdtPrContent.match(/<w:sdtPr[^>]*>([\s\S]*)/);
            if (innerMatch) {
              sdtPrMatch = [sdtPrContent, innerMatch[1].replace(/<\/w:sdtPr>$/, '')];
            }
          }
        }
      }

      if (!sdtPrMatch) {
        // Log first 300 chars to see the structure
        console.log(`[DOCX] Skipping control - no sdtPr found. Preview: ${fullMatch.substring(0, 300)}`);
        continue;
      }

      const sdtPrContent = sdtPrMatch[1];

      // Extract variable name from Content Control properties
      // NEW BEHAVIOR: Title/Alias (w:alias) contains the variable name, Tag (w:tag) contains scope
      // Look for w:alias FIRST (variable name), then fall back to w:tag for backward compatibility
      // Pattern 1: <w:alias w:val="..."/> (preferred - contains variable name)
      // Pattern 2: <w:alias val="..."/> (without namespace)
      // Pattern 3: <w:tag w:val="..."/> (fallback for old templates)
      // Pattern 4: <w:tag val="..."/> (without namespace)
      let nameMatch = sdtPrContent.match(/<w:alias\s+w:val="([^"]*)"/);
      if (!nameMatch) {
        nameMatch = sdtPrContent.match(/<w:alias\s+val="([^"]*)"/);
      }
      if (!nameMatch) {
        // Fallback to w:tag for backward compatibility with old templates
        // Note: In new templates, w:tag contains scope (global/category/local), not the variable name
        nameMatch = sdtPrContent.match(/<w:tag\s+w:val="([^"]*)"/);
      }
      if (!nameMatch) {
        nameMatch = sdtPrContent.match(/<w:tag\s+val="([^"]*)"/);
      }

      if (!nameMatch) {
        // Log first 200 chars of sdtPr for debugging
        console.log(`[DOCX] Skipping control - no alias/tag found. sdtPr preview: ${sdtPrContent.substring(0, 200)}`);
        continue;
      }

      const tagValue = nameMatch[1];
      
      // Check if this is a scope value (from new templates) - skip if it's just a scope
      const scopeValues = ['global', 'category', 'local'];
      if (scopeValues.includes(tagValue.toLowerCase().trim())) {
        console.log(`[DOCX] Skipping control - tag contains scope "${tagValue}", but no alias with variable name found`);
        continue;
      }
      
      const [rawName] = tagValue.split('|');
      const variableName = normalizeVariableName(rawName?.trim() || '');

      console.log(`[DOCX] Found control: tag="${tagValue}", normalized="${variableName}"`);

      // Debug: Check if this variable exists in our map
      const hasNormalized = variableMap.has(variableName);
      const hasRaw = variableMap.has(rawName?.trim() || '');
      console.log(`[DOCX] Variable lookup: normalized=${hasNormalized}, raw=${hasRaw}`);

      // Skip empty variable names
      if (!variableName || variableName.trim() === '') {
        continue;
      }

      // Get variable value
      let variableValue = variableMap.get(variableName) || variableMap.get(rawName?.trim() || '');

      if (!variableValue) {
        console.log(`[DOCX] Skipping ${variableName} - no value provided`);
        continue;
      }

      // Determine control type from sdtPr
      const isImageControl = sdtPrContent.includes('<w:picture') || sdtPrContent.includes('<w:picture/>');
      const isDateControl = sdtPrContent.includes('<w:date');
      const isDropdownControl = sdtPrContent.includes('<w:dropDownList');
      const isCheckboxControl = sdtPrContent.includes(':checkbox');

      // Handle image controls
      if (isImageControl && companyId) {
        let imagePath: string | null = null;
        if (typeof variableValue === 'object' && variableValue !== null) {
          const objValue = variableValue as any;
          if (objValue.type === 'image' && objValue.value) {
            imagePath = typeof objValue.value === 'string' ? objValue.value :
                       (typeof objValue.value?.value === 'string' ? objValue.value.value : null);
          }
        } else if (typeof variableValue === 'string' && variableValue.includes('/images/')) {
          imagePath = variableValue;
        }

        if (imagePath) {
          try {
            console.log(`[DOCX] Processing image for ${variableName}: ${imagePath}`);

            const { data: imageFile, error: imageError } = await storageService.downloadFile(
              { companyId: companyId, isPublic: false },
              imagePath
            );

            if (!imageError && imageFile) {
              const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
              if (imageBuffer.length > 0) {
                const filename = imagePath.split('/').pop() || 'image.png';
                const relationshipId = relationshipManager.addImage(imageBuffer, filename);

                // Calculate dimensions and convert to EMUs (1cm = 360,000 EMUs)
                const dimensions = calculateImageDimensions(imageBuffer);
                const emuWidth = Math.round(dimensions.width * 360000);
                const emuHeight = Math.round(dimensions.height * 360000);

                // Update blip reference in the original XML using string replacement
                let updatedMatch = fullMatch;

                // Replace r:embed attribute in a:blip
                updatedMatch = updatedMatch.replace(
                  /(<a:blip[^>]*\s+r:embed=")([^"]*)(")/g,
                  `$1${relationshipId}$3`
                );

                // Update dimensions in wp:extent and a:ext to preserve aspect ratio
                updatedMatch = updatedMatch.replace(
                  /(<wp:extent\s+cx=")([^"]*)("\s+cy=")([^"]*)(")/g,
                  `$1${emuWidth}$3${emuHeight}$5`
                );
                
                updatedMatch = updatedMatch.replace(
                  /(<a:ext\s+cx=")([^"]*)("\s+cy=")([^"]*)(")/g,
                  `$1${emuWidth}$3${emuHeight}$5`
                );

                // Remove w:showingPlcHdr element
                updatedMatch = updatedMatch.replace(/<w:showingPlcHdr\s*\/>/g, '');
                updatedMatch = updatedMatch.replace(/<w:showingPlcHdr><\/w:showingPlcHdr>/g, '');

                if (updatedMatch !== fullMatch) {
                  replacements.push({
                    start: control.start,
                    end: control.end,
                    originalContent: fullMatch,
                    newContent: updatedMatch,
                    variableName
                  });
                  console.log(`[DOCX] ✅ Updated image reference for ${variableName}`);
                }
              }
            }
          } catch (imgError) {
            console.error(`[DOCX] Error processing image for ${variableName}:`, imgError);
          }
        }
        continue;
      }

      // Handle checkbox content controls
      if (isCheckboxControl) {
        // Determine the checked state from the variable value
        let isChecked = false;
        if (typeof variableValue === 'boolean') {
          isChecked = variableValue;
        } else if (typeof variableValue === 'string') {
          isChecked = variableValue === 'true' || variableValue === '1';
        } else if (variableValue && typeof variableValue === 'object') {
          const objValue = variableValue as any;
          if (objValue.value !== undefined) {
            isChecked = objValue.value === true || objValue.value === 'true' || objValue.value === '1';
          }
        }

        console.log(`[DOCX] Processing checkbox ${variableName}: ${isChecked}`);

        // Update the w14:checked value in the checkbox control
        let updatedMatch = fullMatch;
        
        // Update w14:checked w14:val attribute
        updatedMatch = updatedMatch.replace(
          /(<w14:checked\s+w14:val=")([^"]*)(")/g,
          `$1${isChecked ? '1' : '0'}$3`
        );
        
        // Also handle the case where it might be just val= without namespace
        updatedMatch = updatedMatch.replace(
          /(<w14:checked\s+val=")([^"]*)(")/g,
          `$1${isChecked ? '1' : '0'}$3`
        );

        // Update the checkbox symbol in the content (☑ or ☐)
        // The content usually contains either ☑ (U+2611) or ☐ (U+2610)
        const checkMark = isChecked ? '☑' : '☐';
        // Also handle MS Word's ballot characters: 
        //  (U+F052 or similar) for checked,  (U+F06F or similar) for unchecked
        updatedMatch = updatedMatch.replace(/(<w:t[^>]*>)([☐☑]|\uf052|\uf06f|\uf0a3|\uf0a4)(<\/w:t>)/gi, 
          `$1${checkMark}$3`
        );

        if (updatedMatch !== fullMatch) {
          replacements.push({
            start: control.start,
            end: control.end,
            originalContent: fullMatch,
            newContent: updatedMatch,
            variableName
          });
          console.log(`[DOCX] ✅ Updated checkbox for ${variableName} to ${isChecked}`);
        }
        continue;
      }

      // Handle dropdown content controls
      if (isDropdownControl) {
        // Get the selected value and custom dropdown options from the variable
        let selectedValue = '';
        let customDropdownOptions: { displayText: string; value: string }[] | undefined;
        
        if (typeof variableValue === 'string') {
          selectedValue = variableValue;
        } else if (variableValue && typeof variableValue === 'object') {
          const objValue = variableValue as any;
          if (objValue.value !== undefined) {
            selectedValue = String(objValue.value);
          }
          // Get custom dropdown options if available
          if (objValue.dropdownOptions && Array.isArray(objValue.dropdownOptions)) {
            customDropdownOptions = objValue.dropdownOptions;
          }
        }

        // Also check if custom options are stored in templateVariables
        if (!customDropdownOptions && templateVariables) {
          // Search through all categories and templates for custom dropdown options
          for (const category of Object.keys(templateVariables)) {
            const categoryTemplates = templateVariables[category as keyof typeof templateVariables];
            if (categoryTemplates && typeof categoryTemplates === 'object') {
              for (const templateName of Object.keys(categoryTemplates)) {
                const templateData = (categoryTemplates as any)[templateName];
                if (templateData?.variables) {
                  const varWithOptions = templateData.variables.find((v: any) => 
                    v.name === variableName && v.dropdownOptions
                  );
                  if (varWithOptions?.dropdownOptions) {
                    customDropdownOptions = varWithOptions.dropdownOptions;
                    break;
                  }
                }
              }
            }
            if (customDropdownOptions) break;
          }
        }

        if (selectedValue) {
          let updatedMatch = fullMatch;
          
          // Escape the value for XML
          const escapedValue = escapeXml(selectedValue);

          // Update the dropdown options list if custom options exist
          if (customDropdownOptions && customDropdownOptions.length > 0) {
            // Build new listItem elements
            const listItems = customDropdownOptions.map(opt => {
              // Escape for XML attributes
              const safeDisplay = escapeXml(opt.displayText || opt.value);
              const safeValue = escapeXml(opt.value);
              return `<w:listItem w:displayText="${safeDisplay}" w:value="${safeValue}"/>`;
            }).join('');
            
            const newDropDownList = `<w:dropDownList>${listItems}</w:dropDownList>`;
            
            // Try to find and replace the dropDownList element
            // Pattern 1: <w:dropDownList>..listItems..</w:dropDownList> (with content)
            const dropDownListWithContentRegex = /<w:dropDownList(?:\s[^>]*)?>[\s\S]*?<\/w:dropDownList>/;
            // Pattern 2: <w:dropDownList.../> (self-closing)
            const dropDownListSelfClosingRegex = /<w:dropDownList[^>]*\/>/;
            
            if (dropDownListWithContentRegex.test(updatedMatch)) {
              updatedMatch = updatedMatch.replace(dropDownListWithContentRegex, newDropDownList);
            } else if (dropDownListSelfClosingRegex.test(updatedMatch)) {
              updatedMatch = updatedMatch.replace(dropDownListSelfClosingRegex, newDropDownList);
            }
          }

          // Find the sdtContent section and replace text
          const sdtContentStart = updatedMatch.indexOf('<w:sdtContent');
          if (sdtContentStart !== -1) {
            // Find the matching </w:sdtContent>
            let depth = 1;
            let pos = updatedMatch.indexOf('>', sdtContentStart) + 1;
            let sdtContentEnd = -1;

            while (depth > 0 && pos < updatedMatch.length) {
              const nextOpen = updatedMatch.indexOf('<w:sdtContent', pos);
              const nextClose = updatedMatch.indexOf('</w:sdtContent>', pos);

              if (nextClose === -1) break;

              if (nextOpen !== -1 && nextOpen < nextClose) {
                depth++;
                pos = nextOpen + 13;
              } else {
                depth--;
                if (depth === 0) {
                  sdtContentEnd = nextClose + 15;
                }
                pos = nextClose + 15;
              }
            }

            if (sdtContentEnd !== -1) {
              const sdtContentFull = updatedMatch.substring(sdtContentStart, sdtContentEnd);
              
              // Replace text content in w:t elements
              let newSdtContent = sdtContentFull.replace(
                /(<w:t[^>]*>)[^<]*(<\/w:t>)/g,
                `$1${escapedValue}$2`
              );

              // Remove w:showingPlcHdr if present (indicates placeholder text)
              updatedMatch = updatedMatch.replace(/<w:showingPlcHdr\s*\/>/g, '');
              updatedMatch = updatedMatch.replace(/<w:showingPlcHdr><\/w:showingPlcHdr>/g, '');

              // Replace the sdtContent section
              updatedMatch = updatedMatch.substring(0, sdtContentStart) + 
                           newSdtContent + 
                           updatedMatch.substring(sdtContentEnd);

              // Remove placeholder gray color styling (808080)
              updatedMatch = updatedMatch.replace(/<w:color\s+w:val="808080"\s*\/>/g, '');
              updatedMatch = updatedMatch.replace(/<w:color\s+w:val="808080"><\/w:color>/g, '');

              if (updatedMatch !== fullMatch) {
                replacements.push({
                  start: control.start,
                  end: control.end,
                  originalContent: fullMatch,
                  newContent: updatedMatch,
                  variableName
                });
              }
            }
          }
        }
        continue;
      }

      // Handle text content controls - extract text value
      let textValue = '';
      if (typeof variableValue === 'string') {
        if (!variableValue.includes('/images/')) {
          textValue = variableValue;
        }
      } else if (variableValue && typeof variableValue === 'object') {
        const objValue = variableValue as any;
        if (objValue.type !== 'image' && objValue.value !== undefined) {
          textValue = String(objValue.value);
        }
      } else if (variableValue) {
        textValue = String(variableValue);
      }

      if (!textValue) {
        continue;
      }

      // Escape XML special characters
      const escapedValue = escapeXml(textValue);

      // Find the sdtContent section - need to handle nested controls
      // Look for the DIRECT sdtContent (not one from a nested control)
      const sdtContentStart = fullMatch.indexOf('<w:sdtContent');
      if (sdtContentStart === -1) continue;

      // Find the matching </w:sdtContent> by tracking depth
      let depth = 1;
      let pos = fullMatch.indexOf('>', sdtContentStart) + 1;
      let sdtContentEnd = -1;

      while (depth > 0 && pos < fullMatch.length) {
        const nextOpen = fullMatch.indexOf('<w:sdtContent', pos);
        const nextClose = fullMatch.indexOf('</w:sdtContent>', pos);

        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + 13;
        } else {
          depth--;
          if (depth === 0) {
            sdtContentEnd = nextClose + 15; // '</w:sdtContent>'.length
          }
          pos = nextClose + 15;
        }
      }

      if (sdtContentEnd === -1) continue;

      const sdtContentFull = fullMatch.substring(sdtContentStart, sdtContentEnd);

      // Extract inner content (between opening and closing tags)
      const innerStart = sdtContentFull.indexOf('>') + 1;
      const innerEnd = sdtContentFull.lastIndexOf('</w:sdtContent>');
      const sdtContentInner = sdtContentFull.substring(innerStart, innerEnd);

      // Try to preserve the run structure
      let newSdtContent = sdtContentFull;

      // Check if there's existing text content to replace (but not in nested controls)
      // Find w:t elements that are NOT inside nested w:sdt
      const hasDirectTextContent = hasDirectTextElements(sdtContentInner);

      if (hasDirectTextContent) {
        // Replace text in w:t elements while preserving structure
        // But only replace in the FIRST w:t we find (at the top level)
        newSdtContent = replaceFirstDirectText(sdtContentFull, escapedValue);
      } else if (!sdtContentInner.includes('<w:sdt')) {
        // No nested controls and no w:t - create new run
        const newRunXml = `<w:r><w:t>${escapedValue}</w:t></w:r>`;
        const openTagEnd = sdtContentFull.indexOf('>') + 1;
        newSdtContent = sdtContentFull.substring(0, openTagEnd) + newRunXml + '</w:sdtContent>';
      } else {
        // Has nested controls but no direct text - skip this one
        console.log(`[DOCX] Skipping ${variableName} - contains nested controls without direct text`);
        continue;
      }

      if (newSdtContent !== sdtContentFull) {
        let newFullMatch = fullMatch.replace(sdtContentFull, newSdtContent);
        
        // Remove placeholder gray color styling (808080 is the common gray placeholder color)
        // This ensures the filled-in text appears in normal color, not gray
        newFullMatch = newFullMatch.replace(/<w:color\s+w:val="808080"\s*\/>/g, '');
        newFullMatch = newFullMatch.replace(/<w:color\s+w:val="808080"><\/w:color>/g, '');
        
        // Also remove w:showingPlcHdr element which indicates placeholder text is being shown
        newFullMatch = newFullMatch.replace(/<w:showingPlcHdr\s*\/>/g, '');
        newFullMatch = newFullMatch.replace(/<w:showingPlcHdr><\/w:showingPlcHdr>/g, '');
        
        replacements.push({
          start: control.start,
          end: control.end,
          originalContent: fullMatch,
          newContent: newFullMatch,
          variableName
        });
        console.log(`[DOCX] ✅ Replaced text for ${variableName}: "${textValue.substring(0, 50)}${textValue.length > 50 ? '...' : ''}"`);
      }
    }

    // Sort replacements by position (descending) to avoid index shifting issues
    replacements.sort((a, b) => b.start - a.start);

    // Apply all replacements
    let processedXml = xmlContent;
    let processedCount = 0;

    for (const { start, end, originalContent, newContent, variableName } of replacements) {
      // Verify the content at this position matches what we expect
      const currentContent = processedXml.substring(start, end);
      if (currentContent === originalContent) {
        processedXml = processedXml.substring(0, start) + newContent + processedXml.substring(end);
        processedCount++;
      } else {
        console.warn(`[DOCX] Content mismatch for ${variableName}, skipping replacement`);
      }
    }

    console.log(`[DOCX] Processed ${processedCount} content controls in ${xmlPath}`);

    return { processedXml, processedCount };

  } catch (error) {
    console.error('Error in string-based processing:', error);
    return { processedXml: xmlContent, processedCount: 0 };
  }
}

/**
 * Check if content has direct w:t elements (not inside nested w:sdt)
 */
function hasDirectTextElements(content: string): boolean {
  // Remove nested sdt content first
  let cleaned = content;
  let prevLength = 0;

  // Iteratively remove nested w:sdt elements
  while (cleaned.length !== prevLength) {
    prevLength = cleaned.length;
    cleaned = cleaned.replace(/<w:sdt\b[^>]*>[\s\S]*?<\/w:sdt>/g, '');
  }

  return cleaned.includes('<w:t');
}

/**
 * Replace text in the first direct w:t element (not inside nested w:sdt)
 */
function replaceFirstDirectText(sdtContentFull: string, newText: string): string {
  // Find positions of all nested w:sdt elements
  const nestedRanges: Array<{ start: number; end: number }> = [];
  const nestedControls = findAllContentControls(sdtContentFull);

  // Skip the first one if it's the entire sdtContent (shouldn't happen, but safety check)
  for (const nc of nestedControls) {
    if (nc.start > 0) { // Only add if it's truly nested
      nestedRanges.push({ start: nc.start, end: nc.end });
    }
  }

  // Find all w:t elements
  const tRegex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let result = sdtContentFull;
  let replaced = false;

  result = sdtContentFull.replace(tRegex, (match, attrs, text, offset) => {
    // Check if this w:t is inside a nested control
    const isNested = nestedRanges.some(range => offset >= range.start && offset < range.end);

    if (isNested) {
      return match; // Keep original
    }

    if (!replaced) {
      replaced = true;
      return `<w:t${attrs}>${newText}</w:t>`;
    }

    // Clear subsequent direct w:t elements
    return `<w:t${attrs}></w:t>`;
  });

  return result;
}

/**
 * Generate image XML string for placeholder replacement
 * Includes all necessary namespace declarations for Word compatibility
 */
function getImageXmlForReplacement(relationshipId: string, width: number, height: number, isInline: boolean): string {
  // All namespace declarations needed for the image elements
  // These are declared inline to ensure Word can parse them correctly
  const wpNs = 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  const aNs = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
  const picNs = 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const rNs = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

  // Build the drawing XML with all required namespace declarations on the wp:inline element
  const drawingXml = `<w:drawing><wp:inline ${wpNs} ${aNs} ${picNs} ${rNs} distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${width}" cy="${height}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Picture 1"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Picture 1"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:srcRect/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;

  const runXml = `<w:r><w:rPr><w:noProof/></w:rPr>${drawingXml}</w:r>`;

  if (isInline) {
    return runXml;
  } else {
    return `<w:p>${runXml}</w:p>`;
  }
}


/**
 * Helper function to safely clear or replace content in sdtContent while preserving structural elements
 */
function replaceContentControlContent(
  sdtContent: Element,
  doc: Document,
  variableName: string,
  newContent?: Element,
  originalRunProps?: Element | null,
  originalRunAttributes?: { [key: string]: string } | null
): void {
  // Check if sdtContent contains structural elements that should be preserved
  const hasStructuralElements = sdtContent.getElementsByTagName('w:tc').length > 0 ||
    sdtContent.getElementsByTagName('w:tbl').length > 0 ||
    sdtContent.getElementsByTagName('w:hdr').length > 0 ||
    sdtContent.getElementsByTagName('w:ftr').length > 0;

  if (hasStructuralElements) {
    console.log(`[DOCX] Preserving structural elements for ${variableName}`);
    // For structural elements, find and replace text in paragraphs instead of clearing everything
    const paragraphs = sdtContent.getElementsByTagName('w:p');
    for (let p = 0; p < paragraphs.length; p++) {
      const paragraph = paragraphs[p];
      // Clear existing runs in the paragraph
      const runs = paragraph.getElementsByTagName('w:r');
      for (let r = runs.length - 1; r >= 0; r--) {
        paragraph.removeChild(runs[r]);
      }

      // Add the new content or placeholder text
      if (newContent) {
        paragraph.appendChild(newContent.cloneNode(true));
      } else {
        // Add variable name in red color as a new run
        const textNode = doc.createElement('w:t');
        textNode.appendChild(doc.createTextNode(variableName));
        const runNode = doc.createElement('w:r');

        // Create red color formatting
        const runProps = doc.createElement('w:rPr');
        const colorNode = doc.createElement('w:color');
        colorNode.setAttribute('w:val', 'FF0000'); // Bright red
        runProps.appendChild(colorNode);

        // Apply preserved run attributes if available
        if (originalRunAttributes) {
          Object.entries(originalRunAttributes).forEach(([name, value]) => {
            runNode.setAttribute(name, value);
          });
        }

        // Apply preserved formatting if available, but override with red color
        if (originalRunProps) {
          const clonedProps = originalRunProps.cloneNode(true) as Element;
          // Remove any existing color and add red
          const existingColor = clonedProps.getElementsByTagName('w:color')[0];
          if (existingColor) {
            clonedProps.removeChild(existingColor);
          }
          clonedProps.appendChild(colorNode.cloneNode(true));
          runNode.appendChild(clonedProps);
        } else {
          runNode.appendChild(runProps);
        }

        runNode.appendChild(textNode);
        paragraph.appendChild(runNode);
      }
    }
  } else {
    // For non-structural content controls, clear everything and add new content
    while (sdtContent.firstChild) {
      sdtContent.removeChild(sdtContent.firstChild);
    }

    if (newContent) {
      sdtContent.appendChild(newContent);
    } else {
      // Add variable name in red color
      const textNode = doc.createElement('w:t');
      textNode.appendChild(doc.createTextNode(variableName));
      const runNode = doc.createElement('w:r');

      // Create red color formatting
      const runProps = doc.createElement('w:rPr');
      const colorNode = doc.createElement('w:color');
      colorNode.setAttribute('w:val', 'FF0000'); // Bright red
      runProps.appendChild(colorNode);

      // Apply preserved run attributes if available
      if (originalRunAttributes) {
        Object.entries(originalRunAttributes).forEach(([name, value]) => {
          runNode.setAttribute(name, value);
        });
      }

      // Apply preserved formatting if available, but override with red color
      if (originalRunProps) {
        const clonedProps = originalRunProps.cloneNode(true) as Element;
        // Remove any existing color and add red
        const existingColor = clonedProps.getElementsByTagName('w:color')[0];
        if (existingColor) {
          clonedProps.removeChild(existingColor);
        }
        clonedProps.appendChild(colorNode.cloneNode(true));
        runNode.appendChild(clonedProps);
      } else {
        runNode.appendChild(runProps);
      }

      runNode.appendChild(textNode);
      sdtContent.appendChild(runNode);
    }
  }
}

/**
 * Detect the type of content control based on its properties
 */
function detectEnhancedContentControlType(sdtPr: any): 'text' | 'richtext' | 'image' | 'date' | 'dropdown' | 'checkbox' | 'combobox' {
  // Check for picture content control
  if (sdtPr.getElementsByTagName('w:picture').length > 0) {
    return 'image';
  }

  // Check for checkbox content control
  if (sdtPr.getElementsByTagName('w14:checkbox').length > 0 ||
    sdtPr.getElementsByTagName('w:checkbox').length > 0) {
    return 'checkbox';
  }

  // Check for date content control
  if (sdtPr.getElementsByTagName('w:date').length > 0) {
    return 'date';
  }

  // Check for dropdown content control
  if (sdtPr.getElementsByTagName('w:dropDownList').length > 0) {
    return 'dropdown';
  }

  // Check for combo box content control
  if (sdtPr.getElementsByTagName('w:comboBox').length > 0) {
    return 'combobox';
  }

  // Check for rich text content control
  if (sdtPr.getElementsByTagName('w:richText').length > 0) {
    return 'richtext';
  }

  // Default to text
  return 'text';
}

/**
 * Create image content XML with proper relationship ID
 * Includes all required namespace declarations for Word compatibility
 * @param relationshipId The relationship ID for the image
 * @param width Width in EMUs
 * @param height Height in EMUs
 * @param inlineOnly If true, returns just a run (w:r) without paragraph wrapper - for inline contexts
 */
function createImageContentXmlWithRelationship(relationshipId: string, width?: number, height?: number, inlineOnly?: boolean): string {
  const defaultWidth = width || 1905000; // ~2 inches in EMUs
  const defaultHeight = height || 1905000;

  // Common namespace declarations
  const namespaces = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`;

  // The drawing content (same for both inline and block)
  const drawingContent = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${defaultWidth}" cy="${defaultHeight}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Picture 1"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Picture 1"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:srcRect/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${defaultWidth}" cy="${defaultHeight}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;

  if (inlineOnly) {
    // Return just the run for inline contexts (inside paragraphs, table cells)
    return `<w:r ${namespaces}><w:rPr><w:noProof/></w:rPr>${drawingContent}</w:r>`;
  } else {
    // Return full paragraph for block-level contexts
    return `<w:p ${namespaces}><w:r><w:rPr><w:noProof/></w:rPr>${drawingContent}</w:r></w:p>`;
  }
}

/**
 * Escape XML characters to prevent corruption
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
    return c;
  });
}


/**
 * Check if a string looks like an ISO date
 */
function isISODateString(value: string): boolean {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoDatePattern.test(value);
}

/**
 * Format date for document display
 */
function formatDateForDocument(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if not a valid date
    }

    // Format as DD/MM/YYYY
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString; // Return original if formatting fails
  }
}

/**
 * Preprocesses the document to strip type information from curly bracket placeholders
 * This function handles variables that may be split across XML elements due to Word formatting
 * @param templateBuffer The DOCX template as a buffer
 * @returns Modified buffer with stripped type information
 */
function stripTypeInformationFromTemplate(templateBuffer: Buffer): Buffer {
  try {
    const zip = new PizZip(templateBuffer);

    // Use centralized XML files configuration
    const xmlFilesToProcess = DOCX_XML_FILES_TO_CHECK;

    let totalChanges = 0;
    let processedFiles = 0;

    // Process each XML file that exists in the document
    for (const xmlPath of xmlFilesToProcess) {
      const xmlFile = zip.file(xmlPath);
      if (xmlFile) {
        try {
          let xmlContent = xmlFile.asText();

          let changeCount = 0;

          // Handle simple patterns: {{variable|type}} → {{normalized_variable}}
          xmlContent = xmlContent.replace(/\{\{\s*([^}<|]+)\|[^}]*\s*\}\}/g, (match, variableName) => {
            const normalizedName = normalizeVariableName(variableName.trim());
            console.log(`Stripping type info in ${xmlPath}: "${match}" → "{{${normalizedName}}}"`);
            changeCount++;
            return `{{${normalizedName}}}`;
          });

          // Handle patterns without type info but normalize the variable names
          xmlContent = xmlContent.replace(/\{\{\s*([^}<|]+)\s*\}\}/g, (match, variableName) => {
            // Skip if this was already processed above (contains normalized format)
            if (variableName.includes('_') && variableName === variableName.toLowerCase()) {
              return match; // Already normalized
            }

            const normalizedName = normalizeVariableName(variableName.trim());
            if (normalizedName !== variableName.trim()) {
              console.log(`Normalizing variable in ${xmlPath}: "${match}" → "{{${normalizedName}}}"`);
              changeCount++;
              return `{{${normalizedName}}}`;
            }

            return match;
          });

          // Update the XML file in the zip if changes were made
          if (changeCount > 0) {
            zip.file(xmlPath, xmlContent);
            totalChanges += changeCount;
            processedFiles++;
            console.log(`✅ Made ${changeCount} changes in ${xmlPath}`);
          }

        } catch (error) {
          console.error(`Error processing ${xmlPath} for type stripping:`, error);
          // Continue with other files even if one fails
        }
      }
    }

    console.log(`📊 Template preprocessing complete: ${totalChanges} changes across ${processedFiles} files`);

    // Return the modified zip as buffer
    return zip.generate({ type: 'nodebuffer' });

  } catch (error) {
    console.error('Error stripping type information:', error);
    return templateBuffer; // Return original if processing fails
  }
}

/**
 * Helper: Recursively update <w14:checked> in <w14:checkbox> in <w:sdtPr>
 */
function updateCheckedRecursive(node: any, checked: boolean) {
  if (!node) return;
  if (typeof node.nodeName === 'string' && node.nodeName.toLowerCase().endsWith(':checked')) {
    node.setAttribute('w14:val', checked ? '1' : '0');
  }
  if (node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      updateCheckedRecursive(node.childNodes[i], checked);
    }
  }
}

/**
 * Helper: Recursively search for a tag with a given suffix (namespace-agnostic)
 */
function hasTagWithSuffix(node: any, suffix: string): boolean {
  if (!node) return false;
  if (typeof node.nodeName === 'string' && node.nodeName.toLowerCase().endsWith(suffix.toLowerCase())) return true;
  if (node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      if (hasTagWithSuffix(node.childNodes[i], suffix)) return true;
    }
  }
  return false;
}

/**
 * Processes documents with only curly brackets (legacy method)
 * @param templateBuffer The DOCX template as a buffer
 * @param variables Object containing variable values
 * @returns Processed DOCX as a buffer
 */
function processCurlyBracketsOnly(
  templateBuffer: Buffer,
  variables: DocumentVariables
): Buffer {
  // First, preprocess the template to strip type information
  const preprocessedBuffer = stripTypeInformationFromTemplate(templateBuffer);

  const zip = new PizZip(preprocessedBuffer);

  // Create Docxtemplater instance
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: {
      start: '{{',
      end: '}}'
    }
  });

  // Prepare variables for Docxtemplater (handle null values)
  const docVariables: { [key: string]: string } = {};
  Object.entries(variables).forEach(([key, value]) => {
    if (value === null || value === undefined || value.value === '') {
      docVariables[key] = `***[${key}]***`;
    } else if (typeof value === 'string') {
      // Check if this looks like an ISO date string and format it
      if (isISODateString(value)) {
        docVariables[key] = formatDateForDocument(value);
      } else {
        docVariables[key] = value;
      }
    } else if (typeof value === 'object' && value && 'type' in value && (value as DocumentVariable).type === 'text') {
      const docVar = value as DocumentVariable;
      docVariables[key] = typeof docVar.value === 'string' ? docVar.value : `***[${key}]***`;
    } else {
      // For non-text variables, leave placeholder for content control processing
      docVariables[key] = `***[${key}]***`;
    }
  });

  // Render with Docxtemplater
  doc.render(docVariables);

  // Return the processed document
  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  });
}

/**
 * Calculates appropriate image dimensions for Word document
 * Converts pixel dimensions to cm with reasonable sizing
 */
function calculateImageDimensions(imageBuffer: Buffer): { width: number; height: number } {
  try {
    // Import sizeOf dynamically to avoid issues
    const sizeOf = require('image-size');
    const dimensions = sizeOf(imageBuffer);

    if (!dimensions.width || !dimensions.height) {
      console.log('Could not determine image dimensions, using defaults');
      return { width: 6, height: 4 };
    }

    console.log(`Original image dimensions: ${dimensions.width}x${dimensions.height}px`);

    // Calculate aspect ratio
    const aspectRatio = dimensions.width / dimensions.height;

    // Set target dimensions in cm
    // We want a consistent height while preserving aspect ratio
    const targetHeightCm = 3; // Consistent height for all images (was 4)
    const maxWidthCm = 16;   // Max width to prevent page overflow
    const minSize = 1;       // Minimum size

    let heightCm = targetHeightCm;
    let widthCm = heightCm * aspectRatio;

    // If image is extremely wide, limit by max width
    if (widthCm > maxWidthCm) {
      widthCm = maxWidthCm;
      heightCm = widthCm / aspectRatio;
    }

    // Ensure minimum size
    if (widthCm < minSize) {
      widthCm = minSize;
      heightCm = widthCm / aspectRatio;
    }
    if (heightCm < minSize) {
      heightCm = minSize;
      widthCm = heightCm * aspectRatio;
    }

    // Round to 1 decimal place
    widthCm = Math.round(widthCm * 10) / 10;
    heightCm = Math.round(heightCm * 10) / 10;

    console.log(`Calculated document dimensions: ${widthCm}x${heightCm}cm (aspect ratio: ${aspectRatio.toFixed(2)})`);

    return { width: widthCm, height: heightCm };

  } catch (error) {
    console.error('Error calculating image dimensions:', error);
    return { width: 6, height: 4 }; // Fallback dimensions
  }
} 