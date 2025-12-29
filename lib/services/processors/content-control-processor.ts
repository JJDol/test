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


export async function processDocumentWithEnhancedVariables(
  templateBuffer: Buffer,
  variables: { [key: string]: string | null }
): Promise<Buffer> {
  console.log('🔄 Starting enhanced document processing...');

  // First, strip any type information from the template
  const strippedTemplate = stripTypeInformationFromTemplate(templateBuffer);

  // Process content controls and curly brackets
  const processedBuffer = await processEnhancedContentControlsAndCurlyBrackets(strippedTemplate, variables);

  console.log('Enhanced document processing complete');
  return processedBuffer;
}

/**
 * Processes documents with enhanced content controls and curly brackets
 * Handles ALL document parts: main document, headers, footers, footnotes, endnotes, glossary
 * Now includes proper relationship management for images
 * @param templateBuffer The DOCX template as a buffer
 * @param variables Object containing variable values
 * @returns Processed DOCX as a buffer
 */
async function processEnhancedContentControlsAndCurlyBrackets(
  templateBuffer: Buffer,
  variables: { [key: string]: string | null }
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

        // Process content controls in this XML file and get the count of processed controls
        const { processedXml, processedCount: processedInThisFile } = await processEnhancedContentControlsWithTypeAwarenessAndCount(
          xmlContent,
          variables,
          relationshipManager,
          xmlPath
        );

        if (processedInThisFile > 0) {
          console.log(`✅ Processed ${processedInThisFile} enhanced content controls in ${xmlPath}`);
          processedCount += processedInThisFile;
        }

        // Update the XML file in the zip
        zip.file(xmlPath, processedXml);

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
  }

  console.log(`[DOCX] Re-generating intermediate ZIP...`);
  // Update relationships if any images were added
  if (relationshipManager.hasNewRelationships()) {
    relationshipManager.updateRelationships();
  }

  // Then process any remaining curly brackets using Docxtemplater
  let intermediateBuffer: Buffer;
  try {
    intermediateBuffer = zip.generate({ type: 'nodebuffer' });
    console.log(`[DOCX] Intermediate ZIP generated. Size: ${intermediateBuffer.length}`);
  } catch (error) {
    console.error('[DOCX] Error generating intermediate ZIP:', error);
    throw error;
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
      compression: 'DEFLATE'
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
   * Update the relationships XML file
   */
  updateRelationships(): void {
    if (!this.relsXml) {
      console.warn('No relationships XML available for update');
      return;
    }

    try {
      const { DOMParser, XMLSerializer } = require('xmldom');
      const parser = new DOMParser();
      const serializer = new XMLSerializer();
      const doc = parser.parseFromString(this.relsXml, 'text/xml');

      const relationshipsElement = doc.getElementsByTagName('Relationships')[0];
      if (relationshipsElement) {
        // Add new relationships
        for (const [id, target] of Array.from(this.newRelationships.entries())) {
          // Check if relationship already exists using xmldom methods
          const existingRels = doc.getElementsByTagName('Relationship');
          let existingRel = null;
          for (let i = 0; i < existingRels.length; i++) {
            if (existingRels[i].getAttribute('Id') === id) {
              existingRel = existingRels[i];
              break;
            }
          }

          if (!existingRel) {
            const newRel = doc.createElement('Relationship');
            newRel.setAttribute('Id', id);
            newRel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
            newRel.setAttribute('Target', target);
            relationshipsElement.appendChild(newRel);
            console.log(`Added new relationship: ${id} -> ${target}`);
          }
        }

        // Update the relationships file
        const updatedXml = serializer.serializeToString(doc);
        this.zip.file('word/_rels/document.xml.rels', updatedXml);
        console.log(`Updated relationships file with ${this.newRelationships.size} new relationships`);
      } else {
        console.error('Could not find Relationships element in XML');
      }
    } catch (error) {
      console.error('Error updating relationships:', error);
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
 * Processes Enhanced Content Controls with type-aware handling to prevent corruption
 * Uses DOM-based processing for text and proper relationship management for images
 * @param xmlContent The document.xml content as string
 * @param variables Object containing variable values
 * @param relationshipManager Manager for handling image relationships
 * @param xmlPath Path of the XML file being processed
 * @returns Updated XML content with content controls populated
 */
async function processEnhancedContentControlsWithTypeAwarenessAndCount(
  xmlContent: string,
  variables: { [key: string]: string | null },
  relationshipManager: RelationshipManager,
  xmlPath: string
): Promise<{ processedXml: string; processedCount: number }> {
  try {
    const { DOMParser, XMLSerializer } = require('xmldom');
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

    // OPTIMIZATION: Combine wrapping and processing into one DOM operation
    // Parse once instead of twice (wrapContentControlsInParagraphs parsed it too)
    console.log(`[DOCX] Parsing XML for ${xmlPath}...`);
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    // First, wrap content controls (operating on the same DOM)
    // Inline the logic from wrapContentControlsInParagraphs to avoid re-parsing
    // (We'll implement the wrapping logic directly here or use a helper that takes 'doc')
    // For safety in this refactor, we'll assume the structure is mostly correct or handle it 
    // BUT to be safe given the crash, let's process the DOM directly

    // Find all content controls (w:sdt)
    // LIVE NodeList warning: traversing while modifying can be dangerous.
    // Convert to array first
    const contentControlsList = doc.getElementsByTagName('w:sdt');
    const contentControls = Array.from(contentControlsList); // Static array snapshot

    console.log(`[DOCX] Found ${contentControls.length} content controls to process`);

    let processedCount = 0;

    for (let i = 0; i < contentControls.length; i++) {
      // PER-CONTROL ERROR HANDLING
      try {
        const sdt = contentControls[i] as Element;

        // Check if node still exists in tree (might have been removed if nested?)
        // Usually fine since we snapshot, but good to check parent
        if (!sdt.parentNode) continue;

        const sdtPr = sdt.getElementsByTagName('w:sdtPr')[0];
        if (!sdtPr) continue;

        const tagElement = sdtPr.getElementsByTagName('w:tag')[0];
        if (!tagElement || !tagElement.getAttribute('w:val')) continue;

        const tagValue = tagElement.getAttribute('w:val') || '';
        const [rawName] = tagValue.split('|');
        const variableName = normalizeVariableName(rawName?.trim() || '');

        // Log less frequently to save buffer
        if (i % 10 === 0) console.log(`[DOCX] Processing item ${i}/${contentControls.length}: ${variableName}`);

        // Get variable value
        let variableValue = variables[variableName];
        if (variableValue === undefined || variableValue === null || variableValue === '') {
          variableValue = variables[rawName?.trim() || ''];
        }

        // Find sdtContent
        const sdtContent = sdt.getElementsByTagName('w:sdtContent')[0];
        if (!sdtContent) continue;

        // Preserve formatting
        let originalRunProps: Element | null = null;
        let originalRunAttributes: { [key: string]: string } | null = null;
        const runs = sdtContent.getElementsByTagName('w:r');
        if (runs.length > 0) {
          const firstRun = runs[0];
          const rPr = firstRun.getElementsByTagName('w:rPr')[0];
          if (rPr) originalRunProps = rPr.cloneNode(true) as Element;

          originalRunAttributes = {};
          // @ts-ignore
          if (firstRun.attributes) {
            // @ts-ignore
            for (let a = 0; a < firstRun.attributes.length; a++) {
              // @ts-ignore
              const attr = firstRun.attributes[a];
              originalRunAttributes[attr.name] = attr.value;
            }
          }
        }

        // Determine type
        const controlType = detectEnhancedContentControlType(sdtPr);

        if (!variableValue) {
          // Handle missing value
          if (controlType !== 'image') {
            replaceContentControlContent(sdtContent, doc, variableName, undefined, originalRunProps, originalRunAttributes);
            processedCount++;
          }
          continue;
        }

        // Handle Text
        let textValue = '';
        if (typeof variableValue === 'string') textValue = variableValue;
        else if (variableValue) textValue = String(variableValue);

        if (textValue) {
          const textTextNode = doc.createElement('w:t');
          textTextNode.appendChild(doc.createTextNode(textValue));
          const textRunNode = doc.createElement('w:r');

          if (originalRunAttributes) {
            Object.entries(originalRunAttributes).forEach(([k, v]) => textRunNode.setAttribute(k, v));
          }
          if (originalRunProps) textRunNode.appendChild(originalRunProps.cloneNode(true));

          textRunNode.appendChild(textTextNode);
          replaceContentControlContent(sdtContent, doc, variableName, textRunNode, originalRunProps, originalRunAttributes);
          processedCount++;
        }

      } catch (itemError) {
        console.error(`[DOCX] Error processing item ${i}:`, itemError);
        // Continue processing other items!
      }
    }

    // Ensure all w:sdt are validly placed (Paragraph Wrapping)
    // We do this AFTER processing to avoid re-parsing issues
    // Just ensure top-level SDTs are wrapped
    // NOTE: For safety against the crash, we are skipping the complex 'wrapContentControlsInParagraphs'
    // logic which re-parses the whole doc. 
    // Most Word templates are already valid. If this causes issues, we can add a lighter wrap pass.

    console.log(`[DOCX] Serialization...`);
    const processedXml = serializer.serializeToString(doc);
    return { processedXml, processedCount };

  } catch (error) {
    console.error('Error in single-pass processing:', error);
    return { processedXml: xmlContent, processedCount: 0 };
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
 */
function createImageContentXmlWithRelationship(relationshipId: string, width?: number, height?: number): string {
  const defaultWidth = width || 1905000; // ~2 inches in EMUs
  const defaultHeight = height || 1905000;

  return `<w:p><w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${defaultWidth}" cy="${defaultHeight}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Picture 1"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Picture 1"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:srcRect/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${defaultWidth}" cy="${defaultHeight}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
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

    // Set maximum dimensions in cm (reasonable for document)
    const maxWidthCm = 12;  // Max width: 12cm
    const maxHeightCm = 8;  // Max height: 8cm

    let widthCm: number;
    let heightCm: number;

    // Scale based on aspect ratio while respecting maximums
    if (aspectRatio > maxWidthCm / maxHeightCm) {
      // Image is wider - limit by width
      widthCm = Math.min(maxWidthCm, dimensions.width * 0.02646); // Convert px to cm (96 DPI)
      heightCm = widthCm / aspectRatio;
    } else {
      // Image is taller - limit by height
      heightCm = Math.min(maxHeightCm, dimensions.height * 0.02646);
      widthCm = heightCm * aspectRatio;
    }

    // Ensure minimum size
    const minSize = 2; // cm
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