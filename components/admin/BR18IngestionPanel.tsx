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
  const [mode, setMode] = useState<'idle' | 'test' | 'full'>('idle');

  const handleIngest = async (testMode: boolean) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setMode(testMode ? 'test' : 'full');

    try {
      const url = testMode
        ? '/api/admin/enhanced-br18-ingestion?test=true'
        : '/api/admin/enhanced-br18-ingestion';

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setMode('idle');
    }
  };

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/enhanced-br18-ingestion');
      const data = await response.json();
      
      if (response.ok) {
        setResult({
          message: data.data?.isIngested ? 'BR18 data is ingested and ready' : 'BR18 data not yet ingested',
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="h-5 w-5" />
          BR18 Knowledge Base
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Load Danish building regulations (BR18) into the AI knowledge base so the chatbot can answer regulation questions.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={checkStatus} 
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            Check Status
          </Button>
          <Button 
            onClick={() => handleIngest(false)} 
            size="sm"
            disabled={isLoading}
          >
            {isLoading && mode === 'full' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Full Ingestion (all 21 pages)
          </Button>
        </div>

        {isLoading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              {mode === 'full' 
                ? 'Processing all 21 BR18 pages. This may take several minutes...' 
                : 'Processing test pages...'}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && !isLoading && (
          <Alert variant={result.status?.isIngested || result.data ? "default" : "destructive"}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{result.message}</p>
                
                {result.data && (
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="secondary">
                      {result.data.documentsProcessed} Documents
                    </Badge>
                    <Badge variant="secondary">
                      {result.data.chunksIngested} Chunks
                    </Badge>
                    <Badge variant="outline">
                      Cost: ${result.data.totalCost.toFixed(4)}
                    </Badge>
                    {result.data.errors.length > 0 && (
                      <Badge variant="destructive">
                        {result.data.errors.length} Errors
                      </Badge>
                    )}
                  </div>
                )}

                {result.status && (
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant={result.status.isIngested ? "default" : "secondary"}>
                      {result.status.isIngested ? 'Ingested' : 'Not Ingested'}
                    </Badge>
                    {result.status.documentCount > 0 && (
                      <Badge variant="outline">
                        {result.status.documentCount} Documents
                      </Badge>
                    )}
                    {result.status.totalChunks && (
                      <Badge variant="outline">
                        {result.status.totalChunks} Chunks
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
                      {result.data.errors.map((err, index) => (
                        <li key={index} className="text-red-600">{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
