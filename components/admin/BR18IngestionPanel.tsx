'use client';

import { useState } from 'react';
import { useTranslations } from "next-intl";
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
  const t = useTranslations("documents");
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
          message: data.data?.isIngested ? t("br18Ingested") : t("br18NotIngested"),
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
          {t("br18KnowledgeBase")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("br18Description")}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={checkStatus} 
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {t("checkStatus")}
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
            {t("fullIngestion")}
          </Button>
        </div>

        {isLoading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              {mode === 'full' 
                ? t("processingAllPages")
                : t("processingTestPages")}
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
                      {result.data.documentsProcessed} {t("documents")}
                    </Badge>
                    <Badge variant="secondary">
                      {result.data.chunksIngested} {t("chunks")}
                    </Badge>
                    <Badge variant="outline">
                      {t("cost")}: ${result.data.totalCost.toFixed(4)}
                    </Badge>
                    {result.data.errors.length > 0 && (
                      <Badge variant="destructive">
                        {result.data.errors.length} {t("errors")}
                      </Badge>
                    )}
                  </div>
                )}

                {result.status && (
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant={result.status.isIngested ? "default" : "secondary"}>
                      {result.status.isIngested ? t("ingested") : t("notIngested")}
                    </Badge>
                    {result.status.documentCount > 0 && (
                      <Badge variant="outline">
                        {result.status.documentCount} {t("documents")}
                      </Badge>
                    )}
                    {result.status.totalChunks && (
                      <Badge variant="outline">
                        {result.status.totalChunks} {t("chunks")}
                      </Badge>
                    )}
                  </div>
                )}

                {result.data?.errors && result.data.errors.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-red-600">
                      {t("viewErrors", { count: result.data.errors.length })}
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
