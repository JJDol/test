/**
 * Document Template Variable Extraction Route
 * 
 * PURPOSE: Extract variables and content controls from uploaded document templates
 * - Processes .docx files to identify template variables
 * - Extracts enhanced variable types (text, date, dropdown, checkbox, etc.)
 * - Provides comprehensive variable metadata for template processing
 * - Supports large file processing with extended timeout
 * TODO:
 * - Adapt timeout to subscription tier limits
 * - Add file content validation for malicious content
 * - Consider caching extracted variables for performance
 * - Add variable extraction analytics and monitoring
 * 
 * ROUTE: POST /api/document-templates/extract-variables
 */
import { NextResponse } from 'next/server';
import { extractTemplateVariables } from '@/lib/services/extractors/enhanced-variable-extractor';
import { Buffer } from 'buffer';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { DocumentVariable } from '@/lib/types/variable-types';

export const dynamic = 'force-dynamic';

// Route Segment Config for handling larger files and longer processing times
// TODO: Adapt this timer to the subscription tier
export const maxDuration = 60; // 60 seconds timeout for processing large files

async function extractVariablesHandler(request: AuthenticatedRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type for security
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ 
        message: 'Invalid file type. Only .docx files are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (50MB limit to match configuration)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        message: 'File too large. Maximum size is 50MB.' 
      }, { status: 400 });
    }

    // Convert File to ArrayBuffer, then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);



    // Extract enhanced variables with types - supports all content control types
    const enhancedVariables = extractTemplateVariables(buffer);
    console.log("Extracted variables:", enhancedVariables);
    if (!enhancedVariables) {
      return NextResponse.json({ 
        message: 'Failed to extract variables' 
      }, { status: 500 });
    }
    // Convert to the expected format for backward compatibility
    const variablesWithTypes = enhancedVariables.map((variable: DocumentVariable) => ({
      name: variable.name,
      type: variable.type,
      scope: 'scope' in variable ? variable.scope : 'local', // Include scope (defaults to 'local')
      originalTag: 'originalTag' in variable ? variable.originalTag : undefined,
      id: 'id' in variable ? variable.id : undefined,
      title: 'title' in variable ? variable.title : undefined,
      dateFormat: 'dateFormat' in variable ? variable.dateFormat : undefined,
      dropdownOptions: 'dropdownOptions' in variable ? variable.dropdownOptions : undefined,
      currentContent: 'currentContent' in variable ? variable.currentContent : undefined,
    }));
    
    console.log('Variable extraction completed:', {
      fileName: file.name,
      fileSize: file.size,
      extractedVariables: variablesWithTypes,
      variableCount: variablesWithTypes.length
    });

    return NextResponse.json({ 
      variables: variablesWithTypes // Only the enhanced format with types
    });
  } catch (error) {
    console.error('Error extracting variables:', error);
    return NextResponse.json({ 
      message: 'Failed to extract variables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply authentication wrapper
export const POST = withAuth(extractVariablesHandler); 