'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, MessageSquare, Clock, File } from 'lucide-react';

interface RAGSession {
  _id: string;
  sessionId: string;
  sessionName: string;
  description?: string;
  uploadedFileNames: string[];
  totalChunks: number;
  chatHistory: Array<{ role: string; content: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  totalQueries: number;
}

interface RAGSessionManagerProps {
  applicationId: string;
  onSessionSelect: (session: RAGSession) => void;
  currentSessionId?: string;
}

export function RAGSessionManager({ applicationId, onSessionSelect, currentSessionId }: RAGSessionManagerProps) {
  const [sessions, setSessions] = useState<RAGSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch sessions for the application
  const fetchSessions = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/rag-sessions/app/${applicationId}`);

      if (!response.ok) {
        setError('Failed to fetch sessions');
        setIsLoading(false);
        return;
      }

      const data = await response.json() as { success: boolean; data?: { sessions: RAGSession[] } };

      if (data.success && data.data?.sessions) {
        setSessions(data.data.sessions);
      } else {
        setError('Invalid response format');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[v0] Error fetching sessions:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  // Load sessions on mount
  useEffect(() => {
    if (applicationId?.trim()) {
      fetchSessions();
    }
  }, [applicationId, fetchSessions]);

  // Create new session
  const handleCreateSession = async (): Promise<void> => {
    try {
      if (!newSessionName.trim()) {
        setError('Session name is required');
        return;
      }

      setIsCreating(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/rag-sessions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          sessionName: newSessionName,
          description: '',
          embeddingModel: 'text-embedding-3-small',
          embeddingProvider: 'openai',
          llmProvider: 'openai',
          llmModel: 'gpt-4',
        }),
      });

      if (!response.ok) {
        setError('Failed to create session');
        setIsCreating(false);
        return;
      }

      const data = await response.json() as { success: boolean; data?: RAGSession };

      if (data.success && data.data) {
        setSessions([data.data, ...sessions]);
        setNewSessionName('');
        onSessionSelect(data.data);
      } else {
        setError('Failed to create session');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[v0] Error creating session:', message);
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this session and its chat history?')) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/rag-sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        setError('Failed to delete session');
        return;
      }

      setSessions(sessions.filter(s => s.sessionId !== sessionId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[v0] Error deleting session:', message);
      setError(message);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="w-full max-w-md">
      {/* Create New Session */}
      <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">New Knowledge Base Session</h3>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter session name (e.g., 'Q&A on Machine Learning')"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateSession();
              }
            }}
            disabled={isCreating}
            className="text-sm"
          />
          <Button
            onClick={handleCreateSession}
            disabled={isCreating || !newSessionName.trim()}
            className="gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            {isCreating ? 'Creating...' : 'New'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-600 hover:text-red-800 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 px-2">Recent Sessions</h3>

        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No sessions yet. Create one to get started!
          </div>
        ) : (
          sessions.map((session) => (
            <Card
              key={session.sessionId}
              className={`p-3 cursor-pointer transition-all ${
                currentSessionId === session.sessionId
                  ? 'bg-blue-50 border-blue-300 border-2'
                  : 'bg-white hover:bg-gray-50'
              }`}
              onClick={() => onSessionSelect(session)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {session.sessionName}
                  </h4>
                  <p className="text-xs text-gray-600 truncate">{session.description || 'No description'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.sessionId);
                  }}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Session Stats */}
              <div className="flex gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <File className="w-3 h-3" />
                  <span>{session.uploadedFileNames.length} files</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{session.chatHistory.length} messages</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(session.lastAccessedAt)}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Refresh Button */}
      {sessions.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSessions}
          disabled={isLoading}
          className="w-full mt-4"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Sessions'}
        </Button>
      )}
    </div>
  );
}
