'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface RAGChatInterfaceProps {
  sessionId: string;
  onQuerySubmit?: (query: string, context: string) => Promise<string>;
}

export function RAGChatInterface({ sessionId, onQuerySubmit }: RAGChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  // Fetch chat history on session change
  useEffect(() => {
    if (!sessionId?.trim()) return;

    const fetchChatHistory = async (): Promise<void> => {
      try {
        const response = await fetch(`${apiUrl}/api/rag-sessions/${sessionId}/chat-history`);

        if (!response.ok) {
          console.error('[v0] Failed to fetch chat history');
          return;
        }

        const data = await response.json() as { success: boolean; data?: { chatHistory: ChatMessage[] } };

        if (data.success && data.data?.chatHistory) {
          setMessages(data.data.chatHistory);
        }
      } catch (err: unknown) {
        console.error('[v0] Error fetching chat history:', err);
      }
    };

    fetchChatHistory();
  }, [sessionId, apiUrl]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Submit query
  const handleSubmitQuery = useCallback(async (): Promise<void> => {
    if (!inputValue.trim() || !sessionId?.trim()) {
      setError('Session ID and query are required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Add user message to chat
      const userMessage: ChatMessage = {
        role: 'user',
        content: inputValue,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Save user message to backend
      let saveResponse = await fetch(`${apiUrl}/api/rag-sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: inputValue,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save user message');
      }

      // Get assistant response (call custom handler if provided)
      let assistantResponse: string;

      if (onQuerySubmit) {
        assistantResponse = await onQuerySubmit(inputValue, '');
      } else {
        // Default: Echo back for demo
        assistantResponse = `I received your query: "${inputValue}". Please implement custom onQuerySubmit handler to get real RAG responses.`;
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message to backend
      saveResponse = await fetch(`${apiUrl}/api/rag-sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content: assistantResponse,
        }),
      });

      if (!saveResponse.ok) {
        console.error('[v0] Failed to save assistant message');
      }

      setInputValue('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[v0] Error submitting query:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, sessionId, apiUrl, onQuerySubmit]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-gray-400">Start by asking a question about your documents</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Ask a question about your documents..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                handleSubmitQuery();
              }
            }}
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            onClick={handleSubmitQuery}
            disabled={isLoading || !inputValue.trim()}
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500">Press Enter to send • Shift+Enter for new line</p>
      </div>
    </div>
  );
}
