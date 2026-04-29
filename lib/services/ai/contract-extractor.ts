import OpenAI from 'openai';
import { AI_CONFIG } from '@/lib/config/ai-config';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

/**
 * Contract Information Extraction Service
 * 
 * Extracts essential information from construction/architecture contracts
 * and maps them to AutoDoc project variables.
 */

// Define the expected structure of extracted contract data
export const ContractDataSchema = z.object({
  // Project Information
  projectName: z.string().describe('The name or title of the project'),
  projectAddress: z.string().describe('The physical address or location of the project'),
  projectDescription: z.string().optional().describe('Brief description of the project scope'),
  
  // Client Information
  clientName: z.string().describe('The name of the client/customer'),
  clientAddress: z.string().optional().describe('Client\'s address'),
  clientPhone: z.string().optional().describe('Client\'s phone number'),
  clientEmail: z.string().optional().describe('Client\'s email address'),
  clientCVR: z.string().optional().describe('Client\'s CVR number (Danish business registration)'),
  
  // Financial Information
  contractValue: z.string().optional().describe('Total contract value or project budget'),
  currency: z.string().optional().describe('Currency code (e.g., DKK, EUR)'),
  
  // Timeline Information
  startDate: z.string().optional().describe('Project start date (YYYY-MM-DD format if possible)'),
  endDate: z.string().optional().describe('Project end/deadline date (YYYY-MM-DD format if possible)'),
  duration: z.string().optional().describe('Project duration'),
  
  // Property/Building Information
  propertyType: z.string().optional().describe('Type of property (e.g., residential, commercial, industrial)'),
  buildingType: z.string().optional().describe('Type of building (e.g., apartment, office, warehouse)'),
  totalArea: z.string().optional().describe('Total building area in square meters'),
  numberOfFloors: z.string().optional().describe('Number of floors/stories'),
  
  // Project Team
  architectFirm: z.string().optional().describe('Name of the architecture firm'),
  engineerFirm: z.string().optional().describe('Name of the engineering firm'),
  contractorName: z.string().optional().describe('Name of the main contractor'),
  
  // Additional Information
  buildingPermitNumber: z.string().optional().describe('Building permit number if available'),
  cadastralNumber: z.string().optional().describe('Cadastral / matrikel number. In Danish this is called "Matrikelnummer" or "Matrikel".'),
  cadastralDistrict: z.string().optional().describe('Cadastral district. In Danish this is called "Ejerlav" (the registered land community the parcel belongs to).'),
  municipalityName: z.string().optional().describe('Municipality name'),

  // Case / document metadata
  caseNumber: z.string().optional().describe('Case or file number. In Danish this is called "Sagsnummer" or "Sagsnr".'),
  constructionAddress: z.string().optional().describe('The physical construction site address. May differ from projectAddress if the contract distinguishes between project location and the actual building site. In Danish often labelled "Byggeadresse" or "Byggepladsens adresse".'),
  subject: z.string().optional().describe('Subject or topic line of the document. In Danish this is labelled "Emne".'),
  revisionDate: z.string().optional().describe('Document revision date if shown (e.g. "Revision dato", "Revisionsdato").'),
  revisionNumber: z.string().optional().describe('Document revision number / index if shown (e.g. "Revision nr.", "Rev.nr.", "Revisionsnr.").'),
  regarding: z.string().optional().describe('The "Regarding" / "Re:" line. In Danish this is labelled "Vedrørende" or "Vedr.". Usually a short phrase summarising what the document concerns.'),
  documentReceiver: z.string().optional().describe('The party who receives/is addressed by the document. Often the same as clientName but can differ (e.g. a legal representative, authority, or subsidiary). Extract the receiver name as printed in the header/addressee block.'),

  // Confidence Score
  extractionConfidence: z.enum(['high', 'medium', 'low']).describe('Overall confidence in the extraction quality'),
  missingFields: z.array(z.string()).describe('List of fields that could not be extracted'),
});

export type ContractData = z.infer<typeof ContractDataSchema>;

export interface ContractExtractionResult {
  success: boolean;
  data: ContractData | null;
  tokensUsed: number;
  estimatedCost: number;
  error?: string;
}

