/**
 * @file Frontend service for handling chat interactions with the semantic chat API.
 * 
 * @purpose This service provides a clean and centralized way for frontend components to
 * communicate with the backend chat API (`/api/semantic/chat`). It abstracts away the
 * details of the `fetch` call, request body formatting, and error handling.
 * 
 * @architectural_note (Handover Note)
 * This file is a perfect example of a **Frontend Service**. Its sole responsibility is to act
 * as a communication layer between the client-side components and the server-side API routes.
 * 
 * When creating new frontend services for interacting with other APIs, this file should be
 * used as a reference to ensure a consistent architectural pattern across the application.
 * The pattern is:
 * 1. Frontend Component -> calls -> Frontend Service (like this one)
 * 2. Frontend Service -> makes `fetch` call to -> API Route
 * 3. API Route -> contains -> Backend Business Logic
 */
import { ChatResponse } from '@/lib/types/types';

export async function sendChatMessage(message: string, sessionId?: string): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/semantic/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in chat service:', error);
    throw new Error('Failed to send message');
  }
} 