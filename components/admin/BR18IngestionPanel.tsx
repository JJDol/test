'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, CheckCircle, AlertCircle } from "lucide-react";

interface IngestionResult {
  message: string;
  data?: {
    documentsProcessed: number;
    chunksIngested: number;
    enhancementsApplied: number;
    totalCost: number;
    errors: string[];
    costPerDocument?: number;
    chunksPerDocument?: number;
  };
  status?: {
    isIngested: boolean;
    documentCount: number;
    lastIngested?: string;
    totalChunks?: number;
  };
}

export function BR18IngestionPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIngestBR18 = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/enhanced-br18-ingestion?test=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok || response.status === 207) {
        setResult(data);
      } else {
        throw new Error(data.error || 'Failed to ingest BR18 data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/enhanced-br18-ingestion');
      const data = await response.json();
      
      if (response.ok) {
        setResult({
          message: data.data?.isIngested ? 'Enhanced BR18 data is already ingested' : 'Enhanced BR18 data not yet ingested',
          status: data.data
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          BR18 Document Ingestion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Import BR18 building regulations with enhanced processing. This will process 2 pages 
          in TEST MODE with fact extraction, question generation, and smart chunking.
        </p>

        <div className="flex gap-2">
          <Button 
            onClick={handleIngestBR18} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isLoading ? 'Processing...' : 'Enhanced BR18 Ingestion (TEST)'}
          </Button>
          
          <Button 
            onClick={checkStatus} 
            variant="outline"
            disabled={isLoading}
          >
            Check Status
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert variant={result.status?.isIngested || result.data ? "default" : "destructive"}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{result.message}</p>
                
                {result.data && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <Badge variant="secondary">
                        {result.data.documentsProcessed} Documents
                      </Badge>
                    </div>
                    <div>
                      <Badge variant="secondary">
                        {result.data.chunksIngested} Chunks
                      </Badge>
                    </div>
                    <div>
                      <Badge variant="outline">
                        Cost: ${result.data.totalCost.toFixed(4)}
                      </Badge>
                    </div>
                    <div>
                      <Badge variant="outline">
                        {result.data.enhancementsApplied} Enhanced
                      </Badge>
                    </div>
                    {result.data.errors.length > 0 && (
                      <div>
                        <Badge variant="destructive">
                          {result.data.errors.length} Errors
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {result.status && (
                  <div className="flex gap-2 text-sm">
                    <Badge variant={result.status.isIngested ? "default" : "secondary"}>
                      {result.status.isIngested ? 'Ingested' : 'Not Ingested'}
                    </Badge>
                    {result.status.documentCount > 0 && (
                      <Badge variant="outline">
                        {result.status.documentCount} Documents in DB
                      </Badge>
                    )}
                    {result.status.totalChunks && (
                      <Badge variant="outline">
                        {result.status.totalChunks} Total Chunks
                      </Badge>
                    )}
                  </div>
                )}

                {result.data?.errors && result.data.errors.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-red-600">
                      View Errors ({result.data.errors.length})
                    </summary>
                    <ul className="mt-1 list-disc list-inside text-xs">
                      {result.data.errors.map((error, index) => (
                        <li key={index} className="text-red-600">{error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          <p>💡 Enhanced processing (TEST MODE):</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Scrapes 2 BR18 pages with smart chunking</li>
            <li>Extracts facts and generates questions for better search</li>
            <li>Uses OpenAI embeddings (1536 dimensions)</li>
            <li>Stores in Qdrant Cloud with enhanced metadata</li>
            <li>Provides cost tracking and quality metrics</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 