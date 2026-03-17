'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileInfo, 
  listFiles, 
  deleteFile, 
  removeTemporaryFiles,
  reingestDocuments,
  getIngestionStatus,
  IngestionStatus
} from '@/lib/file-service';
import { Trash2, RefreshCw, Loader2, FileText, Plus } from 'lucide-react';

interface FileListProps {
  onUpdate?: () => void;
  onNewChat?: () => void;
}

export function FileList({ onUpdate, onNewChat }: FileListProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isReingesting, setIsReingesting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatus | null>(null);

  const loadFiles = async () => {
    try {
      const response = await listFiles();
      setFiles(response.files);
      setError(null);
    } catch (error) {
      console.error('Error loading files:', error);
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if ingestion is already in progress
    const checkIngestionStatus = async () => {
      try {
        const status = await getIngestionStatus();
        setIngestionStatus(status);
        setIsReingesting(status.is_ingesting);
      } catch (error) {
        console.error('Error checking ingestion status:', error);
      }
    };
    
    checkIngestionStatus();
    loadFiles();
  }, [refreshTrigger]);

  useEffect(() => {
    if (onUpdate) {
      // Don't refresh too frequently to avoid bombarding the backend
      const timer = setTimeout(() => {
        // Only trigger a refresh if we're not already reingesting
        if (!isReingesting) {
          setRefreshTrigger(prev => prev + 1);
        }
      }, 5000); // Increased to 5 seconds to further reduce backend load
      
      return () => clearTimeout(timer);
    }
  }, [onUpdate, isReingesting]);

  const handleDelete = async (documentId: string) => {
    try {
      await deleteFile(documentId);
      await loadFiles();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
    }
  };

  const handleNewChat = async () => {
    setIsRemoving(true);
    try {
      await removeTemporaryFiles();
      await loadFiles();
      onUpdate?.();
      onNewChat?.();
    } catch (error) {
      console.error('Error starting new chat:', error);
      setError('Failed to start new chat');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleReingest = async () => {
    setIsReingesting(true);
    try {
      await reingestDocuments();
      // Don't trigger additional refreshes here - the parent component will handle status checking
      onUpdate?.();
    } catch (error) {
      console.error('Error reingesting documents:', error);
      setError('Failed to reingest documents');
      setIsReingesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Uploaded Documents</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleNewChat}
            disabled={isRemoving || isReingesting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isRemoving ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Plus className="h-5 w-5 mr-2" />
            )}
            New Chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReingest}
            disabled={isRemoving || isReingesting}
            title={isReingesting ? "Document processing in progress" : "Reingest all documents"}
          >
            {isReingesting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Reingest All
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <Card className="bg-muted">
          <CardContent className="flex items-center justify-center py-6">
            <p className="text-sm text-muted-foreground">
              No files uploaded yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {files.map((file) => (
            <Card
              key={file.id}
              className={cn(
                "transition-colors hover:shadow-md",
                file.isTemporary ? "border-yellow-200 bg-yellow-50/50" : "bg-card"
              )}
            >
              <CardContent className="flex items-center p-4">
                <div className="flex items-center flex-1 min-w-0 gap-3">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">
                        {file.uploadedAt} • {file.size}
                      </p>
                      {file.isTemporary && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                          Temporary
                        </Badge>
                      )}
                      {file.ingestionStatus && file.ingestionStatus !== 'completed' && (
                        <Badge variant="outline" className={cn(
                          file.ingestionStatus === 'processing' && "text-blue-600 border-blue-300 bg-blue-50",
                          file.ingestionStatus === 'failed' && "text-red-600 border-red-300 bg-red-50",
                          file.ingestionStatus === 'pending' && "text-gray-600 border-gray-300 bg-gray-50",
                        )}>
                          {file.ingestionStatus === 'processing' ? 'Processing...' : 
                           file.ingestionStatus === 'failed' ? 'Failed' : 'Pending'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(file.id)}
                    disabled={isReingesting}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete file</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 