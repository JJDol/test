/**
 * 🏢 useSemanticEngine - Business Logic Hook for Semantic Search Engine
 * 
 * PURPOSE: Centralized state management and business logic for semantic engine
 * - Chat message management and API calls
 * - File upload and ingestion status tracking
 * - User role and authentication management
 * - Session management and error handling
 * - Auto-scrolling and UI state management
 * 
 * ENTERPRISE BENEFITS:
 * - Separates business logic from UI components
 * - Testable hook with clear responsibilities
 * - Reusable across different UI implementations
 * - Centralized state management
 * - Professional error handling and loading states
 */

"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from "@/lib/database.types";
import { sendChatMessage } from "@/lib/chat-service";
import { SourceAttribution } from "@/lib/types/types";
import { IngestionStatus } from "@/lib/file-service";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceAttribution[];
}

interface SemanticEngineState {
  messages: Message[];
  inputValue: string;
  currentSessionId: string | undefined;
  refreshTrigger: number;
  ingestionStatus: IngestionStatus | null;
  userRole: string | null;
}

interface LoadingState {
  chat: boolean;
  ingestion: boolean;
}

interface ErrorState {
  chat: string | null;
  backend: boolean;
}

interface SemanticEngineActions {
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleUploadComplete: () => void;
  handleNewChat: () => void;
  setInputValue: (value: string) => void;
}

interface UseSemanticEngineReturn {
  // State
  state: SemanticEngineState;
  loading: LoadingState;
  error: ErrorState;
  
  // Refs for UI management
  messagesEndRef: React.RefObject<HTMLDivElement>;
  
  // Actions
  actions: SemanticEngineActions;
  
  // Computed values
  progressPercentage: number;
  canSendMessage: boolean;
}

export function useSemanticEngine(): UseSemanticEngineReturn {
  // State management
  const [state, setState] = useState<SemanticEngineState>({
    messages: [],
    inputValue: '',
    currentSessionId: undefined,
    refreshTrigger: 0,
    ingestionStatus: null,
    userRole: null,
  });

  const [loading, setLoading] = useState<LoadingState>({
    chat: false,
    ingestion: false,
  });

  const [error, setError] = useState<ErrorState>({
    chat: null,
    backend: false,
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Supabase client
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Auto-scroll functionality
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        const scrollArea = messagesEndRef.current.closest('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        } else {
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end'
          });
        }
      }
    }, 100);
  }, []);

  // Check user role for admin panel visibility
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        // TODO: Use API route for this
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && userData) {
          setState(prev => ({ ...prev, userRole: userData.role }));
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };

    checkUserRole();
  }, [supabase]);

  // Auto-scroll effects
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollToBottom();
  }, [state.messages, scrollToBottom]);

  useEffect(() => {
    if (!loading.chat) {
      scrollToBottom();
    }
  }, [loading.chat, scrollToBottom]);

  useEffect(() => {
    if (state.messages.length > 0) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          const scrollArea = messagesEndRef.current.closest('[data-radix-scroll-area-viewport]');
          if (scrollArea) {
            scrollArea.scrollTop = scrollArea.scrollHeight;
          }
        }
      }, 10);
    }
  }, [state.messages.length]);

  // Check ingestion status
  const checkIngestionStatus = useCallback(async () => {
    try {
      // TODO: Implement new ingestion status API when we add document upload
      // For now, just set default values so chat works
      setState(prev => ({
        ...prev,
        ingestionStatus: {
          is_ingesting: false,
          total_documents: 0,
          completed_documents: 0,
          current_document: null,
          error: null,
          success: true,
          stage: "Ready",
          progress: 0
        }
      }));
      setLoading(prev => ({ ...prev, ingestion: false }));
      setError(prev => ({ ...prev, backend: false }));
    } catch (error) {
      console.error('Error checking ingestion status:', error);
      setError(prev => ({ ...prev, backend: false })); // Don't set to true for now
    }
  }, []);

  // Initialize ingestion status check
  useEffect(() => {
    checkIngestionStatus();
    
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
    };
  }, [state.refreshTrigger, checkIngestionStatus]);

  // Actions
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.inputValue.trim() || loading.chat || loading.ingestion) return;

    setLoading(prev => ({ ...prev, chat: true }));
    setError(prev => ({ ...prev, chat: null }));
    
    // Add user message
    const userMessage = { role: 'user' as const, content: state.inputValue };
    setState(prev => ({ ...prev, messages: [...prev.messages, userMessage] }));
    
    // Add loading message
    const loadingMessage = { role: 'assistant' as const, content: '', sources: [] };
    setState(prev => ({ ...prev, messages: [...prev.messages, loadingMessage] }));
    
    // Force immediate scroll for user message
    setTimeout(() => scrollToBottom(), 50);
    
    try {
      const response = await sendChatMessage(state.inputValue, state.currentSessionId);
      
      // Update session ID if this is a new conversation
      const newSessionId = state.currentSessionId || response.session_id;
      
      // Replace loading message with actual response
      const assistantMessage = { 
        role: 'assistant' as const, 
        content: response.content,
        sources: response.sources || []
      };
      
      setState(prev => ({
        ...prev,
        currentSessionId: newSessionId,
        messages: [...prev.messages.slice(0, -1), assistantMessage],
        inputValue: ''
      }));
      
      setError(prev => ({ ...prev, backend: false }));
      
      // Ensure scroll to bottom after response
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error:', error);
      setError(prev => ({ 
        ...prev, 
        backend: true,
        chat: 'Failed to get response. Please try again.'
      }));
      // Remove loading message on error
      setState(prev => ({ ...prev, messages: prev.messages.slice(0, -1) }));
    } finally {
      setLoading(prev => ({ ...prev, chat: false }));
    }
  }, [state.inputValue, state.currentSessionId, loading.chat, loading.ingestion, scrollToBottom]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }, [handleSubmit]);

  const handleUploadComplete = useCallback(() => {
    setState(prev => ({ ...prev, refreshTrigger: prev.refreshTrigger + 1 }));
  }, []);

  const handleNewChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      currentSessionId: undefined
    }));
    setError(prev => ({ ...prev, chat: null }));
  }, []);

  const setInputValue = useCallback((value: string) => {
    setState(prev => ({ ...prev, inputValue: value }));
  }, []);

  // Computed values
  const progressPercentage = state.ingestionStatus 
    ? (state.ingestionStatus.completed_documents / Math.max(state.ingestionStatus.total_documents, 1)) * 100
    : 0;

  const canSendMessage = !loading.chat && !loading.ingestion && state.inputValue.trim().length > 0;

  const actions: SemanticEngineActions = {
    handleSubmit,
    handleKeyDown,
    handleUploadComplete,
    handleNewChat,
    setInputValue,
  };

  return {
    state,
    loading,
    error,
    messagesEndRef,
    actions,
    progressPercentage,
    canSendMessage,
  };
}
