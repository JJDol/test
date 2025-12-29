import { createReport } from 'docx-templates';
import { storageService } from '@/lib/services/integrations/storage-service';
import PizZip from 'pizzip';
import sizeOf from 'image-size';
import { normalizeVariableName } from '@/lib/utils/variable-utils';

export interface ImageReference {
  filePath: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface ProcessedVariables {
  [key: string]: any;
}

/**
 * Processes a DOCX template with variables including actual image insertion
 * Uses docx-templates library with simple image object format
 * @param templateBuffer The DOCX template as a buffer
 * @param variables Object containing variable values (including image file paths)
 * @param companyId Company ID for accessing images from storage
 * @returns Processed DOCX as a buffer
 */
export async function processDocxWithImages(
  templateBuffer: Buffer,
  variables: { [key: string]: any },
  companyId: string
): Promise<Buffer> {
  try {
    console.log('Processing DOCX with images using docx-templates (simple approach)');
    
    // Step 1: Convert template format to use {IMAGE variable} syntax
    const convertedTemplate = convertTemplateToDocxTemplatesFormat(templateBuffer, variables);
    
    // Step 2: Process variables to handle images
    const processedVariables = await processVariablesForDocxTemplates(variables, companyId);
    
    console.log('Variables processed for docx-templates:', Object.keys(processedVariables));
    
    // Step 3: Use docx-templates with the simple approach
    const report = await createReport({
      template: convertedTemplate,
      data: processedVariables,
      cmdDelimiter: ['{', '}'], // Use single braces
    });

    console.log('DOCX processing completed successfully');
    return Buffer.from(report);
    
  } catch (error) {
    console.error('Error processing DOCX with images:', error);
    throw error;
  }
}

/**
 * Converts template format from {{variable|type}} to {IMAGE variable} for docx-templates
 */
function convertTemplateToDocxTemplatesFormat(templateBuffer: Buffer, variables: { [key: string]: any }): Buffer {
  try {
    // Create a copy of the buffer to prevent corruption of the original
    const bufferCopy = Buffer.from(templateBuffer);
    const zip = new PizZip(bufferCopy);
    
    const documentXml = zip.file('word/document.xml');
    if (!documentXml) {
      console.log('Warning: Could not find word/document.xml in template');
      return templateBuffer;
    }
    
    let xmlContent = documentXml.asText();
    console.log('Converting template to docx-templates format...');
    
    // Handle XML-split patterns first (Word sometimes splits variables across XML elements)
    xmlContent = xmlContent.replace(/\{\{[^}]*<[^>]*>[^}]*\}\}/g, (match) => {
      console.log(`Found XML-split pattern: "${match.substring(0, 100)}..."`);
      
      // Extract text content by removing XML tags
      const textContent = match.replace(/<[^>]*>/g, '').replace(/[{}]/g, '');
      const [name, type] = textContent.split('|').map((s: string) => s?.trim());
      
      if (!name) return match;
      
      const normalizedName = normalizeVariableName(name);
      
      if (type && (type.toLowerCase().includes('image') || type.toLowerCase().includes('signature'))) {
        // Check if the variable has a valid image value
        const variableValue = variables[normalizedName];
        let hasValidImage = false;
        
        if (typeof variableValue === 'string') {
          hasValidImage = variableValue.includes('/images/') || variableValue.startsWith('data:image/');
        } else if (typeof variableValue === 'object' && variableValue !== null) {
          // Check if it's an image object with a file path
          hasValidImage = variableValue.type === 'image' && 
                         typeof variableValue.value === 'string' && 
                         (variableValue.value.includes('/images/') || variableValue.value.startsWith('data:image/'));
        }
        
        if (hasValidImage) {
          const converted = `{IMAGE ${normalizedName}}`;
          console.log(`XML-split image: "${textContent}" → "${converted}"`);
          return converted;
        } else {
          // Convert to text placeholder since no valid image
          const converted = `{${normalizedName}}`;
          console.log(`XML-split image (no value): "${textContent}" → "${converted}" (treating as text)`);
          return converted;
        }
      } else {
        const converted = `{${normalizedName}}`;
        console.log(`XML-split text: "${textContent}" → "${converted}"`);
        return converted;
      }
    });
    
    // Handle regular patterns
    xmlContent = xmlContent.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variableName) => {
      // Skip if already processed (contains XML)
      if (variableName.includes('<') || variableName.includes('>')) {
        return match;
      }
      
      const [name, type] = variableName.split('|').map((s: string) => s?.trim());
      if (!name) return match;
      
      const normalizedName = normalizeVariableName(name);
      
      if (type && (type.toLowerCase().includes('image') || type.toLowerCase().includes('signature'))) {
        // Check if the variable has a valid image value
        const variableValue = variables[normalizedName];
        let hasValidImage = false;
        
        if (typeof variableValue === 'string') {
          hasValidImage = variableValue.includes('/images/') || variableValue.startsWith('data:image/');
        } else if (typeof variableValue === 'object' && variableValue !== null) {
          // Check if it's an image object with a file path
          hasValidImage = variableValue.type === 'image' && 
                         typeof variableValue.value === 'string' && 
                         (variableValue.value.includes('/images/') || variableValue.value.startsWith('data:image/'));
        }
        
        if (hasValidImage) {
          const converted = `{IMAGE ${normalizedName}}`;
          console.log(`Regular image: "${match}" → "${converted}"`);
          return converted;
        } else {
          // Convert to text placeholder since no valid image
          const converted = `{${normalizedName}}`;
          console.log(`Regular image (no value): "${match}" → "${converted}" (treating as text)`);
          return converted;
        }
      } else {
        const converted = `{${normalizedName}}`;
        console.log(`Regular text: "${match}" → "${converted}"`);
        return converted;
      }
    });
    
    // Update the document.xml in the zip
    zip.file('word/document.xml', xmlContent);
    
    return zip.generate({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9
      }
    });
    
  } catch (error) {
    console.error('Error converting template format:', error);
    return templateBuffer;
  }
}


