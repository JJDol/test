/**
 * Contract Text Extraction Utility
 * 
 * Extracts text content from PDF and DOCX contract files
 * for AI processing and information extraction
 */

// NOTE: We import pdf-parse's inner file directly to bypass a known bug in its
// index.js that tries to open a test PDF (./test/data/05-versions-space.pdf)
// at module-load time. In server-rendered Next.js this would throw ENOENT and
// make the whole route module fail to evaluate, returning an HTML 500 page
// (which the client then fails to parse as JSON).
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

export interface TextExtractionResult {
  success: boolean;
  text: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    characterCount?: number;
  };
  error?: string;
}

export class ContractTextExtractor {
  /**
   * Extract text from a file buffer based on file type
   */
  async extractText(fileBuffer: Buffer, fileType: string, fileName: string): Promise<TextExtractionResult> {
    try {
      // Determine extraction method based on file type
      if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        return await this.extractFromPDF(fileBuffer);
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword' ||
        fileName.toLowerCase().endsWith('.docx') ||
        fileName.toLowerCase().endsWith('.doc')
      ) {
        return await this.extractFromDOCX(fileBuffer);
      } else if (fileType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')) {
        return this.extractFromPlainText(fileBuffer);
      } else {
        return {
          success: false,
          text: '',
          error: `Unsupported file type: ${fileType}. Supported types: PDF, DOCX, TXT`,
        };
      }
    } catch (error) {
      console.error('Error extracting text from contract:', error);
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error during text extraction',
      };
    }
  }

  /**
   * Extract text from PDF file
   */
  private async extractFromPDF(buffer: Buffer): Promise<TextExtractionResult> {
    try {
      const data = await pdfParse(buffer);
      
      const text = data.text || '';
      const cleanedText = this.cleanExtractedText(text);

      if (!cleanedText || cleanedText.length < 50) {
        return {
          success: false,
          text: cleanedText,
          error: 'Extracted text is too short or empty. PDF may be image-based or corrupted.',
        };
      }

      return {
        success: true,
        text: cleanedText,
        metadata: {
          pageCount: data.numpages,
          wordCount: this.countWords(cleanedText),
          characterCount: cleanedText.length,
        },
      };
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return {
        success: false,
        text: '',
        error: `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Extract text from DOCX file
   */
  private async extractFromDOCX(buffer: Buffer): Promise<TextExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      const text = result.value || '';
      const cleanedText = this.cleanExtractedText(text);

      if (!cleanedText || cleanedText.length < 50) {
        return {
          success: false,
          text: cleanedText,
          error: 'Extracted text is too short or empty. DOCX may be corrupted or empty.',
        };
      }

      // Log any warnings from mammoth
      if (result.messages && result.messages.length > 0) {
        console.warn('Mammoth extraction warnings:', result.messages);
      }

      return {
        success: true,
        text: cleanedText,
        metadata: {
          wordCount: this.countWords(cleanedText),
          characterCount: cleanedText.length,
        },
      };
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      return {
        success: false,
        text: '',
        error: `Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Extract text from plain text file
   */
  private extractFromPlainText(buffer: Buffer): TextExtractionResult {
    try {
      const text = buffer.toString('utf-8');
      const cleanedText = this.cleanExtractedText(text);

      if (!cleanedText || cleanedText.length < 50) {
        return {
          success: false,
          text: cleanedText,
          error: 'Text file is too short or empty.',
        };
      }

      return {
        success: true,
        text: cleanedText,
        metadata: {
          wordCount: this.countWords(cleanedText),
          characterCount: cleanedText.length,
        },
      };
    } catch (error) {
      console.error('Error reading text file:', error);
      return {
        success: false,
        text: '',
        error: `Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanExtractedText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Validate if extracted text looks like a contract
   */
  isLikelyContract(text: string): boolean {
    const contractKeywords = [
      'kontrakt',
      'aftale',
      'entreprise',
      'bygherre',
      'byggetilladelse',
      'projektadresse',
      'contract',
      'agreement',
      'client',
      'project',
      'contractor',
      'scope of work',
      'terms and conditions',
    ];

    const lowerText = text.toLowerCase();
    const foundKeywords = contractKeywords.filter(keyword => lowerText.includes(keyword));

    // Consider it a contract if it contains at least 3 contract-related keywords
    return foundKeywords.length >= 3;
  }
}

// Singleton instance
export const contractTextExtractor = new ContractTextExtractor();
