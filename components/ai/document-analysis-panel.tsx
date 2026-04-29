"use client";

/**
 * Document Analysis Panel
 * 
 * Displays AI-powered document quality analysis results with:
 * - Overall quality scores
 * - Issues grouped by severity
 * - Actionable suggestions
 * - Status tracking
 */

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface AnalysisIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue_type: string;
  title: string;
  description: string;
  location?: string;
  suggestion?: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
}

interface AnalysisSuggestion {
  id: string;
  type: 'improvement' | 'addition' | 'clarification';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface AnalysisResult {
  id: string;
  template_name: string;
  chapter_name: string;
  overall_status: 'pass' | 'warning' | 'error';
  confidence_score: number;
  issues: AnalysisIssue[];
  suggestions: AnalysisSuggestion[];
  completeness_score: number;
  quality_score: number;
  compliance_score: number;
  word_count: number;
  analyzed_at: string;
}

interface DocumentAnalysisPanelProps {
  projectId: string;
  templateName?: string;
  chapterName?: string;
}

export function DocumentAnalysisPanel({ 
  projectId, 
  templateName, 
  chapterName 
}: DocumentAnalysisPanelProps) {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issuesSummary, setIssuesSummary] = useState({
    total: 0,
    open: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  useEffect(() => {
    fetchAnalysisResults();
  }, [projectId, templateName, chapterName]);

  const fetchAnalysisResults = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/ai/analysis-results/${projectId}`;
      const params = new URLSearchParams();
      if (templateName) params.append('template', templateName);
      if (chapterName) params.append('chapter', chapterName);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || 'Failed to fetch analysis results');
      }

      setResults(data.results || []);
      setIssuesSummary(data.summary || issuesSummary);

    } catch (err) {
      console.error('Error fetching analysis results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analysis results');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <Info className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Pass</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500">Loading analysis results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>{error}</p>
            <Button size="sm" variant="outline" onClick={fetchAnalysisResults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center p-8 space-y-4">
        <FileText className="h-12 w-12 mx-auto text-gray-400" />
        <div>
          <h3 className="text-lg font-medium mb-2">No Analysis Results</h3>
          <p className="text-sm text-gray-500">
            No document analysis has been performed yet for this {chapterName ? 'chapter' : 'project'}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Issues</span>
            <AlertCircle className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold">{issuesSummary.total}</div>
          <div className="text-xs text-gray-500 mt-1">
            {issuesSummary.open} open
          </div>
        </div>

        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Critical & High</span>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold">
            {issuesSummary.critical + issuesSummary.high}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {issuesSummary.critical} critical, {issuesSummary.high} high
          </div>
        </div>

        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Documents Analyzed</span>
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">{results.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            {results.filter(r => r.overall_status === 'pass').length} passing
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.id} className="bg-white border rounded-lg p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {result.chapter_name}
                  {getStatusBadge(result.overall_status)}
                </h3>
                <p className="text-sm text-gray-500">
                  {result.template_name} • {result.word_count} words •
                  Confidence: {formatScore(result.confidence_score)}
                </p>
              </div>
              <Button size="sm" variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Re-analyze
              </Button>
            </div>

            {/* Quality Scores */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-xs text-gray-600 mb-1">Completeness</div>
                <div className="text-lg font-semibold flex items-center gap-2">
                  {formatScore(result.completeness_score)}
                  <TrendingUp className={`h-4 w-4 ${result.completeness_score >= 0.7 ? 'text-green-600' : 'text-orange-600'}`} />
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Quality</div>
                <div className="text-lg font-semibold flex items-center gap-2">
                  {formatScore(result.quality_score)}
                  <TrendingUp className={`h-4 w-4 ${result.quality_score >= 0.7 ? 'text-green-600' : 'text-orange-600'}`} />
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Compliance</div>
                <div className="text-lg font-semibold flex items-center gap-2">
                  {formatScore(result.compliance_score)}
                  <TrendingUp className={`h-4 w-4 ${result.compliance_score >= 0.7 ? 'text-green-600' : 'text-orange-600'}`} />
                </div>
              </div>
            </div>

            {/* Issues */}
            {result.issues && result.issues.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Issues Found ({result.issues.length})</h4>
                <Accordion type="single" collapsible className="space-y-2">
                  {result.issues.map((issue, index) => (
                    <AccordionItem 
                      key={issue.id || index} 
                      value={`issue-${index}`}
                      className={`border rounded-lg ${getSeverityColor(issue.severity)}`}
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-start gap-3 text-left">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="font-medium">{issue.title}</div>
                            {issue.location && (
                              <div className="text-xs mt-1 opacity-75">
                                Location: {issue.location}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {issue.severity}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3 mt-2">
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Description:</div>
                            <div className="text-sm">{issue.description}</div>
                          </div>
                          {issue.suggestion && (
                            <div className="bg-white/50 p-3 rounded border">
                              <div className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Suggestion:
                              </div>
                              <div className="text-sm">{issue.suggestion}</div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Improvement Suggestions ({result.suggestions.length})</h4>
                <div className="space-y-2">
                  {result.suggestions.map((suggestion, index) => (
                    <div 
                      key={suggestion.id || index}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{suggestion.title}</div>
                          <div className="text-sm text-gray-700 mt-1">{suggestion.description}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No issues - celebration */}
            {(!result.issues || result.issues.length === 0) && result.overall_status === 'pass' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Great work!</strong> No issues found in this chapter. The content meets all quality standards.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