/**
 * Processes variables for docx-templates format (like your example)
 */
async function processVariablesForDocxTemplates(
  variables: { [key: string]: any },
  companyId: string
): Promise<ProcessedVariables> {
  const processed: ProcessedVariables = {};
  
  // No need to pre-identify image variables since template conversion handles this
  
  for (const [key, value] of Object.entries(variables)) {
    let imagePath: string | null = null;
    
    // Extract image path from different value formats
    if (typeof value === 'string' && value.includes('/images/') && !value.startsWith('data:')) {
      imagePath = value;
    } else if (typeof value === 'object' && value !== null && 
               value.type === 'image' && 
               typeof value.value === 'string' && 
               value.value.includes('/images/') && 
               !value.value.startsWith('data:')) {
      imagePath = value.value;
    }
    
    if (imagePath) {
      // This is an image file path - download and create image object
      try {
        console.log(`Processing image variable ${key}: ${imagePath}`);
        
        const { data: imageFile, error: imageError } = await storageService.downloadFile(
          {
            companyId: companyId,
            isPublic: false
          },
          imagePath
        );

        if (imageError || !imageFile) {
          console.error(`Error downloading image ${imagePath}:`, imageError);
          // Fallback to placeholder
          processed[key] = `[IMAGE: ${imagePath.split('/').pop() || 'image'}]`;
          continue;
        }

        // Convert to buffer and calculate proper dimensions
        const imageBuffer = await imageFile.arrayBuffer();
        const imageBufferForSize = Buffer.from(imageBuffer);
        const extension = '.' + (imagePath.split('.').pop()?.toLowerCase() || 'png');
        
        // Calculate image dimensions and convert to appropriate size for document
        const dimensions = calculateImageDimensions(imageBufferForSize);
        
        // For docx-templates, we need to pass the buffer directly
        // The library will handle the image insertion automatically
        processed[key] = imageBufferForSize;
        
        console.log(`Created image object for ${key}: ${extension}, ${imageBuffer.byteLength} bytes, ${dimensions.width}x${dimensions.height}cm`);
        
      } catch (error) {
        console.error(`Error processing image ${key}:`, error);
        processed[key] = `[IMAGE: ${imagePath.split('/').pop() || 'image'}]`;
      }
    } else if (typeof value === 'string' && value.startsWith('data:')) {
      // Handle base64 images
      try {
                  const matches = value.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            const extension = '.' + getExtensionFromMimeType(mimeType);
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Calculate dimensions for base64 images too
            const dimensions = calculateImageDimensions(imageBuffer);
            
            // For docx-templates, we need to pass the buffer directly
            processed[key] = imageBuffer;
            
            console.log(`Created base64 image object for ${key}: ${dimensions.width}x${dimensions.height}cm`);
        } else {
          processed[key] = `[IMAGE: Invalid base64]`;
        }
      } catch (error) {
        console.error(`Error processing base64 image ${key}:`, error);
        processed[key] = `[IMAGE: Base64 error]`;
      }
    } else {
      // Handle other variables
      if (value === null || value === undefined) {
        // For null/undefined variables, always use text placeholder
        // The template conversion already handled whether to use IMAGE or text based on actual values
        processed[key] = `*** [${key}] ***`;
        console.log(`Converted null variable ${key} to text placeholder`);
      } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        // This looks like an ISO date string, format it nicely
        try {
          const date = new Date(value);
          processed[key] = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          console.log(`Formatted date ${key}: ${value} → ${processed[key]}`);
        } catch (error) {
          processed[key] = value; // Keep original if parsing fails
        }
      } else {
        processed[key] = value;
      }
    }
  }
  
  return processed;
}

/**
 * Calculates appropriate image dimensions for Word document
 * Converts pixel dimensions to cm with reasonable sizing
 */
function calculateImageDimensions(imageBuffer: Buffer): { width: number; height: number } {
  try {
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

/**
 * Gets file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: { [key: string]: string } = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  };
  
  return extensions[mimeType.toLowerCase()] || 'png';
}

/**
 * Checks if a template should use the image processor
 */
export function shouldUseImageProcessor(variables: { [key: string]: any }): boolean {
  return Object.values(variables).some(value => 
    typeof value === 'string' && 
    (value.includes('/images/') || value.startsWith('data:image/'))
  );
} 