export class ContractExtractorService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: AI_CONFIG.openai.apiKey,
    });
  }

  /**
   * Extract contract information from text using GPT-4 with structured outputs
   */
  async extractContractInfo(contractText: string): Promise<ContractExtractionResult> {
    try {
      console.log('📄 Starting contract information extraction...');
      
      // Validate input
      if (!contractText || contractText.trim().length < 100) {
        return {
          success: false,
          data: null,
          tokensUsed: 0,
          estimatedCost: 0,
          error: 'Contract text is too short or empty. Minimum 100 characters required.',
        };
      }

      // Use GPT-4 with structured output for reliable extraction
      const completion = await this.client.beta.chat.completions.parse({
        model: 'gpt-4o-2024-08-06', // Model with structured output support
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting key information from construction and architecture contracts.
Your task is to carefully read the contract and extract all relevant project information.

IMPORTANT GUIDELINES:
- Extract information exactly as it appears in the document
- If a field cannot be found, leave it as null or empty
- For dates, try to format as YYYY-MM-DD if possible, otherwise keep original format
- For monetary values, include the amount and keep original format
- Be thorough but only extract information that is explicitly stated
- Mark extraction confidence as:
  * 'high' if all critical fields (project name, address, client) are found
  * 'medium' if some critical fields are missing but main info is present
  * 'low' if many fields are missing or uncertain
- List any important fields that couldn't be extracted in missingFields array`,
          },
          {
            role: 'user',
            content: `Extract all relevant information from this contract:\n\n${contractText}`,
          },
        ],
        response_format: zodResponseFormat(ContractDataSchema, 'contract_extraction'),
        temperature: 0.1, // Low temperature for consistent extraction
      });

      const extractedData = completion.choices[0].message.parsed;
      const tokensUsed = completion.usage?.total_tokens || 0;
      const estimatedCost = tokensUsed * AI_CONFIG.costs.chatPricePerToken;

      if (!extractedData) {
        return {
          success: false,
          data: null,
          tokensUsed,
          estimatedCost,
          error: 'Failed to parse structured output from AI',
        };
      }

      console.log(`✅ Contract extraction completed. Tokens: ${tokensUsed}, Cost: $${estimatedCost.toFixed(4)}`);
      console.log(`📊 Confidence: ${extractedData.extractionConfidence}, Missing fields: ${extractedData.missingFields.length}`);

      return {
        success: true,
        data: extractedData,
        tokensUsed,
        estimatedCost,
      };
    } catch (error) {
      console.error('❌ Error extracting contract information:', error);
      return {
        success: false,
        data: null,
        tokensUsed: 0,
        estimatedCost: 0,
        error: error instanceof Error ? error.message : 'Unknown error during extraction',
      };
    }
  }

  /**
   * Map extracted contract data to AutoDoc project variables
   * This creates a mapping from contract fields to template variables
   */
  mapToProjectVariables(contractData: ContractData): Record<string, any> {
    return {
      // Project details
      'Projektets navn': contractData.projectName,
      'Projekt navn': contractData.projectName,
      'Projektnavn': contractData.projectName,
      'Projektadresse': contractData.projectAddress,
      'Projekt adresse': contractData.projectAddress,
      'Adresse': contractData.projectAddress,
      'Projektbeskrivelse': contractData.projectDescription,
      'Beskrivelse': contractData.projectDescription,
      
      // Client information
      'Bygherres navn': contractData.clientName,
      'Bygherre navn': contractData.clientName,
      'Bygherrenavn': contractData.clientName,
      'Kunde navn': contractData.clientName,
      'Bygherre adresse': contractData.clientAddress,
      'Bygherres adresse': contractData.clientAddress,
      'Bygherre telefon': contractData.clientPhone,
      'Bygherre tlf': contractData.clientPhone,
      'Bygherre email': contractData.clientEmail,
      'Bygherre e-mail': contractData.clientEmail,
      'Bygherre CVR': contractData.clientCVR,
      'CVR nummer': contractData.clientCVR,
      'CVR-nummer': contractData.clientCVR,
      
      // Financial
      'Kontraktsum': contractData.contractValue,
      'Entreprisesum': contractData.contractValue,
      'Budget': contractData.contractValue,
      'Valuta': contractData.currency,
      
      // Timeline
      'Startdato': contractData.startDate,
      'Start dato': contractData.startDate,
      'Afleveringsdato': contractData.endDate,
      'Slutdato': contractData.endDate,
      'Deadline': contractData.endDate,
      'Byggeperiode': contractData.duration,
      'Varighed': contractData.duration,
      
      // Property information
      'Ejendomstype': contractData.propertyType,
      'Bygningstype': contractData.buildingType,
      'Samlet areal': contractData.totalArea,
      'Areal': contractData.totalArea,
      'Antal etager': contractData.numberOfFloors,
      'Etager': contractData.numberOfFloors,
      
      // Project team
      'Arkitekt': contractData.architectFirm,
      'Arkitektfirma': contractData.architectFirm,
      'Ingeniør': contractData.engineerFirm,
      'Ingeniørfirma': contractData.engineerFirm,
      'Entreprenør': contractData.contractorName,
      'Hovedentreprenør': contractData.contractorName,
      
      // Additional information
      'Byggetilladelsesnummer': contractData.buildingPermitNumber,
      'Byggetilladelse': contractData.buildingPermitNumber,
      'Matrikelnummer': contractData.cadastralNumber,
      'Matrikel': contractData.cadastralNumber,
      'Ejerlav': contractData.cadastralDistrict,
      'Kommune': contractData.municipalityName,
      'Kommune navn': contractData.municipalityName,

      // Case / document metadata
      'Sagsnummer': contractData.caseNumber,
      'Sagsnr': contractData.caseNumber,
      'Sag nr': contractData.caseNumber,
      'Byggeadresse': contractData.constructionAddress,
      'Byggepladsens adresse': contractData.constructionAddress,
      'Emne': contractData.subject,
      'Revision dato': contractData.revisionDate,
      'Revisionsdato': contractData.revisionDate,
      'Revision nr': contractData.revisionNumber,
      'Revisionsnr': contractData.revisionNumber,
      'Rev.nr.': contractData.revisionNumber,
      'Vedrørende': contractData.regarding,
      'Vedr': contractData.regarding,
      'Vedr.': contractData.regarding,
      'Modtager': contractData.documentReceiver,
      'Dokumentmodtager': contractData.documentReceiver,
    };
  }

  /**
   * Get a summary of extraction results for user review
   */
  getExtractionSummary(contractData: ContractData): {
    critical: { label: string; value: string | undefined }[];
    optional: { label: string; value: string | undefined }[];
    missing: string[];
  } {
    return {
      critical: [
        { label: 'Project Name', value: contractData.projectName },
        { label: 'Project Address', value: contractData.projectAddress },
        { label: 'Client Name', value: contractData.clientName },
        { label: 'End Date', value: contractData.endDate },
      ],
      optional: [
        { label: 'Project Description', value: contractData.projectDescription },
        { label: 'Client Address', value: contractData.clientAddress },
        { label: 'Client Phone', value: contractData.clientPhone },
        { label: 'Client Email', value: contractData.clientEmail },
        { label: 'Client CVR', value: contractData.clientCVR },
        { label: 'Contract Value', value: contractData.contractValue },
        { label: 'Start Date', value: contractData.startDate },
        { label: 'Property Type', value: contractData.propertyType },
        { label: 'Total Area', value: contractData.totalArea },
        { label: 'Number of Floors', value: contractData.numberOfFloors },
        { label: 'Architect Firm', value: contractData.architectFirm },
        { label: 'Contractor', value: contractData.contractorName },
        { label: 'Municipality', value: contractData.municipalityName },
        { label: 'Emne (Subject)', value: contractData.subject },
        { label: 'Revision date', value: contractData.revisionDate },
        { label: 'Revision nr.', value: contractData.revisionNumber },
      ],
      missing: contractData.missingFields,
    };
  }
}

// Singleton instance
export const contractExtractor = new ContractExtractorService();
