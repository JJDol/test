"use client";

/**
 * Revision Comparison Dialog
 * 
 * Side-by-side comparison of original text and AI-generated revisions
 * with accept/reject workflow for selecting preferred version.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Check,
  X,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { RevisionContext } from '@/lib/services/ai/document-revision-service';

interface RevisionComparisonDialogProps {
  originalText: string;
  context?: RevisionContext;
  onAccept?: (revisedText: string) => void;
  triggerButton?: React.ReactNode;
  // Controlled mode props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  alternatives?: RevisionAlternative[];
  overallAssessment?: string;
  onKeepOriginal?: () => void;
  onAcceptRevision?: (revisedText: string) => void;
}

interface RevisionAlternative {
  id: string;
  revised_text: string;
  changes_summary: string;
  improvements: string[];
  reasoning: string;
  confidence: number;
  difference: {
    added_words: number;
    removed_words: number;
    changed_words: number;
    similarity_score: number;
  };
}

export function RevisionComparisonDialog({
  originalText,
  context,
  onAccept,
  triggerButton,
  // Controlled mode props
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  alternatives: controlledAlternatives,
  overallAssessment: controlledOverallAssessment,
  onKeepOriginal,
  onAcceptRevision,
}: RevisionComparisonDialogProps) {
  // Check if component is in controlled mode
  const isControlled = controlledOpen !== undefined && controlledAlternatives !== undefined;
  
  // Uncontrolled state
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalAlternatives, setInternalAlternatives] = useState<RevisionAlternative[]>([]);
  const [internalOverallAssessment, setInternalOverallAssessment] = useState<string>('');
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  
  // Use controlled or uncontrolled values
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;
  const alternatives = isControlled ? (controlledAlternatives || []) : internalAlternatives;
  const overallAssessment = isControlled ? (controlledOverallAssessment || '') : internalOverallAssessment;

  const handleGenerateRevisions = async () => {
    // Only fetch if in uncontrolled mode
    if (isControlled) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/suggest-revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          context,
          numberOfAlternatives: 2,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || 'Failed to generate revisions');
      }

      setInternalAlternatives(data.result.alternatives);
      setInternalOverallAssessment(data.result.overall_assessment);

    } catch (err) {
      console.error('Error generating revisions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate revisions');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (alternativeId: string) => {
    const alternative = alternatives.find(a => a.id === alternativeId);
    if (alternative) {
      // Call appropriate callback
      if (isControlled && onAcceptRevision) {
        onAcceptRevision(alternative.revised_text);
      } else if (onAccept) {
        onAccept(alternative.revised_text);
      }
      setOpen(false);
    }
  };

  const handleReject = () => {
    if (isControlled && onKeepOriginal) {
      onKeepOriginal();
    } else {
      setInternalAlternatives([]);
      setInternalOverallAssessment('');
      setSelectedAlternative(null);
    }
    setOpen(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {triggerButton || (
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Suggest Improvements
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Revision Suggestions
          </DialogTitle>
          <DialogDescription>
            Compare original text with AI-generated improvements
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {alternatives.length === 0 && !loading && !isControlled && (
          <div className="space-y-4">
            {/* Original Text Preview */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-2">Original Text:</div>
              <div className="text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                {originalText}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {originalText.split(/\s+/).length} words
              </div>
            </div>

            <Button 
              onClick={handleGenerateRevisions} 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Revisions...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate AI Revisions
                </>
              )}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <div className="text-lg font-medium">Analyzing and revising...</div>
              <div className="text-sm text-gray-500 mt-1">
                AI is generating improved versions of your text
              </div>
            </div>
          </div>
        )}

        {alternatives.length > 0 && !loading && (
          <div className="space-y-4">
            {/* Overall Assessment */}
            {overallAssessment && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>{overallAssessment}</AlertDescription>
              </Alert>
            )}

            {/* Comparison Tabs */}
            <Tabs defaultValue="original" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="original">Original</TabsTrigger>
                <TabsTrigger value="alt1">
                  Revision 1
                  {alternatives[0] && (
                    <Badge variant="outline" className="ml-2">
                      {Math.round(alternatives[0].confidence * 100)}%
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="alt2">
                  Revision 2
                  {alternatives[1] && (
                    <Badge variant="outline" className="ml-2">
                      {Math.round(alternatives[1].confidence * 100)}%
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Original Text Tab */}
              <TabsContent value="original" className="space-y-4">
                <div className="border rounded-lg p-4 bg-gray-50 min-h-[200px]">
                  <div className="whitespace-pre-wrap">{originalText}</div>
                </div>
                <div className="text-xs text-gray-500">
                  {originalText.split(/\s+/).length} words
                </div>
              </TabsContent>

              {/* Alternative 1 Tab */}
              {alternatives[0] && (
                <TabsContent value="alt1" className="space-y-4">
                  <div className="border rounded-lg p-4 bg-green-50 min-h-[200px]">
                    <div className="whitespace-pre-wrap">{alternatives[0].revised_text}</div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>+{alternatives[0].difference.added_words} words</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      <span>-{alternatives[0].difference.removed_words} words</span>
                    </div>
                    <div className={`font-medium ${getConfidenceColor(alternatives[0].confidence)}`}>
                      Confidence: {Math.round(alternatives[0].confidence * 100)}%
                    </div>
                  </div>

                  {/* Changes Summary */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="font-medium text-sm">Changes Summary:</div>
                    <p className="text-sm">{alternatives[0].changes_summary}</p>
                  </div>

                  {/* Improvements */}
                  <div className="space-y-2">
                    <div className="font-medium text-sm">Improvements:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {alternatives[0].improvements.map((improvement, idx) => (
                        <li key={idx} className="text-sm">{improvement}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Reasoning */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="font-medium text-sm">Reasoning:</div>
                    <p className="text-sm text-gray-700">{alternatives[0].reasoning}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => handleAccept(alternatives[0].id)}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Accept This Revision
                    </Button>
                  </div>
                </TabsContent>
              )}

              {/* Alternative 2 Tab */}
              {alternatives[1] && (
                <TabsContent value="alt2" className="space-y-4">
                  <div className="border rounded-lg p-4 bg-blue-50 min-h-[200px]">
                    <div className="whitespace-pre-wrap">{alternatives[1].revised_text}</div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>+{alternatives[1].difference.added_words} words</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      <span>-{alternatives[1].difference.removed_words} words</span>
                    </div>
                    <div className={`font-medium ${getConfidenceColor(alternatives[1].confidence)}`}>
                      Confidence: {Math.round(alternatives[1].confidence * 100)}%
                    </div>
                  </div>

                  {/* Changes Summary */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="font-medium text-sm">Changes Summary:</div>
                    <p className="text-sm">{alternatives[1].changes_summary}</p>
                  </div>

                  {/* Improvements */}
                  <div className="space-y-2">
                    <div className="font-medium text-sm">Improvements:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {alternatives[1].improvements.map((improvement, idx) => (
                        <li key={idx} className="text-sm">{improvement}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Reasoning */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="font-medium text-sm">Reasoning:</div>
                    <p className="text-sm text-gray-700">{alternatives[1].reasoning}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => handleAccept(alternatives[1].id)}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Accept This Revision
                    </Button>
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {/* Bottom Actions */}
            <div className="flex gap-2 justify-end border-t pt-4">
              <Button variant="outline" onClick={handleReject}>
                <X className="h-4 w-4 mr-2" />
                Keep Original
              </Button>
              <Button variant="outline" onClick={handleGenerateRevisions}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate New Revisions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
