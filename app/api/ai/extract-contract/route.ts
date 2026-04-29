/**
 * Contract Information Extraction API
 * 
 * PURPOSE: Extract essential information from contract documents
 * - Upload PDF/DOCX contract
 * - Extract text content
 * - Use AI to identify and extract key project information
 * - Return structured data for auto-populating project variables
 * 
 * ROUTE: POST /api/ai/extract-contract
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { contractTextExtractor } from '@/lib/services/extractors/contract-text-extractor';
import { contractExtractor } from '@/lib/services/ai/contract-extractor';
import { createClient } from '@/lib/supabase/server';
import { del } from '@vercel/blob';

export const maxDuration = 60;

async function extractContractHandler(request: AuthenticatedRequest) {
  let blobUrlToCleanup: string | null = null;

  try {
    const supabase = await createClient();
    const user = request.user;

    // Get user's company info
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id, name, role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      console.error('User not found in database:', user.id);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!userData.company_id) {
      return NextResponse.json({ 
        error: 'User not assigned to a company' 
      }, { status: 403 });
    }

    // Support two modes: direct FormData upload OR blobUrl (for large files)
    const url = new URL(request.url);
    const blobUrl = url.searchParams.get('blobUrl');

    let file: File | null = null;
    let fileBuffer: Buffer;
    let fileType: string;
    let fileName: string;

    if (blobUrl) {
      // Large file mode: download from Vercel Blob
      blobUrlToCleanup = blobUrl;
      const blobRes = await fetch(blobUrl);
      if (!blobRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch file from storage' }, { status: 400 });
      }
      fileBuffer = Buffer.from(await blobRes.arrayBuffer());
      fileType = blobRes.headers.get('content-type') || 'application/octet-stream';
      fileName = blobUrl.split('/').pop()?.split('?')[0] || 'contract';
    } else {
      // Direct upload mode (small files < 4.5MB)
      const formData = await request.formData();
      file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ 
          error: 'No file provided' 
        }, { status: 400 });
      }
      fileBuffer = Buffer.from(await file.arrayBuffer());
      fileType = file.type;
      fileName = file.name;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const lowerName = fileName.toLowerCase();

    if (!allowedTypes.includes(fileType) && 
        !lowerName.endsWith('.pdf') && 
        !lowerName.endsWith('.docx') &&
        !lowerName.endsWith('.doc') &&
        !lowerName.endsWith('.txt')) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' 
      }, { status: 400 });
    }

    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (fileBuffer.length > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 20MB.' 
      }, { status: 400 });
    }

    console.log(`📄 Processing contract: ${fileName} (${fileType}, ${(fileBuffer.length / 1024).toFixed(2)} KB)`);

    // Step 1: Extract text from the file
    const textExtractionResult = await contractTextExtractor.extractText(
      fileBuffer,
      fileType,
      fileName
    );

    if (!textExtractionResult.success) {
      return NextResponse.json({
        error: 'Failed to extract text from document',
        details: textExtractionResult.error,
      }, { status: 400 });
    }

    console.log(`✅ Text extracted: ${textExtractionResult.metadata?.wordCount || 0} words`);

    // Check if the document looks like a contract
    const isContract = contractTextExtractor.isLikelyContract(textExtractionResult.text);
    if (!isContract) {
      console.warn('⚠️  Uploaded document may not be a contract');
    }

    // Step 2: Use AI to extract contract information
    const extractionResult = await contractExtractor.extractContractInfo(textExtractionResult.text);

    if (!extractionResult.success || !extractionResult.data) {
      return NextResponse.json({
        error: 'Failed to extract contract information',
        details: extractionResult.error,
      }, { status: 500 });
    }

    console.log(`✅ Contract info extracted. Confidence: ${extractionResult.data.extractionConfidence}`);

    // Step 3: Map to project variables
    const variableMapping = contractExtractor.mapToProjectVariables(extractionResult.data);

    // Step 4: Get extraction summary for user review
    const summary = contractExtractor.getExtractionSummary(extractionResult.data);

    // Clean up blob after successful processing
    if (blobUrlToCleanup) {
      del(blobUrlToCleanup).catch((e) => console.warn('Blob cleanup failed:', e));
    }

    return NextResponse.json({
      success: true,
      message: 'Contract information extracted successfully',
      extraction: {
        contractData: extractionResult.data,
        variableMapping,
        summary: {
          critical: summary.critical.filter(item => item.value),
          optional: summary.optional.filter(item => item.value),
          missing: summary.missing,
        },
        confidence: extractionResult.data.extractionConfidence,
        isLikelyContract: isContract,
        stats: {
          tokensUsed: extractionResult.tokensUsed,
          estimatedCost: extractionResult.estimatedCost,
          wordCount: textExtractionResult.metadata?.wordCount,
          characterCount: textExtractionResult.metadata?.characterCount,
          pageCount: textExtractionResult.metadata?.pageCount,
        },
      },
    });

  } catch (error) {
    console.error('❌ Error in contract extraction:', error);
    if (blobUrlToCleanup) {
      del(blobUrlToCleanup).catch(() => {});
    }
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Apply authentication wrapper
export const POST = withAuth(extractContractHandler);

// Export type for frontend use
export type ContractExtractionResponse = {
  success: boolean;
  message: string;
  extraction: {
    contractData: any;
    variableMapping: Record<string, any>;
    summary: {
      critical: { label: string; value: string }[];
      optional: { label: string; value: string }[];
      missing: string[];
    };
    confidence: 'high' | 'medium' | 'low';
    isLikelyContract: boolean;
    stats: {
      tokensUsed: number;
      estimatedCost: number;
      wordCount?: number;
      characterCount?: number;
      pageCount?: number;
    };
  };
};
